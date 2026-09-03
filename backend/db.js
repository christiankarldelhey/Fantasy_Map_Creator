import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

// Idle clients can drop for reasons outside our control (managed Postgres
// restarts, proxy timeouts). The pool discards the broken client and opens a
// new one on the next query, so log and keep serving instead of killing the
// process and taking the whole container down with it.
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
});

export default pool;
