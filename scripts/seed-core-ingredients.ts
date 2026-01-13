import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Curated list of common ingredients (core set)
const CORE_INGREDIENTS = [
  // Vegetables
  'tomato', 'onion', 'garlic', 'potato', 'carrot', 'celery', 'bell pepper',
  'cucumber', 'lettuce', 'spinach', 'broccoli', 'cauliflower', 'zucchini',
  'eggplant', 'mushroom', 'corn', 'peas', 'green beans', 'cabbage', 'kale',
  
  // Fruits
  'apple', 'banana', 'orange', 'lemon', 'lime', 'strawberry', 'blueberry',
  'raspberry', 'grape', 'watermelon', 'pineapple', 'mango', 'avocado',
  'peach', 'pear', 'cherry', 'plum', 'kiwi', 'melon',
  
  // Herbs & Spices
  'basil', 'oregano', 'thyme', 'rosemary', 'parsley', 'cilantro', 'dill',
  'mint', 'sage', 'bay leaf', 'salt', 'black pepper', 'paprika', 'cumin',
  'coriander', 'cinnamon', 'nutmeg', 'ginger', 'turmeric', 'chili powder',
  'cayenne pepper', 'curry powder', 'vanilla', 'cloves', 'cardamom',
  
  // Dairy
  'milk', 'butter', 'cream', 'cheese', 'cheddar cheese', 'parmesan cheese',
  'mozzarella cheese', 'yogurt', 'sour cream', 'cream cheese',
  
  // Meat & Protein
  'chicken', 'beef', 'pork', 'lamb', 'turkey', 'bacon', 'sausage', 'ham',
  'egg', 'tofu', 'tempeh',
  
  // Fish & Seafood
  'salmon', 'tuna', 'cod', 'shrimp', 'crab', 'lobster', 'mussels', 'clams',
  'scallops', 'sardines', 'anchovies',
  
  // Grains & Pasta
  'flour', 'bread', 'rice', 'pasta', 'spaghetti', 'noodles', 'oats', 'quinoa',
  'couscous', 'barley', 'wheat', 'cornmeal',
  
  // Legumes
  'black beans', 'kidney beans', 'chickpeas', 'lentils', 'pinto beans',
  'navy beans', 'lima beans', 'split peas',
  
  // Nuts & Seeds
  'almonds', 'walnuts', 'pecans', 'cashews', 'peanuts', 'pistachios',
  'sunflower seeds', 'pumpkin seeds', 'sesame seeds', 'chia seeds', 'flax seeds',
  
  // Oils & Fats
  'olive oil', 'vegetable oil', 'canola oil', 'coconut oil', 'sesame oil',
  'peanut oil', 'sunflower oil',
  
  // Condiments & Sauces
  'soy sauce', 'vinegar', 'balsamic vinegar', 'ketchup', 'mustard',
  'mayonnaise', 'hot sauce', 'worcestershire sauce', 'fish sauce',
  'tomato paste', 'tomato sauce',
  
  // Baking
  'sugar', 'brown sugar', 'honey', 'maple syrup', 'baking powder',
  'baking soda', 'yeast', 'cocoa powder', 'chocolate', 'vanilla extract',
  
  // Canned/Jarred
  'diced tomatoes', 'tomato puree', 'coconut milk', 'chicken broth',
  'beef broth', 'vegetable broth', 'olives', 'pickles', 'capers',
  
  // Frozen
  'frozen peas', 'frozen corn', 'frozen spinach', 'frozen berries',
  'ice cream',
  
  // Beverages (cooking)
  'wine', 'white wine', 'red wine', 'beer', 'coffee', 'tea',
  
  // Asian
  'rice vinegar', 'mirin', 'sake', 'miso paste', 'tahini', 'hoisin sauce',
  'oyster sauce', 'sriracha', 'gochujang', 'curry paste',
  
  // Mediterranean  
  'feta cheese', 'goat cheese', 'sun-dried tomatoes', 'pesto', 'hummus',
  
  // Mexican/Latin
  'tortilla', 'salsa', 'jalapeno', 'poblano pepper', 'chipotle', 'lime juice',
  'black pepper', 'white pepper', 'red pepper flakes',
  
  // Common additions
  'breadcrumbs', 'panko', 'cornstarch', 'gelatin', 'pectin',
];

function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

async function main() {
  console.log('🌱 Seeding core ingredients...');
  console.log(`   Target: ${CORE_INGREDIENTS.length} core ingredients`);
  
  let inserted = 0;
  let skipped = 0;
  
  for (const name of CORE_INGREDIENTS) {
    try {
      const existing = await prisma.ingredient.findUnique({
        where: { name },
      });
      
      if (existing) {
        // Update to mark as core if it's OFF source
        if (existing.source === 'OFF' || existing.source === null) {
          await prisma.ingredient.update({
            where: { id: existing.id },
            data: { is_core: true, source: 'OFF' },
          });
        }
        skipped++;
      } else {
        await prisma.ingredient.create({
          data: {
            name,
            source: 'OFF',
            is_core: true,
          },
        });
        inserted++;
      }
    } catch (err: any) {
      console.warn(`   ⚠️  Failed to insert "${name}": ${err.message}`);
    }
  }
  
  const totalCore = await prisma.ingredient.count({
    where: { is_core: true },
  });
  
  const totalAll = await prisma.ingredient.count();
  
  console.log('\n✅ Seed complete!');
  console.log(`   📊 Stats:`);
  console.log(`      Target ingredients: ${CORE_INGREDIENTS.length}`);
  console.log(`      Inserted:           ${inserted}`);
  console.log(`      Skipped:            ${skipped}`);
  console.log(`\n   📈 Final Counts:`);
  console.log(`      Core ingredients:   ${totalCore}`);
  console.log(`      Total ingredients:  ${totalAll}`);
  
  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
