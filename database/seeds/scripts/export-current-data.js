#!/usr/bin/env node

/**
 * Middle Earth Database Data Exporter
 * 
 * This script exports current database data to seed files in the appropriate formats:
 * - CSV for tabular data
 * - GeoJSON for geographic data
 * - SQL for complex data
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../../backend/.env') });

const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Export configuration
const EXPORT_CONFIG = {
  // Tables to export as CSV
  csvTables: [
    {
      table: 'kingdoms',
      columns: ['id', 'name', 'description', 'created_at'],
      filename: 'kingdoms.csv'
    },
    {
      table: 'climate_zones', 
      columns: ['id', '"desc"', 'temperature', 'precipitation', 'koppen', 'analog_location', 'analog_lat', 'analog_lon', 'created_at'],
      filename: 'climate_zones.csv'
    },
    {
      table: 'conversation_topics',
      columns: ['entity_type', 'topic', 'prose_hint'],
      filename: 'conversation_topics.csv'
    },
    {
      table: 'npc_interactions',
      columns: ['id', 'entity_id', 'entity_type', 'interaction_form', 'shadow_band', 'character_id', 'cultural_family', 'region_id', 'npc_attitude', 'concrete_content', 'tension', 'traveller_stance', 'topic'],
      filename: 'dialogue_master.csv'
    },
    {
      table: 'entities',
      columns: ['id', 'name', 'slug', 'type', 'active', 'tier', 'parent_id', 'description', 'description_summary', 'url_path', 'biomes', 'created_at'],
      filename: 'entities.csv'
    },
  ],
  
  // Tables to export as GeoJSON
  geojsonTables: [
    {
      table: 'regions',
      properties: ['id', 'name', 'region_type', 'kingdom_id', 'climate_zone_id', 'description_text', 'description_summary', 'area_km2', 'distance_for_encounter', 'chance_of_encounter', 'hours_to_encounter', 'population_ratio'],
      filename: 'regions.geojson'
    },
    {
      table: 'biomes',
      properties: ['id', 'name', 'type', 'description', 'area_km2'],
      filename: 'biomes.geojson'
    },
    {
      table: 'water',
      properties: ['id', 'name', 'water_type', 'description'],
      filename: 'water.geojson'
    },
  ],
  
  // Tables to export as SQL
  sqlTables: [
    {
      table: 'locations',
      columns: ['id', 'name', 'location_type', 'population', 'inhabitants', 'description', 'region', 'image_url', 'external_id'],
      filename: 'locations.sql'
    },
    {
      table: 'roads',
      columns: ['id', 'name', 'terrain_type', 'difficulty', 'cost_factor'],
      filename: 'roads.sql'
    },
  ],
};

/**
 * Export table data as CSV
 */
async function exportTableAsCSV(config) {
  console.log(`📊 Exporting ${config.table} as CSV...`);
  
  try {
    const orderByClause = config.columns.includes('id') ? 'ORDER BY id' : 
                           config.table === 'conversation_topics' ? 'ORDER BY entity_type, topic' :
                           '';
    
    const result = await pool.query(`
      SELECT ${config.columns.join(', ')}
      FROM ${config.table}
      ${orderByClause}
    `);
    
    if (result.rows.length === 0) {
      console.log(`⚠️  No data found in ${config.table}`);
      return;
    }
    
    // Convert to CSV format
    const csvLines = [];
    
    // Header
    csvLines.push(config.columns.join(','));
    
    // Data rows
    for (const row of result.rows) {
      const values = config.columns.map(col => {
        let value = row[col];
        
        // Handle null values
        if (value === null || value === undefined) {
          return '';
        }
        
        // Handle arrays (like biomes)
        if (Array.isArray(value)) {
          value = `{${value.join(',')}}`;
        }
        
        // Handle dates
        if (value instanceof Date) {
          value = value.toISOString();
        }
        
        // Escape commas and quotes in strings
        if (typeof value === 'string') {
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
        }
        
        return value;
      });
      
      csvLines.push(values.join(','));
    }
    
    // Write to file
    const csvContent = csvLines.join('\n');
    const filePath = path.join(__dirname, '../data/csv', config.filename);
    await fs.writeFile(filePath, csvContent);
    
    console.log(`✅ Exported ${result.rows.length} rows to ${config.filename}`);
    
  } catch (error) {
    console.error(`❌ Error exporting ${config.table} as CSV:`, error.message);
    throw error;
  }
}

/**
 * Export table data as GeoJSON
 */
