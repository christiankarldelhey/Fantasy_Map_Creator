-- C20: wolf-specific prose lived in carnivores-generic rows (entity_id NULL),
-- so a Foxes encounter could resolve "Wolf-prints crossing the path".
-- The generic rows become species-neutral; the wolf text is preserved as
-- entity-scoped copies keyed to the Wolves entity (entity_id lookups run
-- before entity_type in fetchNpcInteraction, so wolves keep their voice).

-- 1. Neutralize the three wolf rows (they still serve all carnivores).
UPDATE npc_interactions
SET npc_attitude = 'Predator prints crossing the path — a pair, moving at a trot, heading north. Made last night.'
WHERE id = '376ef05f-8292-4b9a-ba70-b89f525d7343';

UPDATE npc_interactions
SET npc_attitude = 'A predator in the road ahead — it sees the traveller and leaves. Not flees, leaves. At a steady trot toward the treeline.',
    concrete_content = 'A predator that chooses to leave rather than test an encounter has made a calculation about the outcome. The calculation went in the traveller''s favour.',
    tension = 'It went into the trees. It did not go over the ridge.'
WHERE id = '1e14d589-fb9c-470c-bd8a-817fef5006e8';

UPDATE npc_interactions
SET npc_attitude = 'A predator on the ridge above the road — visible because it is sitting and watching, not because it moved.',
    tension = 'A single hunter watching a road from a ridge is either a scout or an individual with a territory claim on this road.'
WHERE id = '08be085c-a486-4a77-9f56-d5c59d7b8c58';

-- 2. Wolf-scoped copies with the original wording (idempotent).
INSERT INTO npc_interactions
    (entity_id, entity_type, interaction_form, shadow_band, character_id,
     cultural_family, region_id, npc_attitude, concrete_content, tension,
     traveller_stance, topic, topic_prose_hint)
SELECT '5c4c3611-6c66-48b2-bfe5-2df5a9e98042', 'carnivores', 'reacts_withdraws', 'low', NULL,
       NULL, NULL,
       'A wolf in the road ahead — it sees the traveller and leaves. Not flees, leaves. At a steady trot toward the treeline.',
       'A wolf that chooses to leave rather than test an encounter has made a calculation about the outcome. The calculation went in the traveller''s favour.',
       'The wolf went into the trees. It did not go over the ridge.',
       'Notes which side of the road it entered. Continues without relaxing.',
       'care_of_living_things', NULL
WHERE NOT EXISTS (
    SELECT 1 FROM npc_interactions
    WHERE entity_id = '5c4c3611-6c66-48b2-bfe5-2df5a9e98042'
      AND interaction_form = 'reacts_withdraws' AND shadow_band = 'low'
      AND npc_attitude LIKE 'A wolf in the road ahead%'
);

INSERT INTO npc_interactions
    (entity_id, entity_type, interaction_form, shadow_band, character_id,
     cultural_family, region_id, npc_attitude, concrete_content, tension,
     traveller_stance, topic, topic_prose_hint)
SELECT '5c4c3611-6c66-48b2-bfe5-2df5a9e98042', 'carnivores', 'sign_only', 'low', NULL,
       NULL, NULL,
       'Wolf-prints crossing the path — a pair, moving at a trot, heading north. Made last night.',
       'Both adults, by the size. Not a pack, a bonded pair. Moving purposefully, not hunting — the stride is too regular for active hunting.',
       'They have a destination. The direction is north, same as the traveller.',
       'Notes the direction. Checks behind. Continues.',
       'care_of_living_things', NULL
WHERE NOT EXISTS (
    SELECT 1 FROM npc_interactions
    WHERE entity_id = '5c4c3611-6c66-48b2-bfe5-2df5a9e98042'
      AND interaction_form = 'sign_only' AND shadow_band = 'low'
      AND npc_attitude LIKE 'Wolf-prints crossing%'
);

INSERT INTO npc_interactions
    (entity_id, entity_type, interaction_form, shadow_band, character_id,
     cultural_family, region_id, npc_attitude, concrete_content, tension,
     traveller_stance, topic, topic_prose_hint)
SELECT '5c4c3611-6c66-48b2-bfe5-2df5a9e98042', 'carnivores', 'glimpsed_far', 'low', NULL,
       NULL, NULL,
       'A wolf on the ridge above the road — visible because it is sitting and watching, not because it moved.',
       'It has been there for some time. It registered the traveller''s approach far enough back that it was already settled when the traveller came into view.',
       'A single wolf watching a road from a ridge is either a scout or an individual with a territory claim on this road.',
       'Notes it. Does not stop. Keeps moving.',
       'care_of_living_things', NULL
WHERE NOT EXISTS (
    SELECT 1 FROM npc_interactions
    WHERE entity_id = '5c4c3611-6c66-48b2-bfe5-2df5a9e98042'
      AND interaction_form = 'glimpsed_far' AND shadow_band = 'low'
      AND npc_attitude LIKE 'A wolf on the ridge%'
);

-- 3. Degenerate memories: 'body'/'travel' items resolve no reading by
-- design (vitals speak through needs/mood), but the encoder used to
-- write them anyway as 'a body' / 'a travel' / raw field dumps.
-- C20 stops encoding unwordable items; this clears the backlog.
DELETE FROM mind.memories
WHERE kind = 'episodic' AND (
    "desc" ~ '^a (body|travel|climate|rest|meal|place|note|terrain|encounter)$'
    OR "desc" ~ '^[a-z_]+:\s*[0-9]'
);
