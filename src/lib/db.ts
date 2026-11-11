import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * No fallback connection string, on purpose (the CSP learned this the hard
 * way: a literal default once put production credentials in the repository).
 */
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Set it in .env locally or in the deployment environment.');
  }
  const ssl = connectionString.includes('sslmode=require') || connectionString.includes('neon.tech');
  // The local PGlite server accepts one connection; a larger pool gets
  // "server closed the connection" on ordinary queries.
  const localPglite = /:5543\d\//.test(connectionString);
  const pool = new Pool({
    connectionString,
    ssl: ssl ? { rejectUnauthorized: false } : undefined,
    max: localPglite ? 1 : 10,
    idleTimeoutMillis: 30_000,
  });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

// One client per process, in production too: Next bundles API routes and pages
// separately, and each bundle would otherwise open its own pool (the local
// PGlite server drops the second connection).
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;
