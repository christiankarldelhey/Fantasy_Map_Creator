const fs = require('fs');
const path = require('path');

const fixedFile = path.join(__dirname, 'people_region_analysis_fixed.json');

try {
  const content = fs.readFileSync(fixedFile, 'utf8');
  const data = JSON.parse(content);
  console.log('✓ JSON is valid!');
  console.log(`Total regions: ${data.people_field_by_region.length}`);
  console.log(`Last region ID: ${data.people_field_by_region[data.people_field_by_region.length - 1].region_id}`);
} catch (e) {
  console.error('✗ JSON parsing failed:');
  console.error(e.message);
}
