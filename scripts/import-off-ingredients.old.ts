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
  offId: string;
  canonicalName: string;
  aliases: string[];
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

function canonicalize(text: string): string {
  return normalizeText(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+&\s+/g, ' and ')
    .replace(/\s+/g, ' ')
    .trim();
}

function createSlug(text: string): string {
  return canonicalize(text).replace(/\s+/g, '-');
}

function stripVariantSuffix(name: string): string {
  const words = name.split(' ');
  if (words.length > 1) {
    const lastWord = words[words.length - 1];
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
// en:vegetables:root-vegetables:carrots = depth 3
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
  const entries: IngredientEntry[] = [];
  let currentOffId: string | null = null;
  let currentCanonical: string | null = null;
  let currentAliases: Set<string> = new Set();
  let currentDepth = 0;

  const flushEntry = () => {
    if (currentOffId && currentCanonical) {
      if (currentDepth <= 2 && !shouldExclude(currentCanonical)) {
        const canonical = canonicalize(currentCanonical);
        const score = scoreIngredient(canonical);
        
        entries.push({
          offId: currentOffId,
          canonicalName: canonical,
          aliases: Array.from(currentAliases),
          depth: currentDepth,
          score,
        });
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
          currentAliases.add(canonicalize(s));
        }
      });
    }
  }
  
  flushEntry();
  
  // Sort by score descending and limit to MAX_INGREDIENTS
  entries.sort((a, b) => b.score - a.score);
  return entries.slice(0, MAX_INGREDIENTS);
}

// Handle case-insensitive duplicates by merging into aliases
async function handleDuplicates() {
  console.log('🔍 Checking for case-insensitive duplicates...');
  
  // Find ingredients with same lowercase canonical_name
  const allIngredients = await prisma.ingredient.findMany({
    where: { source: 'OFF' },
    select: { id: true, canonical_name: true },
  });
  
  const groups = new Map<string, typeof allIngredients>();
  for (const ing of allIngredients) {
    const lower = ing.canonical_name.toLowerCase();
    if (!groups.has(lower)) {
      groups.set(lower, []);
    }
    groups.get(lower)!.push(ing);
  }
  
  let mergedCount = 0;
  for (const [, group] of groups) {
    if (group.length <= 1) continue;
    
    // Keep first one, convert others to aliases
    const [canonical, ...duplicates] = group;
    
    for (const dup of duplicates) {
      try {
        // Create alias pointing to canonical
        await prisma.ingredient_alias.create({
          data: {
            ingredient_id: canonical.id,
            name: dup.canonical_name,
          },
        });
        
        // Update foreign key references to point to canonical
        await prisma.$executeRaw`
          UPDATE recipe_ingredient SET ingredient_id = ${canonical.id} WHERE ingredient_id = ${dup.id}
        `;
        await prisma.$executeRaw`
          UPDATE shopping_list_item SET ingredient_id = ${canonical.id} WHERE ingredient_id = ${dup.id}
        `;
        
        // Delete the duplicate
        await prisma.ingredient.delete({ where: { id: dup.id } });
        mergedCount++;
      } catch (err: any) {
        console.warn(`   ⚠️  Could not merge duplicate "${dup.canonical_name}": ${err.message}`);
      }
    }
  }
  
  if (mergedCount > 0) {
    console.log(`   Merged ${mergedCount} duplicate ingredients into aliases`);
  }
}

async function main() {
  console.log('📥 Downloading OFF ingredients taxonomy...');
  const content = await downloadFile(OFF_TAXONOMY_URL);
  
  console.log('📄 Parsing taxonomy with filters...');
  console.log(`   MAX_INGREDIENTS: ${MAX_INGREDIENTS}`);
  console.log(`   CORE_TARGET: ${CORE_TARGET}`);
  console.log(`   Depth limit: <= 2`);
  const entries = parseIngredientsTaxonomy(content);
  console.log(`   Selected ${entries.length} ingredients after filtering and scoring`);

  let inserted = 0;
  let updated = 0;
  let aliasesInserted = 0;
  let merged = 0;
  let skipped = 0;

  console.log('💾 Upserting ingredients...');
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const isCore = i < CORE_TARGET; // Top CORE_TARGET are core
    
    try {
      const slug = createSlug(entry.canonicalName);
      const baseCanonical = stripVariantSuffix(entry.canonicalName);
      
      // Check if base exists (for variant merging)
      let targetIngredient = null;
      if (baseCanonical !== entry.canonicalName) {
        targetIngredient = await prisma.ingredient.findFirst({
          where: { canonical_name: baseCanonical },
        });
      }
      
      if (targetIngredient) {
        // Merge as alias
        try {
          await prisma.ingredient_alias.create({
            data: {
              ingredient_id: targetIngredient.id,
              name: entry.canonicalName,
            },
          });
          merged++;
        } catch (e: any) {
          if (!e.message?.includes('Unique constraint')) {
            console.warn(`   ⚠️  Failed to merge "${entry.canonicalName}": ${e.message}`);
          }
        }
      } else {
        const existing = await prisma.ingredient.findFirst({
          where: {
            OR: [
              { off_id: entry.offId },
              { canonical_name: entry.canonicalName },
            ],
          },
        });

        let ingredient;
        if (existing) {
          // Update existing, preserve if USER source
          if (existing.source === 'USER') {
            skipped++;
            continue;
          }
          
          ingredient = await prisma.ingredient.update({
            where: { id: existing.id },
            data: {
              off_id: entry.offId,
              canonical_name: entry.canonicalName,
              name: entry.canonicalName,
              slug,
              source: 'OFF',
              is_core: isCore,
            },
          });
          updated++;
        } else {
          ingredient = await prisma.ingredient.create({
            data: {
              off_id: entry.offId,
              canonical_name: entry.canonicalName,
              name: entry.canonicalName,
              slug,
              source: 'OFF',
              is_core: isCore,
            },
          });
          inserted++;
        }

        for (const alias of entry.aliases) {
          if (alias === entry.canonicalName) continue;
          
          try {
            await prisma.ingredient_alias.create({
              data: {
                ingredient_id: ingredient.id,
                name: alias,
              },
            });
            aliasesInserted++;
          } catch (err: any) {
            if (!err.message?.includes('Unique constraint')) {
              console.warn(`   ⚠️  Failed to insert alias "${alias}": ${err.message}`);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.message?.includes('Unique constraint')) {
        skipped++;
      } else {
        console.error(`   ❌ Error processing "${entry.canonicalName}": ${err.message}`);
        skipped++;
      }
    }
  }

  // Handle case-insensitive duplicates
  await handleDuplicates();

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
  console.error('❌ Import failed:', err);
  process.exit(1);
});
