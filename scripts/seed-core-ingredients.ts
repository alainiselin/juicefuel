import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type Unit = 'G' | 'KG' | 'ML' | 'L' | 'TBSP' | 'TSP' | 'CUP' | 'PIECE' | 'PACKAGE';

interface CoreIngredient {
  name: string;
  default_unit?: Unit;
  aisle: string;
  aliases?: string[];
}

const byAisle = (aisle: string, default_unit: Unit, names: string[]): CoreIngredient[] =>
  names.map((name) => ({ name, default_unit, aisle }));

// Curated MVP set: broad enough for recipe creation and shopping search without importing a huge taxonomy.
const CORE_INGREDIENTS: CoreIngredient[] = [
  ...byAisle('fruits-vegetables', 'PIECE', [
    'tomato', 'cherry tomato', 'onion', 'red onion', 'yellow onion', 'shallot', 'garlic',
    'potato', 'sweet potato', 'carrot', 'celery', 'bell pepper', 'red bell pepper',
    'cucumber', 'lettuce', 'romaine lettuce', 'spinach', 'arugula', 'broccoli',
    'cauliflower', 'zucchini', 'eggplant', 'mushroom', 'corn', 'peas', 'green beans',
    'cabbage', 'red cabbage', 'kale', 'asparagus', 'leek', 'spring onion', 'ginger',
    'jalapeno', 'poblano pepper', 'avocado', 'apple', 'banana', 'orange', 'lemon',
    'lime', 'strawberry', 'blueberry', 'raspberry', 'grape', 'pineapple', 'mango',
    'peach', 'pear', 'kiwi', 'melon',
  ]),
  ...byAisle('fruits-vegetables', 'PIECE', [
    'beetroot', 'radish', 'daikon', 'fennel', 'parsnip', 'turnip', 'rutabaga',
    'butternut squash', 'pumpkin', 'acorn squash', 'bok choy', 'pak choi',
    'brussels sprouts', 'artichoke', 'okra', 'snap peas', 'snow peas', 'edamame',
    'watercress', 'endive', 'radicchio', 'chard', 'collard greens', 'mustard greens',
    'microgreens', 'bean sprouts', 'alfalfa sprouts', 'red chili', 'green chili',
    'serrano pepper', 'habanero pepper', 'fresno chili', 'plantain', 'fig', 'date',
    'apricot', 'nectarine', 'pomegranate', 'grapefruit', 'tangerine', 'clementine',
    'blood orange', 'passion fruit', 'papaya', 'guava', 'lychee', 'coconut',
    'cranberry', 'blackberry', 'currants', 'rhubarb',
  ]),
  ...byAisle('ingredients-spices', 'G', [
    'basil', 'oregano', 'thyme', 'rosemary', 'parsley', 'cilantro', 'dill', 'mint',
    'sage', 'bay leaf', 'salt', 'black pepper', 'white pepper', 'paprika',
    'smoked paprika', 'cumin', 'coriander', 'cinnamon', 'nutmeg', 'turmeric',
    'chili powder', 'cayenne pepper', 'curry powder', 'garam masala', 'cloves',
    'cardamom', 'red pepper flakes', 'sesame seeds', 'sunflower seeds', 'pumpkin seeds',
    'chia seeds', 'flax seeds', 'breadcrumbs', 'panko', 'cornstarch', 'gelatin',
    'pectin', 'yeast', 'baking powder', 'baking soda', 'cocoa powder',
  ]),
  ...byAisle('ingredients-spices', 'G', [
    'sea salt', 'kosher salt', 'garlic powder', 'onion powder', 'mustard powder',
    'fennel seeds', 'caraway seeds', 'celery seeds', 'poppy seeds', 'nigella seeds',
    'star anise', 'allspice', 'juniper berries', 'saffron', 'sumac', 'zaatar',
    'italian seasoning', 'herbes de provence', 'five spice powder', 'ras el hanout',
    'berbere', 'chipotle powder', 'ancho chili powder', 'dried oregano',
    'dried basil', 'dried thyme', 'dried rosemary', 'fresh basil', 'fresh parsley',
    'fresh cilantro', 'fresh dill', 'fresh mint', 'fresh rosemary', 'fresh thyme',
    'nori', 'wakame', 'kombu', 'nutritional yeast', 'citric acid', 'cream of tartar',
  ]),
  ...byAisle('ingredients-spices', 'ML', [
    'olive oil', 'vegetable oil', 'canola oil', 'coconut oil', 'sesame oil',
    'peanut oil', 'sunflower oil', 'vinegar', 'balsamic vinegar', 'rice vinegar',
    'soy sauce', 'fish sauce', 'worcestershire sauce', 'hot sauce', 'sriracha',
    'vanilla extract', 'lime juice',
  ]),
  ...byAisle('ingredients-spices', 'ML', [
    'extra virgin olive oil', 'avocado oil', 'grapeseed oil', 'walnut oil',
    'white vinegar', 'apple cider vinegar', 'red wine vinegar', 'white wine vinegar',
    'sherry vinegar', 'mirin', 'sake', 'teriyaki sauce', 'tamari', 'coconut aminos',
    'maggi seasoning', 'liquid smoke', 'rose water', 'orange blossom water',
  ]),
  ...byAisle('ingredients-spices', 'TBSP', [
    'tomato paste', 'miso paste', 'tahini', 'hoisin sauce', 'oyster sauce',
    'gochujang', 'curry paste', 'pesto', 'mustard', 'mayonnaise', 'ketchup',
    'salsa', 'hummus',
  ]),
  ...byAisle('ingredients-spices', 'TBSP', [
    'dijon mustard', 'whole grain mustard', 'harissa', 'red curry paste',
    'green curry paste', 'yellow curry paste', 'black bean sauce', 'chili crisp',
    'sambal oelek', 'marmite', 'vegemite', 'mango chutney', 'tamarind paste',
    'apple sauce', 'cranberry sauce', 'bbq sauce', 'ranch dressing',
    'italian dressing', 'vinaigrette', 'mole paste',
  ]),
  ...byAisle('milk-cheese', 'ML', ['milk', 'cream', 'heavy cream', 'sour cream', 'yogurt']),
  ...byAisle('milk-cheese', 'ML', [
    'buttermilk', 'evaporated milk', 'condensed milk', 'oat milk', 'almond milk',
    'soy milk', 'coconut cream', 'creme fraiche',
  ]),
  ...byAisle('milk-cheese', 'G', [
    'butter', 'cheese', 'cheddar cheese', 'parmesan cheese', 'mozzarella cheese',
    'feta cheese', 'goat cheese', 'cream cheese', 'ricotta', 'cottage cheese',
  ]),
  ...byAisle('milk-cheese', 'G', [
    'mascarpone', 'halloumi', 'paneer', 'gruyere', 'swiss cheese', 'brie',
    'camembert', 'gouda', 'pecorino', 'manchego', 'blue cheese', 'provolone',
    'monterey jack cheese', 'queso fresco', 'vegan cheese', 'ghee',
  ]),
  ...byAisle('meat-fish', 'G', [
    'chicken', 'chicken breast', 'chicken thigh', 'ground beef', 'beef', 'steak',
    'pork', 'pork chop', 'lamb', 'turkey', 'ground turkey', 'bacon', 'sausage',
    'ham', 'salmon', 'tuna', 'cod', 'shrimp', 'crab', 'mussels', 'clams',
    'scallops', 'sardines', 'anchovies',
  ]),
  ...byAisle('meat-fish', 'G', [
    'chicken wings', 'chicken drumsticks', 'whole chicken', 'duck breast', 'duck',
    'beef chuck', 'beef brisket', 'short ribs', 'ground pork', 'pork belly',
    'pork shoulder', 'prosciutto', 'salami', 'chorizo', 'pepperoni', 'meatballs',
    'veal', 'venison', 'tilapia', 'halibut', 'trout', 'sea bass', 'haddock',
    'pollock', 'mackerel', 'squid', 'octopus', 'smoked salmon', 'white fish',
  ]),
  ...byAisle('meat-fish', 'PIECE', ['egg']),
  ...byAisle('grain-products', 'G', [
    'flour', 'all-purpose flour', 'bread flour', 'rice', 'brown rice', 'pasta',
    'spaghetti', 'penne', 'noodles', 'ramen noodles', 'oats', 'quinoa', 'couscous',
    'barley', 'cornmeal', 'polenta', 'bulgur', 'black beans', 'kidney beans',
    'chickpeas', 'lentils', 'pinto beans', 'split peas',
  ]),
  ...byAisle('grain-products', 'G', [
    'whole wheat flour', 'rye flour', 'semolina', 'corn flour', 'rice flour',
    'almond flour', 'coconut flour', 'basmati rice', 'jasmine rice', 'sushi rice',
    'wild rice', 'arborio rice', 'risotto rice', 'orzo', 'fusilli', 'rigatoni',
    'tagliatelle', 'fettuccine', 'lasagna sheets', 'rice noodles', 'udon noodles',
    'soba noodles', 'egg noodles', 'glass noodles', 'farro', 'millet', 'buckwheat',
    'couscous pearls', 'white beans', 'cannellini beans', 'borlotti beans',
    'mung beans', 'red lentils', 'green lentils', 'brown lentils',
  ]),
  ...byAisle('bread-pastries', 'PIECE', [
    'bread', 'baguette', 'toast bread', 'tortilla', 'pita bread', 'naan',
    'burger bun', 'breadcrumbs',
  ]),
  ...byAisle('bread-pastries', 'PIECE', [
    'sourdough bread', 'whole wheat bread', 'rye bread', 'ciabatta', 'focaccia',
    'english muffin', 'bagel', 'brioche', 'hot dog bun', 'wrap', 'corn tortilla',
    'flour tortilla', 'lavash', 'crackers', 'puff pastry', 'phyllo dough',
  ]),
  ...byAisle('snacks-sweets', 'G', [
    'sugar', 'brown sugar', 'powdered sugar', 'chocolate', 'dark chocolate',
    'almonds', 'walnuts', 'pecans', 'cashews', 'peanuts', 'pistachios',
  ]),
  ...byAisle('snacks-sweets', 'G', [
    'white chocolate', 'milk chocolate', 'chocolate chips', 'coconut flakes',
    'raisins', 'dried cranberries', 'dried apricots', 'prunes', 'hazelnuts',
    'macadamia nuts', 'pine nuts', 'brazil nuts', 'nut butter', 'peanut butter',
    'almond butter', 'jam', 'marmalade', 'marshmallows',
  ]),
  ...byAisle('snacks-sweets', 'ML', ['honey', 'maple syrup']),
  ...byAisle('frozen-convenience', 'G', [
    'frozen peas', 'frozen corn', 'frozen spinach', 'frozen berries',
  ]),
  ...byAisle('frozen-convenience', 'G', [
    'frozen broccoli', 'frozen cauliflower', 'frozen green beans', 'frozen edamame',
    'frozen mango', 'frozen shrimp', 'frozen fish fillets', 'frozen puff pastry',
    'frozen pizza dough', 'frozen dumplings',
  ]),
  ...byAisle('frozen-convenience', 'PACKAGE', ['ice cream']),
  ...byAisle('ingredients-spices', 'ML', [
    'chicken broth', 'beef broth', 'vegetable broth', 'coconut milk', 'tomato sauce',
    'tomato puree', 'diced tomatoes',
  ]),
  ...byAisle('ingredients-spices', 'ML', [
    'fish stock', 'bone broth', 'passata', 'crushed tomatoes', 'whole peeled tomatoes',
  ]),
  ...byAisle('ingredients-spices', 'G', [
    'olives', 'green olives', 'black olives', 'kalamata olives', 'pickles',
    'gherkins', 'capers', 'sun-dried tomatoes', 'roasted red peppers',
    'artichoke hearts', 'canned corn', 'canned beans', 'canned chickpeas',
    'canned tuna', 'canned salmon',
  ]),
  ...byAisle('beverages', 'ML', ['wine', 'white wine', 'red wine', 'beer', 'coffee', 'tea']),
  ...byAisle('beverages', 'ML', [
    'sparkling water', 'orange juice', 'apple juice', 'vegetable juice',
    'coconut water', 'espresso', 'green tea', 'black tea',
  ]),
  ...byAisle('ingredients-spices', 'G', [
    'tofu', 'firm tofu', 'silken tofu', 'tempeh', 'seitan', 'textured vegetable protein',
    'soy curls', 'vegan mince',
  ]),
  { name: 'caesar dressing', default_unit: 'TBSP', aisle: 'ingredients-spices', aliases: ['caesar salad dressing'] },
  { name: 'breadcrumbs', default_unit: 'G', aisle: 'bread-pastries', aliases: ['bread crumbs'] },
];

