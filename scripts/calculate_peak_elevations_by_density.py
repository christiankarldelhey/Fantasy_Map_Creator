#!/usr/bin/env python3
"""
Calculate peak elevations based on neighbor density
Updates elevation_final in elevation_points table
"""

import psycopg2
import numpy as np
from scipy.spatial import KDTree
import os
from dotenv import load_dotenv

load_dotenv()

def connect_db():
    """Connect to PostgreSQL database"""
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        database=os.getenv('DB_NAME', 'middle_earth'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'postgres'),
        port=os.getenv('DB_PORT', '5432')
    )

def calculate_peak_elevations():
    """Calculate peak elevations based on neighbor density"""
    print('=' * 60)
    print('CALCULATING PEAK ELEVATIONS BY NEIGHBOR DENSITY')
    print('=' * 60)
    print()
    
    conn = connect_db()
    cursor = conn.cursor()
    
    # Load all elevation points
    print('Loading elevation points...')
    cursor.execute("""
        SELECT 
            id,
            ST_X(geom) as lon,
            ST_Y(geom) as lat,
            altitude_type
        FROM elevation_points
        ORDER BY id
    """)
    
    points = cursor.fetchall()
    print(f'Loaded {len(points)} points\n')
    
    if len(points) == 0:
        print('❌ No elevation points found.')
        return
    
    # Extract data
    ids = np.array([p[0] for p in points])
    lons = np.array([float(p[1]) for p in points])
    lats = np.array([float(p[2]) for p in points])
    types = np.array([p[3] for p in points])
    
    # Define radii of influence in degrees
    INFLUENCE_RADII = {
        'plain': 1.5 / 111,
        'hills': 1.5 / 111,
        'mountains_low': 7.5 / 111,
        'mountains_med': 10.0 / 111,
        'mountains_high': 12.5 / 111
    }
    
    # Define elevation ranges by type
    ELEVATION_RANGES = {
        'plain': (100, 150),
        'hills': (300, 700),
        'mountains_low': (1500, 1700),
        'mountains_med': (2500, 2800),
        'mountains_high': (4000, 4800)
    }
    
    # Build KDTree for spatial queries
    print('Building KDTree...')
    coords = np.column_stack((lons, lats))
    tree = KDTree(coords)
    print('✅ KDTree built\n')
    
    # Calculate elevations based on neighbor density
    print('Calculating elevations based on neighbor density...')
    elevations = np.zeros(len(points), dtype=np.float32)
    max_neighbors = 20  # Maximum expected neighbors for normalization
    
    updates = []
    
    for i, (point_id, lon, lat, ptype) in enumerate(points):
        radius = INFLUENCE_RADII.get(ptype, 0.0135)
        
        # Find neighbors within radius
        neighbors = tree.query_ball_point([lon, lat], r=radius)
        neighbor_count = len(neighbors) - 1  # Exclude the peak itself
        
        # Normalize density (0 = isolated, 1 = very dense)
        density = min(neighbor_count / max_neighbors, 1.0)
        
        # Get elevation range for this type
        min_elev, max_elev = ELEVATION_RANGES.get(ptype, (0, 100))
        
        # Calculate elevation: more neighbors = higher elevation
        peak_elevation = min_elev + (max_elev - min_elev) * density
        
        elevations[i] = peak_elevation
        updates.append((float(peak_elevation), int(point_id)))
        
        if (i + 1) % 1000 == 0:
            print(f'  Processed {i + 1}/{len(points)} peaks...')
    
    print(f'✅ Calculated elevations for {len(points)} peaks\n')
    
    # Statistics
    print('Elevation Statistics by Type:')
    for ptype in ['plain', 'hills', 'mountains_low', 'mountains_med', 'mountains_high']:
        type_mask = types == ptype
        if np.any(type_mask):
            type_elevs = elevations[type_mask]
            print(f'  {ptype:20s}: min={type_elevs.min():.1f}m, max={type_elevs.max():.1f}m, mean={type_elevs.mean():.1f}m')
    print()
    
    # Update database
    print('Updating elevation_final in database...')
    cursor.executemany("""
        UPDATE elevation_points
        SET elevation_final = %s
        WHERE id = %s
    """, updates)
    
    conn.commit()
    print(f'✅ Updated {len(updates)} peaks in database\n')
    
    cursor.close()
    conn.close()
    
    print('=' * 60)
    print('PEAK ELEVATION CALCULATION COMPLETE')
    print('=' * 60)

if __name__ == '__main__':
    calculate_peak_elevations()
