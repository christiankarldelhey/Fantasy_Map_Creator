-- C31: aid_or_trade — dusk offers become decisions; daylight gifts land.
-- Generated from backend/scripts/c31_csv_patch.mjs (single source).

-- The farmstead barn (C25) authored meal_slug shared_pot before the NL
-- pack had the key — it rendered as a literal slug in memory readings.
INSERT INTO mind.nl_phrase_lists (game_id, key, ordinal, phrase)
SELECT 'middle_earth', 'meal.name.shared_pot', 0, 'a share of the pot at their fire'
WHERE NOT EXISTS (
  SELECT 1 FROM mind.nl_phrase_lists WHERE game_id='middle_earth'
  AND key='meal.name.shared_pot'
);

UPDATE npc_interactions SET
  options = '[{"id":"stay","label":"Take the byre-loft","tags":["need:exhaustion","need:hunger","need:unrest"],"stance":"Takes the byre-loft. Pays in news and an hour of hands at the evening work.","commands":[{"type":"overnight_shelter","name":"the byre-loft","description":"a dry loft above the byre — coin refused, the price is news and hands","indoor":true,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":3,"shadow_effect":-1}]},{"id":"move_on","label":"Pay in news and walk on","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = '0a1d0001-0000-4000-8000-0a1d00000001';

UPDATE npc_interactions SET
  options = '[{"id":"stay","label":"Take the dry corner for the night","tags":["need:exhaustion","need:hunger","need:unrest"],"stance":"Takes the dry corner. Gives them the Greenway honestly — the watched stretch and the quiet one.","commands":[{"type":"overnight_shelter","name":"the farm''s dry corner","description":"a dry corner under the farmhouse roof, earned with word of the road","indoor":true,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":3,"shadow_effect":-1}]},{"id":"move_on","label":"Give the road news and walk on","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = '0a1d0004-0000-4000-8000-0a1d00000004';

UPDATE npc_interactions SET
  options = '[{"id":"stay","label":"Share their fire, leave unseen","tags":["need:exhaustion","need:hunger","need:unrest"],"stance":"Shares the fire and the pot. Leaves by the back path before the village is awake.","commands":[{"type":"overnight_shelter","name":"the unwitnessed fire","description":"a place by a fire whose owners ask not to be seen being kind","indoor":true,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":3,"shadow_effect":-1}]},{"id":"move_on","label":"Agree to the back path and go now","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = '0a1d0008-0000-4000-8000-0a1d00000008';

UPDATE npc_interactions SET
  options = '[{"id":"stay","label":"Take the hearth-place for the night","tags":["need:exhaustion","need:unrest"],"stance":"Takes the hearth-place for the night. Gives the old woman the true answer and does not dress it up.","commands":[{"type":"overnight_shelter","name":"the hearth-place","description":"a place by the hearth of a woman who has waited her whole life to ask","indoor":true,"lodging_cost":0,"meal":false,"rest_quality":3,"shadow_effect":-1}]},{"id":"move_on","label":"Answer her and walk on","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = '0a1d0009-0000-4000-8000-0a1d00000009';

UPDATE npc_interactions SET
  options = '[{"id":"stay","label":"Take the place at the peat-fire","tags":["need:exhaustion","need:hunger","need:unrest"],"stance":"Takes the place at the peat-fire. Eats their mutton and curds. Answers plainly about the riders.","commands":[{"type":"overnight_shelter","name":"the peat-fire","description":"a place at a peat-fire in hill-country, bought with a straight answer","indoor":false,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":2,"shadow_effect":-1}]},{"id":"move_on","label":"Answer plainly and walk on","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = '0a1d0010-0000-4000-8000-0a1d00000010';

UPDATE npc_interactions SET
  options = '[{"id":"stay","label":"Take the bench in the hall","tags":["need:exhaustion","need:hunger","need:unrest"],"stance":"Takes the bench in the hall. Gives news freely until the ale runs out.","commands":[{"type":"overnight_shelter","name":"the hall bench","description":"a bench by the hall fire, with the whole household listening","indoor":true,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":3,"shadow_effect":-1}]},{"id":"move_on","label":"Give the road news and keep walking","tags":["risk:bold"],"stance":"Gives them the news of the southern roads. Declines the bench and keeps his own errand out of it.","commands":[]}]'::jsonb
WHERE id = '0a1d0012-0000-4000-8000-0a1d00000012';

