#!/usr/bin/env node

/**
 * Post-deploy script for Railway
 * Automatically loads seed data on every deploy
 * This ensures production always has the latest seed data
 */

import pg from 'pg';
import { loadSeeds } from './load-seeds.js';

async function postDeploy() {
  console.log('🚀 Running post-deploy setup...');
  
  try {
    console.log('📊 Loading seed data (automatic update)...');
    await loadSeeds();
    console.log('✅ Seed data updated successfully!');
    
    // Verify data was loaded
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    const result = await pool.query('SELECT COUNT(*) as count FROM kingdoms');
    const kingdomCount = parseInt(result.rows[0].count);
    console.log(`� Verification: ${kingdomCount} kingdoms loaded`);
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Post-deploy setup failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  postDeploy();
}

export { postDeploy };
