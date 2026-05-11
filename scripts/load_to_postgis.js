const fs = require('fs');
const path = require('path');
const pgp = require('pg-promise')();

// Database connection configuration
const db = pgp({
    host: 'localhost',
    port: 5432,
    database: 'middle_earth',
    user: process.env.USER || 'postgres',
    password: process.env.PGPASSWORD || ''
});

// Paths configuration
const DATA_DIR = path.join(__dirname, '..', 'data', 'normalized');

/**
 * Load point features (locations) into PostgreSQL
 */
async function loadPoints() {
    console.log('📍 Loading points...');
    
    const geojsonPath = path.join(DATA_DIR, 'points.geojson');
    
    if (!fs.existsSync(geojsonPath)) {
        console.log('⚠️  points.geojson not found, skipping points load');
        return { loaded: 0, errors: 0 };
    }
    
    const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
    
    if (!geojson.features || geojson.features.length === 0) {
        console.log('⚠️  No features found in points.geojson');
        return { loaded: 0, errors: 0 };
    }
    
    let loaded = 0;
    let errors = 0;
    
    for (const feature of geojson.features) {
        try {
            const [lon, lat] = feature.geometry.coordinates;
            const props = feature.properties;
            
            await db.none(`
                INSERT INTO locations (
                    external_id, 
                    name, 
                    location_type, 
                    population, 
                    description, 
                    race, 
                    region,
                    geom
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_MakePoint($8, $9), 4326))
            `, [
                feature.id,
                props.name || 'Unnamed',
                props.type || props.tipo || null,  // Support both translated and original
                props.pop || null,
                props.desc || null,
                props.race || props.raza || null,  // Support both translated and original
                props.region || null,
                lon,
                lat
            ]);
            
            loaded++;
        } catch (error) {
            console.error(`❌ Error loading feature ${feature.id}:`, error.message);
            errors++;
        }
    }
    
    console.log(`✅ Loaded ${loaded} points`);
    if (errors > 0) {
        console.log(`⚠️  Errors: ${errors}`);
    }
    
    return { loaded, errors };
}

/**
 * Load polygon features (regions) into PostgreSQL
 */
async function loadPolygons() {
    console.log('🗺️  Loading polygons...');
    
    const geojsonPath = path.join(DATA_DIR, 'polygons.geojson');
    
    if (!fs.existsSync(geojsonPath)) {
        console.log('⚠️  polygons.geojson not found, skipping polygons load');
        return { loaded: 0, errors: 0 };
    }
    
    const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
    
    if (!geojson.features || geojson.features.length === 0) {
        console.log('⚠️  No features found in polygons.geojson');
        return { loaded: 0, errors: 0 };
    }
    
    let loaded = 0;
    let errors = 0;
    
    for (const feature of geojson.features) {
        try {
            const geomGeoJSON = JSON.stringify(feature.geometry);
            const props = feature.properties;
            
            await db.none(`
                INSERT INTO regions (
                    name, 
                    region_type, 
                    geom
                )
                VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326))
            `, [
                props.name || feature.id || 'Unnamed',
                props.type || 'province',
                geomGeoJSON
            ]);
            
            loaded++;
        } catch (error) {
            console.error(`❌ Error loading polygon:`, error.message);
            errors++;
        }
    }
    
    console.log(`✅ Loaded ${loaded} polygons`);
    if (errors > 0) {
        console.log(`⚠️  Errors: ${errors}`);
    }
    
    return { loaded, errors };
}

/**
 * Load biome features into PostgreSQL
 */
async function loadBiomes() {
    console.log('🌿 Loading biomes...');
    
    const geojsonPath = path.join(DATA_DIR, 'biomes.geojson');
    
    // Check if file exists
    if (!fs.existsSync(geojsonPath)) {
        console.log('⚠️  biomes.geojson not found, skipping biomes load');
        return { loaded: 0, errors: 0 };
    }
    
    const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
    
    if (!geojson.features || geojson.features.length === 0) {
        console.log('⚠️  No features found in biomes.geojson');
        return { loaded: 0, errors: 0 };
    }
    
    let loaded = 0;
    let errors = 0;
    
    for (const feature of geojson.features) {
        try {
            const geomGeoJSON = JSON.stringify(feature.geometry);
            const props = feature.properties;
            
            await db.none(`
                INSERT INTO biomes (
                    name,
                    type,
                    description,
                    geom
                )
                VALUES ($1, $2, $3, ST_SetSRID(ST_GeomFromGeoJSON($4), 4326))
            `, [
                props.name || feature.id || 'Unnamed',
                props.type || null,
                props.description || null,
                geomGeoJSON
            ]);
            
            loaded++;
        } catch (error) {
            console.error(`❌ Error loading biome ${feature.id}:`, error.message);
            errors++;
        }
    }
    
    console.log(`✅ Loaded ${loaded} biomes`);
    if (errors > 0) {
        console.log(`⚠️  Errors: ${errors}`);
    }
    
    return { loaded, errors };
}

