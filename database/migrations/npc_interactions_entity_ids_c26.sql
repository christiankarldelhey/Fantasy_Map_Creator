-- C26: npc_interactions.entity_ids — a whitelist of the entities a row
-- actually describes.
--
-- Bug being fixed: rows with entity_id IS NULL were treated as generic
-- to the whole entity_type, but many carry prose written for one member
-- of the type ("Great Eagles watch the pass" under flying_animals, the
-- stone overhang under resources). A Waterfowl encounter would then
-- receive eagle prose and the mind stored memories of things that never
-- happened.
--
-- Semantics: NULL = type-generic (unchanged, matches any entity of the
-- type); non-empty = the row only resolves when the encounter's entity
-- is listed. One row can cover a family of alike entities (the eight
-- eagle species) without duplicating it.
--
-- The world names what appeared; a row can only describe what it lists.

ALTER TABLE npc_interactions
  ADD COLUMN IF NOT EXISTS entity_ids uuid[];

-- ---------------------------------------------------------------------------
-- Audit pass 1: the four types whose generic rows described one member of the
-- type. Each gets its entity whitelist; rows that were already agnostic
-- (a herd on a hillside, churned ground at a waterhole) stay generic.
-- ---------------------------------------------------------------------------

-- RESOURCES: every row was disguised-specific. The overhang scene is stonework,
-- so it whitelists to rock/ruin entities across types — entity_ids matching
-- ignores entity_type by design.

-- overhang → rocky shelters: mine diggings + the site's own stonework
UPDATE npc_interactions SET entity_ids = ARRAY[
  'e797f18e-0fb3-45f9-a2e3-27bdcf54c926', -- Mines & Diggings (resources)
  'a8faa37b-2508-454b-8fcb-a2de88d6617f', -- Cavern (sites)
  'f91a5ba5-f789-474d-ac5a-18cbaa1d64be', -- Ruins (sites)
  '05431549-7db3-4991-b944-bb1909f678c5', -- Calenardhon Ruins (sites)
  '5f0c5043-8774-4196-bbde-50990d0ce41e', -- Edain Ruin (sites)
  '1f679cbf-3383-4708-b2a5-a1162b1da37f'  -- Mine Quarry (sites)
]::uuid[] WHERE id = 'a08592dc-7a81-4b89-b592-82884fa7e359';

-- athelas spring → herb-lands only
UPDATE npc_interactions SET entity_ids = ARRAY[
  '8120e7df-a6ef-4fc4-8f57-b7d357d07eff'  -- Herb-lands
]::uuid[] WHERE id = '4fa9870a-3951-48ca-9f98-f1e8e273e3aa';

-- logging operation → timberlands only
UPDATE npc_interactions SET entity_ids = ARRAY[
  'a823b248-ba5d-4dd9-94b6-ec878f4c72a9'  -- Timberlands
]::uuid[] WHERE id = 'f1086f27-74e0-4daf-89b9-ebe57e14f115';

-- tended beehives → apiaries only
UPDATE npc_interactions SET entity_ids = ARRAY[
  '0ab6222f-9ebe-422d-afd2-635b196dae6a'  -- Apiaries
]::uuid[] WHERE id = '4ca7e0a3-effe-499e-9887-00820a0e23b7';

-- strung nets and weirs → fisheries only
UPDATE npc_interactions SET entity_ids = ARRAY[
  '62453971-4c38-4388-b177-fa4e2c6f857a'  -- Fisheries
]::uuid[] WHERE id = 'a7d8a484-61bd-4bb0-892a-09bdca08820f';

-- SITES: inhabited settlements vs worked stonework vs burial ground.

-- lit-lamp wayhouse → places with people and a door
UPDATE npc_interactions SET entity_ids = ARRAY[
  '1a344085-17ae-47df-ab64-7e6a661e0bd4', -- Settlement Camp
  'bc4d3f9c-e2eb-4852-92c4-ca805cc0b5a6', -- Garth
  'cee52cc8-ac0e-4c41-9fe9-1761fea711f5'  -- Guard Tower
]::uuid[] WHERE id = '68ca394e-67f0-42c8-871a-421437d0868a';

