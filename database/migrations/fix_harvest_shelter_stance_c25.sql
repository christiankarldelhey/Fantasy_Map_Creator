-- C25: harvest_shelter encounters fire mid-march (~10:00) and carry no
-- mechanics — meals come from the day's rations, rest from the
-- overnight_interaction resolved at leg.end. The stances claimed an
-- uptake that never happens ("Accepts the hospitality", "Sets up
-- camp"), so minds stored "a dry bed and a meal" for travellers who
-- kept walking and went hungry. The offer stays real (the lamp, the
-- dry barn, the clean spring); the stance now says what actually
-- happened: evaluate, pause briefly, mark it, move on.

UPDATE npc_interactions
SET concrete_content = 'The offer is readable from the threshold: a real fire, a basic pot, a dry bed for a small coin. The keeper asks no questions beyond which road the traveller came from — road-courtesy, not interrogation.',
    traveller_stance = 'Weighs the coin against the miles left in the day. Trades the road news owed at the door. Marks the lamp for the road back.'
WHERE id = '68ca394e-67f0-42c8-871a-421437d0868a';

UPDATE npc_interactions
SET traveller_stance = 'Answers the raised hand. An hour at the fence trading road news — the barn stays an offer, the day is not done.'
WHERE id = 'b644aeb9-f713-4321-8218-a1f4f8f66df5';

UPDATE npc_interactions
SET traveller_stance = 'Rests a while in the dry lee. Reads the road it is set to watch. Marks the overhang for a harder night.'
WHERE id = 'a08592dc-7a81-4b89-b592-82884fa7e359';

UPDATE npc_interactions
SET traveller_stance = 'Drinks from the spring. Leaves the stand rooted. Marks where athelas grows.'
WHERE id = '4fa9870a-3951-48ca-9f98-f1e8e273e3aa';

-- C25 (cont.): the same rows can now become real choices. When one of
-- them surfaces at before_sleep the wire carries `decision` — authored
-- options the mind weighs (need:* tags score against open needs) and
-- the host applies (`overnight_shelter` commands re-resolve the night
-- through the existing lodging machinery). `stance` on an option is
-- what actually happened if that option is chosen; `move_on` falls
-- back to the row's pass-by stance.

ALTER TABLE npc_interactions ADD COLUMN IF NOT EXISTS options JSONB;

UPDATE npc_interactions
SET options = '[{"id":"stay","label":"Take the bed — a small coin","tags":["need:exhaustion","need:hunger","need:unrest"],"commands":[{"type":"overnight_shelter","name":"the wayhouse","description":"a lamp lit for whoever comes in off the road","indoor":true,"lodging_cost":5,"meal":true,"rest_quality":4,"shadow_effect":-2}],"stance":"Takes the bed. Eats what the pot offers. The coin is spent without regret."},{"id":"move_on","label":"Mark the lamp and keep to the road","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = '68ca394e-67f0-42c8-871a-421437d0868a';

UPDATE npc_interactions
SET options = '[{"id":"stay","label":"Take the barn''s dry corner","tags":["need:exhaustion","need:hunger","need:unrest"],"commands":[{"type":"overnight_shelter","name":"the farmstead barn","description":"a dry corner under the hay, the yard lamp long out","indoor":true,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":3,"shadow_effect":-1}],"stance":"Takes the barn''s dry corner. Shares the pot and the road''s news until the lamp goes out."},{"id":"move_on","label":"Trade news at the fence and walk on","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = 'b644aeb9-f713-4321-8218-a1f4f8f66df5';

UPDATE npc_interactions
SET options = '[{"id":"stay","label":"Make camp under the stone","tags":["need:exhaustion","need:unrest"],"commands":[{"type":"overnight_shelter","name":"the overhang","description":"a dry lee above the road, fire-rings old as the path itself","indoor":false,"lodging_cost":0,"meal":false,"rest_quality":3,"shadow_effect":-1}],"stance":"Makes camp under the stone. The beam serves as it was left to serve."},{"id":"move_on","label":"Rest a while, mark it, and move on","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = 'a08592dc-7a81-4b89-b592-82884fa7e359';

UPDATE npc_interactions
SET options = '[{"id":"stay","label":"Camp beside the spring","tags":["need:thirst","need:exhaustion","need:unrest"],"commands":[{"type":"overnight_shelter","name":"the spring","description":"clean water and a stand of athelas — the ground keeps itself","indoor":false,"lodging_cost":0,"meal":false,"water":true,"rest_quality":2,"shadow_effect":-1}],"stance":"Camps beside the spring. The athelas stays rooted for the next traveller."},{"id":"move_on","label":"Drink, mark the stand, and move on","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = '4fa9870a-3951-48ca-9f98-f1e8e273e3aa';