UPDATE npc_interactions SET
  options = '[{"id":"stay","label":"Take the place in the outbuilding","tags":["need:exhaustion","need:hunger","need:unrest"],"stance":"Takes the place in the outbuilding. Eats the bread and olives. Lets the tally have his name.","commands":[{"type":"overnight_shelter","name":"the outbuilding","description":"a place in the outbuilding of a village that writes travellers into a tally","indoor":true,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":3,"shadow_effect":0}]},{"id":"move_on","label":"Give the tally a name and walk on","tags":["risk:bold"],"stance":"Gives a name they can write down. Reads the tally for what it is. Walks on.","commands":[]}]'::jsonb
WHERE id = '0a1d0014-0000-4000-8000-0a1d00000014';

UPDATE npc_interactions SET
  options = '[{"id":"stay","label":"Take the dry loft","tags":["need:exhaustion","need:hunger","need:unrest"],"stance":"Takes the dry loft and the arrows. Gives a true answer about the north even where the truth is thin.","commands":[{"type":"overnight_shelter","name":"the dry loft","description":"a dry loft over a house that keeps faith with a ruined kingdom","indoor":true,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":3,"shadow_effect":-1}]},{"id":"move_on","label":"Give the north honestly and walk on","tags":["risk:bold"],"stance":"Gives a true answer about the north even where the truth is thin. Leaves the bundle where it lies.","commands":[]}]'::jsonb
WHERE id = '0a1d0016-0000-4000-8000-0a1d00000016';

UPDATE npc_interactions SET
  options = '[{"id":"stay","label":"Take the berth in the net-loft","tags":["need:exhaustion","need:hunger"],"stance":"Takes the berth in the net-loft. Takes the oar before dawn if the boat goes out.","commands":[{"type":"overnight_shelter","name":"the net-loft","description":"a berth among the drying nets, paid for with an oar before dawn","indoor":true,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":2,"shadow_effect":-1}]},{"id":"move_on","label":"Take the fish and camp upshore","tags":["risk:bold"],"stance":"Takes the smoked fish. Camps upshore of the net-lofts.","commands":[]}]'::jsonb
WHERE id = '0a1d0017-0000-4000-8000-0a1d00000017';

UPDATE npc_interactions SET
  options = '[{"id":"stay","label":"Take the place out of the wind","tags":["need:exhaustion","need:hunger","need:unrest"],"stance":"Takes the place out of the wind. Sleeps with the seal-meat and the grass packing earned.","commands":[{"type":"overnight_shelter","name":"the place out of the wind","description":"a place out of the wind in country where wind kills","indoor":false,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":3,"shadow_effect":-1}]},{"id":"move_on","label":"Repay the kindness and walk on","tags":["risk:bold"],"stance":"Repays the kindness as he can. Walks on while the wind allows.","commands":[]}]'::jsonb
WHERE id = '0a1d0018-0000-4000-8000-0a1d00000018';

UPDATE npc_interactions SET
  options = '[{"id":"stay","label":"Take the place at the firelight edge","tags":["need:exhaustion","need:hunger","need:unrest"],"stance":"Takes the place at the edge of the firelight. Eats his share of the spit. Gives them word of the war-bands.","commands":[{"type":"overnight_shelter","name":"the edge of the firelight","description":"a place at the edge of a camp that trusts nothing unproven","indoor":false,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":2,"shadow_effect":0}]},{"id":"move_on","label":"Give the war-band news and move on","tags":["risk:bold"],"stance":"Gives them word of the war-bands. Does not take the place at the firelight edge.","commands":[]}]'::jsonb
WHERE id = '0a1d0019-0000-4000-8000-0a1d00000019';

UPDATE npc_interactions SET
  traveller_stance = 'Trades word of the lower fords for the name of the dry crossing. Does not press toward their fire.',
  options = '[{"id":"stay","label":"Give the salt and the oath","tags":["need:exhaustion","need:hunger"],"stance":"Gives the salt. Gives the promise and means it. Sleeps with his boots on.","commands":[{"type":"overnight_shelter","name":"the hidden camp''s fire","description":"a place by a fire in a camp that is not supposed to be here","indoor":false,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":2,"shadow_effect":0}]},{"id":"move_on","label":"Take the crossing name and walk on","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = '0a1e0002-0000-4000-8000-0a1e00000002';

UPDATE npc_interactions SET
  commands = '[{"type":"meal","food":"food at their fire"}]'::jsonb,
  options = '[{"id":"stay","label":"Take the food and the hide","tags":["need:exhaustion","need:hunger"],"stance":"Takes the food and the hide. Sleeps light, deciding nothing about the track.","commands":[{"type":"overnight_shelter","name":"the offered hide","description":"a hide to sleep under, offered by people who need a stranger to walk a bad track","indoor":false,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":2,"shadow_effect":0}]},{"id":"move_on","label":"Take the warning and walk on","tags":["risk:cautious"],"stance":"Understands what is not being asked. Walks on before they can offer the hide.","commands":[]}]'::jsonb
