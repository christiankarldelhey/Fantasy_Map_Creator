#!/usr/bin/env python3
"""
Import Climate Data to PostgreSQL
Imports climate analogs metadata to regions table and hourly climate data to climate_data table
"""

import csv
import os
from pathlib import Path
import psycopg2
from psycopg2 import sql
from psycopg2.extras import execute_batch
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection - support both DATABASE_URL and individual params
DATABASE_URL = os.getenv('DATABASE_URL')
if DATABASE_URL:
    # Parse DATABASE_URL (format: postgresql://user:password@host:port/dbname)
    import urllib.parse
    parsed = urllib.parse.urlparse(DATABASE_URL)
    DB_HOST = parsed.hostname
    DB_PORT = parsed.port or 5432
    DB_NAME = parsed.path.lstrip('/')
    DB_USER = parsed.username
    DB_PASSWORD = parsed.password
else:
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '5432')
    DB_NAME = os.getenv('DB_NAME', 'middle_earth')
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')

# File paths
ANALOGS_FILE = Path('data/region_climate_analogs.csv')
CLIMATE_DATA_DIR = Path('data/climate_data')

def get_db_connection():
    """Create and return a database connection"""
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

def import_climate_analogs(conn):
    """Import climate analogs metadata to regions table"""
    print("=== Importing Climate Analogs to regions table ===")
    
    with open(ANALOGS_FILE, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        analogs = list(reader)
    
    updated = 0
    skipped = 0
    
    with conn.cursor() as cur:
        for row in analogs:
            region_id = row.get('region_id')
            if not region_id or region_id == '':
                skipped += 1
                continue
            
            # Skip ocean and cave entries (no climate data)
            if row.get('koppen') in ['ocean', 'cave']:
                skipped += 1
                continue
            
            try:
                cur.execute("""
                    UPDATE regions 
                    SET koppen = %s,
                        analog_location = %s,
                        analog_lat = %s,
                        analog_lon = %s
                    WHERE id = %s
                """, (
                    row.get('koppen'),
                    row.get('analog_location'),
                    float(row['lat']) if row.get('lat') else None,
                    float(row['lon']) if row.get('lon') else None,
                    int(region_id)
                ))
                updated += 1
            except Exception as e:
                print(f"  [ERROR] Region ID {region_id}: {e}")
                skipped += 1
    
    conn.commit()
    print(f"Updated: {updated} regions")
    print(f"Skipped: {skipped} entries")
    return updated

def import_hourly_climate_data(conn):
    """Import hourly climate data from CSV files to climate_data table"""
    print("\n=== Importing Hourly Climate Data to climate_data table ===")
    
    csv_files = list(CLIMATE_DATA_DIR.glob('*.csv'))
    print(f"Found {len(csv_files)} CSV files")
    
    total_rows = 0
    failed_files = []
    
    with conn.cursor() as cur:
        for csv_file in csv_files:
            try:
                # Extract region_id from filename (e.g., 65_Vinyalas.csv -> 65)
                region_id = int(csv_file.name.split('_')[0])
                
                print(f"  Processing {csv_file.name} (region_id={region_id})...")
                
                with open(csv_file, mode='r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    rows = list(reader)
                
                # Prepare batch insert
                insert_query = sql.SQL("""
                    INSERT INTO climate_data 
                    (region_id, time, temperature_2m, relative_humidity_2m, precipitation, 
                     snowfall, cloud_cover, wind_speed_10m, wind_direction_10m, 
                     surface_pressure, soil_moisture_0_to_7cm, et0_fao_evapotranspiration, 
                     shortwave_radiation)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """)
                
                batch_data = []
                for row in rows:
                    # Parse numeric values, handle empty strings
                    def parse_float(val):
                        return float(val) if val and val != '' else None
                    
                    batch_data.append((
                        region_id,
                        row.get('time'),
                        parse_float(row.get('temperature_2m')),
                        parse_float(row.get('relative_humidity_2m')),
                        parse_float(row.get('precipitation')),
                        parse_float(row.get('snowfall')),
                        parse_float(row.get('cloud_cover')),
                        parse_float(row.get('wind_speed_10m')),
                        parse_float(row.get('wind_direction_10m')),
                        parse_float(row.get('surface_pressure')),
                        parse_float(row.get('soil_moisture_0_to_7cm')),
                        parse_float(row.get('et0_fao_evapotranspiration')),
                        parse_float(row.get('shortwave_radiation'))
                    ))
                
                # Execute batch insert
                execute_batch(cur, insert_query, batch_data, page_size=1000)
                total_rows += len(batch_data)
                print(f"    Inserted {len(batch_data)} rows")
                
            except Exception as e:
                print(f"  [ERROR] {csv_file.name}: {e}")
                failed_files.append(csv_file.name)
    
    conn.commit()
    print(f"\nTotal rows inserted: {total_rows}")
    if failed_files:
        print(f"Failed files: {len(failed_files)}")
        for f in failed_files:
            print(f"  - {f}")
    
    return total_rows

def verify_import(conn):
    """Verify the import was successful"""
    print("\n=== Verification ===")
    
    with conn.cursor() as cur:
        # Check regions with climate data
        cur.execute("""
            SELECT COUNT(*) 
            FROM regions 
            WHERE koppen IS NOT NULL
        """)
        regions_count = cur.fetchone()[0]
        print(f"Regions with climate metadata: {regions_count}")
        
        # Check climate_data row count
        cur.execute("SELECT COUNT(*) FROM climate_data")
        climate_count = cur.fetchone()[0]
        print(f"Total climate_data rows: {climate_count}")
        
        # Check distinct regions in climate_data
        cur.execute("SELECT COUNT(DISTINCT region_id) FROM climate_data")
        distinct_regions = cur.fetchone()[0]
        print(f"Distinct regions with hourly data: {distinct_regions}")
        
        # Sample query
        cur.execute("""
            SELECT r.name, r.koppen, COUNT(cd.id) as hourly_records
            FROM regions r
            LEFT JOIN climate_data cd ON r.id = cd.region_id
            WHERE r.koppen IS NOT NULL
            GROUP BY r.id, r.name, r.koppen
            ORDER BY hourly_records DESC
            LIMIT 5
        """)
        print("\nSample regions with data:")
        for row in cur.fetchall():
            print(f"  {row[0]} (Köppen: {row[1]}): {row[2]} hourly records")

def main():
    print("=== Climate Data Import Script ===")
    print(f"Database: {DB_NAME} @ {DB_HOST}:{DB_PORT}")
    print(f"Analogs file: {ANALOGS_FILE}")
    print(f"Climate data directory: {CLIMATE_DATA_DIR}\n")
    
    # Check if files exist
    if not ANALOGS_FILE.exists():
        print(f"ERROR: Analogs file not found: {ANALOGS_FILE}")
        return
    
    if not CLIMATE_DATA_DIR.exists():
        print(f"ERROR: Climate data directory not found: {CLIMATE_DATA_DIR}")
        return
    
    try:
        conn = get_db_connection()
        print("Connected to database\n")
        
        # Import climate analogs
        import_climate_analogs(conn)
        
        # Import hourly climate data
        import_hourly_climate_data(conn)
        
        # Verify
        verify_import(conn)
        
        conn.close()
        print("\n=== Import Complete ===")
        
    except Exception as e:
        print(f"\nERROR: {e}")
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main()
