const fs = require('fs');
const path = require('path');

// NOTE: This script uses @vitalets/google-translate-api for automatic translation
// Install it with: npm install @vitalets/google-translate-api
// If not available, it will use the manual dictionary below

let translate;
try {
  translate = require('@vitalets/google-translate-api').translate;
} catch (e) {
  console.log('⚠️  Google Translate API not available. Using manual dictionary only.');
  console.log('   Install with: npm install @vitalets/google-translate-api');
  translate = null;
}

// Translation dictionary for common terms
const translations = {
  // Property keys
  'nombre': 'name',
  'desc': 'desc',
  'raza': 'race',
  'prod': 'production',
  'tipo': 'type',
  'pop': 'pop',
  
  // Types
  'castillo': 'castle',
  'mansion': 'manor',
  'fortaleza': 'fortress',
  'ciudad en ruinas': 'ruined city',
  'ciudad': 'city',
  'pueblo': 'town',
  'aldea': 'village',
  'ciudad fortaleza': 'fortress city',
  'ciudad fortificada': 'fortified city',
  'torrre en ruinas': 'ruined tower',
  'desconocido': 'unknown',
  'mina enana': 'dwarven mine',
  
  // Races
  'elfos silvanos': 'Silvan Elves',
  'Dunedain': 'Dúnedain',
  'Gondor': 'Gondor',
  'Enanos': 'Dwarves',
  'Eriadorianos': 'Eriadorians',
  'Hobbits': 'Hobbits',
  'Norteño': 'Northmen',
  'Dunledinos': 'Dunlendings',
  'Rohirrim': 'Rohirrim',
  'Corsarios': 'Corsairs',
  'orcos': 'orcs',
  'sauron': 'Sauron',
  'Noldor': 'Noldor',
  'Sindar': 'Sindar',
  'Nandor': 'Nandor',
  'Nandor, Sindar, Noldor': 'Nandor, Sindar, Noldor',
  'Elfos Noldor, Elfos Silvanos, Elfos Sindar, Medio Elfos, Dunedain': 'Noldor Elves, Silvan Elves, Sindar Elves, Half-Elves, Dúnedain',
  'Humanos. Hobbits, Elfos Silvanos': 'Humans, Hobbits, Silvan Elves',
  'Hombres de los bosques': 'Woodmen',
  
  // Production items
  'ropa, lembas, hierbas, pociones, objetos magicos': 'cloth, lembas, herbs, potions, magical items',
  'pescado, hierro, plata, cobre': 'fish, iron, silver, copper',
  'lana, vidrio, hierro, zinc, plomo, gemas': 'wool, glass, iron, zinc, lead, gems',
  'armas, hierro, esclavos': 'weapons, iron, slaves'
};

async function translateText(text) {
  if (!text) return text;
  
  // Check if we have a direct translation
  if (translations[text]) {
    return translations[text];
  }
  
  // If translate API is available and text is long (likely a description), use it
  if (translate && text.length > 50) {
    try {
      const result = await translate(text, { from: 'es', to: 'en' });
      return result.text;
    } catch (error) {
      console.warn(`Translation failed for: "${text.substring(0, 50)}..." - using original`);
      return text;
    }
  }
  
  // For untranslated text, return as-is
  return text;
}

async function translateProperties(properties) {
  if (!properties) return properties;
  
  const translated = {};
  
  for (const [key, value] of Object.entries(properties)) {
    // Translate the key
    const translatedKey = translations[key] || key;
    
    // Translate the value if it's a string
    let translatedValue = value;
    if (typeof value === 'string') {
      translatedValue = await translateText(value);
    }
    
    translated[translatedKey] = translatedValue;
  }
  
  return translated;
}

async function translateGeoJSON(data) {
  if (Array.isArray(data)) {
    // Handle array of FeatureCollections (provincias.json format)
    const translated = [];
    for (const featureCollection of data) {
      const translatedFeatures = [];
      for (const feature of featureCollection.features) {
        translatedFeatures.push({
          ...feature,
          properties: await translateProperties(feature.properties)
        });
      }
      translated.push({
        ...featureCollection,
        properties: await translateProperties(featureCollection.properties),
        features: translatedFeatures
      });
    }
    return translated;
  } else if (data.features) {
    // Handle single FeatureCollection (mapLocations.json format)
    const translatedFeatures = [];
    for (const feature of data.features) {
      if (feature && feature.properties) {
        translatedFeatures.push({
          ...feature,
          properties: await translateProperties(feature.properties)
        });
      } else {
        translatedFeatures.push(feature);
      }
    }
    return {
      ...data,
      features: translatedFeatures
    };
  }
  
  return data;
}

// Main execution
async function main() {
  const geojsonDir = path.join(__dirname, '../Geojson');

  // Translate provincias.json
  console.log('Translating provincias.json...');
  const provinciasPath = path.join(geojsonDir, 'provincias.json');
  const provinciasData = JSON.parse(fs.readFileSync(provinciasPath, 'utf8'));
  const translatedProvincias = await translateGeoJSON(provinciasData);
  fs.writeFileSync(
    path.join(geojsonDir, 'provincias_en.json'),
    JSON.stringify(translatedProvincias, null, 2),
    'utf8'
  );
  console.log('✓ Created provincias_en.json');

  // Translate mapLocations.json
  console.log('Translating mapLocations.json...');
  const locationsPath = path.join(geojsonDir, 'mapLocations.json');
  const locationsData = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));
  const translatedLocations = await translateGeoJSON(locationsData);
  fs.writeFileSync(
    path.join(geojsonDir, 'mapLocations_en.json'),
    JSON.stringify(translatedLocations, null, 2),
    'utf8'
  );
  console.log('✓ Created mapLocations_en.json');

  console.log('\n✓ Translation complete!');
  console.log('\nFiles created:');
  console.log('  - Geojson/provincias_en.json');
  console.log('  - Geojson/mapLocations_en.json');
}

main().catch(error => {
  console.error('Error during translation:', error);
  process.exit(1);
});
