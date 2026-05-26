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
const GEOJSON_DIR = path.join(__dirname, '..', 'data', 'geojson');

/**
 * Detect the SRID/CRS of a GeoJSON object
 * @param {Object} geojson
 * @returns {number}
 */
function getSRID(geojson) {
    if (geojson.crs && geojson.crs.properties && geojson.crs.properties.name) {
        const crsName = geojson.crs.properties.name;
        if (crsName.includes('3857')) {
            return 3857;
        }
    }
    return 4326; // Default to CRS84 / EPSG:4326
}

/**
 * Prepare database schema to accept both Polygon and MultiPolygon (coerce to generic Geometry)
 */
async function prepareSchema() {
    console.log('🏗️  Preparing schema for flexible geometry types (Polygon/MultiPolygon)...');
    try {
        await db.none(`
            ALTER TABLE regions ALTER COLUMN geom TYPE GEOMETRY(Geometry, 4326);
            ALTER TABLE biomes ALTER COLUMN geom TYPE GEOMETRY(Geometry, 4326);
            ALTER TABLE paths ALTER COLUMN geom TYPE GEOMETRY(Geometry, 4326);
        `);
        console.log('✅ Schema prepared successfully.');
    } catch (error) {
        console.warn('⚠️  Could not alter columns to generic Geometry. Continuing with original schema constraints:', error.message);
    }
}

/**
 * Clear existing tables before loading new data
 */
async function clearTables() {
    console.log('🧹 Clearing existing spatial tables...');
    await db.none('TRUNCATE TABLE paths, regions, biomes RESTART IDENTITY CASCADE;');
    console.log('✅ Tables cleared successfully.');
}

/**
 * Load regions (polygons)
 */
async function loadRegions() {
    console.log('🗺️  Loading regions...');
    const geojsonPath = path.join(GEOJSON_DIR, 'regions', 'regions.geojson');
    
    if (!fs.existsSync(geojsonPath)) {
        console.log('⚠️  regions.geojson not found');
        return { loaded: 0, errors: 0 };
    }
    
    const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
    const srid = getSRID(geojson);
    
    let loaded = 0;
    let errors = 0;
    
    const geomSql = srid === 3857 
        ? 'ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($4), 3857), 4326)'
        : 'ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)';
        
    for (const feature of geojson.features) {
        try {
            const props = feature.properties;
            await db.none(`
                INSERT INTO regions (name, region_type, ruler, geom)
                VALUES ($1, $2, $3, ${geomSql})
            `, [
                props.name || 'Unnamed Region',
                'province',
                props.kingdom || null,
                JSON.stringify(feature.geometry)
            ]);
            loaded++;
        } catch (error) {
            console.error(`❌ Error loading region feature:`, error.message);
            errors++;
        }
    }
    
    console.log(`✅ Loaded ${loaded} regions (SRID source: ${srid})`);
    return { loaded, errors };
}

/**
 * Load roads & water paths (LineStrings)
 */
async function loadPaths() {
    console.log('🛣️  Loading paths (roads and water streams/rivers)...');
    
    const pathsToLoad = [
        // Roads
        { dir: 'roads', file: 'royal_road.geojson', type: 'road', terrain: 'plains', diff: 1, defaultName: 'Royal Road' },
        { dir: 'roads', file: 'regular_road.geojson', type: 'road', terrain: 'plains', diff: 1, defaultName: 'Regular Road' },
        { dir: 'roads', file: 'main_road.geojson', type: 'road', terrain: 'plains', diff: 2, defaultName: 'Main Road' },
        { dir: 'roads', file: 'trails.geojson', type: 'road', terrain: 'hills', diff: 3, defaultName: 'Trail' },
        // Water lines
        { dir: 'water', file: 'rivers.geojson', type: 'river', terrain: 'water', diff: 4, defaultName: 'River' },
        { dir: 'water', file: 'streams.geojson', type: 'stream', terrain: 'water', diff: 3, defaultName: 'Stream' }
    ];
    
    let totalLoaded = 0;
    let totalErrors = 0;
    
    for (const config of pathsToLoad) {
        const filePath = path.join(GEOJSON_DIR, config.dir, config.file);
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️  File not found: ${config.dir}/${config.file}, skipping`);
            continue;
        }
        
        console.log(`   Loading ${config.dir}/${config.file}...`);
        const geojson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const srid = getSRID(geojson);
        
        const geomSql = srid === 3857 
            ? 'ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($5), 3857), 4326)'
            : 'ST_SetSRID(ST_GeomFromGeoJSON($5), 4326)';
            
        let fileLoaded = 0;
        
        for (const feature of geojson.features) {
            try {
                const props = feature.properties;
                const name = props.name || props.label || config.defaultName;
                
                await db.none(`
                    INSERT INTO paths (name, path_type, terrain_type, difficulty, geom)
                    VALUES ($1, $2, $3, $4, ${geomSql})
                `, [
                    name,
                    config.type,
                    config.terrain,
                    config.diff,
                    JSON.stringify(feature.geometry)
                ]);
                fileLoaded++;
                totalLoaded++;
            } catch (error) {
                console.error(`❌ Error loading path feature in ${config.file}:`, error.message);
                totalErrors++;
            }
        }
        console.log(`   ✅ Loaded ${fileLoaded} features from ${config.file} (SRID source: ${srid})`);
    }
    
    return { loaded: totalLoaded, errors: totalErrors };
}

/**
 * Load biomes, altitude, and lakes (Polygons/MultiPolygons)
 */
async function loadBiomes() {
    console.log('🌿 Loading biomes, altitude zones, and lakes...');
    
    const biomesToLoad = [
        // Biomes
        { dir: 'biomes', file: 'forest.geojson', type: 'forest', defaultName: 'Forest' },
        { dir: 'biomes', file: 'desert.geojson', type: 'desert', defaultName: 'Desert' },
        { dir: 'biomes', file: 'marshes.geojson', type: 'marsh', defaultName: 'Marsh' },
        // Lakes
        { dir: 'water', file: 'lakes.geojson', type: 'lake', defaultName: 'Lake' },
        // Altitude
        { dir: 'altitude', file: 'hills.geojson', type: 'hills', defaultName: 'Hills' },
        { dir: 'altitude', file: 'mountains.geojson', type: 'mountains', defaultName: 'Mountains' },
        { dir: 'altitude', file: 'mountain_low.geojson', type: 'mountains_low', defaultName: 'Low Mountains' },
        { dir: 'altitude', file: 'mountain_med.geojson', type: 'mountains_med', defaultName: 'Medium Mountains' },
        { dir: 'altitude', file: 'mountain_high.geojson', type: 'mountains_high', defaultName: 'High Mountains' }
    ];
    
    let totalLoaded = 0;
    let totalErrors = 0;
    
    for (const config of biomesToLoad) {
        const filePath = path.join(GEOJSON_DIR, config.dir, config.file);
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️  File not found: ${config.dir}/${config.file}, skipping`);
            continue;
        }
        
        console.log(`   Loading ${config.dir}/${config.file}...`);
        const geojson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const srid = getSRID(geojson);
        
        const geomSql = srid === 3857 
            ? 'ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($4), 3857), 4326)'
            : 'ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)';
            
        let fileLoaded = 0;
        
        for (const feature of geojson.features) {
            try {
                const props = feature.properties || {};
                const name = props.name || props.label || config.defaultName;
                
                await db.none(`
                    INSERT INTO biomes (name, type, description, geom)
                    VALUES ($1, $2, $3, ${geomSql})
                `, [
                    name,
                    config.type,
                    props.desc || props.description || null,
                    JSON.stringify(feature.geometry)
                ]);
                fileLoaded++;
                totalLoaded++;
            } catch (error) {
                console.error(`❌ Error loading biome feature in ${config.file}:`, error.message);
                totalErrors++;
            }
        }
        console.log(`   ✅ Loaded ${fileLoaded} features from ${config.file} (SRID source: ${srid})`);
    }
    
    return { loaded: totalLoaded, errors: totalErrors };
}

