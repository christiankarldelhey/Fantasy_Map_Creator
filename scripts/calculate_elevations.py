#!/usr/bin/env python3
"""
Calculate final elevations for elevation points
Combines base elevation, neighbor density, and Perlin noise
"""

import psycopg2
import os
from dotenv import load_dotenv
from noise import pnoise2

load_dotenv()

# Elevation ranges by altitude type
ELEVATION_RANGES = {
    'plain': {'min': 0, 'max': 100, 'base': 50},
    'hills': {'min': 100, 'max': 300, 'base': 200},
    'mountains_low': {'min': 300, 'max': 1000, 'base': 650},
    'mountains_med': {'min': 1000, 'max': 2500, 'base': 1750},
    'mountains_high': {'min': 2500, 'max': 4500, 'base': 3500}
}

def connect_db():
    """Connect to PostgreSQL database"""
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        database=os.getenv('DB_NAME', 'middle_earth'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'postgres'),
        port=os.getenv('DB_PORT', '5432')
    )

def calculate_elevations():
    """Calculate final elevations for all points"""
    print('=' * 60)
    print('CALCULATING ELEVATIONS')
    print('=' * 60)
    print()
    
    conn = connect_db()
    cursor = conn.cursor()
    
    # Get all points
    print('Loading elevation points...')
    cursor.execute("""
        SELECT id, altitude_type, neighbor_density, 
               ST_X(geom) as lon, ST_Y(geom) as lat
        FROM elevation_points
        ORDER BY id
    """)
    
    points = cursor.fetchall()
    print(f'Loaded {len(points)} points\n')
    
    print('Calculating elevations...')
    print('(Formula: base + density_adjustment + perlin_noise)\n')
    
    updated = 0
    
    for i, point in enumerate(points):
        point_id, altitude_type, density, lon, lat = point
        
        if altitude_type not in ELEVATION_RANGES:
            print(f'Warning: Unknown altitude type "{altitude_type}" for point {point_id}')
            continue
        
        # Get range info
        range_info = ELEVATION_RANGES[altitude_type]
        range_size = range_info['max'] - range_info['min']
        
        # 1. Base elevation (midpoint of range)
        elev_base = range_info['base']
        
        # 2. Density adjustment (30% of range max)
        # More neighbors = higher peak
        density_value = float(density) if density is not None else 0.0
        elev_density = density_value * range_size * 0.3
        
        # 3. Perlin noise (±20% of range)
        # Natural variation
        perlin_value = pnoise2(lon * 10, lat * 10, octaves=3, persistence=0.5, lacunarity=2.0)
        elev_perlin = perlin_value * range_size * 0.2
        
        # 4. Final elevation
        elev_final = elev_base + elev_density + elev_perlin
        
        # Clamp to valid range
        elev_final = max(range_info['min'], min(range_info['max'], elev_final))
        
        # Update in database
        cursor.execute("""
            UPDATE elevation_points
            SET elevation_base = %s,
                elevation_density = %s,
                elevation_perlin = %s,
                elevation_final = %s
            WHERE id = %s
        """, (elev_base, elev_density, elev_perlin, elev_final, point_id))
        
        updated += 1
        
        if (i + 1) % 1000 == 0:
            print(f'  Processed {i + 1}/{len(points)} points...')
            conn.commit()
    
    conn.commit()
    print(f'\n✅ Updated {updated} points\n')
    
    # Show statistics
    print('Elevation Statistics:')
    print('─' * 80)
    print()
    
    cursor.execute("""
        SELECT 
            altitude_type,
            COUNT(*) as points,
            ROUND(MIN(elevation_final)::numeric, 0) as min_elev,
            ROUND(AVG(elevation_final)::numeric, 0) as avg_elev,
            ROUND(MAX(elevation_final)::numeric, 0) as max_elev,
            ROUND(AVG(elevation_base)::numeric, 0) as avg_base,
            ROUND(AVG(elevation_density)::numeric, 0) as avg_density_adj,
            ROUND(AVG(elevation_perlin)::numeric, 0) as avg_perlin_adj
        FROM elevation_points
        GROUP BY altitude_type
        ORDER BY 
            CASE altitude_type
                WHEN 'mountains_high' THEN 5
                WHEN 'mountains_med' THEN 4
                WHEN 'mountains_low' THEN 3
                WHEN 'hills' THEN 2
                WHEN 'plain' THEN 1
                ELSE 0
            END DESC
    """)
    
    results = cursor.fetchall()
    
    print('Type              | Points | Min    | Avg    | Max    | Base | +Density | +Perlin')
    print('─' * 80)
    
    for row in results:
        altitude_type, points, min_e, avg_e, max_e, avg_base, avg_dens, avg_perl = row
        type_str = altitude_type.ljust(17)
        points_str = str(points).rjust(6)
        min_str = str(int(min_e)).rjust(6)
        avg_str = str(int(avg_e)).rjust(6)
        max_str = str(int(max_e)).rjust(6)
        base_str = str(int(avg_base)).rjust(4)
        dens_str = str(int(avg_dens)).rjust(8)
        perl_str = str(int(avg_perl)).rjust(7)
        
        print(f'{type_str} | {points_str} | {min_str} | {avg_str} | {max_str} | {base_str} | {dens_str} | {perl_str}')
    
    cursor.close()
    conn.close()
    
    print()
    print('=' * 60)
    print('ELEVATION CALCULATION COMPLETE')
    print('=' * 60)

if __name__ == '__main__':
    try:
        calculate_elevations()
    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()
        exit(1)
