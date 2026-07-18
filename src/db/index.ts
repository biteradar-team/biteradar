import 'server-only';
import {drizzle} from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Server-only DB client. `import 'server-only'` makes the build fail loudly if
// this module ever gets pulled into a Client Component bundle — DATABASE_URL
// must never reach the browser (blueprint §5).
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is not set (see .env.example / .env.local).');
}

// prepare:false keeps us compatible with Supabase's transaction pooler.
const client = postgres(url, {prepare: false});

export const db = drizzle(client, {schema, casing: 'snake_case'});
