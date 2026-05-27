#!/bin/bash

# Quick test script to verify DEM system is working

echo "Testing DEM System..."
echo ""

# Test 1: Check if tables exist
echo "Test 1: Checking database tables..."
psql -d middle_earth -c "\dt detected_peaks" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "  ✅ detected_peaks table exists"
else
    echo "  ❌ detected_peaks table not found"
fi

psql -d middle_earth -c "\dt dem_elevation" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "  ✅ dem_elevation table exists"
else
    echo "  ❌ dem_elevation table not found"
fi

echo ""

# Test 2: Check if function exists
echo "Test 2: Checking helper functions..."
psql -d middle_earth -c "\df get_elevation_at_point" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "  ✅ get_elevation_at_point function exists"
else
    echo "  ❌ get_elevation_at_point function not found"
fi

echo ""

# Test 3: Check data counts
echo "Test 3: Checking data..."
PEAK_COUNT=$(psql -d middle_earth -t -c "SELECT COUNT(*) FROM detected_peaks;" 2>/dev/null | tr -d ' ')
echo "  Detected peaks: $PEAK_COUNT"

DEM_COUNT=$(psql -d middle_earth -t -c "SELECT COUNT(*) FROM dem_elevation;" 2>/dev/null | tr -d ' ')
echo "  DEM tiles: $DEM_COUNT"

echo ""

# Test 4: Test elevation query
echo "Test 4: Testing elevation query..."
RESULT=$(psql -d middle_earth -t -c "SELECT get_elevation_at_point(0, 50);" 2>/dev/null | tr -d ' ')
if [ ! -z "$RESULT" ]; then
    echo "  ✅ Elevation query works (result: ${RESULT}m)"
else
    echo "  ⚠️  Elevation query returned no result (DEM may not be loaded yet)"
fi

echo ""
echo "Test complete!"
