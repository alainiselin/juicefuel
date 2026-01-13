import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { hash } from 'bcrypt';

// Create Prisma client with adapter (matching server/utils/prisma.ts)
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

async function main() {
  console.log('🌱 Starting seed...');

  // Create 2 test users
  const user1 = await prisma.user_profile.upsert({
    where: { email: 'test@juicefuel.local' },
    update: {},
    create: {
      email: 'test@juicefuel.local',
      display_name: 'Test User',
      password_hash: await hashPassword('password123'),
    },
  });
  console.log('✅ Created user 1:', user1.email);

  const user2 = await prisma.user_profile.upsert({
    where: { email: 'second@juicefuel.local' },
    update: {},
    create: {
      email: 'second@juicefuel.local',
      display_name: 'Second User',
      password_hash: await hashPassword('password123'),
    },
  });
  console.log('✅ Created user 2:', user2.email);

  // Create household 1 for user 1
  const household1 = await prisma.household.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Test Household',
      members: {
        create: {
          user_id: user1.id,
          role: 'OWNER',
        },
      },
    },
  });
  console.log('✅ Created household 1:', household1.name);

  // Create household 2 for user 2
  const household2 = await prisma.household.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Second Household',
      members: {
        create: {
          user_id: user2.id,
          role: 'OWNER',
        },
      },
    },
  });
  console.log('✅ Created household 2:', household2.name);

  // Create recipe library for household 1
  const library1 = await prisma.recipe_library.upsert({
    where: { id: '908b1a20-9184-4156-9934-ea1448cd819e' },
    update: {},
    create: {
      id: '908b1a20-9184-4156-9934-ea1448cd819e',
      household_id: household1.id,
      name: "Test User's Recipes",
      is_public: false,
      created_by_user_id: user1.id,
    },
  });

  // Create recipe library for household 2
  const library2 = await prisma.recipe_library.upsert({
    where: { id: '908b1a20-9184-4156-9934-ea1448cd819f' },
    update: {},
    create: {
      id: '908b1a20-9184-4156-9934-ea1448cd819f',
      household_id: household2.id,
      name: "Second User's Recipes",
      is_public: false,
      created_by_user_id: user2.id,
    },
  });

  // Create a PUBLIC recipe library for household 1
  const publicLibrary = await prisma.recipe_library.upsert({
    where: { id: '908b1a20-9184-4156-9934-ea1448cd8190' },
    update: {},
    create: {
      id: '908b1a20-9184-4156-9934-ea1448cd8190',
      household_id: household1.id,
      name: "Community Recipes (Public)",
      is_public: true,
      created_by_user_id: user1.id,
    },
  });

  // Create ingredients
  const ingredients = [
    { name: 'flour', default_unit: 'G' as const },
    { name: 'sugar', default_unit: 'G' as const },
    { name: 'eggs', default_unit: 'PIECE' as const },
    { name: 'milk', default_unit: 'ML' as const },
    { name: 'butter', default_unit: 'G' as const },
    { name: 'olive oil', default_unit: 'ML' as const },
    { name: 'tomato', default_unit: 'PIECE' as const },
    { name: 'pasta', default_unit: 'G' as const },
    { name: 'chicken breast', default_unit: 'G' as const },
    { name: 'soy sauce', default_unit: 'TBSP' as const },
    { name: 'rice', default_unit: 'G' as const },
    { name: 'coconut milk', default_unit: 'ML' as const },
    { name: 'curry powder', default_unit: 'TBSP' as const },
    { name: 'onion', default_unit: 'PIECE' as const },
    { name: 'garlic', default_unit: 'PIECE' as const },
    { name: 'bell pepper', default_unit: 'PIECE' as const },
    { name: 'oats', default_unit: 'G' as const },
    { name: 'banana', default_unit: 'PIECE' as const },
    { name: 'honey', default_unit: 'TBSP' as const },
    { name: 'bread', default_unit: 'PIECE' as const },
    { name: 'cheese', default_unit: 'G' as const },
    { name: 'lettuce', default_unit: 'PIECE' as const },
    { name: 'cucumber', default_unit: 'PIECE' as const },
    { name: 'carrot', default_unit: 'PIECE' as const },
    { name: 'potato', default_unit: 'PIECE' as const },
  ];

  const createdIngredients = await Promise.all(
    ingredients.map((ing) =>
      prisma.ingredient.upsert({
        where: { name: ing.name },
        update: {},
        create: ing,
      })
    )
  );

  // Helper to create recipes
  async function upsertRecipe(data: {
    id: string;
    library_id: string;
    title: string;
    instructions: string;
    source_url?: string;
    ingredients: Array<{ name: string; quantity: number; unit: string; note?: string }>;
  }) {
    const recipe = await prisma.recipe.upsert({
      where: { id: data.id },
      update: {},
      create: {
        id: data.id,
        recipe_library_id: data.library_id,
        title: data.title,
        instructions_markdown: data.instructions,
        source_url: data.source_url,
      },
    });

    for (const ing of data.ingredients) {
      const ingredient = createdIngredients.find((i) => i.name === ing.name);
      if (ingredient) {
        await prisma.recipe_ingredient.upsert({
          where: {
            recipe_id_ingredient_id: {
              recipe_id: recipe.id,
              ingredient_id: ingredient.id,
            },
          },
          update: {},
          create: {
            recipe_id: recipe.id,
            ingredient_id: ingredient.id,
            quantity: ing.quantity,
            unit: ing.unit as any,
            note: ing.note,
          },
        });
      }
    }

    return recipe;
  }

  // Create recipes for user 1 (4 recipes)
  const recipe1 = await upsertRecipe({
    id: 'c6016b2d-f7e7-4656-a1b9-45cd34ee47ed',
    library_id: library1.id,
    title: 'Simple Pancakes',
    instructions: '1. Mix dry ingredients\n2. Add wet ingredients\n3. Cook on griddle',
    ingredients: [
      { name: 'flour', quantity: 200, unit: 'G' },
      { name: 'sugar', quantity: 50, unit: 'G' },
      { name: 'eggs', quantity: 2, unit: 'PIECE' },
      { name: 'milk', quantity: 300, unit: 'ML' },
      { name: 'butter', quantity: 30, unit: 'G' },
    ],
  });

  const recipe2 = await upsertRecipe({
    id: 'c6016b2d-f7e7-4656-a1b9-45cd34ee47ee',
    library_id: library1.id,
    title: 'Pasta Pomodoro',
    instructions: '1. Boil pasta\n2. Sauté garlic in olive oil\n3. Add tomatoes\n4. Mix with pasta',
    ingredients: [
      { name: 'pasta', quantity: 400, unit: 'G' },
      { name: 'tomato', quantity: 4, unit: 'PIECE' },
      { name: 'garlic', quantity: 3, unit: 'PIECE' },
      { name: 'olive oil', quantity: 50, unit: 'ML' },
    ],
  });

  const recipe3 = await upsertRecipe({
    id: 'c6016b2d-f7e7-4656-a1b9-45cd34ee47ef',
    library_id: library1.id,
    title: 'Chicken Stir Fry',
    instructions: '1. Cut chicken into pieces\n2. Stir fry with vegetables\n3. Add soy sauce\n4. Serve with rice',
    ingredients: [
      { name: 'chicken breast', quantity: 500, unit: 'G' },
      { name: 'bell pepper', quantity: 2, unit: 'PIECE' },
      { name: 'onion', quantity: 1, unit: 'PIECE' },
      { name: 'soy sauce', quantity: 3, unit: 'TBSP' },
      { name: 'rice', quantity: 300, unit: 'G' },
    ],
  });

  const recipe4 = await upsertRecipe({
    id: 'c6016b2d-f7e7-4656-a1b9-45cd34ee47f0',
    library_id: library1.id,
    title: 'Overnight Oats',
    instructions: '1. Mix oats with milk\n2. Add banana and honey\n3. Refrigerate overnight',
    ingredients: [
      { name: 'oats', quantity: 100, unit: 'G' },
      { name: 'milk', quantity: 200, unit: 'ML' },
      { name: 'banana', quantity: 1, unit: 'PIECE' },
      { name: 'honey', quantity: 1, unit: 'TBSP' },
    ],
  });

  // Create recipes for user 2 (3 recipes)
  const recipe5 = await upsertRecipe({
    id: 'c6016b2d-f7e7-4656-a1b9-45cd34ee47f1',
    library_id: library2.id,
    title: 'Veggie Curry',
    instructions: '1. Sauté onions and garlic\n2. Add curry powder\n3. Add vegetables and coconut milk\n4. Simmer 20 minutes',
    ingredients: [
      { name: 'onion', quantity: 2, unit: 'PIECE' },
      { name: 'garlic', quantity: 4, unit: 'PIECE' },
      { name: 'curry powder', quantity: 2, unit: 'TBSP' },
      { name: 'coconut milk', quantity: 400, unit: 'ML' },
      { name: 'potato', quantity: 3, unit: 'PIECE' },
      { name: 'carrot', quantity: 2, unit: 'PIECE' },
    ],
  });

  const recipe6 = await upsertRecipe({
    id: 'c6016b2d-f7e7-4656-a1b9-45cd34ee47f2',
    library_id: library2.id,
    title: 'Grilled Cheese Sandwich',
    instructions: '1. Butter bread\n2. Add cheese between slices\n3. Grill until golden',
    ingredients: [
      { name: 'bread', quantity: 2, unit: 'PIECE' },
      { name: 'cheese', quantity: 100, unit: 'G' },
      { name: 'butter', quantity: 20, unit: 'G' },
    ],
  });

  const recipe7 = await upsertRecipe({
    id: 'c6016b2d-f7e7-4656-a1b9-45cd34ee47f3',
    library_id: library2.id,
    title: 'Simple Garden Salad',
    instructions: '1. Chop vegetables\n2. Mix in bowl\n3. Drizzle with olive oil',
    ingredients: [
      { name: 'lettuce', quantity: 1, unit: 'PIECE' },
      { name: 'cucumber', quantity: 1, unit: 'PIECE' },
      { name: 'tomato', quantity: 2, unit: 'PIECE' },
      { name: 'carrot', quantity: 1, unit: 'PIECE' },
      { name: 'olive oil', quantity: 30, unit: 'ML' },
    ],
  });

  // Create public recipes (accessible to all users)
  const recipe8 = await upsertRecipe({
    id: 'c6016b2d-f7e7-4656-a1b9-45cd34ee47f4',
    library_id: publicLibrary.id,
    title: 'Classic Margherita Pizza',
    instructions: '1. Prepare pizza dough\n2. Spread tomato sauce\n3. Add mozzarella cheese\n4. Bake at 220°C for 12-15 minutes',
    ingredients: [
      { name: 'flour', quantity: 300, unit: 'G' },
      { name: 'tomato', quantity: 3, unit: 'PIECE' },
      { name: 'cheese', quantity: 200, unit: 'G' },
      { name: 'olive oil', quantity: 40, unit: 'ML' },
    ],
  });

  const recipe9 = await upsertRecipe({
    id: 'c6016b2d-f7e7-4656-a1b9-45cd34ee47f5',
    library_id: publicLibrary.id,
    title: 'Banana Smoothie',
    instructions: '1. Blend banana with milk\n2. Add honey and oats\n3. Blend until smooth',
    ingredients: [
      { name: 'banana', quantity: 2, unit: 'PIECE' },
      { name: 'milk', quantity: 300, unit: 'ML' },
      { name: 'honey', quantity: 2, unit: 'TBSP' },
      { name: 'oats', quantity: 50, unit: 'G' },
    ],
  });

  console.log('✅ Created 9 recipes (4 for user 1 private, 3 for user 2 private, 2 public)');

  // Create meal plans
  const mealPlan1 = await prisma.meal_plan.upsert({
    where: { id: 'e7e7685f-e270-47dc-b3c5-a4237fd4791e' },
    update: {},
    create: {
      id: 'e7e7685f-e270-47dc-b3c5-a4237fd4791e',
      household_id: household1.id,
    },
  });

  const mealPlan2 = await prisma.meal_plan.upsert({
    where: { id: 'e7e7685f-e270-47dc-b3c5-a4237fd4791f' },
    update: {},
    create: {
      id: 'e7e7685f-e270-47dc-b3c5-a4237fd4791f',
      household_id: household2.id,
    },
  });

  // Get current week dates (Monday-Sunday)
  function getCurrentWeekDates() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date);
    }
    return dates;
  }

  const weekDates = getCurrentWeekDates();

  // Create meal slots for user 1
  const meals1 = [
    { date: weekDates[0], slot: 'BREAKFAST', recipe_id: recipe4.id },
    { date: weekDates[0], slot: 'LUNCH', recipe_id: recipe2.id },
    { date: weekDates[0], slot: 'DINNER', recipe_id: recipe3.id },
    { date: weekDates[1], slot: 'BREAKFAST', recipe_id: recipe1.id },
    { date: weekDates[1], slot: 'DINNER', recipe_id: recipe2.id },
    { date: weekDates[2], slot: 'BREAKFAST', recipe_id: recipe4.id },
    { date: weekDates[2], slot: 'LUNCH', recipe_id: recipe3.id },
    { date: weekDates[3], slot: 'BREAKFAST', recipe_id: recipe1.id },
    { date: weekDates[3], slot: 'DINNER', recipe_id: recipe2.id },
    { date: weekDates[4], slot: 'LUNCH', recipe_id: recipe3.id },
  ];

  for (const meal of meals1) {
    await prisma.meal_slot.upsert({
      where: {
        meal_plan_id_date_slot: {
          meal_plan_id: mealPlan1.id,
          date: meal.date,
          slot: meal.slot as any,
        },
      },
      update: {},
      create: {
        meal_plan_id: mealPlan1.id,
        date: meal.date,
        slot: meal.slot as any,
        recipe_id: meal.recipe_id,
      },
    });
  }

  // Create meal slots for user 2
  const meals2 = [
    { date: weekDates[0], slot: 'BREAKFAST', recipe_id: recipe5.id },
    { date: weekDates[0], slot: 'LUNCH', recipe_id: recipe6.id },
    { date: weekDates[1], slot: 'DINNER', recipe_id: recipe7.id },
    { date: weekDates[2], slot: 'BREAKFAST', recipe_id: recipe5.id },
    { date: weekDates[2], slot: 'LUNCH', recipe_id: recipe6.id },
    { date: weekDates[3], slot: 'DINNER', recipe_id: recipe5.id },
    { date: weekDates[4], slot: 'LUNCH', recipe_id: recipe7.id },
    { date: weekDates[5], slot: 'BREAKFAST', recipe_id: recipe6.id },
  ];

  for (const meal of meals2) {
    await prisma.meal_slot.upsert({
      where: {
        meal_plan_id_date_slot: {
          meal_plan_id: mealPlan2.id,
          date: meal.date,
          slot: meal.slot as any,
        },
      },
      update: {},
      create: {
        meal_plan_id: mealPlan2.id,
        date: meal.date,
        slot: meal.slot as any,
        recipe_id: meal.recipe_id,
      },
    });
  }

  console.log('✅ Created meal slots for both users');

  // Seed tags from tags.seed.json
  console.log('🏷️  Seeding tags...');
  const tagsData = await import('../tags.seed.json');
  const tags = tagsData.default;
  
  let tagCount = 0;
  for (const tagData of tags) {
    await prisma.tag.upsert({
      where: { slug: tagData.slug },
      update: {},
      create: {
        name: tagData.canonical_name,
        slug: tagData.slug,
        kind: tagData.category,
        scope: 'GLOBAL',
      },
    });
    tagCount++;
  }
  
  console.log(`✅ Seeded ${tagCount} tags from tags.seed.json`);

  console.log('');
  console.log('✅ Prisma seed completed successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📚 Recipes seeded: 9 total');
  console.log('   User 1 (Private): Simple Pancakes, Pasta Pomodoro, Chicken Stir Fry, Overnight Oats');
  console.log('   User 2 (Private): Veggie Curry, Grilled Cheese Sandwich, Simple Garden Salad');
  console.log('   Public Library: Classic Margherita Pizza, Banana Smoothie');
  console.log('');
  console.log('📅 Meal slots seeded: 18 total (10 for user 1, 8 for user 2)');
  console.log(`   Week: ${weekDates[0].toISOString().split('T')[0]} to ${weekDates[6].toISOString().split('T')[0]}`);
  console.log('');
  console.log('👤 Test credentials:');
  console.log('   User 1: test@juicefuel.local / password123');
  console.log('   User 2: second@juicefuel.local / password123');
  console.log('');
  console.log('🏠 Households & Libraries:');
  console.log(`   household_id (user 1): ${household1.id}`);
  console.log(`   meal_plan_id (user 1): ${mealPlan1.id}`);
  console.log(`   recipe_library_id (user 1): ${library1.id}`);
  console.log(`   public_library_id (user 1): ${publicLibrary.id}`);
  console.log('');
  console.log(`   household_id (user 2): ${household2.id}`);
  console.log(`   meal_plan_id (user 2): ${mealPlan2.id}`);
  console.log(`   recipe_library_id (user 2): ${library2.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
