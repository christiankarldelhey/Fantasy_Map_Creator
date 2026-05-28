#!/usr/bin/env python3
"""
Generate DEM from elevation points using dynamic hybrid interpolation
Creates a realistic, geographically precise raster grid with base layers, 
Perlin noise, and radial influence cones for peaks and ranges.
"""

import psycopg2
import numpy as np
from scipy.spatial import KDTree
from noise import pnoise2
from osgeo import gdal, osr
import os
from dotenv import load_dotenv
from pathlib import Path
import shapely.wkb
from shapely.geometry import Point
from shapely.strtree import STRtree

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

def generate_dem(resolution=250, output_path=None):
    """
    Generate DEM from elevation points
    
    Args:
        resolution: Grid resolution in meters (default 250m)
        output_path: Output GeoTIFF path
    """
    print('=' * 60)
    print('DEM GENERATION FROM ELEVATION POINTS')
    print('=' * 60)
    print()
    
    if output_path is None:
        project_root = Path(__file__).parent.parent
        output_path = project_root / 'data' / 'dem_elevation.tif'
        output_path.parent.mkdir(parents=True, exist_ok=True)
    
    print(f'Resolution: {resolution}m per pixel')
    print(f'Output: {output_path}\n')
    
    # Connect to database
    conn = connect_db()
    cursor = conn.cursor()
    
    # Load elevation points
    print('Loading elevation points...')
    cursor.execute("""
        SELECT 
            ST_X(geom) as lon,
            ST_Y(geom) as lat,
            elevation_final,
            altitude_type
        FROM elevation_points
        WHERE elevation_final IS NOT NULL
        ORDER BY id
    """)
    
    points = cursor.fetchall()
    print(f'Loaded {len(points)} points with elevations\n')
    
    if len(points) == 0:
        print('❌ No elevation points found. Run calculate_elevations.py first.')
        return
    
    # Extract coordinates, elevations and types
    lons = np.array([float(p[0]) for p in points])
    lats = np.array([float(p[1]) for p in points])
    elevs = np.array([float(p[2]) for p in points])
    types = np.array([p[3] for p in points])
    
    # Radii of influence in degrees (~1 degree ≈ 111km)
    # plain: 1.5 km, hills: 1.5 km, mountains_low: 7.5 km, med: 10.0 km, high: 12.5 km
    INFLUENCE_RADII = {
        'plain': 1.5 / 111,
        'hills': 1.5 / 111,
        'mountains_low': 7.5 / 111,
        'mountains_med': 10.0 / 111,
        'mountains_high': 12.5 / 111
    }
    
    # Map types to numeric values for speed
    type_keys = list(INFLUENCE_RADII.keys())
    radii_arr = np.array([INFLUENCE_RADII[t] for T_key, t in enumerate(types)])
    
    # Determine bounds
    min_lon, max_lon = lons.min(), lons.max()
    min_lat, max_lat = lats.min(), lats.max()
    
    print(f'Bounds:')
    print(f'  Longitude: {min_lon:.4f} to {max_lon:.4f}')
    print(f'  Latitude:  {min_lat:.4f} to {max_lat:.4f}\n')
    
    # Calculate grid dimensions
    lon_range_m = (max_lon - min_lon) * 111000
    lat_range_m = (max_lat - min_lat) * 111000
    
    width = int(lon_range_m / resolution)
    height = int(lat_range_m / resolution)
    
    print(f'Grid dimensions: {width} x {height} pixels')
    print(f'Total pixels: {width * height:,}\n')
    
    # Load altitude layers (polygons)
    print('Loading altitude layers (polygons)...')
    cursor.execute("""
        SELECT altitude_type, ST_AsBinary(geom) as geom_wkb
        FROM altitude_layers
        ORDER BY priority DESC
    """)
    layers_raw = cursor.fetchall()
    print(f'Loaded {len(layers_raw)} altitude layers\n')
    
    # Load into Shapely geometries and STRtree
    print('Building STRtree for altitude layers...')
    layer_geoms = []
    layer_types = []
    for alt_type, geom_wkb in layers_raw:
        geom_obj = shapely.wkb.loads(bytes(geom_wkb))
        layer_geoms.append(geom_obj)
        layer_types.append(alt_type)
        
    layer_tree = STRtree(layer_geoms)
    print('✅ STRtree built\n')

    # Create grid Coordinates arrays
    grid_lon = np.linspace(min_lon, max_lon, width)
    grid_lat = np.linspace(max_lat, min_lat, height)  # reversed for raster (top-left is max_lat)
    
    # Create KDTree for fast spatial queries
    print('Building KDTree for peaks...')
    coords = np.column_stack((lons, lats))
    tree = KDTree(coords)
    print('✅ KDTree built\n')
    
    # Allocate empty array for elevations
    grid_elev = np.zeros((height, width), dtype=np.float32)
    
    # Interpolate elevations row-by-row (chunked) to optimize RAM and speed
    print('Generating DEM using Hybrid Radial-Perlin model...')
    print('(Processing chunked raster grid for optimal memory usage...)\n')
    
    # Define chunk size for row processing
    chunk_size = 100
    max_search_dist = 12.5 / 111  # Max search distance (12.5 km for mountains_high)
    
    for row_start in range(0, height, chunk_size):
        row_end = min(row_start + chunk_size, height)
        chunk_height = row_end - row_start
        
        # Grid meshes for the current chunk
        chunk_lats = grid_lat[row_start:row_end]
        chunk_lon_mesh, chunk_lat_mesh = np.meshgrid(grid_lon, chunk_lats)
        
        # Flatten for processing
        chunk_coords = np.column_stack((chunk_lon_mesh.ravel(), chunk_lat_mesh.ravel()))
        chunk_elevs = np.zeros(len(chunk_coords), dtype=np.float32)
        
        # Query KDTree for all points in chunk
        # Find all peaks within max search distance for each grid cell in chunk
        indices_list = tree.query_ball_point(chunk_coords, r=max_search_dist)
        
        # Compute elevations cell-by-cell in chunk (highly optimized with numpy)
        for idx, (coord, indices) in enumerate(zip(chunk_coords, indices_list)):
            lon_cell, lat_cell = coord
            p_cell = Point(lon_cell, lat_cell)
            
            # Determine which altitude layer polygon contains this point
            intersecting_indices = layer_tree.query(p_cell)
            point_type = 'plain'
            for geom_idx in intersecting_indices:
                if layer_geoms[geom_idx].contains(p_cell):
                    point_type = layer_types[geom_idx]
                    break
            
            # 1. Base terrain depending on altitude layer classification (Polygons)
            if point_type == 'hills':
                # hills: 150m to 200m base (using Perlin noise to provide natural variation)
                base_elev = 150.0 + (pnoise2(lon_cell * 15, lat_cell * 15, octaves=2) * 50.0)
            elif point_type == 'mountains_low':
                # mountains_low: 700m to 1000m base
                base_elev = 700.0 + (pnoise2(lon_cell * 12, lat_cell * 12, octaves=3) * 300.0)
            elif point_type == 'mountains_med':
                # mountains_med: 1700m to 2000m base
                base_elev = 1700.0 + (pnoise2(lon_cell * 10, lat_cell * 10, octaves=3) * 300.0)
            elif point_type == 'mountains_high':
                # mountains_high: 2800m to 3300m base
                base_elev = 2800.0 + (pnoise2(lon_cell * 8, lat_cell * 8, octaves=4) * 500.0)
            else:
                # plain / no layer: 0m to 100m base
                bg_perlin = (pnoise2(lon_cell * 8, lat_cell * 8, octaves=3, persistence=0.5, lacunarity=2.0) + 1.0) * 50.0
                base_elev = max(0.0, bg_perlin)
            
            pixel_base = base_elev
            
            if not indices:
                chunk_elevs[idx] = pixel_base
                continue
                
            # Compute distance to nearby peaks
            peak_coords = coords[indices]
            dists = np.sqrt(np.sum((peak_coords - coord) ** 2, axis=1))
            
            # Filter properties of nearby peaks
            peak_elevs = elevs[indices]
            peak_types = types[indices]
            peak_radii = radii_arr[indices]
            
            # Determine closest peak
            closest_idx = np.argmin(dists)
            closest_dist = dists[closest_idx]
            closest_type = peak_types[closest_idx]
            closest_elev = peak_elevs[closest_idx]
            closest_radius = peak_radii[closest_idx]
            
            # 2. Cones and peak accumulation
            final_peak_val = pixel_base
            
            # Handle peaks depending on class (Plain/Hills vs Mountain ranges)
            if 'mountains' in closest_type:
                # Mountains form continuous chains using IDW (Inverse Distance Weighting)
                mountain_indices = [idx_p for idx_p, t in enumerate(peak_types) if 'mountains' in t]
                if mountain_indices:
                    m_dists = dists[mountain_indices]
                    m_elevs = peak_elevs[mountain_indices]
                    m_radii = peak_radii[mountain_indices]
                    
                    # Weights inverse of distance (clamped to prevent div by zero)
                    eps = 0.001
                    weights = 1.0 / (m_dists + eps) ** 2
                    
                    # Apply influence radius weight
                    influence = np.maximum(0.0, 1.0 - m_dists / m_radii) ** 2
                    weights *= influence
                    
                    sum_weights = np.sum(weights)
                    if sum_weights > 0.0:
                        idw_elev = np.sum(m_elevs * weights) / sum_weights
                        # Blend the IDW mountain ridge with the base
                        max_influence = np.max(influence)
                        final_peak_val = idw_elev * max_influence + pixel_base * (1.0 - max_influence)
            else:
                # Plains / Hills form discrete peaks (radial cones)
                # Compute contribution of nearest plain/hill peaks
                cone_vals = []
                for p_dist, p_elev, p_radius in zip(dists, peak_elevs, peak_radii):
                    if p_dist < p_radius:
                        # Decay factor: (1 - d/R)^2 for sharp peak and smooth base
                        decay = (1.0 - p_dist / p_radius) ** 2
                        # The cono rises from the pixel_base up to peak_elev
                        cone_elev = pixel_base + (p_elev - pixel_base) * decay
                        cone_vals.append(cone_elev)
                
                if cone_vals:
                    final_peak_val = max(cone_vals)
            
            chunk_elevs[idx] = max(pixel_base, final_peak_val)
            
        # Write chunk back to main grid
        grid_elev[row_start:row_end, :] = chunk_elevs.reshape((chunk_height, width))
        print(f'  Processed rows {row_start} to {row_end} of {height} ({row_end/height*100:.1f}%)')
        
    print('✅ Interpolation complete\n')
    
    # Replace NaN values with 0
    grid_elev = np.nan_to_num(grid_elev, nan=0.0)
    
    # Ensure non-negative elevations
    grid_elev = np.maximum(grid_elev, 0)
    
    # Statistics
    print('DEM Statistics:')
    print('─' * 60)
    print(f'  Min elevation: {grid_elev.min():.1f}m')
    print(f'  Max elevation: {grid_elev.max():.1f}m')
    print(f'  Mean elevation: {grid_elev.mean():.1f}m')
    print(f'  Std deviation: {grid_elev.std():.1f}m\n')
    
    # Export to GeoTIFF
    print(f'Exporting to GeoTIFF: {output_path}')
    
    driver = gdal.GetDriverByName('GTiff')
    dataset = driver.Create(
        str(output_path),
        width,
        height,
        1,
        gdal.GDT_Float32,
        options=['COMPRESS=LZW', 'TILED=YES']
    )
    
    # Set geotransform
    pixel_width = (max_lon - min_lon) / width
    pixel_height = (max_lat - min_lat) / height
    
    geotransform = (
        min_lon,           # top left x
        pixel_width,       # w-e pixel resolution
        0,                 # rotation, 0 if image is "north up"
        max_lat,           # top left y
        0,                 # rotation, 0 if image is "north up"
        -pixel_height      # n-s pixel resolution (negative)
    )
    
    dataset.SetGeoTransform(geotransform)
    
    # Set projection (WGS84)
    srs = osr.SpatialReference()
    srs.ImportFromEPSG(4326)
    dataset.SetProjection(srs.ExportToWkt())
    
    # Write data
    band = dataset.GetRasterBand(1)
    band.WriteArray(grid_elev)
    band.SetNoDataValue(0)
    
    # Add metadata
    dataset.SetMetadataItem('RESOLUTION', str(resolution))
    dataset.SetMetadataItem('UNIT', 'meters')
    dataset.SetMetadataItem('SOURCE', 'manual_elevation_points')
    dataset.SetMetadataItem('NUM_POINTS', str(len(points)))
    dataset.SetMetadataItem('INTERPOLATION', 'cubic')
    
    # Flush and close
    dataset.FlushCache()
    dataset = None
    
    # Get file size
    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    
    print(f'✅ GeoTIFF created')
    print(f'   File size: {file_size_mb:.1f} MB\n')
    
    cursor.close()
    conn.close()
    
    print('=' * 60)
    print('DEM GENERATION COMPLETE')
    print('=' * 60)
    print()
    print('Next step: Import to PostgreSQL')
    print(f'  raster2pgsql -s 4326 -I -C -M -t 100x100 {output_path} dem_elevation | psql -d middle_earth')

if __name__ == '__main__':
    try:
        generate_dem(resolution=250)
    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()
        exit(1)
