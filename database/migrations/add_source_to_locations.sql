-- ADR-0014 (#103): anchor provenance — distinguish gazetteer imports from
-- georef-created anchors. NULL is normalized by the seed's normalizeLocations
-- pass ('gazetteer' / 'georef').
ALTER TABLE locations ADD COLUMN IF NOT EXISTS source TEXT;
