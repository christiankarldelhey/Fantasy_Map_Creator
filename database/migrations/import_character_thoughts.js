import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Path to the CSV file
const csvPath = path.join(__dirname, '../../data_public/thoughts - Hoja 1.csv');

async function importCharacterThoughts() {
  try {
    console.log('Reading CSV file...');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV (skip header)
    const lines = csvContent.split('\n').filter(line => line.trim());
    const header = lines[0].split(',');
    const dataLines = lines.slice(1);
    
    console.log(`Found ${dataLines.length} thoughts to import`);
    
    // Clear existing data
    await pool.query('DELETE FROM character_thoughts');
    console.log('Cleared existing character_thoughts data');
    
    // Insert data
    let inserted = 0;
    for (const line of dataLines) {
      if (!line.trim()) continue;
      
      // Parse CSV line (handle quoted strings)
      const parts = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          parts.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      parts.push(current.trim());
      
      if (parts.length < 4) continue;
      
      const [character_id, thought, type, thought_id] = parts;
      
      // Clean up thought text (remove ALL quotes - both straight and curly)
      // Using Unicode escape sequences for curly quotes: \u201C (") and \u201D (")
      const cleanThought = thought
        .replace(/^[""\u201C\u201D\u2018\u2019]|[""\u201C\u201D\u2018\u2019]$/g, '')  // Remove wrapping quotes
        .replace(/""/g, '"')                           // Handle escaped quotes
        .replace(/\u201C/g, '')                        // Remove left curly double quote
        .replace(/\u201D/g, '')                        // Remove right curly double quote
        .replace(/\u2018/g, '')                        // Remove left curly single quote
        .replace(/\u2019/g, '')                        // Remove right curly single quote
        .replace(/"/g, '')                             // Remove all straight quotes
        .replace(/'/g, '');                            // Remove all straight single quotes
      
      await pool.query(
        `INSERT INTO character_thoughts (character_id, thought, type, thought_id)
         VALUES ($1, $2, $3, $4)`,
        [parseInt(character_id), cleanThought, type, parseInt(thought_id)]
      );
      
      inserted++;
      if (inserted % 50 === 0) {
        console.log(`Inserted ${inserted} thoughts...`);
      }
    }
    
    console.log(`Successfully imported ${inserted} thoughts`);
    
    // Verify
    const { rows } = await pool.query('SELECT COUNT(*) as count FROM character_thoughts');
    console.log(`Total thoughts in database: ${rows[0].count}`);
    
    // Show breakdown by type
    const typeBreakdown = await pool.query(
      `SELECT type, COUNT(*) as count FROM character_thoughts GROUP BY type ORDER BY type`
    );
    console.log('\nBreakdown by type:');
    typeBreakdown.rows.forEach(row => {
      console.log(`  ${row.type}: ${row.count}`);
    });
    
    // Show breakdown by character
    const charBreakdown = await pool.query(
      `SELECT character_id, COUNT(*) as count FROM character_thoughts GROUP BY character_id ORDER BY character_id`
    );
    console.log('\nBreakdown by character:');
    charBreakdown.rows.forEach(row => {
      console.log(`  Character ${row.character_id}: ${row.count}`);
    });
    
  } catch (error) {
    console.error('Error importing character thoughts:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importCharacterThoughts();
