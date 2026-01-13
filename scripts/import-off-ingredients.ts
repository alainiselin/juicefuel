import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import https from 'https';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const OFF_TAXONOMY_URL = 'https://static.openfoodfacts.org/data/taxonomies/ingredients.txt';
const MAX_INGREDIENTS = 4000;
const CORE_TARGET = 1000;

const EXCLUDED_TERMS = [
  'additive', 'emulsifier', 'stabilizer', 'colour', 'color', 'preservative',
  'thickener', 'raising agent', 'flavouring', 'flavoring',
  'acidity regulator', 'acid'
];

const EXACT_EXCLUDES = ['food', 'ingredients', 'miscellaneous', 'other', 'unknown'];

const VARIANT_SUFFIXES = ['powder', 'ground', 'fresh', 'dried', 'whole', 'chopped'];

const FOOD_CATEGORIES = [
  'vegetable', 'fruit', 'herb', 'spice', 'grain', 'dairy', 'meat', 'fish',
  'oil', 'nut', 'legume', 'bean', 'seed', 'cereal', 'pasta', 'rice',
  'cheese', 'milk', 'egg', 'chicken', 'beef', 'pork', 'lamb', 'seafood'
];

interface IngredientEntry {
  name: string;              // Canonical name
  nameLower: string;         // Lowercase for dedup (always used for storage)
  aliases: string[];         // Alternative names
  depth: number;
  score: number;
}

function downloadFile(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });
  });
}

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

// Capitalize first letter of each word for display names
function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function stripVariantSuffix(name: string): string {
  const words = name.split(' ');
  if (words.length > 1) {
    const lastWord = words[words.length - 1].toLowerCase();
    if (VARIANT_SUFFIXES.includes(lastWord)) {
      return words.slice(0, -1).join(' ');
    }
  }
  return name;
}

function shouldExclude(name: string): boolean {
  const lower = name.toLowerCase();
  
  if (/^e\d+\b/i.test(name)) return true;
  if (EXACT_EXCLUDES.includes(lower)) return true;
  
  for (const term of EXCLUDED_TERMS) {
    if (lower.includes(term)) return true;
  }
  
  return false;
}

// Calculate depth from OFF taxonomy path structure
function calculateDepth(offId: string): number {
  return (offId.match(/:/g) || []).length;
}

function scoreIngredient(name: string): number {
  let score = 1000;
  
  // Prefer shorter names
  score -= name.length * 2;
  
  // Penalize complex punctuation
  score -= (name.match(/[(),]/g) || []).length * 50;
  
  // Boost food categories
  const lower = name.toLowerCase();
  for (const cat of FOOD_CATEGORIES) {
    if (lower.includes(cat)) {
      score += 100;
      break;
    }
  }
  
  // Penalize stop-words
  if (lower.includes('other') || lower.includes('various')) {
    score -= 200;
  }
  
  return score;
}

function parseIngredientsTaxonomy(content: string): IngredientEntry[] {
  const lines = content.split('\n');
  const entriesMap = new Map<string, IngredientEntry>();  // Use lowercase key for dedup
  let currentOffId: string | null = null;
  let currentCanonical: string | null = null;
  let currentAliases: Set<string> = new Set();
  let currentDepth = 0;

  const flushEntry = () => {
    if (currentOffId && currentCanonical) {
      if (currentDepth <= 2 && !shouldExclude(currentCanonical)) {
        const nameLower = currentCanonical.toLowerCase();
        const nameDisplay = toTitleCase(currentCanonical);
        const score = scoreIngredient(nameLower);
        
        // Check if we already have this ingredient (case-insensitive)
        const existing = entriesMap.get(nameLower);
        if (existing) {
          // Merge aliases
          currentAliases.forEach(a => existing.aliases.push(a));
          // Keep better score
          if (score > existing.score) {
            existing.score = score;
          }
        } else {
          entriesMap.set(nameLower, {
            name: nameDisplay,
            nameLower,
            aliases: Array.from(currentAliases),
            depth: currentDepth,
            score,
          });
        }
      }
    }
    currentOffId = null;
    currentCanonical = null;
    currentAliases = new Set();
    currentDepth = 0;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    if (trimmed.startsWith('en:')) {
      flushEntry();
      currentOffId = trimmed.substring(3);
      currentDepth = calculateDepth(trimmed);
      currentCanonical = normalizeText(currentOffId.replace(/-/g, ' '));
    } else if (trimmed.startsWith('name:en:')) {
      const name = normalizeText(trimmed.substring(8));
      if (name) currentCanonical = name;
    } else if (trimmed.startsWith('synonyms:en:')) {
      const synonymsStr = trimmed.substring(12);
      const synonyms = synonymsStr.split(',').map(s => normalizeText(s)).filter(Boolean);
      synonyms.forEach(s => {
        if (!shouldExclude(s)) {
          currentAliases.add(s.toLowerCase());
        }
      });
    }
  }
  
  flushEntry();
  
  // Convert map to array and sort by score
  const entries = Array.from(entriesMap.values());
  entries.sort((a, b) => b.score - a.score);
  return entries.slice(0, MAX_INGREDIENTS);
}

