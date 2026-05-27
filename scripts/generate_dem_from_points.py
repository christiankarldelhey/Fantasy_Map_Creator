#!/usr/bin/env python3
"""
Generate DEM from elevation points using interpolation
Creates a raster grid with elevation values interpolated from manual points
"""

import psycopg2
import numpy as np
from scipy.interpolate import griddata
from osgeo import gdal, osr
import os
from dotenv import load_dotenv
from pathlib import Path

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
            elevation_final
        FROM elevation_points
        WHERE elevation_final IS NOT NULL
        ORDER BY id
    """)
    
    points = cursor.fetchall()
    print(f'Loaded {len(points)} points with elevations\n')
    
    if len(points) == 0:
        print('❌ No elevation points found. Run calculate_elevations.py first.')
        return
    
    # Extract coordinates and elevations
    lons = np.array([p[0] for p in points])
    lats = np.array([p[1] for p in points])
    elevs = np.array([p[2] for p in points])
    
    # Determine bounds
    min_lon, max_lon = lons.min(), lons.max()
    min_lat, max_lat = lats.min(), lats.max()
    
    print(f'Bounds:')
    print(f'  Longitude: {min_lon:.4f} to {max_lon:.4f}')
    print(f'  Latitude:  {min_lat:.4f} to {max_lat:.4f}\n')
    
    # Calculate grid dimensions
    # Approximate: 1 degree ≈ 111km at equator
    lon_range_m = (max_lon - min_lon) * 111000
    lat_range_m = (max_lat - min_lat) * 111000
    
    width = int(lon_range_m / resolution)
    height = int(lat_range_m / resolution)
    
    print(f'Grid dimensions: {width} x {height} pixels')
    print(f'Total pixels: {width * height:,}\n')
    
    # Create grid
    print('Creating interpolation grid...')
    grid_lon = np.linspace(min_lon, max_lon, width)
    grid_lat = np.linspace(max_lat, min_lat, height)  # Note: reversed for raster
    grid_lon_mesh, grid_lat_mesh = np.meshgrid(grid_lon, grid_lat)
    
    print('✅ Grid created\n')
    
    # Interpolate elevations
    print('Interpolating elevations...')
    print('(This may take 5-15 minutes depending on resolution)\n')
    
    # Use cubic interpolation for smooth results
    grid_elev = griddata(
        points=np.column_stack((lons, lats)),
        values=elevs,
        xi=(grid_lon_mesh, grid_lat_mesh),
        method='cubic',
        fill_value=0
    )
    
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
