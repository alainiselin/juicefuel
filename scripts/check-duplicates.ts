import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkDuplicates() {
  console.log('Checking for case-insensitive duplicate ingredients...\n');

  // Find duplicates by checking lowercase names
  const allIngredients = await prisma.ingredient.findMany({
    select: {
      id: true,
      name: true,
      source: true,
      is_core: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Group by lowercase name
  const grouped = new Map<string, typeof allIngredients>();
  
  for (const ing of allIngredients) {
    const key = ing.name.toLowerCase();
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(ing);
  }

  // Find duplicates
  const duplicates = Array.from(grouped.entries())
    .filter(([_, items]) => items.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  console.log(`Found ${duplicates.length} case-insensitive duplicates:\n`);

  for (const [lowercase, items] of duplicates) {
    console.log(`"${lowercase}" (${items.length} duplicates):`);
    for (const item of items) {
      console.log(`  - "${item.name}" (${item.source}, core: ${item.is_core}, id: ${item.id})`);
    }
    console.log();
  }

  // Check for duplicate slugs too
  console.log('\nChecking ingredient_alias table for related entries...\n');
  
  const aliases = await prisma.ingredient_alias.findMany({
    select: {
      id: true,
      name: true,
      ingredient_id: true,
    },
  });
  
  console.log(`Found ${aliases.length} aliases in the database.`);

  await prisma.$disconnect();
}

checkDuplicates().catch(console.error);
