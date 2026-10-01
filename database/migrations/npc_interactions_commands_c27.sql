-- C27: encounter gifts — `commands` jsonb on npc_interactions.
--
-- Sibling of `options`: options are a CHOICE the mind weighs and the host
-- resolves (B5 decide rail); commands are UNCONDITIONAL effects the world
-- applies outright when the encounter resolves. If the stance says the
-- traveller eats, the character eats — the host makes the text true.
--
-- Vocabulary v1 (auto-applied, no decision):
--   {type:'meal',        slot?:'midday'|'evening', food?:string, drink?:string}
--   {type:'water_refill'}                                  tops the flask
--   {type:'item',        slug:string, qty:int}             grants inventory
--   {type:'coins',       amount:int}                       signed gift/cost
--   {type:'heal'}                                          wound down a tier
--
-- Anything that carries a real cost or a real choice keeps waiting for
-- options — commands must always be safe to apply unconditionally.

ALTER TABLE npc_interactions ADD COLUMN IF NOT EXISTS commands jsonb;

-- ---------------------------------------------------------------------------
-- Generic aid_or_trade rows whose stances claim gifts the world never gave.
-- Each gets the commands that make its stance true; stances that claimed an
-- overnight stay on a daytime encounter are rewritten to daylight scope.
-- ---------------------------------------------------------------------------

-- Hot food, a dry corner and grain for the road (they ask about the Greenway).
UPDATE npc_interactions SET commands = '[
  {"type":"meal","food":"hot food at the farmhouse table"},
  {"type":"item","slug":"trail_rations","qty":1}
]'::jsonb
WHERE id = '0a1d0004-0000-4000-8000-0a1d00000004';

-- Food left on the gate-stone, water drawn beside it.
UPDATE npc_interactions SET commands = '[
  {"type":"meal","food":"what was left on the gate-stone"},
  {"type":"water_refill"}
]'::jsonb
WHERE id = '0a1d0003-0000-4000-8000-0a1d00000003';

-- They feed him; he promises a look at the sheep-fold. The overnight claim
-- ("goes out at dawn") is rewritten to the daylight the day actually has.
UPDATE npc_interactions SET
  commands = '[{"type":"meal","food":"a share of the pot"}]'::jsonb,
  traveller_stance = 'Eats what they give. Tells them only what they can use. Walks on while the light lasts.'
WHERE id = '0a1d0006-0000-4000-8000-0a1d00000006';

-- The best of the house: new bread, honey, the one good cup.
UPDATE npc_interactions SET commands = '[
  {"type":"meal","food":"new bread and honey","drink":"the one good cup"}
]'::jsonb
WHERE id = '0a1d0007-0000-4000-8000-0a1d00000007';

-- Bench in the hall, meat and ale; they send him on with smoked fish.
UPDATE npc_interactions SET commands = '[
  {"type":"meal","food":"meat and ale at the bench"},
  {"type":"item","slug":"trail_rations","qty":1}
]'::jsonb
WHERE id = '0a1d0012-0000-4000-8000-0a1d00000012';

-- Outbuilding place, bread, oil and olives — overnight claim rewritten to
-- the day's scope: he eats, they write his name, he keeps the road.
UPDATE npc_interactions SET
  commands = '[{"type":"meal","food":"bread, oil and olives"}]'::jsonb,
  traveller_stance = 'Gives a name they can write down. Eats the bread and olives. Leaves while the light holds.'
WHERE id = '0a1d0014-0000-4000-8000-0a1d00000014';

-- Bundle of arrows kept for those who walk this road.
UPDATE npc_interactions SET commands = '[
  {"type":"meal","food":"the household''s hot food"},
  {"type":"item","slug":"common_arrows","qty":8}
]'::jsonb
WHERE id = '0a1d0016-0000-4000-8000-0a1d00000016';

-- Smoked fish and flat bread, earned at the oar.
UPDATE npc_interactions SET
  commands = '[{"type":"meal","food":"smoked fish and flat bread"}]'::jsonb,
  traveller_stance = 'Takes the oar for the crossing. Earns the breakfast. Walks on.'
WHERE id = '0a1d0017-0000-4000-8000-0a1d00000017';