WHERE id = '0a1e0003-0000-4000-8000-0a1e00000003';

UPDATE npc_interactions SET
  commands = '[{"type":"meal","food":"what they give"}]'::jsonb,
  options = '[{"id":"stay","label":"Sleep within the ring of the camp","tags":["need:exhaustion","need:hunger","need:unrest"],"stance":"Eats what they give. Sleeps within the ring of the camp. Lets the story die.","commands":[{"type":"overnight_shelter","name":"the camp ring","description":"a place to sleep inside the ring of a camp that is afraid of being seen","indoor":false,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":3,"shadow_effect":-1}]},{"id":"move_on","label":"Tell them the remedy and walk on","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = '0a1e0005-0000-4000-8000-0a1e00000005';

UPDATE npc_interactions SET
  commands = '[{"type":"meal","food":"meat and mare''s milk"}]'::jsonb,
  options = '[{"id":"stay","label":"Take the place at the fire","tags":["need:exhaustion","need:hunger","need:unrest"],"stance":"Takes the place at the fire. Eats their meat and drinks their mare''s milk.","commands":[{"type":"overnight_shelter","name":"the herd-camp fire","description":"a place at the fire of people who move with the grass","indoor":false,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":2,"shadow_effect":-1}]},{"id":"move_on","label":"Describe the grazing and walk on","tags":["risk:bold"],"stance":"Describes the grass and the water honestly. Does not take the place at the fire.","commands":[]}]'::jsonb
WHERE id = '0a1e0009-0000-4000-8000-0a1e00000009';

UPDATE npc_interactions SET
  traveller_stance = 'Gives an edited version of the road. Listens to the whole state of the Bree-land laid out unasked.',
  options = '[{"id":"stay","label":"Take the bed — a copper or two","tags":["need:exhaustion","need:hunger","need:unrest"],"stance":"Pays the coppers. Gives an edited version of the road. Sleeps warm.","commands":[{"type":"overnight_shelter","name":"the bed of straw","description":"a bed of straw and the whole state of the Bree-land laid out unasked","indoor":true,"lodging_cost":2,"meal":true,"meal_slug":"shared_pot","rest_quality":3,"shadow_effect":-1}]},{"id":"move_on","label":"Give the short version and walk on","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = '0a1e0011-0000-4000-8000-0a1e00000011';

UPDATE npc_interactions SET
  traveller_stance = 'Takes the warning about the south road. Notes the month and the road. Walks on.',
  options = '[{"id":"stay","label":"Take the room","tags":["need:exhaustion","need:hunger"],"stance":"Takes the room. Notes the month and the road. Says he will keep his eyes open, and means it.","commands":[{"type":"overnight_shelter","name":"the room","description":"a roof for a fair price and a warning that comes free with it","indoor":true,"lodging_cost":5,"meal":true,"rest_quality":4,"shadow_effect":-1}]},{"id":"move_on","label":"Take the warning and walk on","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = '0a1e0012-0000-4000-8000-0a1e00000012';

UPDATE npc_interactions SET
  commands = '[{"type":"meal","food":"a share of the fish"}]'::jsonb,
  options = '[{"id":"stay","label":"Take the dry place among the bales","tags":["need:exhaustion","need:hunger"],"stance":"Takes the dry place among the bales. Takes the pole for three hours.","commands":[{"type":"overnight_shelter","name":"the bales","description":"a dry place among the bales of a river barge, earned at the pole","indoor":false,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":2,"shadow_effect":-1}]},{"id":"move_on","label":"Take the pole and get off at the landing","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = '0a1e0013-0000-4000-8000-0a1e00000013';

UPDATE npc_interactions SET
  commands = '[{"type":"meal","food":"bread, cream and honey"}]'::jsonb,
  options = '[{"id":"stay","label":"Take the bed in the hay","tags":["need:exhaustion","need:hunger","need:unrest"],"stance":"Takes the bed in the hay. Eats what is set out. Answers about the hunting truthfully.","commands":[{"type":"overnight_shelter","name":"the hay","description":"a bed in the hay of a board where no meat is set","indoor":true,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":3,"shadow_effect":-1}]},{"id":"move_on","label":"Account for the hunt and walk on","tags":["risk:bold"],"stance":"Answers about the hunting truthfully. Does not ask about the bees. Finds his own ground.","commands":[]}]'::jsonb
