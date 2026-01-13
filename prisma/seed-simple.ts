import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Create adapter
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

async function main() {
  console.log('🌱 Starting seed...');

  // Users
  const user1 = await prisma.user_profile.upsert({
    where: { email: 'test@juicefuel.local' },
    update: {},
    create: {
      email: 'test@juicefuel.local',
      display_name: 'Test User',
      password_hash: await hashPassword('password123'),
    },
  });
  console.log('✅ User 1:', user1.email);

  const user2 = await prisma.user_profile.upsert({
    where: { email: 'second@juicefuel.local' },
    update: {},
    create: {
      email: 'second@juicefuel.local',
      display_name: 'Second User',
      password_hash: await hashPassword('password123'),
    },
  });
  console.log('✅ User 2:', user2.email);

  console.log('✅ Seed completed!');
  console.log('👤 Credentials: test@juicefuel.local / password123');
  console.log('�� Credentials: second@juicefuel.local / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