/**
 * Calculate areas for all regions and biomes
 */
async function calculateAreas() {
    console.log('📏 Calculating areas...');
    
    try {
        // Calculate regions areas
        const regionResult = await db.result(`
            UPDATE regions
            SET area_km2 = ST_Area(geom::geography) / 1000000
        `);
        
        console.log(`✅ Areas calculated for ${regionResult.rowCount || 0} regions`);
        
        // Calculate biomes areas
        const biomeResult = await db.result(`
            UPDATE biomes
            SET area_km2 = ST_Area(geom::geography) / 1000000
        `);
        
        console.log(`✅ Areas calculated for ${biomeResult.rowCount || 0} biomes`);
        
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
        // Count locations (historical/existing)
        const locationsCount = await db.one('SELECT COUNT(*) as count FROM locations');
        console.log(`   Locations: ${locationsCount.count}`);
        
        // Count regions
        const regionsCount = await db.one('SELECT COUNT(*) as count FROM regions');
        console.log(`   Regions: ${regionsCount.count}`);
        
        // Count biomes
        const biomesCount = await db.one('SELECT COUNT(*) as count FROM biomes');
        console.log(`   Biomes/Features: ${biomesCount.count}`);
        
        // Count biomes by type
        const biomeTypeStats = await db.any(`
            SELECT type, COUNT(*) as count
            FROM biomes
            GROUP BY type
            ORDER BY count DESC
        `);
        
        if (biomeTypeStats.length > 0) {
            console.log('   Biomes/Features by type:');
            biomeTypeStats.forEach(stat => {
                console.log(`      - ${stat.type}: ${stat.count}`);
            });
        }
        
        // Count paths
        const pathsCount = await db.one('SELECT COUNT(*) as count FROM paths');
        console.log(`   Paths (roads/streams): ${pathsCount.count}`);
        
        // Count paths by type
        const pathTypeStats = await db.any(`
            SELECT path_type, COUNT(*) as count
            FROM paths
            GROUP BY path_type
            ORDER BY count DESC
        `);
        
        if (pathTypeStats.length > 0) {
            console.log('   Paths by type:');
            pathTypeStats.forEach(stat => {
                console.log(`      - ${stat.path_type}: ${stat.count}`);
            });
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
        console.log('🚀 Starting Middle Earth raw GeoJSON load to PostGIS...\n');
        
        // Prepare generic columns
        await prepareSchema();
        
        // Truncate before load
        await clearTables();
        
        // Load features
        const regionsResult = await loadRegions();
        console.log('');
        
        const pathsResult = await loadPaths();
        console.log('');
        
        const biomesResult = await loadBiomes();
        console.log('');
        
        // Calculate areas
        await calculateAreas();
        
        // Display statistics
        await displayStatistics();
        
        // Summary
        console.log('\n🎉 Data load completed successfully!');
        console.log(`\n📈 Summary:`);
        console.log(`   Regions loaded: ${regionsResult.loaded}`);
        console.log(`   Paths loaded: ${pathsResult.loaded}`);
        console.log(`   Biomes/features loaded: ${biomesResult.loaded}`);
        
        const totalErrors = regionsResult.errors + pathsResult.errors + biomesResult.errors;
        if (totalErrors > 0) {
            console.log(`   ⚠️  Total errors encountered: ${totalErrors}`);
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

module.exports = { loadRegions, loadPaths, loadBiomes, calculateAreas };