WHERE id = '0a1e0015-0000-4000-8000-0a1e00000015';

UPDATE npc_interactions SET
  traveller_stance = 'Takes the directions. Marks the clearing for a harder night.',
  options = '[{"id":"stay","label":"Camp in the hidden clearing","tags":["need:exhaustion","need:hunger","need:unrest"],"stance":"Takes the share of the pot and the resin-torches. Camps in the one clearing a fire cannot be seen from.","commands":[{"type":"overnight_shelter","name":"the hidden clearing","description":"the one clearing where a fire will not be seen from the eastern slopes","indoor":false,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":3,"shadow_effect":-1}]},{"id":"move_on","label":"Mark the clearing and walk on","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = '0a1e0016-0000-4000-8000-0a1e00000016';

UPDATE npc_interactions SET
  traveller_stance = 'Talks at the fire a while. Gives the honest answer about the lower fords.',
  options = '[{"id":"stay","label":"Take the dog and the second watch","tags":["need:exhaustion","need:hunger","need:unrest"],"stance":"Talks. Takes the dog. Returns it in the morning.","commands":[{"type":"overnight_shelter","name":"the shepherd''s fire","description":"a place at a shepherd''s fire with a dog borrowed for the watch","indoor":false,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":3,"shadow_effect":-1}]},{"id":"move_on","label":"Give the ford answer and camp alone","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = '0a1e0017-0000-4000-8000-0a1e00000017';

UPDATE npc_interactions SET
  traveller_stance = 'Trades the hooks. Copies how they bank the fire.',
  options = '[{"id":"stay","label":"Take the place in the snow-house","tags":["need:exhaustion","need:hunger","need:unrest"],"stance":"Takes the place in the snow-house. Trades the hooks. Wears the overshirt.","commands":[{"type":"overnight_shelter","name":"the snow-house","description":"a shared snow-house, built by people who know what weather costs","indoor":true,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":4,"shadow_effect":-1}]},{"id":"move_on","label":"Trade the hooks and walk on","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = '0a1e0018-0000-4000-8000-0a1e00000018';

UPDATE npc_interactions SET
  traveller_stance = 'Walks with the waggons while the road allows. Trades road news at their fires.',
  commands = '[{"type":"meal","food":"food from the cook-waggon"}]'::jsonb,
  options = '[{"id":"stay","label":"Stand the watch in the waggon circle","tags":["need:exhaustion","need:hunger"],"stance":"Takes the watch in the waggon circle. Eats at the cook-fire. Walks with them as far as the roads run together.","commands":[{"type":"overnight_shelter","name":"the waggon circle","description":"a place inside the waggon circle, earned standing their watch","indoor":false,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":2,"shadow_effect":-1}]},{"id":"move_on","label":"Walk with them a while and camp alone","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = '0a1e0021-0000-4000-8000-0a1e00000021';

UPDATE npc_interactions SET
  traveller_stance = 'Notes the three men behind the caravan. Keeps his own distance.',
  options = '[{"id":"stay","label":"Take the coin and walk the rear watch","tags":["need:hunger","risk:bold"],"stance":"Takes the coin. Walks the rear watch. Does not let the three men out of counting.","commands":[{"type":"overnight_shelter","name":"the caravan''s night picket","description":"a place at the caravan''s picket, paid for with a sword at the rear","indoor":false,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":1,"shadow_effect":0}]},{"id":"move_on","label":"Note the three men and camp elsewhere","tags":["risk:cautious"],"commands":[]}]'::jsonb
WHERE id = '0a1e0022-0000-4000-8000-0a1e00000022';

UPDATE npc_interactions SET
  commands = '[{"type":"item","slug":"trail_rations","qty":1}]'::jsonb,
  options = '[{"id":"stay","label":"Take the bed in the byre","tags":["need:exhaustion","need:hunger","need:unrest"],"stance":"Gives the salt and the northern news. Takes the bed in the byre.","commands":[{"type":"overnight_shelter","name":"the byre","description":"a bed in the byre of a woman who prices what she knows","indoor":true,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":3,"shadow_effect":-1}]},{"id":"move_on","label":"Take the crossing line and walk on","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = '0a1e0024-0000-4000-8000-0a1e00000024';