-- farmstead hospitality → garths and camps
UPDATE npc_interactions SET entity_ids = ARRAY[
  'bc4d3f9c-e2eb-4852-92c4-ca805cc0b5a6', -- Garth
  '1a344085-17ae-47df-ab64-7e6a661e0bd4'  -- Settlement Camp
]::uuid[] WHERE id = 'b644aeb9-f713-4321-8218-a1f4f8f66df5';

-- rope across the road → settlements
UPDATE npc_interactions SET entity_ids = ARRAY[
  '1a344085-17ae-47df-ab64-7e6a661e0bd4', -- Settlement Camp
  'bc4d3f9c-e2eb-4852-92c4-ca805cc0b5a6'  -- Garth
]::uuid[] WHERE id = '4323ea0d-af66-4963-ae5e-3fb86fa78848';

-- crossroads market → settlements
UPDATE npc_interactions SET entity_ids = ARRAY[
  '1a344085-17ae-47df-ab64-7e6a661e0bd4', -- Settlement Camp
  'bc4d3f9c-e2eb-4852-92c4-ca805cc0b5a6'  -- Garth
]::uuid[] WHERE id = '503a28f5-b382-4ace-b031-7c26919b8793';

-- garrisoned waystation → guard tower, fortified garth
UPDATE npc_interactions SET entity_ids = ARRAY[
  'cee52cc8-ac0e-4c41-9fe9-1761fea711f5', -- Guard Tower
  'bc4d3f9c-e2eb-4852-92c4-ca805cc0b5a6'  -- Garth
]::uuid[] WHERE id = 'e46682cb-c575-4c55-8430-290c0ca0f56c';

-- fled village → settlements
UPDATE npc_interactions SET entity_ids = ARRAY[
  '1a344085-17ae-47df-ab64-7e6a661e0bd4', -- Settlement Camp
  'bc4d3f9c-e2eb-4852-92c4-ca805cc0b5a6'  -- Garth
]::uuid[] WHERE id = '9ae1b4bb-5e10-4333-bb34-954b358efd60';

-- ruined watch-tower, Dunedain cut → the ruin family
UPDATE npc_interactions SET entity_ids = ARRAY[
  'b0e8a8a8-dd35-4d05-8106-fbf768ac2000', -- Dunedain Site
  'f8deaa10-81d9-4468-a084-53b270828e56', -- Arthedain Site
  '319b9148-8e40-416d-b059-0eea56efaa8f', -- Eriadorian Site
  '5f0c5043-8774-4196-bbde-50990d0ce41e', -- Edain Ruin
  'f91a5ba5-f789-474d-ac5a-18cbaa1d64be', -- Ruins
  'cee52cc8-ac0e-4c41-9fe9-1761fea711f5', -- Guard Tower
  '05431549-7db3-4991-b944-bb1909f678c5'  -- Calenardhon Ruins
]::uuid[] WHERE id = '404eda32-12ce-4ceb-895d-14026c08fc26';

-- shut-gate village → settlements
UPDATE npc_interactions SET entity_ids = ARRAY[
  '1a344085-17ae-47df-ab64-7e6a661e0bd4', -- Settlement Camp
  'bc4d3f9c-e2eb-4852-92c4-ca805cc0b5a6'  -- Garth
]::uuid[] WHERE id = '940e02d1-51f3-4bff-b96c-a2beb68ef386';

-- shifted barrow-mound → burial sites only
UPDATE npc_interactions SET entity_ids = ARRAY[
  'c2602d09-321b-461f-bba4-915609a897a0'  -- Burial Sites
]::uuid[] WHERE id = 'fb4c39d7-352e-4443-8d5b-4d8643a6b017';

-- besieged keep that watches → the ruin family
UPDATE npc_interactions SET entity_ids = ARRAY[
  'f91a5ba5-f789-474d-ac5a-18cbaa1d64be', -- Ruins
  '05431549-7db3-4991-b944-bb1909f678c5', -- Calenardhon Ruins
  '5f0c5043-8774-4196-bbde-50990d0ce41e', -- Edain Ruin
  'cee52cc8-ac0e-4c41-9fe9-1761fea711f5', -- Guard Tower
  'b0e8a8a8-dd35-4d05-8106-fbf768ac2000', -- Dunedain Site
  'f8deaa10-81d9-4468-a084-53b270828e56', -- Arthedain Site
  '319b9148-8e40-416d-b059-0eea56efaa8f'  -- Eriadorian Site
]::uuid[] WHERE id = '7618df16-2232-4650-8fa9-1396a9994596';

