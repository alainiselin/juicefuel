import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Fixed aisle enum - matches Shopping List rubric order
const AISLES = [
  { slug: 'fruits-vegetables', name: 'Fruits & Vegetables' },
  { slug: 'bread-pastries', name: 'Bread & Pastries' },
  { slug: 'milk-cheese', name: 'Milk & Cheese' },
  { slug: 'meat-fish', name: 'Meat & Fish' },
  { slug: 'ingredients-spices', name: 'Ingredients & Spices' },
  { slug: 'grain-products', name: 'Grain Products' },
  { slug: 'frozen-convenience', name: 'Frozen & Convenience' },
  { slug: 'snacks-sweets', name: 'Snacks & Sweets' },
  { slug: 'beverages', name: 'Beverages' },
  { slug: 'household', name: 'Household' },
  { slug: 'care-health', name: 'Care & Health' },
  { slug: 'pet-supplies', name: 'Pet Supplies' },
  { slug: 'home-garden', name: 'Home & Garden' },
  { slug: 'own-items', name: 'Own Items' },
];

// Keyword-based aisle assignment rules
const AISLE_RULES = [
  {
    aisle: 'fruits-vegetables',
    keywords: ['tomato', 'onion', 'garlic', 'potato', 'carrot', 'celery', 'pepper', 'cucumber', 
               'lettuce', 'spinach', 'broccoli', 'cauliflower', 'zucchini', 'eggplant', 'mushroom',
               'corn', 'pea', 'bean', 'cabbage', 'kale', 'apple', 'banana', 'orange', 'lemon',
               'lime', 'strawberry', 'blueberry', 'raspberry', 'grape', 'watermelon', 'pineapple',
               'mango', 'avocado', 'peach', 'pear', 'cherry', 'plum', 'kiwi', 'melon', 'vegetable',
               'fruit', 'salad', 'greens', 'squash', 'turnip', 'beet', 'radish', 'asparagus'],
  },
  {
    aisle: 'bread-pastries',
    keywords: ['bread', 'roll', 'baguette', 'croissant', 'bagel', 'muffin', 'pastry', 'bun',
               'toast', 'tortilla', 'pita', 'naan', 'cracker', 'pretzel'],
  },
  {
    aisle: 'milk-cheese',
    keywords: ['milk', 'cheese', 'cheddar', 'parmesan', 'mozzarella', 'yogurt', 'cream', 'butter',
               'sour cream', 'cream cheese', 'feta', 'goat cheese', 'dairy', 'whey', 'cottage cheese',
               'ricotta', 'blue cheese', 'brie', 'swiss', 'provolone'],
  },
  {
    aisle: 'meat-fish',
    keywords: ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'bacon', 'sausage', 'ham', 'meat',
               'salmon', 'tuna', 'cod', 'shrimp', 'crab', 'lobster', 'mussel', 'clam', 'scallop',
               'sardine', 'anchov', 'fish', 'seafood', 'duck', 'veal', 'venison', 'steak', 'ground',
               'fillet', 'breast', 'thigh', 'wing'],
  },
  {
    aisle: 'ingredients-spices',
    keywords: ['basil', 'oregano', 'thyme', 'rosemary', 'parsley', 'cilantro', 'dill', 'mint',
               'sage', 'bay leaf', 'salt', 'pepper', 'paprika', 'cumin', 'coriander', 'cinnamon',
               'nutmeg', 'ginger', 'turmeric', 'chili', 'cayenne', 'curry', 'vanilla', 'clove',
               'cardamom', 'herb', 'spice', 'seasoning', 'extract', 'vinegar', 'soy sauce', 'sauce',
               'ketchup', 'mustard', 'mayonnaise', 'hot sauce', 'worcestershire', 'fish sauce',
               'paste', 'oil', 'olive oil', 'vegetable oil', 'canola', 'sesame oil', 'coconut oil',
               'condiment', 'dressing', 'marinade', 'stock', 'broth', 'bouillon'],
  },
  {
    aisle: 'grain-products',
    keywords: ['rice', 'pasta', 'spaghetti', 'noodle', 'oat', 'quinoa', 'couscous', 'barley',
               'wheat', 'flour', 'cornmeal', 'cereal', 'grain', 'macaroni', 'penne', 'fusilli',
               'ramen', 'vermicelli', 'farro', 'bulgur', 'polenta'],
  },
  {
    aisle: 'frozen-convenience',
    keywords: ['frozen', 'ice cream', 'sorbet', 'gelato', 'pizza', 'dinner', 'meal', 'ready'],
  },
  {
    aisle: 'snacks-sweets',
    keywords: ['chocolate', 'candy', 'cookie', 'chip', 'snack', 'popcorn', 'pretzel', 'nut',
               'almond', 'walnut', 'pecan', 'cashew', 'peanut', 'pistachio', 'sweet', 'dessert',
               'cake', 'brownie', 'sugar', 'honey', 'syrup', 'jam', 'jelly', 'spread'],
  },
  {
    aisle: 'beverages',
    keywords: ['wine', 'beer', 'coffee', 'tea', 'juice', 'soda', 'water', 'milk', 'drink',
               'beverage', 'ale', 'lager', 'spirit', 'liquor', 'cocktail'],
  },
];

function inferAisle(ingredientName: string): string {
  const lower = ingredientName.toLowerCase();
  
  for (const rule of AISLE_RULES) {
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword)) {
        return rule.aisle;
      }
    }
  }
  
  return 'own-items'; // Fallback
}