-- Seal-meat and grass boot-liners (no liner item exists — the food lands).
UPDATE npc_interactions SET
  commands = '[{"type":"meal","food":"seal-meat at the fire"}]'::jsonb,
  traveller_stance = 'Accepts the seal-meat and the grass packing. Repays the kindness as he can.'
WHERE id = '0a1d0018-0000-4000-8000-0a1d00000018';

-- A share of the spit at the firelight edge; the salt-price is theirs to
-- ask, not his to pay unconditionally — rewritten to the honest exchange.
UPDATE npc_interactions SET
  commands = '[{"type":"meal","food":"a share of what is on the spit"}]'::jsonb,
  traveller_stance = 'Sits where he is put. Eats his share. Gives them word of the war-bands and moves on.'
WHERE id = '0a1d0019-0000-4000-8000-0a1d00000019';

-- Byre-loft and a share of the pot — the night's roof is a before_sleep
-- matter; in daylight the honest scope is the meal and the labour.
UPDATE npc_interactions SET
  commands = '[{"type":"meal","food":"thin barley bread and a share of the pot"}]'::jsonb,
  traveller_stance = 'Takes the fire and the share of the pot. Pays in news and an hour of hands before walking on.'
WHERE id = '0a1d0001-0000-4000-8000-0a1d00000001';

-- ---------------------------------------------------------------------------
-- Elves (0e1f…) — hospitality that claims gifts.
-- ---------------------------------------------------------------------------

-- They heal what can be healed tonight and feed him.
UPDATE npc_interactions SET commands = '[
  {"type":"heal"},
  {"type":"meal","food":"food at their fire"}
]'::jsonb
WHERE id = '0e1f0002-0000-4000-8000-0e1f00000002';

-- Bread, cord, arrows fletched their way.
UPDATE npc_interactions SET commands = '[
  {"type":"item","slug":"common_arrows","qty":6},
  {"type":"item","slug":"trail_rations","qty":1}
]'::jsonb
WHERE id = '0e1f0004-0000-4000-8000-0e1f00000004';

-- They provision him for four days.
UPDATE npc_interactions SET commands = '[
  {"type":"item","slug":"trail_rations","qty":4}
]'::jsonb
WHERE id = '0e1f0005-0000-4000-8000-0e1f00000005';

-- A proper camp made, hot water — overnight claim rewritten; the hot water
-- and the food are what the daylight actually gives.
UPDATE npc_interactions SET
  commands = '[{"type":"meal","food":"a meal at the camp they made"},{"type":"water_refill"}]'::jsonb,
  traveller_stance = 'Accepts the meal and the hot water. Answers about the road. Does not confirm the assumption.'
WHERE id = '0e1f0006-0000-4000-8000-0e1f00000006';

-- Shelter, a horse, an escort — the horse has no item and the offer is a
-- real trade-off; rewritten to the road-gift they actually press on her.
UPDATE npc_interactions SET
  commands = '[{"type":"item","slug":"trail_rations","qty":2}]'::jsonb,
  traveller_stance = 'Refuses the escort. Takes what they press on her for the road. Does not answer the question.'
WHERE id = '0e1f0007-0000-4000-8000-0e1f00000007';

-- A fire built low, food she does not want, a place made in the middle of
-- their camp — overnight claim rewritten; she barely eats, so no commands.
UPDATE npc_interactions SET
  traveller_stance = 'Eats little. Rests at the edge of their firelight a while. Says nothing about why the place was made there.'
WHERE id = '0e1f0008-0000-4000-8000-0e1f00000008';

-- ---------------------------------------------------------------------------
-- Maiar / hobbits.
-- ---------------------------------------------------------------------------

-- A hot meal, a night's shelter — the counsel stays, the meal lands, the
-- overnight claim softens to the rest the daylight allows.
UPDATE npc_interactions SET
  commands = '[{"type":"meal","food":"the hot meal that should not exist where it is standing"}]'::jsonb,
  traveller_stance = 'Eats. Rests in the shelter of their fire a while. Remembers the counsel word for word.'
WHERE id = '0ca10002-0000-4000-8000-0ca100000002';

-- The wrapped seed-cake the hobbits press on him — packed for the road.
UPDATE npc_interactions SET commands = '[
  {"type":"item","slug":"trail_rations","qty":1}
]'::jsonb
WHERE id = '0ba10003-0000-4000-8000-0ba100000003';
