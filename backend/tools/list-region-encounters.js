import pool from '../db.js';
import {
  buildRegionPool,
  PHASE_MORNING,
  PHASE_AFTERNOON,
  PHASE_NIGHT,
  ENCOUNTER_CHANCE,
} from '../services/encounters.js';

const PHASES = [PHASE_MORNING, PHASE_AFTERNOON, PHASE_NIGHT];

async function loadRegions() {
  const { rows } = await pool.query(
    `SELECT id, name, region_type FROM regions ORDER BY name`
  );
  return rows;
}

async function loadEntities() {
  const { rows } = await pool.query(
    `SELECT id, name, slug, type, active, danger, description_summary,
            probability_by_region
     FROM entities
     ORDER BY name`
  );
  return rows;
}

const CSV_HEADERS = [
  'region',
  'region_type',
  'phase',
  'base_encounter_chance_pct',
  'entity_name',
  'entity_type',
  'active',
  'danger',
  'raw_level',
  'adjusted_level',
  'conditional_probability_pct',
  'absolute_probability_pct',
];

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows) {
  const lines = [CSV_HEADERS.join(',')];
  for (const row of rows) {
    lines.push(CSV_HEADERS.map((h) => csvEscape(row[h])).join(','));
  }
  return lines.join('\n');
}

function buildReport(regions, entities) {
  const rows = [];
  for (const region of regions) {
    for (const phase of PHASES) {
      const pool = buildRegionPool(region.name, phase, entities);
      if (pool.length === 0) continue;

      for (const entry of pool) {
        const pbr = entry.entity.probability_by_region?.find(
          (p) => p.region === region.name
        );
        rows.push({
          region: region.name,
          region_type: region.region_type,
          phase,
          base_encounter_chance_pct: ENCOUNTER_CHANCE,
          entity_name: entry.entity.name,
          entity_type: entry.entity.type,
          active: entry.entity.active,
          danger: entry.entity.danger,
          raw_level: pbr ? Number(pbr.probability) : null,
          adjusted_level: entry.level,
          conditional_probability_pct: Number(entry.probability.toFixed(2)),
          absolute_probability_pct: Number(
            ((entry.probability * ENCOUNTER_CHANCE) / 100).toFixed(2)
          ),
        });
      }
    }
  }
  return rows;
}

async function main() {
  const [regions, entities] = await Promise.all([loadRegions(), loadEntities()]);
  console.error(`Loaded ${regions.length} regions and ${entities.length} entities`);

  const rows = buildReport(regions, entities);

  // Print as CSV to stdout
  console.log(toCsv(rows));

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