async function main() {
  console.log('🏷️  Setting up AISLE tags...\n');
  
  // Step 1: Create AISLE tags (idempotent)
  console.log('1️⃣  Creating AISLE tags...');
  let aisleTagsCreated = 0;
  let aisleTagsExisted = 0;
  
  const aisleTagMap = new Map<string, string>(); // slug -> tag_id
  
  for (const aisle of AISLES) {
    try {
      const existing = await prisma.tag.findUnique({
        where: { slug: aisle.slug },
      });
      
      if (existing) {
        // Update to ensure kind is AISLE
        await prisma.tag.update({
          where: { id: existing.id },
          data: { kind: 'AISLE', name: aisle.name },
        });
        aisleTagMap.set(aisle.slug, existing.id);
        aisleTagsExisted++;
      } else {
        const created = await prisma.tag.create({
          data: {
            name: aisle.name,
            slug: aisle.slug,
            kind: 'AISLE',
            scope: 'GLOBAL',
          },
        });
        aisleTagMap.set(aisle.slug, created.id);
        aisleTagsCreated++;
      }
    } catch (err: any) {
      console.error(`   ❌ Failed to create tag "${aisle.slug}": ${err.message}`);
    }
  }
  
  console.log(`   Created: ${aisleTagsCreated}`);
  console.log(`   Existed: ${aisleTagsExisted}`);
  
  // Step 2: Fetch all ingredients
  console.log('\n2️⃣  Fetching ingredients...');
  const ingredients = await prisma.ingredient.findMany({
    include: {
      ingredient_tag: {
        include: {
          tag: true,
        },
      },
    },
  });
  console.log(`   Found: ${ingredients.length} ingredients`);
  
  // Step 3: Auto-assign AISLE tags
  console.log('\n3️⃣  Auto-assigning AISLE tags...');
  let assigned = 0;
  let skipped = 0;
  let updated = 0;
  let removed = 0;
  
  for (const ingredient of ingredients) {
    try {
      // Check if ingredient already has AISLE tag(s)
      const existingAisleTags = ingredient.ingredient_tag.filter(
        it => it.tag.kind === 'AISLE'
      );
      
      // Prefer curated aisle metadata from the seed; infer only for legacy/imported rows.
      const inferredAisle = ingredient.aisle && aisleTagMap.has(ingredient.aisle)
        ? ingredient.aisle
        : inferAisle(ingredient.name);
      const targetTagId = aisleTagMap.get(inferredAisle);
      
      if (!targetTagId) {
        console.warn(`   ⚠️  No tag ID for aisle "${inferredAisle}"`);
        continue;
      }

      if (ingredient.aisle !== inferredAisle) {
        await prisma.ingredient.update({
          where: { id: ingredient.id },
          data: { aisle: inferredAisle },
        });
      }
      
      // If ingredient already has the correct AISLE tag, skip
      if (existingAisleTags.length === 1 && existingAisleTags[0].tag_id === targetTagId) {
        skipped++;
        continue;
      }
      
      // Remove all existing AISLE tags (clean slate)
      if (existingAisleTags.length > 0) {
        for (const aisleTag of existingAisleTags) {
          await prisma.ingredient_tag.delete({
            where: {
              ingredient_id_tag_id: {
                ingredient_id: ingredient.id,
                tag_id: aisleTag.tag_id,
              },
            },
          });
          removed++;
        }
      }
      
      // Assign the correct AISLE tag
      await prisma.ingredient_tag.create({
        data: {
          ingredient_id: ingredient.id,
          tag_id: targetTagId,
        },
      });
      
      if (existingAisleTags.length > 0) {
        updated++;
      } else {
        assigned++;
      }
    } catch (err: any) {
      if (!err.message?.includes('Unique constraint')) {
        console.error(`   ❌ Failed to tag "${ingredient.name}": ${err.message}`);
      }
    }
  }
  
  console.log(`   Newly assigned:   ${assigned}`);
  console.log(`   Updated:          ${updated}`);
  console.log(`   Already correct:  ${skipped}`);
  console.log(`   Duplicate removed: ${removed}`);
  
  // Step 4: Final stats
  console.log('\n4️⃣  Final statistics...');
  
  const byAisle = await prisma.$queryRaw<Array<{ aisle_slug: string; count: bigint }>>`
    SELECT t.slug as aisle_slug, COUNT(*) as count
    FROM ingredient_tag it
    JOIN tag t ON t.id = it.tag_id
    WHERE t.kind = 'AISLE'
    GROUP BY t.slug
    ORDER BY COUNT(*) DESC
  `;
  
  console.log('\n   Ingredients by aisle:');
  for (const row of byAisle) {
    const count = Number(row.count);
    const aisleName = AISLES.find(a => a.slug === row.aisle_slug)?.name || row.aisle_slug;
    console.log(`      ${aisleName.padEnd(25)} ${count}`);
  }
  
  const untagged = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM ingredient i
    WHERE NOT EXISTS (
      SELECT 1 FROM ingredient_tag it
      JOIN tag t ON t.id = it.tag_id
      WHERE it.ingredient_id = i.id AND t.kind = 'AISLE'
    )
  `;
  
  console.log(`\n   Untagged ingredients:   ${Number(untagged[0].count)}`);
  
  console.log('\n✅ AISLE tag setup complete!');
  
  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error('❌ Setup failed:', err);
  process.exit(1);
});
