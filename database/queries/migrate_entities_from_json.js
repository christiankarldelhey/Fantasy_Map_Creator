import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const jsonFilePath = path.join(__dirname, 'people_region_analysis_fixed.json');
const reportFilePath = path.join(__dirname, 'entity_migration_report.txt');

// Function to create slug from name
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .trim();
}

// Function to normalize name for comparison (case-insensitive)
function normalizeName(name) {
  return name.toLowerCase().trim();
}

async function createBackup() {
  console.log('Creating backup of entities table...');
  await pool.query('CREATE TABLE IF NOT EXISTS entities_backup AS SELECT * FROM entities');
  console.log('✓ Backup created (entities_backup)');
}

async function getExistingEntities() {
  const result = await pool.query('SELECT id, name, slug, type, description, region_ids FROM entities');
  const entities = {};
  result.rows.forEach(row => {
    entities[normalizeName(row.name)] = row;
  });
  return entities;
}

async function migrateEntities() {
  const client = await pool.connect();
  let report = 'ENTITY MIGRATION REPORT\n';
  report += '='.repeat(80) + '\n\n';
  
  try {
    await client.query('BEGIN');
    
    // Read JSON file
    console.log('Reading JSON file...');
    const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8');
    const data = JSON.parse(jsonContent);
    
    console.log(`Total regions: ${data.people_field_by_region.length}`);
    
    // Get existing entities
    console.log('Fetching existing entities...');
    const existingEntities = await getExistingEntities();
    console.log(`Existing entities: ${Object.keys(existingEntities).length}`);
    
    let newEntitiesCount = 0;
    let updatedEntitiesCount = 0;
    let errors = [];
    let warnings = [];
    
    // Process each region
    for (const region of data.people_field_by_region) {
      const regionId = region.region_id;
      const regionName = region.region_name;
      
      console.log(`\nProcessing Region #${regionId}: ${regionName}`);
      
      // Process each item in the list
      for (const item of region.list) {
        if (item.name) {
          // Skip entity creation - only process disclaimers
          continue;
          
        } else if (item.disclaimer) {
          // Existing entity to update
          const disclaimer = item.disclaimer;
          const match = disclaimer.match(/ONLY ADD (?:this )?region id in entity (.+)/i);
          
          if (!match) {
            errors.push(`Invalid disclaimer format: ${disclaimer}`);
            continue;
          }
          
          const entityName = match[1].trim();
          const normalizedName = normalizeName(entityName);
          
          // Check if entity exists
          if (!existingEntities[normalizedName]) {
            errors.push(`Entity "${entityName}" not found (referenced in region #${regionId})`);
            continue;
          }
          
          const entity = existingEntities[normalizedName];
          
          // Check if region_id is already in the array
          if (entity.region_ids && entity.region_ids.includes(regionId)) {
            console.log(`  - Region ${regionId} already in entity "${entityName}"`);
            continue;
          }
          
          // Add region_id to the array
          const updateQuery = `
            UPDATE entities
            SET region_ids = array_append(region_ids, $1)
            WHERE id = $2
          `;
          
          await client.query(updateQuery, [regionId, entity.id]);
          
          // Update local cache
          if (!entity.region_ids) {
            entity.region_ids = [];
          }
          entity.region_ids.push(regionId);
          
          updatedEntitiesCount++;
          console.log(`  ✓ Updated entity: ${entityName} (added region ${regionId})`);
        }
      }
    }
    
    await client.query('COMMIT');
    
    // Generate report
    report += `Migration completed successfully\n\n`;
    report += `Statistics:\n`;
    report += `  New entities created: ${newEntitiesCount}\n`;
    report += `  Existing entities updated: ${updatedEntitiesCount}\n`;
    report += `  Errors: ${errors.length}\n`;
    report += `  Warnings: ${warnings.length}\n\n`;
    
    if (errors.length > 0) {
      report += 'ERRORS:\n';
      report += '-'.repeat(80) + '\n';
      errors.forEach(error => {
        report += `  - ${error}\n`;
      });
      report += '\n';
    }
    
    if (warnings.length > 0) {
      report += 'WARNINGS:\n';
      report += '-'.repeat(80) + '\n';
      warnings.forEach(warning => {
        report += `  - ${warning}\n`;
      });
      report += '\n';
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('Migration completed successfully');
    console.log(`New entities: ${newEntitiesCount}`);
    console.log(`Updated entities: ${updatedEntitiesCount}`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);
    console.log('='.repeat(80));
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed, transaction rolled back:', error);
    report += `Migration FAILED: ${error.message}\n`;
    throw error;
  } finally {
    client.release();
  }
  
  // Write report
  fs.writeFileSync(reportFilePath, report, 'utf-8');
  console.log(`\n✓ Report saved to: ${reportFilePath}`);
}

async function main() {
  try {
    await createBackup();
    await migrateEntities();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
