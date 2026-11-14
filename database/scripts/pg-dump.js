// Pre-#104 dump gate: runs pg_dump against the same DATABASE_URL the backend
// uses (loaded from backend/.env via dotenv — the secret never touches the
// command line or stdout). Usage:
//   node database/scripts/pg-dump.js <output-file>
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const out = process.argv[2];
if (!out) {
  console.error('usage: node pg-dump.js <output-file>');
  process.exit(2);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set (backend/.env missing?)');
  process.exit(2);
}

const child = spawn(
  'pg_dump',
  [process.env.DATABASE_URL, '--no-owner', '--no-privileges', '-f', out],
  { stdio: ['ignore', 'inherit', 'inherit'] }
);
child.on('exit', (code) => process.exit(code ?? 1));
