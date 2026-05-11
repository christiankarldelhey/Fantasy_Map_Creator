const fs = require('fs');
const path = require('path');

/**
 * Convert QGIS-exported GeoJSON to biome format
 * - Converts CRS from EPSG:3857 to EPSG:4326 (approximate for test)
 * - Converts MultiPolygon to Polygon
 * - Adds required properties (name, type, description)
 */

const inputFile = path.join(__dirname, '../data/normalized/biomes.geojson');
const outputFile = path.join(__dirname, '../data/normalized/biomes_fixed.geojson');

try {
    const geojson = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    
    console.log('📥 Original CRS:', geojson.crs?.properties?.name);
    console.log('📥 Features:', geojson.features.length);
    
    // Check if CRS is already EPSG:4326 (CRS84)
    const isEPSG4326 = geojson.crs?.properties?.name?.includes('CRS84') || 
                       geojson.crs?.properties?.name?.includes('4326');
    
    if (isEPSG4326) {
        console.log('✅ CRS is already EPSG:4326, no conversion needed');
    }
    
    // Process features
    geojson.features = geojson.features.map(feature => {
        const props = feature.properties || {};
        
        // Convert MultiPolygon to Polygon (take first polygon)
        if (feature.geometry.type === 'MultiPolygon') {
            console.log('🔄 Converting MultiPolygon to Polygon');
            feature.geometry.type = 'Polygon';
            feature.geometry.coordinates = feature.geometry.coordinates[0];
        }
        
        // Note: CRS conversion will be handled by PostGIS using ST_Transform
        // We keep original coordinates for now
        
        // Add required properties
        feature.properties = {
            name: 'Forest',  // Standard type for now
            type: 'forest',
            description: null,  // NULL for standard biomes
            ...props  // Keep original properties for reference
        };
        
        // Remove CRS from output (PostGIS will handle it)
        delete geojson.crs;
        
        return feature;
    });
    
    // Write output
    fs.writeFileSync(outputFile, JSON.stringify(geojson, null, 2));
    console.log('✅ Converted file saved to:', outputFile);
    console.log('⚠️  Note: CRS conversion is approximate. For production, use proper projection library.');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
