-- Migration: Elven sanctuary overnight tier (full recovery)
-- Date: 2026-07-21
-- Description: A night in a great elven refuge fully restores the body. This
--   adds a rest_quality = 4 "sanctuary" tier (recognised by characterState.js
--   isSanctuary / SANCTUARY_LOCATION_IDS) and gives Lórien its own named
--   overnight rows (previously it fell through to generic city/keep records).
--
-- Sanctuary locations: Imladris/Rivendell (472), Mithlond/Grey Havens (482),
--   Caras Galadhon (536) and Cerin Amroth (493) in Lórien.

-- Rivendell & Mithlond already have named rows: promote them to the tier.
UPDATE places_interactions
   SET rest_quality = 4
 WHERE interaction_type = 'overnight'
   AND location_id IN (472, 482);

-- Lórien: add named overnight rows if they do not yet exist.
INSERT INTO places_interactions
  (interaction_type, location_id, title, description, rest_quality, shadow_effect, priority)
SELECT 'overnight', 536, 'Caras Galadhon',
       'Under the mallorn-boughs of the Golden Wood the traveller sleeps as one held out of time. No shadow of the world reaches into Caras Galadhon, and the night restores both body and spirit entirely.',
       4, -2, 100
 WHERE NOT EXISTS (
   SELECT 1 FROM places_interactions
    WHERE interaction_type = 'overnight' AND location_id = 536
 );

INSERT INTO places_interactions
  (interaction_type, location_id, title, description, rest_quality, shadow_effect, priority)
SELECT 'overnight', 493, 'Cerin Amroth',
       'On the green hill of Cerin Amroth, amid elanor and niphredil, the air is clean of all care. A night here lifts the weariness of the road completely and eases the heart of its shadow.',
       4, -2, 100
 WHERE NOT EXISTS (
   SELECT 1 FROM places_interactions
    WHERE interaction_type = 'overnight' AND location_id = 493
 );
