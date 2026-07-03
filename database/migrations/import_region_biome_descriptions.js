/**
 * import_region_biome_descriptions.js
 * Imports data_public/region_biome_descriptions (2).csv into the
 * region_biome_descriptions table.
 *
 * Usage:
 *   node database/migrations/import_region_biome_descriptions.js
 *
 * Run AFTER create_region_biome_descriptions.sql has been applied.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CSV_PATH = path.join(__dirname, '../../data_public/region_biome_descriptions (2).csv');

const COLUMN_TO_CATEGORY = {
  forest: 'forest',
  hill: 'hills',
  marshes: 'marsh',
  plains: 'plain',
  mountains_low: 'mountains_low',
  mountains_med: 'mountains_med',
  mountains_high: 'mountains_high',
  road: 'road',
  trail: 'trail',
};

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function splitPhrases(text) {
  if (!text || !text.trim()) return [];
  // Split on sentence boundaries, then clean and filter empty fragments.
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function importRegionBiomeDescriptions() {
  try {
    console.log('📄 Reading region_biome_descriptions CSV...');
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = csvContent.split('\n').filter((l) => l.trim());

    if (lines.length === 0) {
      console.log('⚠️ CSV is empty');
      return;
    }

    const header = parseCsvLine(lines[0]).map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());
    const dataLines = lines.slice(1);
    console.log(`   Found ${dataLines.length} data rows`);

    // Clear existing data so the import is idempotent.
    await pool.query('TRUNCATE TABLE region_biome_descriptions');
    console.log('   Cleared existing region_biome_descriptions');

    let inserted = 0;
    let skipped = 0;

    for (const line of dataLines) {
      const parts = parseCsvLine(line);
      if (parts.length < header.length) {
        skipped++;
        continue;
      }

      const row = Object.fromEntries(header.map((h, i) => [h, parts[i]]));
      const regionName = row.region_name || row.region || '';
      if (!regionName) {
        skipped++;
        continue;
      }

      for (const [csvColumn, category] of Object.entries(COLUMN_TO_CATEGORY)) {
        const rawText = row[csvColumn];
        const phrases = splitPhrases(rawText);
        if (phrases.length === 0) continue;

        await pool.query(
          `INSERT INTO region_biome_descriptions (region_name, category, phrases)
           VALUES ($1, $2, $3)
           ON CONFLICT (region_name, category) DO UPDATE
             SET phrases = EXCLUDED.phrases, updated_at = NOW()`,
          [regionName, category, phrases]
        );
        inserted++;
      }
    }

    console.log(`✅ Done: ${inserted} region/category combinations inserted/updated`);
    console.log(`   Skipped rows: ${skipped}`);

    const { rows } = await pool.query(
      `SELECT category, COUNT(*) AS n
       FROM region_biome_descriptions
       GROUP BY category
       ORDER BY category`
    );
    console.log('\n📊 Combinations per category:');
    rows.forEach((r) => console.log(`   ${r.category}: ${r.n}`));

    const total = await pool.query('SELECT COUNT(*) FROM region_biome_descriptions');
    console.log(`\n   Total: ${total.rows[0].count} rows`);
  } catch (err) {
    console.error('❌ Import failed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importRegionBiomeDescriptions();