UPDATE npc_interactions SET
  traveller_stance = 'Trades what he knows of the road behind for what they know of the road ahead.',
  options = '[{"id":"stay","label":"Put his rations in and take the second watch","tags":["need:exhaustion","need:hunger","need:unrest"],"stance":"Puts his rations into the pot. Takes the second watch. Parts from them at the crossroads.","commands":[{"type":"overnight_shelter","name":"the shared fire","description":"a shared fire with watches split — nobody asks anything beyond the morning","indoor":false,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":3,"shadow_effect":-1}]},{"id":"move_on","label":"Trade road news and camp alone","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = '0a1e0027-0000-4000-8000-0a1e00000027';

UPDATE npc_interactions SET
  options = '[{"id":"stay","label":"Take the shelter that should not exist","tags":["need:exhaustion","need:unrest"],"stance":"Takes the night''s shelter that should not exist where it is standing. Eats. Remembers the counsel word for word.","commands":[{"type":"overnight_shelter","name":"the shelter that should not exist","description":"a night''s shelter standing where no shelter should be","indoor":true,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":4,"shadow_effect":-1}]},{"id":"move_on","label":"Keep the counsel and walk on","tags":["risk:bold"],"stance":"Remembers the counsel word for word. Does not ask what the shelter costs.","commands":[]}]'::jsonb
WHERE id = '0ca10002-0000-4000-8000-0ca100000002';

UPDATE npc_interactions SET
  traveller_stance = 'Eats far too much. Learns the rhyme. Walks on before the light goes.',
  commands = '[{"type":"meal","food":"yellow cream, honeycomb, bread and butter"}]'::jsonb,
  options = '[{"id":"stay","label":"Take the bed of dry rushes","tags":["need:exhaustion","need:hunger","need:unrest"],"stance":"Takes the bed of dry rushes. Eats far too much. Sleeps like the dead.","commands":[{"type":"overnight_shelter","name":"the house of Tom Bombadil","description":"a bed of dry rushes in the one house the forest cannot touch","indoor":true,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":5,"shadow_effect":-2}]},{"id":"move_on","label":"Eat, learn the rhyme, and go before dark","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = '0ca10006-0000-4000-8000-0ca100000006';

UPDATE npc_interactions SET
  options = '[{"id":"stay","label":"Take the night''s lodging","tags":["need:exhaustion","need:hunger","need:unrest"],"stance":"Takes the night''s lodging. Eats all he can hold. Follows the directions exactly come morning.","commands":[{"type":"overnight_shelter","name":"the house of Tom Bombadil","description":"a night''s lodging where gear dries by morning and directions must be followed exactly","indoor":true,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":5,"shadow_effect":-2}]},{"id":"move_on","label":"Take the directions and keep walking","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = '0ca10007-0000-4000-8000-0ca100000007';

UPDATE npc_interactions SET
  options = '[{"id":"stay","label":"Take the easy eastern line","tags":["need:exhaustion","need:thirst","need:unrest"],"stance":"Takes the water, the shelter, the dry wood. Lets the road go where it is being steered.","commands":[{"type":"overnight_shelter","name":"the offered ease","description":"water, shelter and dry wood, suddenly available on the eastern line of march","indoor":false,"lodging_cost":0,"meal":false,"water":true,"rest_quality":4,"shadow_effect":2}]},{"id":"move_on","label":"Break east and pay for the harder road","tags":["risk:cautious"],"commands":[]}]'::jsonb
WHERE id = '0ca10009-0000-4000-8000-0ca100000009';

UPDATE npc_interactions SET
  traveller_stance = 'Marks the offered ground and does not take it. Walks on while the light holds.',
  options = '[{"id":"stay","label":"Take the offered rest","tags":["need:exhaustion","need:unrest"],"stance":"Takes the offered ground. Sleeps deeply, the first real rest in weeks — and wakes not knowing what it cost.","commands":[{"type":"overnight_shelter","name":"the chosen ground","description":"ground that some old instinct says was chosen for him","indoor":false,"lodging_cost":0,"meal":false,"rest_quality":4,"shadow_effect":3}]},{"id":"move_on","label":"Refuse the ground and sleep worse","tags":["risk:cautious"],"stance":"Refuses the ground. Sleeps badly somewhere worse and wakes up himself.","commands":[]}]'::jsonb
WHERE id = '0ca10010-0000-4000-8000-0ca100000010';

UPDATE npc_interactions SET
  traveller_stance = 'Shares the road''s news at the edge of his fire. Does not ask what is behind him.',
  options = '[{"id":"stay","label":"Take the first watch","tags":["need:exhaustion","need:hunger"],"stance":"Takes the first watch. Eats at his fire. Wakes him only if it matters. Does not mention the pass.","commands":[{"type":"overnight_shelter","name":"the watch-fire","description":"a place at a fire that needed another pair of eyes","indoor":false,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":2,"shadow_effect":-1}]},{"id":"move_on","label":"Share the news and leave him his watch","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = '0d1a0005-0000-4000-8000-0d1a00000005';