-- FLYING_ANIMALS: all six rows named species. Each gets its flock.

-- watching eagles → every eagle kind
UPDATE npc_interactions SET entity_ids = ARRAY[
  '37065964-4cb3-4844-b081-1f61dff43778', -- Eagles
  'f9d69ee3-26b3-4fcd-9dee-cf4b8e831e2b', -- Great Eagles
  '0e302fb8-e738-4a7f-a410-9852cfcf0569', -- Golden Eagle
  'b4c50a02-ea2c-4e57-8a28-23d45092d528', -- Red Eagles
  '50c27cea-1b14-4b13-9f75-9b72d0cd98d4', -- Sea Eagles
  'bfe667d7-574f-4bf6-877e-28daa6d561cf', -- Vereut Eagles
  '4fde5e29-9bc7-4324-a4bf-615bcdbdc1ba'  -- Orao
]::uuid[] WHERE id = 'c63f8b5f-9829-4469-8a0e-2958bc9bdb4c';

-- murmuration → small flocking birds
UPDATE npc_interactions SET entity_ids = ARRAY[
  '59d6e9fb-e865-4ca1-86b3-5fce6dfe5cd6', -- Birds
  '0f8f956e-c5c1-4f9d-978b-c521435176e8'  -- Thrushes
]::uuid[] WHERE id = '90f8a791-067a-4417-94f7-88ca03863cf4';

-- quartering hawk → working raptors
UPDATE npc_interactions SET entity_ids = ARRAY[
  'eb66ddd3-e7b9-4c71-8e70-b2b135367b1d', -- Cliff Buzzards
  '3185fd77-6d4e-4580-9ddf-0a55a357e3fa', -- Echo Hawks
  '49cd5454-4de9-47f6-9f92-81a5c521c9e3', -- Great Falcons Of Ardor
  '606782e6-e26f-4a19-97cf-def67ba76fdb', -- Great Falcons Of Mirkwood
  '4fde5e29-9bc7-4324-a4bf-615bcdbdc1ba'  -- Orao
]::uuid[] WHERE id = '92017349-8c73-404e-9195-809171f8e6b0';

-- owl from the roadside hollow → the owls
UPDATE npc_interactions SET entity_ids = ARRAY[
  '3ebb1f78-5a92-4b93-906f-bf14a89474d2', -- Barrow Owls
  'dbf4184f-60a3-405d-ae3b-390388402931', -- Owls
  '09cdbbc0-aa79-491f-ad64-0e67fdde1371'  -- Short-Eared Owls
]::uuid[] WHERE id = '5cb07cd0-6dc8-493e-a19b-05b7de15febe';

-- winged thing with a rider → the great bats (nearest to a fell shape on wings)
UPDATE npc_interactions SET entity_ids = ARRAY[
  'e0289f7c-e8b6-4f38-b215-117358ec4df4', -- Giant Vampire Bat
  'e7437c52-3b0e-47fc-80da-188f9db62ed5'  -- Great Bats
]::uuid[] WHERE id = '9436d082-a432-4156-9925-41057129f49c';

-- raven gathering → the crow family
UPDATE npc_interactions SET entity_ids = ARRAY[
  'eb20a6ab-2d8d-4b29-8bba-af41e26ae6eb', -- Ravens
  'fb1f3299-d113-484b-b213-a020f48b5776', -- Crows
  'c5ec8809-14ea-418f-b7b5-f1c90df1eec8', -- Gorcrows
  'f423b389-fe8a-497d-a925-590637569dcd', -- Crebain
  '75c7df54-5d7b-4aa4-bf95-09532c2374ff'  -- Green-Winged Crows
]::uuid[] WHERE id = 'e4c8ba7d-f0d3-40c8-86d5-42fd80da2fbd';

-- HERBIVORES: the herd rows stay generic (they name no animal); the five that
-- named species get whitelists.

