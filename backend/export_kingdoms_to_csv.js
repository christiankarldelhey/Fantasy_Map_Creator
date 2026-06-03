import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function exportKingdomsToCSV() {
  try {
    console.log('📦 Exporting kingdoms table to CSV...');

    // Query to get all kingdoms
    const query = `
      SELECT 
        id,
        name,
        description,
        created_at
      FROM kingdoms
      ORDER BY name;
    `;

    const result = await pool.query(query);
    const rows = result.rows;

    if (rows.length === 0) {
      console.log('⚠️  No kingdoms found in the database');
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
    const outputPath = '../data/kingdoms.csv';
    fs.writeFileSync(outputPath, csvContent, 'utf8');

    console.log(`✅ Successfully exported ${rows.length} kingdoms to ${outputPath}`);
    console.log(`📊 CSV file size: ${(csvContent.length / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('❌ Error exporting kingdoms:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

exportKingdomsToCSV();