UPDATE npc_interactions SET
  commands = '[{"type":"item","slug":"lembas","qty":1},{"type":"water_refill"}]'::jsonb,
  options = '[{"id":"stay","label":"Take the night under the hythe","tags":["need:exhaustion","need:hunger","need:unrest","need:thirst"],"stance":"Takes the night under the hythe of woven branches. Asks one question, well chosen.","commands":[{"type":"overnight_shelter","name":"the hythe","description":"a night under a hythe of woven branches, lent by elves","indoor":false,"lodging_cost":0,"meal":false,"water":true,"rest_quality":4,"shadow_effect":-2}]},{"id":"move_on","label":"Take the waybread and walk on","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = '0e1f0001-0000-4000-8000-0e1f00000001';

UPDATE npc_interactions SET
  options = '[{"id":"stay","label":"Take the healing and a place at their fire","tags":["need:exhaustion","need:hunger","need:unrest"],"stance":"Takes the food and a place at their fire. Accepts the boundary without argument.","commands":[{"type":"overnight_shelter","name":"the healers'' fire","description":"a place at the fire of those who heal and then let go","indoor":false,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":4,"shadow_effect":-2}]},{"id":"move_on","label":"Take the path they showed and walk on","tags":["risk:bold"],"stance":"Accepts the boundary without argument. Walks on with the path they showed her.","commands":[]}]'::jsonb
WHERE id = '0e1f0002-0000-4000-8000-0e1f00000002';

UPDATE npc_interactions SET
  options = '[{"id":"stay","label":"Sit for the singing and sleep under their keep","tags":["need:exhaustion","need:unrest"],"stance":"Sits for the singing. Sleeps under their keep and wakes lighter than he lay down.","commands":[{"type":"overnight_shelter","name":"the sung watch","description":"a place to sleep kept by those who sing over what ails the traveller","indoor":false,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","rest_quality":4,"shadow_effect":-2}]},{"id":"move_on","label":"Sit a while and walk on","tags":["risk:bold"],"stance":"Sits for it a while. Does not stay the night.","commands":[]}]'::jsonb
WHERE id = '0e1f0003-0000-4000-8000-0e1f00000003';

UPDATE npc_interactions SET
  options = '[{"id":"stay","label":"Take the camp they made","tags":["need:exhaustion","need:hunger","need:thirst","need:unrest"],"stance":"Takes the camp they made without being asked. Eats the meal. Drinks the hot water.","commands":[{"type":"overnight_shelter","name":"the camp they made","description":"a proper camp made for her without being asked","indoor":false,"lodging_cost":0,"meal":true,"meal_slug":"shared_pot","water":true,"rest_quality":3,"shadow_effect":-1}]},{"id":"move_on","label":"Answer about the road and make her own camp","tags":["risk:bold"],"stance":"Answers about the road. Does not confirm the assumption. Makes her own camp.","commands":[]}]'::jsonb
WHERE id = '0e1f0006-0000-4000-8000-0e1f00000006';

UPDATE npc_interactions SET
  options = '[{"id":"stay","label":"Take the shelter, refuse the escort","tags":["need:exhaustion","need:unrest"],"stance":"Takes the shelter. Refuses the horse and the escort. Does not answer the question.","commands":[{"type":"overnight_shelter","name":"the offered shelter","description":"shelter offered by elves who ask only one question too kind to answer","indoor":false,"lodging_cost":0,"meal":false,"rest_quality":3,"shadow_effect":-1}]},{"id":"move_on","label":"Refuse the escort and walk on","tags":["risk:bold"],"commands":[]}]'::jsonb
WHERE id = '0e1f0007-0000-4000-8000-0e1f00000007';

UPDATE npc_interactions SET
  options = '[{"id":"stay","label":"Take the place made ready","tags":["need:exhaustion","need:unrest"],"stance":"Takes the place made ready in the middle of their camp. Eats little. Says nothing about why it was made there.","commands":[{"type":"overnight_shelter","name":"the place made ready","description":"a place made ready in the middle of their camp — deliberately, so that she is surrounded","indoor":false,"lodging_cost":0,"meal":false,"rest_quality":3,"shadow_effect":-2}]},{"id":"move_on","label":"Rest at the firelight edge and go","tags":["risk:bold"],"stance":"Eats little. Rests at the edge of their firelight a while. Walks on before the place made ready can hold her.","commands":[]}]'::jsonb
