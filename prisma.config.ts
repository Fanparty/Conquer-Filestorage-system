import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Same pattern as the CSP and the hub: `prisma generate` runs at install, before a host
// injects DATABASE_URL, and does not need one. Commands that connect do.
const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  ...(url ? { datasource: { url } } : {}),
});
