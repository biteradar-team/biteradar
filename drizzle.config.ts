import {config} from 'dotenv';
import {defineConfig} from 'drizzle-kit';

// Secrets live in .env.local (gitignored). drizzle-kit only auto-loads .env,
// so load .env.local explicitly for `migrate` / `studio`. `generate` doesn't
// need a connection.
config({path: '.env.local'});

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
});