WHERE id = '0e1f0008-0000-4000-8000-0e1f00000008';

UPDATE npc_interactions SET
  traveller_stance = 'Takes the lembas and the coil of grey rope. Promises the wood his feet and his knife.',
  commands = '[{"type":"item","slug":"lembas","qty":1}]'::jsonb,
  options = '[{"id":"stay","label":"Take the flet on their terms","tags":["need:exhaustion","need:unrest"],"stance":"Sleeps where he is put. Cuts nothing. Leaves at the hour they name.","commands":[{"type":"overnight_shelter","name":"the flet","description":"a talan above the ground, lent for a night on their terms","indoor":false,"lodging_cost":0,"meal":false,"rest_quality":4,"shadow_effect":-2}]},{"id":"move_on","label":"Thank them and keep out of the wood","tags":["risk:cautious"],"stance":"Thanks them for the terms. Does not take the flet. Keeps walking while the light holds.","commands":[]}]'::jsonb
WHERE id = '0e1f0011-0000-4000-8000-0e1f00000011';

UPDATE npc_interactions SET commands = '[{"type":"item","slug":"trail_rations","qty":1}]'::jsonb
WHERE id = '0a1d0002-0000-4000-8000-0a1d00000002';

UPDATE npc_interactions SET commands = '[{"type":"meal","food":"their bread"}]'::jsonb
WHERE id = '0a1d0011-0000-4000-8000-0a1d00000011';

UPDATE npc_interactions SET commands = '[{"type":"item","slug":"trail_rations","qty":3}]'::jsonb
WHERE id = '0a1d0013-0000-4000-8000-0a1d00000013';

UPDATE npc_interactions SET commands = '[{"type":"coins","amount":-2},{"type":"meal","food":"food bought at last year''s price"}]'::jsonb
WHERE id = '0a1d0015-0000-4000-8000-0a1d00000015';

UPDATE npc_interactions SET commands = '[{"type":"item","slug":"trail_rations","qty":1}]'::jsonb
WHERE id = '0a1d0020-0000-4000-8000-0a1d00000020';

UPDATE npc_interactions SET commands = '[{"type":"meal","food":"roasted roots and water"}]'::jsonb
WHERE id = '0a1d0021-0000-4000-8000-0a1d00000021';

UPDATE npc_interactions SET commands = '[{"type":"meal","food":"roots and water"},{"type":"water_refill"}]'::jsonb
WHERE id = '0a1d0022-0000-4000-8000-0a1d00000022';

UPDATE npc_interactions SET commands = '[{"type":"meal","food":"oatcake and mutton fat","drink":"thin beer"}]'::jsonb
WHERE id = '0a1e0001-0000-4000-8000-0a1e00000001';

UPDATE npc_interactions SET commands = '[{"type":"meal","food":"curds and barley bread"}]'::jsonb
WHERE id = '0a1e0004-0000-4000-8000-0a1e00000004';

UPDATE npc_interactions SET commands = '[{"type":"item","slug":"trail_rations","qty":2},{"type":"water_refill"}]'::jsonb
WHERE id = '0a1e0007-0000-4000-8000-0a1e00000007';

UPDATE npc_interactions SET commands = '[{"type":"meal","food":"food and grain at their fire"},{"type":"item","slug":"trail_rations","qty":1}]'::jsonb
WHERE id = '0a1e0008-0000-4000-8000-0a1e00000008';

UPDATE npc_interactions SET commands = '[{"type":"meal","food":"roots and smoked meat"},{"type":"water_refill"}]'::jsonb
WHERE id = '0a1e0010-0000-4000-8000-0a1e00000010';

UPDATE npc_interactions SET commands = '[{"type":"coins","amount":-1}]'::jsonb
WHERE id = '0a1e0014-0000-4000-8000-0a1e00000014';

UPDATE npc_interactions SET commands = '[{"type":"meal","food":"eel and flat reed-bread"}]'::jsonb
WHERE id = '0a1e0019-0000-4000-8000-0a1e00000019';

UPDATE npc_interactions SET commands = '[{"type":"coins","amount":-2},{"type":"meal","food":"bread, oil and dried figs"},{"type":"water_refill"}]'::jsonb
WHERE id = '0a1e0020-0000-4000-8000-0a1e00000020';

UPDATE npc_interactions SET commands = '[{"type":"coins","amount":-3},{"type":"item","slug":"trail_rations","qty":1}]'::jsonb
WHERE id = '0a1e0023-0000-4000-8000-0a1e00000023';

