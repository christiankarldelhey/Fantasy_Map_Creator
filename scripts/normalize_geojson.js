const fs = require('fs');
const path = require('path');

// Paths configuration
const GEOJSON_DIR = path.join(__dirname, '..', 'Geojson');
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'normalized');

/**
 * Normalize mapLocations.json to valid GeoJSON
 * Adds missing "type": "FeatureCollection" at root level
 */
function normalizeMapLocations() {
    console.log('📍 Normalizing mapLocations.json...');
    
    const inputPath = path.join(GEOJSON_DIR, 'mapLocations_en.json');
    const outputPath = path.join(OUTPUT_DIR, 'points.geojson');
    
    // Read file
    const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    
    // Add type if missing
    if (!data.type) {
        data.type = 'FeatureCollection';
    }
    
    // Validate each feature
    let validFeatures = 0;
    let invalidFeatures = 0;
    
    data.features = data.features.filter(feature => {
        // Skip null or undefined features
        if (!feature) {
            invalidFeatures++;
            return false;
        }
        
        // Validate geometry
        if (!feature.geometry) {
            console.warn(`⚠️  Feature without geometry: ${feature.id || 'unknown'}`);
            invalidFeatures++;
            return false;
        }
        
        // Ensure all required fields exist
        if (!feature.type) feature.type = 'Feature';
        if (!feature.properties) feature.properties = {};
        
        validFeatures++;
        return true;
    });
    
    // Save normalized file
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Normalized: ${validFeatures} valid points`);
    if (invalidFeatures > 0) {
        console.log(`⚠️  Skipped: ${invalidFeatures} invalid features`);
    }
    
    return { valid: validFeatures, invalid: invalidFeatures };
}

/**
 * Extract polygons from provincias.json
 * Handles array of FeatureCollections structure
 */
function normalizeProvincias() {
    console.log('🗺️  Normalizing provincias.json...');
    
    const inputPath = path.join(GEOJSON_DIR, 'provincias_en.json');
    const outputPath = path.join(OUTPUT_DIR, 'polygons.geojson');
    
    // Read file
    const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    
    // Handle different structures
    let allFeatures = [];
    
    if (Array.isArray(data)) {
        // If it's an array, extract features from each FeatureCollection
        console.log(`   Found ${data.length} FeatureCollections in array`);
        
        data.forEach((item, arrayIndex) => {
            if (item.type === 'FeatureCollection' && item.features) {
                item.features.forEach((feature, featureIndex) => {
                    // Ensure all required fields exist
                    if (!feature.type) feature.type = 'Feature';
                    if (!feature.properties) feature.properties = {};
                    
                    // Add ID if missing
                    if (!feature.properties.id && !feature.id) {
                        feature.id = `region_${arrayIndex}_${featureIndex}`;
                    }
                    
                    allFeatures.push(feature);
                });
            }
        });
    } else if (data.type === 'FeatureCollection') {
        // If it's already a single FeatureCollection
        allFeatures = data.features || [];
    } else {
        throw new Error('Invalid GeoJSON structure');
    }
    
    // Create final FeatureCollection
    const featureCollection = {
        type: 'FeatureCollection',
        features: allFeatures
    };
    
    // Save normalized file
    fs.writeFileSync(outputPath, JSON.stringify(featureCollection, null, 2));
    
    console.log(`✅ Normalized: ${allFeatures.length} polygons`);
    
    return { valid: allFeatures.length, invalid: 0 };
}

/**
 * Main execution function
 */
async function main() {
    try {
        console.log('🚀 Starting GeoJSON normalization...\n');
        
        // Ensure output directory exists
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }
        
        // Normalize both files
        const pointsResult = normalizeMapLocations();
        console.log('');
        const polygonsResult = normalizeProvincias();
        
        // Summary
        console.log('\n📊 Summary:');
        console.log(`   Points: ${pointsResult.valid} valid, ${pointsResult.invalid} invalid`);
        console.log(`   Polygons: ${polygonsResult.valid} valid, ${polygonsResult.invalid} invalid`);
        console.log('\n🎉 Normalization completed successfully!');
        console.log(`\n📁 Output files:`);
        console.log(`   - ${path.join(OUTPUT_DIR, 'points.geojson')}`);
        console.log(`   - ${path.join(OUTPUT_DIR, 'polygons.geojson')}`);
        
    } catch (error) {
        console.error('❌ Error during normalization:', error.message);
        process.exit(1);
    }
}

// Execute if run directly
if (require.main === module) {
    main();
}

module.exports = { normalizeMapLocations, normalizeProvincias };