-- watching aurochs → the great wild cattle
UPDATE npc_interactions SET entity_ids = ARRAY[
  '5f465085-1130-4763-ac25-16f95107e5d3', -- Ninfiara Wild Aurochs
  '7c4c4e62-39dd-47dc-89ba-536cbc0894a6', -- Aurych
  'ab20c66b-5143-4427-8dbd-60b756301feb'  -- Kine Of Araw
]::uuid[] WHERE id = '88bf030f-6991-4b13-aeb3-8b5caf5a2502';

-- stag at the water → the deer family
UPDATE npc_interactions SET entity_ids = ARRAY[
  '8c749264-2039-43e5-b6be-6b7e18d3d587', -- Deer
  '257c6194-d26b-4d8e-86cb-36672a4c9e14', -- Dappled Deer
  'bf1ba528-8f5c-4a5b-ada0-8e58d605ceba', -- Elk
  '1d484c30-6561-475e-ad42-a8ee5868dab3'  -- Great Elk
]::uuid[] WHERE id = '12f38939-860f-4bc5-b00f-aeeb7adeaee6';

-- old scarred boar → boars (other_animals — cross-type whitelist)
UPDATE npc_interactions SET entity_ids = ARRAY[
  '5bca644d-8688-479c-9393-9b7d943dca3e', -- Boars
  'f7b2ad25-e803-4753-b604-8198c7ca722e'  -- Fen Boars
]::uuid[] WHERE id = '9eae7da7-7742-43b1-a587-0a89b18782b5';

-- starved elk carcass → the elk
UPDATE npc_interactions SET entity_ids = ARRAY[
  'bf1ba528-8f5c-4a5b-ada0-8e58d605ceba', -- Elk
  '1d484c30-6561-475e-ad42-a8ee5868dab3'  -- Great Elk
]::uuid[] WHERE id = 'cc67f316-2423-4511-a96d-ac35487a1638';

-- deer-slots by the path → the deer
UPDATE npc_interactions SET entity_ids = ARRAY[
  '8c749264-2039-43e5-b6be-6b7e18d3d587', -- Deer
  '257c6194-d26b-4d8e-86cb-36672a4c9e14'  -- Dappled Deer
]::uuid[] WHERE id = '0d354f5b-f6d3-41c3-afa9-96fa232cc2e4';

-- ---------------------------------------------------------------------------
-- Generic coverage backfill — where whitelisting left a (type, form) without
-- a truly agnostic row. Authored to describe the SHAPE of the contact only;
-- the entity supplies the subject. Band 'low' covers higher bands through
-- the resolver's relaxation chain.
-- ---------------------------------------------------------------------------

INSERT INTO npc_interactions
  (id, entity_type, interaction_form, shadow_band, npc_attitude, concrete_content,
   tension, traveller_stance, topic, options)
VALUES
-- resources / harvest_shelter: tended land offers a corner
('c26e0001-0000-4000-8000-000000000001','resources','harvest_shelter','low',
 'Tended land running up to the road''s edge — someone''s work on it, recent enough to read.',
 'A corner out of the wind can be found where land is kept: a hedge lee, a stacked-stone angle, ground that drainage has kept dry.',
 'Worked land has owners. Owners mean questions — or a roof, if the evening goes that way.',
 'Reads who works this ground and how well. Notes the sheltered corner. Continues.',
 'food_and_comfort',
 '[{"id":"stay","label":"Take the sheltered corner for the night","tags":["need:exhaustion","need:unrest"],"stance":"Takes the dry corner for the night. Sleeps rough but out of the wind.","commands":[{"type":"overnight_shelter","name":"the sheltered corner","indoor":false,"description":"a lee of tended ground, out of the wind","lodging_cost":0,"rest_quality":1,"shadow_effect":0,"meal":false}]},{"id":"move_on","label":"Mark it and keep to the road","tags":["risk:bold"],"commands":[]}]'::jsonb),
-- resources / observed_activity: worked land reads as kept
('c26e0002-0000-4000-8000-000000000002','resources','observed_activity','low',
 'Signs of work on the land beside the road — recently used, recently tended, not abandoned.',
 'Whoever works this ground keeps it in order. Order in the land usually means order on the road.',
 'Tended ground says the region is fed and governed. The road is safer where the land is kept.',
 'Notes the state of the work. Continues.',
 'harvest_and_weather', NULL),