UPDATE npc_interactions SET commands = '[{"type":"item","slug":"trail_rations","qty":1}]'::jsonb
WHERE id = '0a1e0025-0000-4000-8000-0a1e00000025';

UPDATE npc_interactions SET commands = '[{"type":"item","slug":"common_arrows","qty":6},{"type":"item","slug":"trail_rations","qty":1}]'::jsonb
WHERE id = '0a1e0026-0000-4000-8000-0a1e00000026';

UPDATE npc_interactions SET commands = '[{"type":"meal","food":"the fresh fish"}]'::jsonb
WHERE id = '0a1e0028-0000-4000-8000-0a1e00000028';

UPDATE npc_interactions SET commands = '[{"type":"meal","food":"the food he did not know he needed"}]'::jsonb
WHERE id = '0ca10001-0000-4000-8000-0ca100000001';

UPDATE npc_interactions SET commands = '[{"type":"meal","food":"a warm mash of something wholesome"}]'::jsonb
WHERE id = '0ca10004-0000-4000-8000-0ca100000004';

UPDATE npc_interactions SET commands = '[{"type":"heal"}]'::jsonb
WHERE id = '0ca10005-0000-4000-8000-0ca100000005';

UPDATE npc_interactions SET commands = '[{"type":"meal","food":"bread, honey and yellow cream"}]'::jsonb
WHERE id = '0ca10008-0000-4000-8000-0ca100000008';

UPDATE npc_interactions SET commands = '[{"type":"coins","amount":-2},{"type":"item","slug":"trail_rations","qty":1}]'::jsonb
WHERE id = '0d1a0004-0000-4000-8000-0d1a00000004';

UPDATE npc_interactions SET commands = '[{"type":"meal","food":"food at his fire"}]'::jsonb
WHERE id = '0d1a0006-0000-4000-8000-0d1a00000006';

UPDATE npc_interactions SET commands = '[{"type":"coins","amount":-3},{"type":"item","slug":"trail_rations","qty":1}]'::jsonb
WHERE id = '0d1a0009-0000-4000-8000-0d1a00000009';

UPDATE npc_interactions SET commands = '[{"type":"coins","amount":-3},{"type":"item","slug":"trail_rations","qty":1}]'::jsonb
WHERE id = '0d1a0010-0000-4000-8000-0d1a00000010';

UPDATE npc_interactions SET commands = '[{"type":"meal","food":"the hot meal at the mine-mouth"},{"type":"water_refill"}]'::jsonb
WHERE id = '0d1a0014-0000-4000-8000-0d1a00000014';

UPDATE npc_interactions SET commands = '[{"type":"heal"},{"type":"item","slug":"lembas","qty":1}]'::jsonb
WHERE id = '0e1f0009-0000-4000-8000-0e1f00000009';

UPDATE npc_interactions SET commands = '[{"type":"heal"},{"type":"item","slug":"trail_rations","qty":3}]'::jsonb
WHERE id = '0e1f0010-0000-4000-8000-0e1f00000010';

UPDATE npc_interactions SET commands = '[{"type":"meal","food":"a hot meal at their fire","drink":"their strong wine"}]'::jsonb
WHERE id = '0e1f0012-0000-4000-8000-0e1f00000012';

UPDATE npc_interactions SET commands = '[{"type":"meal","food":"food from their own store"}]'::jsonb
WHERE id = '0e1f0013-0000-4000-8000-0e1f00000013';

UPDATE npc_interactions SET commands = '[{"type":"meal","food":"dried fruit"},{"type":"water_refill"}]'::jsonb
WHERE id = '0e1f0014-0000-4000-8000-0e1f00000014';

UPDATE npc_interactions SET commands = '[{"type":"meal","food":"ship''s bread and salt fish"}]'::jsonb
WHERE id = '0e1f0015-0000-4000-8000-0e1f00000015';

UPDATE npc_interactions SET commands = '[{"type":"item","slug":"common_arrows","qty":6}]'::jsonb
WHERE id = '0e1f0016-0000-4000-8000-0e1f00000016';

UPDATE npc_interactions SET commands = '[{"type":"meal","drink":"the hot drink he cannot identify"}]'::jsonb
WHERE id = '0e1f0018-0000-4000-8000-0e1f00000018';

UPDATE npc_interactions SET commands = '[{"type":"meal","food":"grilled fish"},{"type":"water_refill"}]'::jsonb
WHERE id = '0e1f0019-0000-4000-8000-0e1f00000019';