/**
 * Calculate areas for all regions and biomes
 */
async function calculateAreas() {
    console.log('📏 Calculating areas...');
    
    try {
        // Calculate regions areas
        const regionResult = await db.one(`
            UPDATE regions
            SET area_km2 = ST_Area(geom::geography) / 1000000
            WHERE area_km2 IS NULL
            RETURNING COUNT(*) as updated
        `);
        
        console.log(`✅ Areas calculated for ${regionResult.updated || 'all'} regions`);
        
        // Calculate biomes areas
        const biomeResult = await db.one(`
            UPDATE biomes
            SET area_km2 = ST_Area(geom::geography) / 1000000
            WHERE area_km2 IS NULL
            RETURNING COUNT(*) as updated
        `);
        
        console.log(`✅ Areas calculated for ${biomeResult.updated || 'all'} biomes`);
        
        return { success: true };
    } catch (error) {
        console.error('❌ Error calculating areas:', error.message);
        return { success: false };
    }
}

/**
 * Display statistics about loaded data
 */
async function displayStatistics() {
    console.log('\n📊 Database Statistics:');
    
    try {
        // Count locations
        const locationsCount = await db.one('SELECT COUNT(*) as count FROM locations');
        console.log(`   Locations: ${locationsCount.count}`);
        
        // Count by type
        const typeStats = await db.any(`
            SELECT location_type, COUNT(*) as count
            FROM locations
            WHERE location_type IS NOT NULL
            GROUP BY location_type
            ORDER BY count DESC
        `);
        
        if (typeStats.length > 0) {
            console.log('   By type:');
            typeStats.forEach(stat => {
                console.log(`      - ${stat.location_type}: ${stat.count}`);
            });
        }
        
        // Count regions
        const regionsCount = await db.one('SELECT COUNT(*) as count FROM regions');
        console.log(`   Regions: ${regionsCount.count}`);
        
        // Total area for regions
        const regionArea = await db.oneOrNone(`
            SELECT ROUND(SUM(area_km2)::numeric, 2) as total_area
            FROM regions
            WHERE area_km2 IS NOT NULL
        `);
        
        if (regionArea && regionArea.total_area) {
            console.log(`   Regions total area: ${regionArea.total_area} km²`);
        }
        
        // Count biomes
        const biomesCount = await db.one('SELECT COUNT(*) as count FROM biomes');
        console.log(`   Biomes: ${biomesCount.count}`);
        
        // Count biomes by type
        const biomeTypeStats = await db.any(`
            SELECT type, COUNT(*) as count
            FROM biomes
            WHERE type IS NOT NULL
            GROUP BY type
            ORDER BY count DESC
        `);
        
        if (biomeTypeStats.length > 0) {
            console.log('   Biomes by type:');
            biomeTypeStats.forEach(stat => {
                console.log(`      - ${stat.type}: ${stat.count}`);
            });
        }
        
        // Total area for biomes
        const biomeArea = await db.oneOrNone(`
            SELECT ROUND(SUM(area_km2)::numeric, 2) as total_area
            FROM biomes
            WHERE area_km2 IS NOT NULL
        `);
        
        if (biomeArea && biomeArea.total_area) {
            console.log(`   Biomes total area: ${biomeArea.total_area} km²`);
        }
        
    } catch (error) {
        console.error('❌ Error getting statistics:', error.message);
    }
}

/**
 * Main execution function
 */
async function main() {
    try {
        console.log('🚀 Starting data load to PostGIS...\n');
        
        // Load points
        const pointsResult = await loadPoints();
        console.log('');
        
        // Load polygons
        const polygonsResult = await loadPolygons();
        console.log('');
        
        // Load biomes
        const biomesResult = await loadBiomes();
        console.log('');
        
        // Calculate areas
        await calculateAreas();
        
        // Display statistics
        await displayStatistics();
        
        // Summary
        console.log('\n🎉 Data load completed successfully!');
        console.log(`\n📈 Summary:`);
        console.log(`   Points loaded: ${pointsResult.loaded}`);
        console.log(`   Polygons loaded: ${polygonsResult.loaded}`);
        console.log(`   Biomes loaded: ${biomesResult.loaded}`);
        
        const totalErrors = pointsResult.errors + polygonsResult.errors + biomesResult.errors;
        if (totalErrors > 0) {
            console.log(`   Total errors: ${totalErrors}`);
        }
        
    } catch (error) {
        console.error('\n❌ Fatal error during data load:', error.message);
        process.exit(1);
    } finally {
        pgp.end();
    }
}

// Execute if run directly
if (require.main === module) {
    main();
}

module.exports = { loadPoints, loadPolygons, loadBiomes, calculateAreas };