async function exportTableAsGeoJSON(config) {
  console.log(`🗺️  Exporting ${config.table} as GeoJSON...`);
  
  try {
    // First check if table has geometry column
    const geomCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = '${config.table}' 
      AND (data_type = 'geometry' OR udt_name = 'geometry')
    `);
    
    if (geomCheck.rows.length === 0) {
      console.log(`⚠️  No geometry column found in ${config.table}`);
      return;
    }
    
    const geomColumn = geomCheck.rows[0].column_name;
    
    // Get data with geometry as GeoJSON
    const result = await pool.query(`
      SELECT ${config.properties.join(', ')}, 
             ST_AsGeoJSON(${geomColumn}) as geometry
      FROM ${config.table}
      WHERE ${geomColumn} IS NOT NULL
      ORDER BY id
    `);
    
    if (result.rows.length === 0) {
      console.log(`⚠️  No data found in ${config.table}`);
      return;
    }
    
    // Build GeoJSON FeatureCollection
    const features = result.rows.map(row => {
      const properties = {};
      config.properties.forEach(prop => {
        properties[prop] = row[prop];
      });
      
      return {
        type: 'Feature',
        properties: properties,
        geometry: JSON.parse(row.geometry)
      };
    });
    
    const geojson = {
      type: 'FeatureCollection',
      features: features
    };
    
    // Write to file
    const filePath = path.join(__dirname, '../data/geojson', config.filename);
    await fs.writeFile(filePath, JSON.stringify(geojson, null, 2));
    
    console.log(`✅ Exported ${result.rows.length} features to ${config.filename}`);
    
  } catch (error) {
    console.error(`❌ Error exporting ${config.table} as GeoJSON:`, error.message);
    throw error;
  }
}

/**
 * Export table data as SQL
 */
async function exportTableAsSQL(config) {
  console.log(`🔧 Exporting ${config.table} as SQL...`);
  
  try {
    // Check if table has geometry
    const geomCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = '${config.table}' 
      AND LOWER(data_type) = 'user-defined'
      AND udt_name = 'geometry'
    `);
    
    const hasGeometry = geomCheck.rows.length > 0;
    const geomColumn = hasGeometry ? geomCheck.rows[0].column_name : null;
    
    // Get all columns or specified columns
    let columns = config.columns;
    if (hasGeometry && !columns.includes(geomColumn)) {
      columns = [...columns, geomColumn];
    }
    
    const selectColumns = columns.map(col =>
      (hasGeometry && col === geomColumn) ? `ST_AsText(${geomColumn}) as ${geomColumn}` : col
    );

    const result = await pool.query(`
      SELECT ${selectColumns.join(', ')}
      FROM ${config.table}
      ORDER BY id
    `);
    
    if (result.rows.length === 0) {
      console.log(`⚠️  No data found in ${config.table}`);
      return;
    }
    
    // Generate SQL INSERT statements
    const sqlLines = [];
    
    sqlLines.push(`-- Seed data for ${config.table}`);
    sqlLines.push(`-- Generated: ${new Date().toISOString()}`);
    sqlLines.push('');
    
    for (const row of result.rows) {
      const columnNames = [];
      const values = [];
      
      for (const col of columns) {
        let value = row[col];
        
        if (value === null || value === undefined) {
          continue; // Skip null values
        }
        
        columnNames.push(col);
        
        if (hasGeometry && col === geomColumn) {
          // Handle geometry with ST_GeomFromText
          values.push(`ST_GeomFromText('${value}', 4326)`);
        } else if (typeof value === 'string') {
          // Escape strings
          values.push(`'${value.replace(/'/g, "''")}'`);
        } else if (value instanceof Date) {
          // Handle dates
          values.push(`'${value.toISOString()}'`);
        } else if (Array.isArray(value)) {
          // Handle arrays
          values.push(`'${JSON.stringify(value)}'`);
        } else {
          // Handle numbers and other types
          values.push(value);
        }
      }
      
      if (columnNames.length > 0) {
        const insertSql = `INSERT INTO ${config.table} (${columnNames.join(', ')}) VALUES (${values.join(', ')});`;
        sqlLines.push(insertSql);
      }
    }
    
    // Write to file
    const sqlContent = sqlLines.join('\n');
    const filePath = path.join(__dirname, '../data/sql', config.filename);
    await fs.writeFile(filePath, sqlContent);
    
    console.log(`✅ Exported ${result.rows.length} rows to ${config.filename}`);
    
  } catch (error) {
    console.error(`❌ Error exporting ${config.table} as SQL:`, error.message);
    throw error;
  }
}

/**
 * Create directories if they don't exist
 */
async function ensureDirectories() {
  const dirs = [
    path.join(__dirname, '../data/csv'),
    path.join(__dirname, '../data/geojson'),
    path.join(__dirname, '../data/sql'),
  ];
  
  for (const dir of dirs) {
    try {
      await fs.access(dir);
    } catch (error) {
      await fs.mkdir(dir, { recursive: true });
      console.log(`📁 Created directory: ${path.relative(__dirname, dir)}`);
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('📤 Starting Middle Earth Database Data Export...\n');
  
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established\n');
    
    // Ensure directories exist
    await ensureDirectories();
    
    // Export CSV tables
    console.log('📊 Exporting CSV tables...');
    for (const config of EXPORT_CONFIG.csvTables) {
      await exportTableAsCSV(config);
    }
    
    // Export GeoJSON tables
    console.log('\n🗺️  Exporting GeoJSON tables...');
    for (const config of EXPORT_CONFIG.geojsonTables) {
      await exportTableAsGeoJSON(config);
    }
    
    // Export SQL tables
    console.log('\n🔧 Exporting SQL tables...');
    for (const config of EXPORT_CONFIG.sqlTables) {
      await exportTableAsSQL(config);
    }
    
    console.log('\n🎉 All data exported successfully!');
    console.log('\n📁 Files created in:');
    console.log(`   - CSV: database/seeds/data/csv/`);
    console.log(`   - GeoJSON: database/seeds/data/geojson/`);
    console.log(`   - SQL: database/seeds/data/sql/`);
    
  } catch (error) {
    console.error('💥 Fatal error during export:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export { main as exportCurrentData };
