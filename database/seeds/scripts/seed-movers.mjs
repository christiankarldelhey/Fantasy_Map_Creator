#!/usr/bin/env node

/**
 * Loads only the movers seed family (campaigns + movers + legs + beats +
 * resampled trails). For authoring iteration: bake one YAML and check the
 * result without reseeding the whole database.
 *
 *   cd backend && npm run db:seed:movers
 */

import { seedMovers, pool } from './load-seeds.js';

try {
  await seedMovers();
  console.log('\n🎉 Movers seeded.');
} catch (error) {
  console.error('💥 Mover seed failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
