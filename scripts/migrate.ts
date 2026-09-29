/**
 * @file scripts/migrate.ts
 * @description Standalone CLI script to run schema migrations and verify database connectivity.
 */

import dotenv from 'dotenv';
dotenv.config();

import { initDatabase, pool } from '../lib/db';

async function main() {
  console.log('[ObsSuite Migrate] Starting database migration check...');
  try {
    const success = await initDatabase();
    if (success) {
      console.log('[ObsSuite Migrate] Migration finished successfully.');
    } else {
      console.log('[ObsSuite Migrate] Database URL not provided or un-reachable. Run skipped.');
    }
  } catch (err) {
    console.error('[ObsSuite Migrate] Migration failed with error:', err);
    process.exit(1);
  } finally {
    await pool.end().catch(() => {});
  }
}

main();
