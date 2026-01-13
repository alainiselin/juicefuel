import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function dedupIngredients() {
  console.log('🔍 Finding case-insensitive duplicates...\n');
  
  const allIngredients = await prisma.ingredient.findMany({
    select: { id: true, name: true, source: true, created_at: true },
    orderBy: { created_at: 'asc' },  // Keep older ones as canonical
  });

  const grouped = new Map<string, typeof allIngredients>();
  for (const ing of allIngredients) {
    const key = ing.name.toLowerCase();
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(ing);
  }

  const duplicates = Array.from(grouped.entries()).filter(([_, items]) => items.length > 1);
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicates found!\n');
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  console.log(`Found ${duplicates.length} case-insensitive duplicates:\n`);

  let mergedCount = 0;
  for (const [lowercase, items] of duplicates) {
    console.log(`"${lowercase}" (${items.length} variants):`);
    items.forEach(i => console.log(`  - "${i.name}" (${i.source}, ${i.created_at.toISOString()})`));
    
    // Keep first one (oldest), convert others to aliases
    const [canonical, ...dups] = items;
    console.log(`  → Keeping: "${canonical.name}"\n`);
    
    for (const dup of dups) {
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
        
        // Update foreign keys
        await prisma.$executeRaw`
          UPDATE recipe_ingredient 
          SET ingredient_id = ${canonical.id} 
          WHERE ingredient_id = ${dup.id}
        `;
        await prisma.$executeRaw`
          UPDATE shopping_list_item 
          SET ingredient_id = ${canonical.id} 
          WHERE ingredient_id = ${dup.id}
        `;
        await prisma.$executeRaw`
          UPDATE ingredient_tag 
          SET ingredient_id = ${canonical.id} 
          WHERE ingredient_id = ${dup.id} 
          ON CONFLICT DO NOTHING
        `;
        
        // Delete the duplicate
        await prisma.ingredient.delete({ where: { id: dup.id } });
        mergedCount++;
        console.log(`  ✓ Merged "${dup.name}" into alias`);
      } catch (err: any) {
        console.warn(`  ⚠️  Could not merge "${dup.name}": ${err.message}`);
      }
    }
    console.log();
  }
  
  console.log(`\n✅ Merged ${mergedCount} duplicates into aliases\n`);
  
  await prisma.$disconnect();
  await pool.end();
}

dedupIngredients().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