async function main() {
  console.log('🔍 Checking for existing case-insensitive duplicates in DB...\n');
  
  // First, clean up any existing case-insensitive duplicates
  const allIngredients = await prisma.ingredient.findMany({
    where: { source: 'OFF' },
    select: { id: true, name: true, source: true },
    orderBy: { created_at: 'asc' },  // Keep older ones
  });

  const grouped = new Map<string, typeof allIngredients>();
  for (const ing of allIngredients) {
    const key = ing.name.toLowerCase();
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(ing);
  }

  let mergedCount = 0;
  for (const [lowercase, items] of grouped) {
    if (items.length <= 1) continue;
    
    console.log(`   Found duplicate: "${lowercase}" (${items.length} variants)`);
    // Keep first one (oldest), convert others to aliases
    const [canonical, ...duplicates] = items;
    
    for (const dup of duplicates) {
      try {
        // Create alias
        await prisma.ingredient_alias.upsert({
          where: { name: dup.name },
          create: {
            ingredient_id: canonical.id,
            name: dup.name,
          },
          update: {
            ingredient_id: canonical.id,
          },
        });
        
        // Update foreign key references
        await prisma.$executeRaw`
          UPDATE recipe_ingredient SET ingredient_id = ${canonical.id} WHERE ingredient_id = ${dup.id}
        `;
        await prisma.$executeRaw`
          UPDATE shopping_list_item SET ingredient_id = ${canonical.id} WHERE ingredient_id = ${dup.id}
        `;
        await prisma.$executeRaw`
          UPDATE ingredient_tag SET ingredient_id = ${canonical.id} WHERE ingredient_id = ${dup.id} 
          ON CONFLICT DO NOTHING
        `;
        
        // Delete the duplicate
        await prisma.ingredient.delete({ where: { id: dup.id } });
        mergedCount++;
        console.log(`   ✓ Merged "${dup.name}" → "${canonical.name}"`);
      } catch (err: any) {
        console.warn(`   ⚠️  Could not merge "${dup.name}": ${err.message}`);
      }
    }
  }
  
  if (mergedCount > 0) {
    console.log(`\n✅ Cleaned up ${mergedCount} duplicates\n`);
  } else {
    console.log('   No duplicates found\n');
  }

  console.log('📥 Downloading OFF ingredients taxonomy...');
  const content = await downloadFile(OFF_TAXONOMY_URL);
  
  console.log('📄 Parsing taxonomy with filters...');
  console.log(`   MAX_INGREDIENTS: ${MAX_INGREDIENTS}`);
  console.log(`   CORE_TARGET: ${CORE_TARGET}`);
  console.log(`   Depth limit: <= 2`);
  const entries = parseIngredientsTaxonomy(content);
  console.log(`   Selected ${entries.length} ingredients after filtering and scoring\n`);

  let inserted = 0;
  let updated = 0;
  let aliasesInserted = 0;
  let merged = 0;
  let skipped = 0;

  console.log('💾 Upserting ingredients...');
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const isCore = i < CORE_TARGET;
    
    try {
      const baseName = stripVariantSuffix(entry.name);
      
      // Check if base exists (for variant merging)
      let targetIngredient = null;
      if (baseName.toLowerCase() !== entry.nameLower) {
        targetIngredient = await prisma.ingredient.findFirst({
          where: {
            name: {
              equals: baseName,
              mode: 'insensitive',
            },
          },
        });
      }
      
      if (targetIngredient) {
        // Merge as alias
        try {
          await prisma.ingredient_alias.upsert({
            where: { name: entry.name },
            create: {
              ingredient_id: targetIngredient.id,
              name: entry.name,
            },
            update: {
              ingredient_id: targetIngredient.id,
            },
          });
          merged++;
        } catch (e: any) {
          // Silent fail on constraint
        }
      } else {
        // Check if ingredient exists (case-insensitive)
        const existing = await prisma.ingredient.findFirst({
          where: {
            name: {
              equals: entry.name,
              mode: 'insensitive',
            },
          },
        });

        let ingredient;
        if (existing) {
          // Preserve USER ingredients
          if (existing.source === 'USER') {
            skipped++;
            continue;
          }
          
          // Update existing OFF ingredient
          ingredient = await prisma.ingredient.update({
            where: { id: existing.id },
            data: {
              name: entry.nameLower,  // Always store lowercase
              source: 'OFF',
              is_core: isCore,
            },
          });
          updated++;
        } else {
          // Create new ingredient
          try {
            ingredient = await prisma.ingredient.create({
              data: {
                name: entry.nameLower,  // Always store lowercase
                source: 'OFF',
                is_core: isCore,
              },
            });
            inserted++;
          } catch (e: any) {
            if (e.code === 'P2002') {
              // Unique constraint - race condition, skip
              skipped++;
              continue;
            }
            throw e;
          }
        }

        // Insert aliases
        for (const alias of entry.aliases) {
          const aliasLower = alias.toLowerCase();
          if (aliasLower === entry.nameLower) continue;
          
          try {
            await prisma.ingredient_alias.upsert({
              where: { name: aliasLower },
              create: {
                ingredient_id: ingredient.id,
                name: aliasLower,  // Always store lowercase
              },
              update: {
                ingredient_id: ingredient.id,
              },
            });
            aliasesInserted++;
          } catch (err: any) {
            // Silent fail on constraint
          }
        }
      }
    } catch (err: any) {
      console.error(`   ❌ Error processing "${entry.name}": ${err.message}`);
      skipped++;
    }
    
    // Progress indicator
    if ((i + 1) % 100 === 0) {
      console.log(`   ... processed ${i + 1}/${entries.length}`);
    }
  }

  // Count final stats
  const coreCount = await prisma.ingredient.count({
    where: { source: 'OFF', is_core: true },
  });
  const nonCoreCount = await prisma.ingredient.count({
    where: { source: 'OFF', is_core: false },
  });
  const userCount = await prisma.ingredient.count({
    where: { source: 'USER' },
  });
  const totalOff = coreCount + nonCoreCount;

  console.log('\n✅ Import complete!');
  console.log(`   📊 Stats:`);
  console.log(`      Total selected:    ${entries.length}`);
  console.log(`      Inserted:          ${inserted}`);
  console.log(`      Updated:           ${updated}`);
  console.log(`      Merged as aliases: ${merged}`);
  console.log(`      Aliases created:   ${aliasesInserted}`);
  console.log(`      Skipped (USER):    ${skipped}`);
  console.log(`\n   📈 Final Counts:`);
  console.log(`      Core (is_core=true):     ${coreCount}`);
  console.log(`      Non-core (is_core=false): ${nonCoreCount}`);
  console.log(`      Total OFF:                ${totalOff}`);
  console.log(`      USER ingredients:         ${userCount}`);
  console.log(`      Grand Total:              ${totalOff + userCount}`);
  
  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
