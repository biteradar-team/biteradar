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
// max:1 — each build worker / serverless instance only runs one query at a
// time, so one connection is enough. Without it postgres-js opens up to 10,
// and a few concurrent builds exhaust the pooler's 15-client session limit
// (EMAXCONNSESSION), which fails prerender on whichever build loses the race.
const client = postgres(url, {prepare: false, max: 1});

export const db = drizzle(client, {schema, casing: 'snake_case'});
