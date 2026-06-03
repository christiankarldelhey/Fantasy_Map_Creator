import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function exportRegionsToCSV() {
  try {
    console.log('📦 Exporting regions table to CSV...');

    // Query to get all regions (excluding geometry column)
    const query = `
      SELECT 
        id,
        name,
        region_type,
        kingdom_id,
        allegiance,
        biome,
        climate,
        description,
        area_km2,
        created_at
      FROM regions
      ORDER BY name;
    `;

    const result = await pool.query(query);
    const rows = result.rows;

    if (rows.length === 0) {
      console.log('⚠️  No regions found in the database');
      return;
    }

    // Create CSV header
    const headers = Object.keys(rows[0]).join(',');
    
    // Create CSV rows
    const csvRows = rows.map(row => {
      return Object.values(row).map(value => {
        // Handle null values
        if (value === null || value === undefined) {
          return '';
        }
        // Handle strings with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    });

    // Combine header and rows
    const csvContent = [headers, ...csvRows].join('\n');

    // Write to file
    const outputPath = '../data/regions.csv';
    fs.writeFileSync(outputPath, csvContent, 'utf8');

    console.log(`✅ Successfully exported ${rows.length} regions to ${outputPath}`);
    console.log(`📊 CSV file size: ${(csvContent.length / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('❌ Error exporting regions:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

exportRegionsToCSV();