async function main() {
  const dedupedIngredients = Array.from(
    new Map(CORE_INGREDIENTS.map((ingredient) => [ingredient.name, ingredient])).values()
  );

  console.log('🌱 Seeding core ingredients...');
  console.log(`   Target: ${dedupedIngredients.length} core ingredients`);
  
  let inserted = 0;
  let updated = 0;
  let aliasesUpserted = 0;
  
  for (const ingredientSeed of dedupedIngredients) {
    try {
      const existing = await prisma.ingredient.findUnique({
        where: { name: ingredientSeed.name },
      });
      
      let ingredientId: string;

      if (existing) {
        const updatedIngredient = await prisma.ingredient.update({
          where: { id: existing.id },
          data: {
            default_unit: ingredientSeed.default_unit as any,
            aisle: ingredientSeed.aisle,
            is_core: true,
            is_recipe_eligible: true,
            source: existing.source === 'USER' ? existing.source : 'OFF',
          },
        });
        ingredientId = updatedIngredient.id;
        updated++;
      } else {
        const created = await prisma.ingredient.create({
          data: {
            name: ingredientSeed.name,
            default_unit: ingredientSeed.default_unit as any,
            aisle: ingredientSeed.aisle,
            source: 'OFF',
            is_core: true,
            is_recipe_eligible: true,
          },
        });
        ingredientId = created.id;
        inserted++;
      }

      for (const alias of ingredientSeed.aliases ?? []) {
        if (alias === ingredientSeed.name) continue;

        try {
          await prisma.ingredient_alias.upsert({
            where: { name: alias },
            update: { ingredient_id: ingredientId },
            create: {
              ingredient_id: ingredientId,
              name: alias,
            },
          });
          aliasesUpserted++;
        } catch (err: any) {
          console.warn(`   ⚠️  Failed to upsert alias "${alias}": ${err.message}`);
        }
      }
    } catch (err: any) {
      console.warn(`   ⚠️  Failed to seed "${ingredientSeed.name}": ${err.message}`);
    }
  }
  
  const totalCore = await prisma.ingredient.count({
    where: { is_core: true },
  });
  
  const totalAll = await prisma.ingredient.count();
  
  console.log('\n✅ Seed complete!');
  console.log(`   📊 Stats:`);
  console.log(`      Target ingredients: ${dedupedIngredients.length}`);
  console.log(`      Inserted:           ${inserted}`);
  console.log(`      Updated:            ${updated}`);
  console.log(`      Aliases upserted:   ${aliasesUpserted}`);
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
