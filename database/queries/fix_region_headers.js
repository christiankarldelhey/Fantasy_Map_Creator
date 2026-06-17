const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'people_region_analysis.json');
const outputFile = path.join(__dirname, 'people_region_analysis_fixed.json');

// Read the file
const content = fs.readFileSync(inputFile, 'utf8');

// Replace region headers with proper JSON format
// Pattern: Region #X: Name\n--------------------------------------------------------------------------------
// Replace with: { "region_id": X, "region_name": "Name",
let fixedContent = content.replace(
  /Region #(\d+): ([^\n]+)\n--------------------------------------------------------------------------------\n\{/g,
  '{\n  "region_id": $1,\n  "region_name": "$2",'
);

// Add commas between region objects when they're separated by newlines
// Pattern: }\n\n{ (closing brace, blank line, opening brace)
// Replace with: },\n{ (add comma between them)
fixedContent = fixedContent.replace(/\}\n\n\{/g, '},\n{');

// Fix disclaimer lines that are missing quotes
// Pattern: ONLY ADD region id in entity X
// Replace with: "disclaimer": "ONLY ADD region id in entity X"
fixedContent = fixedContent.replace(
  /\{\s+ONLY ADD region id in entity ([^\n]+)\s+\}/g,
  '{\n      "disclaimer": "ONLY ADD region id in entity $1"\n    }'
);

// Write to new file
fs.writeFileSync(outputFile, fixedContent, 'utf8');

console.log(`Fixed file written to: ${outputFile}`);
console.log('Original file remains unchanged.');
