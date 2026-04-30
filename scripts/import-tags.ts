import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface TagSeed {
  category: string;
  canonical_name: string;
  slug: string;
  aliases: string[];
}

async function main() {
  console.log('Importing tags from tags.seed.json...\n');

  const seedPath = join(process.cwd(), 'tags.seed.json');
  const seeds: TagSeed[] = JSON.parse(readFileSync(seedPath, 'utf-8'));

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const seed of seeds) {
    try {
      // Upsert tag by slug
      const tag = await prisma.tag.upsert({
        where: { slug: seed.slug },
        update: {
          name: seed.canonical_name,
          kind: seed.category,
        },
        create: {
          name: seed.canonical_name,
          slug: seed.slug,
          kind: seed.category,
          scope: 'GLOBAL',
        },
      });

      if (tag.name === seed.canonical_name) {
        created++;
      } else {
        updated++;
      }

      // Handle aliases
      for (const alias of seed.aliases) {
        if (alias.toLowerCase() === seed.canonical_name.toLowerCase()) {
          continue; // Skip if alias equals canonical name
        }

        const aliasSlug = alias.toLowerCase().replace(/\s+/g, '-');
        
        try {
          await prisma.tag_alias.upsert({
            where: { slug: aliasSlug },
            update: {
              tag_id: tag.id,
            },
            create: {
              tag_id: tag.id,
              alias: alias,
              slug: aliasSlug,
            },
          });
        } catch {
          // Ignore duplicate alias errors
        }
      }
    } catch (error) {
      console.error(`Failed to import tag "${seed.canonical_name}":`, error);
      skipped++;
    }
  }

  console.log(`\n✅ Import complete`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total:   ${seeds.length}`);
}

main()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
