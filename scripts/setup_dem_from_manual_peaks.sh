#!/bin/bash

# DEM Setup Script - Using Manual Peak Points
# Automates the complete DEM generation pipeline from manual points

set -e  # Exit on error

echo "============================================================"
echo "DEM GENERATION FROM MANUAL PEAK POINTS"
echo "============================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Database Setup
echo -e "${GREEN}Step 1: Setting up database tables...${NC}"
echo ""

echo "  → Creating elevation_points table..."
psql -d middle_earth -f ../database/queries/create_elevation_points_table.sql -q

echo "  → Creating dem_elevation table..."
psql -d middle_earth -f ../database/queries/create_dem_table.sql -q

echo -e "${GREEN}✅ Database tables created${NC}"
echo ""

# Step 2: Check Python dependencies
echo -e "${GREEN}Step 2: Checking Python dependencies...${NC}"
echo ""

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found. Please install Python 3.8+${NC}"
    exit 1
fi

echo "  → Installing Python dependencies..."
pip3 install -r requirements.txt -q

echo -e "${GREEN}✅ Python dependencies installed${NC}"
echo ""

# Step 3: Import manual peaks
echo -e "${GREEN}Step 3: Importing manual peak points...${NC}"
echo ""

if [ ! -f "../data/geojson/altitude/peaks.geojson" ]; then
    echo -e "${RED}❌ peaks.geojson not found${NC}"
    exit 1
fi

node import_manual_peaks.js

echo ""

# Step 4: Classify peaks by altitude layer
echo -e "${GREEN}Step 4: Classifying peaks by altitude layer...${NC}"
echo ""

node classify_elevation_points.js

echo ""

# Step 5: Calculate neighbor density
echo -e "${GREEN}Step 5: Calculating neighbor density...${NC}"
echo ""

node calculate_neighbor_density.js

echo ""

# Step 6: Calculate elevations
echo -e "${GREEN}Step 6: Calculating elevations (base + density + Perlin)...${NC}"
echo ""

python3 calculate_elevations.py

echo ""

# Step 7: Generate DEM
echo -e "${GREEN}Step 7: Generating DEM raster (this may take 5-15 minutes)...${NC}"
echo ""

python3 generate_dem_from_points.py

echo ""

# Step 8: Import to PostgreSQL
echo -e "${GREEN}Step 8: Importing DEM to PostgreSQL...${NC}"
echo ""

if [ ! -f "../data/dem_elevation.tif" ]; then
    echo -e "${RED}❌ DEM file not found: data/dem_elevation.tif${NC}"
    exit 1
fi

echo "  → Importing raster to database..."
raster2pgsql -s 4326 -I -C -M -t 100x100 ../data/dem_elevation.tif dem_elevation | psql -d middle_earth -q

echo -e "${GREEN}✅ DEM imported to database${NC}"
echo ""

# Step 9: Verify installation
echo -e "${GREEN}Step 9: Verifying installation...${NC}"
echo ""

POINT_COUNT=$(psql -d middle_earth -t -c "SELECT COUNT(*) FROM elevation_points;" | tr -d ' ')
DEM_TILES=$(psql -d middle_earth -t -c "SELECT COUNT(*) FROM dem_elevation;" | tr -d ' ')

echo "  Elevation points: $POINT_COUNT"
echo "  DEM tiles: $DEM_TILES"

echo ""
echo "============================================================"
echo -e "${GREEN}✅ DEM SETUP COMPLETE!${NC}"
echo "============================================================"
echo ""
echo "Next steps:"
echo "  1. Start the backend server: cd backend && npm run dev"
echo "  2. Test API endpoints:"
echo "     curl 'http://localhost:5000/api/dem/stats'"
echo "     curl 'http://localhost:5000/api/dem/elevation?lon=3.0&lat=45.0'"
echo ""