-- sites / harvest_shelter: a made place keeps a dry corner
('c26e0003-0000-4000-8000-000000000003','sites','harvest_shelter','low',
 'A made place with weather-worth left in it — a standing wall, a corner out of the wind, ground that builders chose well once.',
 'Travellers before this one have used the same corner; the ground shows it.',
 'A made place remembers use. What it once kept out can still be kept out of one corner of it.',
 'Marks the sheltered corner for a harder night. Continues.',
 'food_and_comfort',
 '[{"id":"stay","label":"Take the dry corner for the night","tags":["need:exhaustion","need:unrest"],"stance":"Takes the dry corner of the old work for the night. Sleeps rough but roofed against the dew.","commands":[{"type":"overnight_shelter","name":"the standing stone","indoor":false,"description":"a lee of old masonry, weather-worn but dry","lodging_cost":0,"rest_quality":1,"shadow_effect":0,"meal":false}]},{"id":"move_on","label":"Mark it and keep to the road","tags":["risk:bold"],"commands":[]}]'::jsonb),
-- sites / observed_activity: the site is in use
('c26e0004-0000-4000-8000-000000000004','sites','observed_activity','low',
 'The place is used — not abandoned. Marks of work, of coming and going, none of them a traveller''s.',
 'Whoever uses it keeps it for their own reasons. The road takes no part in them.',
 'A used place has users. Users keep watch over what they use.',
 'Notes that the place is in use. Continues on the road''s side of it.',
 'suspicion_of_strangers', NULL),
-- sites / scenery: old work beside the road
('c26e0005-0000-4000-8000-000000000005','sites','scenery','low',
 'Old work beside the road — a line of stones, a mound, the plan of a place still readable in the ground.',
 'Whoever built here meant to stay. They did not stay.',
 'The north is full of places people meant to keep.',
 'Reads the place for what it was. Continues.',
 'old_grief', NULL),
-- flying_animals / glimpsed_far: wings too far to name
('c26e0006-0000-4000-8000-000000000006','flying_animals','glimpsed_far','low',
 'Wings on the far side of the sky — a flock moving with the wind, too far for names.',
 'They are going about their own business. Their business does not include the road.',
 'A calm sky is information too.',
 'Notes the sky is calm. Continues.',
 'care_of_living_things', NULL),
-- flying_animals / observed_activity: feeding birds mean a quiet field
('c26e0007-0000-4000-8000-000000000007','flying_animals','observed_activity','low',
 'Birds working the ground beside the road — feeding, unsettled only by the usual things.',
 'Feeding birds mean a quiet field. Disturbed birds would already be up.',
 'What the birds are doing says what has been through here lately. Lately: nothing.',
 'Notes the calm. Continues.',
 'care_of_living_things', NULL),
-- flying_animals / sound_only: a sound that leaves
('c26e0008-0000-4000-8000-000000000008','flying_animals','sound_only','low',
 'Wings or calls from above — out of sight, close enough to hear, not close enough to read.',
 'The sound is bird-shaped and moving away. Whatever it is, it is leaving.',
 'A sound that leaves is better than a sound that circles.',
 'Listens until it fades. Continues.',
 'what_stirs_in_the_dark', NULL),
-- flying_animals / reacts_withdraws: a single startled bird
('c26e0009-0000-4000-8000-000000000009','flying_animals','reacts_withdraws','low',
 'A bird bursting out of the near cover — startled by the traveller, not by anything behind them.',
 'One bird, one alarm. It climbs away and the cover settles again.',
 'A single startled bird means the traveller was the only surprise.',
 'Notes the direction it chose. Continues.',
 'care_of_living_things', NULL),
-- herbivores / sign_only: calm tracks
('c26e000a-0000-4000-8000-000000000010','herbivores','sign_only','low',
 'Tracks in the soft verge — fresh enough to read, left at a walk.',
 'Grazing animals passed within hours, unhurried. Nothing pushed them.',
 'Calm tracks mean a calm wood ahead.',
 'Notes direction and count. Continues.',
 'care_of_living_things', NULL);

