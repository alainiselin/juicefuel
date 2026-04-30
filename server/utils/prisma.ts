import pkg from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { PrismaClient } = pkg;

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;
  const isHostedPostgres = connectionString?.includes('supabase.com');

  const pool = new pg.Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? (process.env.NODE_ENV === 'production' ? 1 : 10)),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
    ssl: isHostedPostgres ? { rejectUnauthorized: false } : undefined,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

declare global {
  var prismaInstance: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaInstance ?? prismaClientSingleton();

globalThis.prismaInstance = prisma;

export default prisma;
