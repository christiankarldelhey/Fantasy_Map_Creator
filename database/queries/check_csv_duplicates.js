import fs from 'fs';

const csvContent = fs.readFileSync(
  '/Users/christiankarldelhey/Documents/Middle Earth Map/data_public/encounters_final.csv',
  'utf-8'
);

const lines = csvContent.split('\n').filter(line => line.trim());
const slugCounts = new Map();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  
  // Parse CSV
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      if (inQuotes && j + 1 < line.length && line[j + 1] === '"') {
        current += '"';
        j++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  
  if (values.length >= 3) {
    const slug = values[2].trim();
    const name = values[1].trim();
    
    if (!slugCounts.has(slug)) {
      slugCounts.set(slug, []);
    }
    slugCounts.get(slug).push(name);
  }
}

console.log('=== DUPLICATE SLUGS IN CSV ===\n');
const duplicates = [];
for (const [slug, names] of slugCounts) {
  if (names.length > 1) {
    duplicates.push({ slug, names, count: names.length });
  }
}

duplicates.sort((a, b) => b.count - a.count);

for (const { slug, names, count } of duplicates) {
  console.log(`Slug: ${slug} (${count} entries)`);
  console.log(`  Names: ${names.join(', ')}`);
  console.log();
}

console.log(`Total duplicate slugs: ${duplicates.length}`);
console.log(`Total entries merged: ${duplicates.reduce((acc, d) => acc + d.count - 1, 0)}`);
