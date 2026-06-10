-- ============================================================================
-- Convert Manors to Inns
-- Purpose: Convert 16 manors to inns with thematic names
-- ============================================================================

BEGIN;

-- Update selected manors to inns with creative names
UPDATE locations SET location_type = 'inn', name = 'Blymiras Inn' WHERE id = 941;
UPDATE locations SET location_type = 'inn', name = 'Dremant Inn' WHERE id = 970;
UPDATE locations SET location_type = 'inn', name = 'Groddig Inn' WHERE id = 927;
UPDATE locations SET location_type = 'inn', name = 'Azaghâl''s Anvil' WHERE id = 932;
UPDATE locations SET location_type = 'inn', name = 'The Bril Forge' WHERE id = 972;
UPDATE locations SET location_type = 'inn', name = 'Aikanáro''s Bow' WHERE id = 938;
UPDATE locations SET location_type = 'inn', name = 'The Alcarin Star' WHERE id = 942;
UPDATE locations SET location_type = 'inn', name = 'Adrahil''s Shield' WHERE id = 926;
UPDATE locations SET location_type = 'inn', name = 'The Aglahad Blade' WHERE id = 967;
UPDATE locations SET location_type = 'inn', name = 'Éadburg''s Stable' WHERE id = 943;
UPDATE locations SET location_type = 'inn', name = 'The Éadcwén Mare' WHERE id = 974;
UPDATE locations SET location_type = 'inn', name = 'Brelmodoc''s Rest' WHERE id = 937;
UPDATE locations SET location_type = 'inn', name = 'The Dend Haven' WHERE id = 947;
UPDATE locations SET location_type = 'inn', name = 'Dodind''s Tavern' WHERE id = 965;
UPDATE locations SET location_type = 'inn', name = 'The Zant Shield' WHERE id = 966;
UPDATE locations SET location_type = 'inn', name = 'Ralt''s Corner' WHERE id = 936;

COMMIT;

-- Verify the changes
SELECT id, name, location_type FROM locations WHERE id IN (941, 970, 927, 932, 972, 938, 942, 926, 967, 943, 974, 937, 947, 965, 966, 936) ORDER BY id;
