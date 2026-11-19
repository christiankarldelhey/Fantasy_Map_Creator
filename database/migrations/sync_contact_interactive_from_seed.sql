-- Sync entities_narration.interactive for kind='contact' rows from the
-- authored seed (entities_narration.json). The local rows were loaded
-- before stance/commands/options were authored on the unified model:
-- only {id, tags, situation} survived, so the dusk shelter decision
-- (B5) could never fire — an aid_or_trade offering 'a dry loft' met a
-- night still resolved as open camp, and the prompt carried both.
-- Generated from the seed JSON: interactive is set verbatim per id.

BEGIN;

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0228ae0a-a041-4892-a12f-0cae7580e758:sit", "tags": [], "situation": {"en": "A visual gift. Nothing else."}, "stance": {"en": "Notes the colour. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:0228ae0a-a041-4892-a12f-0cae7580e758';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:024cca5e-3a79-45fa-a9c9-32b7aebffc67:sit", "tags": [], "situation": {"en": "The offer is fair. She is testing whether the traveller is worth helping, and the test is this: do they take the offer seriously or dismiss it."}, "stance": {"en": "Takes the offer seriously."}}]$interactive$::jsonb
WHERE id = 'cnt:024cca5e-3a79-45fa-a9c9-32b7aebffc67';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:03a2d476-3e9e-437b-8bea-52de13335884:sit", "tags": [], "situation": {"en": "Papers exist for people who are supposed to be here. The traveller is not supposed to be here."}, "stance": {"en": "Has no papers. Has a story instead. Watches to see which one the Man prefers."}}]$interactive$::jsonb
WHERE id = 'cnt:03a2d476-3e9e-437b-8bea-52de13335884';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:046cd08b-6907-4870-8a05-8bfe8ab60ee1:sit", "tags": [], "situation": {"en": "There is a reason this path was abandoned. It might be as simple as a better road was built. It might not."}, "stance": {"en": "Does not force through the scrub. Looks for the reason the path was abandoned."}}]$interactive$::jsonb
WHERE id = 'cnt:046cd08b-6907-4870-8a05-8bfe8ab60ee1';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:04965f25-03aa-48ec-92d9-b0ec8ad45341:sit", "tags": [], "situation": {"en": "The watch means the forest has reason to watch this particular road at this particular time."}, "stance": {"en": "Continues on the road. Does not enter the forest."}}]$interactive$::jsonb
WHERE id = 'cnt:04965f25-03aa-48ec-92d9-b0ec8ad45341';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:04d67694-00b0-42c5-b727-25e7f48c4917:sit", "tags": [], "situation": {"en": "It has not acted. It is noting. The difference between those two things is not permanent."}, "stance": {"en": "Does not stop. Does not acknowledge it. Continues at the same pace."}}]$interactive$::jsonb
WHERE id = 'cnt:04d67694-00b0-42c5-b727-25e7f48c4917';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:05125450-86f5-4ed3-8114-bda723ad874f:sit", "tags": [], "situation": {"en": "Variags do not share information without reason. The reason here is not stated."}, "stance": {"en": "Thanks him. Asks what is on the eastern road."}}]$interactive$::jsonb
WHERE id = 'cnt:05125450-86f5-4ed3-8114-bda723ad874f';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:065d0ce3-f96f-466e-9682-6bf3c95406f6:sit", "tags": [], "situation": {"en": "Whatever it is, it is aware of the traveller at the bank. It has turned to parallel them each time they move."}, "stance": {"en": "Does not enter the water. Moves away from the bank."}}]$interactive$::jsonb
WHERE id = 'cnt:065d0ce3-f96f-466e-9682-6bf3c95406f6';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:06a542aa-44cb-4709-a4e7-17364504cd60:sit", "tags": [], "situation": {"en": "They are not going to explain what they are looking at unless asked, and asking may get more answer than expected."}, "stance": {"en": "Continues past. Or stops and asks."}}]$interactive$::jsonb
WHERE id = 'cnt:06a542aa-44cb-4709-a4e7-17364504cd60';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:070e2ff8-531e-40c9-bd8f-0b11224f1a2f:sit", "tags": [], "situation": {"en": "Being retreated from by someone who does not retreat easily is worth thinking about."}, "stance": {"en": "Continues. Does not follow into the trees. Considers what they saw."}}]$interactive$::jsonb
WHERE id = 'cnt:070e2ff8-531e-40c9-bd8f-0b11224f1a2f';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:085efb03-40b0-4d56-b02b-3f9f6b886f2e:sit", "tags": [], "situation": {"en": "He may be right. She has never examined the possibility that staying is not fully chosen."}, "stance": {"en": "Asks him what he means by holding. Listens to the answer."}}]$interactive$::jsonb
WHERE id = 'cnt:085efb03-40b0-4d56-b02b-3f9f6b886f2e';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:08ab9ccf-508d-4a4e-a3c9-7dde3144a434:sit", "tags": [], "situation": {"en": "The description may or may not match someone the traveller knows. If it does, the message is clear. If it doesn't, it is still a warning about what is being hunted on this road."}, "stance": {"en": "Listens to the description. Gives nothing away."}}]$interactive$::jsonb
WHERE id = 'cnt:08ab9ccf-508d-4a4e-a3c9-7dde3144a434';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:08be085c-a486-4a77-9f56-d5c59d7b8c58:sit", "tags": [], "situation": {"en": "A single wolf watching a road from a ridge is either a scout or an individual with a territory claim on this road."}, "stance": {"en": "Notes it. Does not stop. Keeps moving."}}]$interactive$::jsonb
WHERE id = 'cnt:08be085c-a486-4a77-9f56-d5c59d7b8c58';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:08e80be2-358c-466f-9f89-6527e5aca449:sit", "tags": [], "situation": {"en": "The lake looks still again. The wake did not come toward the shore."}, "stance": {"en": "Notes the direction it was moving. Does not swim in this lake."}}]$interactive$::jsonb
WHERE id = 'cnt:08e80be2-358c-466f-9f89-6527e5aca449';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:09376525-c60c-451e-acd0-845549cdaa30:sit", "tags": [], "situation": {"en": "He may be right that the mark requires a witness. She is not that witness — but she knows someone who was."}, "stance": {"en": "Says she was not there at the beginning. Tells him she knows who was. Watches what he does with that."}}]$interactive$::jsonb
WHERE id = 'cnt:09376525-c60c-451e-acd0-845549cdaa30';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0964152f-5fac-4f17-9706-3197fcf1f000:sit", "tags": [], "situation": {"en": "A Corsair offering a boat to a stranger on a road is offering something, but it may not be transportation."}, "stance": {"en": "Declines politely. Watches which way he goes to report back."}}]$interactive$::jsonb
WHERE id = 'cnt:0964152f-5fac-4f17-9706-3197fcf1f000';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1d0001-0000-4000-8000-0a1d00000001:sit", "tags": [], "situation": {"en": "The bargain is real on both sides and neither will name it aloud."}, "stance": {"en": "Takes the fire and the share of the pot. Pays in news and an hour of hands before walking on."}, "commands": [{"type": "meal", "food": "thin barley bread and a share of the pot"}], "options": [{"id": "stay", "label": "Take the byre-loft", "tags": ["need:exhaustion", "need:hunger", "need:unrest"], "stance": "Takes the byre-loft. Pays in news and an hour of hands at the evening work.", "commands": [{"type": "overnight_shelter", "name": "the byre-loft", "description": "a dry loft above the byre — coin refused, the price is news and hands", "indoor": true, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 3, "shadow_effect": -1}]}, {"id": "move_on", "label": "Pay in news and walk on", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1d0001-0000-4000-8000-0a1d00000001';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1d0002-0000-4000-8000-0a1d00000002:sit", "tags": [], "situation": {"en": "Something has taught this house to count strangers. They will help and still be glad to see him gone at first light."}, "stance": {"en": "Answers the question about the road honestly. Does not ask what happened here."}, "commands": [{"type": "item", "slug": "trail_rations", "qty": 1}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1d0002-0000-4000-8000-0a1d00000002';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1d0003-0000-4000-8000-0a1d00000003:sit", "tags": [], "situation": {"en": "They are afraid of what walks the country now and not certain he is no part of it. The charity is real; the fear is older."}, "stance": {"en": "Eats what is given at the gate. Leaves the bowl clean and something small beside it."}, "commands": [{"type": "meal", "food": "what was left on the gate-stone"}, {"type": "water_refill"}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1d0003-0000-4000-8000-0a1d00000003';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1d0004-0000-4000-8000-0a1d00000004:sit", "tags": [], "situation": {"en": "They know what he is without the word being said. Rangers are useful and slightly unlucky to have at the table."}, "stance": {"en": "Gives the road honestly and names the two places he would not stop at. Takes only what he can carry."}, "commands": [{"type": "meal", "food": "hot food at the farmhouse table"}, {"type": "item", "slug": "trail_rations", "qty": 1}], "options": [{"id": "stay", "label": "Take the dry corner for the night", "tags": ["need:exhaustion", "need:hunger", "need:unrest"], "stance": "Takes the dry corner. Gives them the Greenway honestly — the watched stretch and the quiet one.", "commands": [{"type": "overnight_shelter", "name": "the farm's dry corner", "description": "a dry corner under the farmhouse roof, earned with word of the road", "indoor": true, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 3, "shadow_effect": -1}]}, {"id": "move_on", "label": "Give the road news and walk on", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1d0004-0000-4000-8000-0a1d00000004';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1d0005-0000-4000-8000-0a1d00000005:sit", "tags": [], "situation": {"en": "They have been holding a dead man's gear for two seasons and would rather hand it to a stranger than keep it another night."}, "stance": {"en": "Takes the bundle. Reads the writing. Says nothing of what it means to him."}}]$interactive$::jsonb
WHERE id = 'cnt:0a1d0005-0000-4000-8000-0a1d00000005';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1d0006-0000-4000-8000-0a1d00000006:sit", "tags": [], "situation": {"en": "They want the fold looked at and they do not want to be told the worst answer if that is what he finds."}, "stance": {"en": "Eats what they give. Tells them only what they can use. Walks on while the light lasts."}, "commands": [{"type": "meal", "food": "a share of the pot"}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1d0006-0000-4000-8000-0a1d00000006';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1d0007-0000-4000-8000-0a1d00000007:sit", "tags": [], "situation": {"en": "They have nothing worth giving to one of her kind and are giving it regardless. Refusing would cost them more than accepting."}, "stance": {"en": "Accepts the cup. Looks at the child. Says what can be done in words a farmer can use."}, "commands": [{"type": "meal", "food": "new bread and honey", "drink": "the one good cup"}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1d0007-0000-4000-8000-0a1d00000007';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1d0008-0000-4000-8000-0a1d00000008:sit", "tags": [], "situation": {"en": "Kindness that must not be witnessed. It is not her they fear — it is what their neighbours would make of it."}, "stance": {"en": "Agrees to the back path. Does not make them explain it."}, "options": [{"id": "stay", "label": "Share their fire, leave unseen", "tags": ["need:exhaustion", "need:hunger", "need:unrest"], "stance": "Shares the fire and the pot. Leaves by the back path before the village is awake.", "commands": [{"type": "overnight_shelter", "name": "the unwitnessed fire", "description": "a place by a fire whose owners ask not to be seen being kind", "indoor": true, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 3, "shadow_effect": -1}]}, {"id": "move_on", "label": "Agree to the back path and go now", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1d0008-0000-4000-8000-0a1d00000008';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1d0009-0000-4000-8000-0a1d00000009:sit", "tags": [], "situation": {"en": "The old woman has waited her whole life to ask someone who would know. The answer will not comfort her."}, "stance": {"en": "Answers truthfully and briefly. Does not dress it up for her."}, "options": [{"id": "stay", "label": "Take the hearth-place for the night", "tags": ["need:exhaustion", "need:unrest"], "stance": "Takes the hearth-place for the night. Gives the old woman the true answer and does not dress it up.", "commands": [{"type": "overnight_shelter", "name": "the hearth-place", "description": "a place by the hearth of a woman who has waited her whole life to ask", "indoor": true, "lodging_cost": 0, "meal": false, "rest_quality": 3, "shadow_effect": -1}]}, {"id": "move_on", "label": "Answer her and walk on", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1d0009-0000-4000-8000-0a1d00000009';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1d0010-0000-4000-8000-0a1d00000010:sit", "tags": [], "situation": {"en": "The whole welcome hangs on one thing — which side of the old quarrel he stands on. They will not ask twice."}, "stance": {"en": "Answers plainly. Neither defends the Rohirrim nor flatters the hill-folk."}, "options": [{"id": "stay", "label": "Take the place at the peat-fire", "tags": ["need:exhaustion", "need:hunger", "need:unrest"], "stance": "Takes the place at the peat-fire. Eats their mutton and curds. Answers plainly about the riders.", "commands": [{"type": "overnight_shelter", "name": "the peat-fire", "description": "a place at a peat-fire in hill-country, bought with a straight answer", "indoor": false, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 2, "shadow_effect": -1}]}, {"id": "move_on", "label": "Answer plainly and walk on", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1d0010-0000-4000-8000-0a1d00000010';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1d0011-0000-4000-8000-0a1d00000011:sit", "tags": [], "situation": {"en": "They believe a stranger knows more than he is saying. The trade is also a test of that."}, "stance": {"en": "Gives up the knife. Says what he knows of the burning and no more than that."}, "commands": [{"type": "meal", "food": "their bread"}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1d0011-0000-4000-8000-0a1d00000011';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1d0012-0000-4000-8000-0a1d00000012:sit", "tags": [], "situation": {"en": "The generosity is genuine and the questioning is relentless. Nothing is owed and everything is asked."}, "stance": {"en": "Eats well. Gives news freely. Keeps his own errand out of it."}, "commands": [{"type": "meal", "food": "meat and ale at the bench"}, {"type": "item", "slug": "trail_rations", "qty": 1}], "options": [{"id": "stay", "label": "Take the bench in the hall", "tags": ["need:exhaustion", "need:hunger", "need:unrest"], "stance": "Takes the bench in the hall. Gives news freely until the ale runs out.", "commands": [{"type": "overnight_shelter", "name": "the hall bench", "description": "a bench by the hall fire, with the whole household listening", "indoor": true, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 3, "shadow_effect": -1}]}, {"id": "move_on", "label": "Give the road news and keep walking", "tags": ["risk:bold"], "stance": "Gives them the news of the southern roads. Declines the bench and keeps his own errand out of it.", "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1d0012-0000-4000-8000-0a1d00000012';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1d0013-0000-4000-8000-0a1d00000013:sit", "tags": [], "situation": {"en": "They are being pushed westward by something they will not name at the table and would rather send a warning than admit it aloud."}, "stance": {"en": "Takes the message. Carries it. Repeats it exactly as given."}, "commands": [{"type": "item", "slug": "trail_rations", "qty": 3}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1d0013-0000-4000-8000-0a1d00000013';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1d0014-0000-4000-8000-0a1d00000014:sit", "tags": [], "situation": {"en": "The hospitality is real. So is the tally, and someone in Minas Anor will read it eventually."}, "stance": {"en": "Gives a name they can write down. Eats the bread and olives. Leaves while the light holds."}, "commands": [{"type": "meal", "food": "bread, oil and olives"}], "options": [{"id": "stay", "label": "Take the place in the outbuilding", "tags": ["need:exhaustion", "need:hunger", "need:unrest"], "stance": "Takes the place in the outbuilding. Eats the bread and olives. Lets the tally have his name.", "commands": [{"type": "overnight_shelter", "name": "the outbuilding", "description": "a place in the outbuilding of a village that writes travellers into a tally", "indoor": true, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 3, "shadow_effect": 0}]}, {"id": "move_on", "label": "Give the tally a name and walk on", "tags": ["risk:bold"], "stance": "Gives a name they can write down. Reads the tally for what it is. Walks on.", "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1d0014-0000-4000-8000-0a1d00000014';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1d0015-0000-4000-8000-0a1d00000015:sit", "tags": [], "situation": {"en": "He is telling a stranger something he ought to be telling his own captain. He knows it."}, "stance": {"en": "Pays the asked price. Marks the milestone. Does not press him further."}, "commands": [{"type": "coins", "amount": -2}, {"type": "meal", "food": "food bought at last year's price"}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1d0015-0000-4000-8000-0a1d00000015';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1d0016-0000-4000-8000-0a1d00000016:sit", "tags": [], "situation": {"en": "These are folk who have kept faith with a ruined kingdom for generations and want to hear that it still counts for something."}, "stance": {"en": "Takes the arrows. Gives a true answer about the north even where the truth is thin."}, "commands": [{"type": "meal", "food": "the household's hot food"}, {"type": "item", "slug": "common_arrows", "qty": 8}], "options": [{"id": "stay", "label": "Take the dry loft", "tags": ["need:exhaustion", "need:hunger", "need:unrest"], "stance": "Takes the dry loft and the arrows. Gives a true answer about the north even where the truth is thin.", "commands": [{"type": "overnight_shelter", "name": "the dry loft", "description": "a dry loft over a house that keeps faith with a ruined kingdom", "indoor": true, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 3, "shadow_effect": -1}]}, {"id": "move_on", "label": "Give the north honestly and walk on", "tags": ["risk:bold"], "stance": "Gives a true answer about the north even where the truth is thin. Leaves the bundle where it lies.", "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1d0016-0000-4000-8000-0a1d00000016';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1d0017-0000-4000-8000-0a1d00000017:sit", "tags": [], "situation": {"en": "Nothing here is free, but the price is work and everyone knows the rate."}, "stance": {"en": "Takes the oar for the crossing. Earns the breakfast. Walks on."}, "commands": [{"type": "meal", "food": "smoked fish and flat bread"}], "options": [{"id": "stay", "label": "Take the berth in the net-loft", "tags": ["need:exhaustion", "need:hunger"], "stance": "Takes the berth in the net-loft. Takes the oar before dawn if the boat goes out.", "commands": [{"type": "overnight_shelter", "name": "the net-loft", "description": "a berth among the drying nets, paid for with an oar before dawn", "indoor": true, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 2, "shadow_effect": -1}]}, {"id": "move_on", "label": "Take the fish and camp upshore", "tags": ["risk:bold"], "stance": "Takes the smoked fish. Camps upshore of the net-lofts.", "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1d0017-0000-4000-8000-0a1d00000017';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1d0018-0000-4000-8000-0a1d00000018:sit", "tags": [], "situation": {"en": "There is no sentiment in it. The land does not allow any. The gift is exact and it will save his life."}, "stance": {"en": "Accepts the seal-meat and the grass packing. Repays the kindness as he can."}, "commands": [{"type": "meal", "food": "seal-meat at the fire"}], "options": [{"id": "stay", "label": "Take the place out of the wind", "tags": ["need:exhaustion", "need:hunger", "need:unrest"], "stance": "Takes the place out of the wind. Sleeps with the seal-meat and the grass packing earned.", "commands": [{"type": "overnight_shelter", "name": "the place out of the wind", "description": "a place out of the wind in country where wind kills", "indoor": false, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 3, "shadow_effect": -1}]}, {"id": "move_on", "label": "Repay the kindness and walk on", "tags": ["risk:bold"], "stance": "Repays the kindness as he can. Walks on while the wind allows.", "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1d0018-0000-4000-8000-0a1d00000018';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1d0019-0000-4000-8000-0a1d00000019:sit", "tags": [], "situation": {"en": "They are camped in country nobody rules and they trust nothing that has not yet proved useful."}, "stance": {"en": "Sits where he is put. Eats his share. Gives them word of the war-bands and moves on."}, "commands": [{"type": "meal", "food": "a share of what is on the spit"}], "options": [{"id": "stay", "label": "Take the place at the firelight edge", "tags": ["need:exhaustion", "need:hunger", "need:unrest"], "stance": "Takes the place at the edge of the firelight. Eats his share of the spit. Gives them word of the war-bands.", "commands": [{"type": "overnight_shelter", "name": "the edge of the firelight", "description": "a place at the edge of a camp that trusts nothing unproven", "indoor": false, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 2, "shadow_effect": 0}]}, {"id": "move_on", "label": "Give the war-band news and move on", "tags": ["risk:bold"], "stance": "Gives them word of the war-bands. Does not take the place at the firelight edge.", "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1d0019-0000-4000-8000-0a1d00000019';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1d0020-0000-4000-8000-0a1d00000020:sit", "tags": [], "situation": {"en": "The short way is real and it is only offered to those who help with the ewe. That is the whole of the test."}, "stance": {"en": "Carries the ewe down. Takes the short way."}, "commands": [{"type": "item", "slug": "trail_rations", "qty": 1}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1d0020-0000-4000-8000-0a1d00000020';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1d0021-0000-4000-8000-0a1d00000021:sit", "tags": [], "situation": {"en": "They are handing him the land in their own language and they will not repeat it. Either he can read it or he cannot."}, "stance": {"en": "Reads the sticks. Leaves dried meat on the stone. Walks around the marked place."}, "commands": [{"type": "meal", "food": "roasted roots and water"}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1d0021-0000-4000-8000-0a1d00000021';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1d0022-0000-4000-8000-0a1d00000022:sit", "tags": [], "situation": {"en": "They have been raided twice this season and will trade with anyone who is not carrying the raiders' gear."}, "stance": {"en": "Pays without haggling. Leaves by the road they name."}, "commands": [{"type": "meal", "food": "roots and water"}, {"type": "water_refill"}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1d0022-0000-4000-8000-0a1d00000022';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0001-0000-4000-8000-0a1e00000001:sit", "tags": [], "situation": {"en": "Hill-folk share their fire readily and their trust never. What is being bought with the food is information about the horse-folk."}, "stance": {"en": "Answers about the riders without pretending not to have seen them. Eats what is put in his hand."}, "commands": [{"type": "meal", "food": "oatcake and mutton fat", "drink": "thin beer"}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0001-0000-4000-8000-0a1e00000001';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0002-0000-4000-8000-0a1e00000002:sit", "tags": [], "situation": {"en": "They are in country they consider stolen from them and they are camped on it without leave. The hospitality is genuine and so is the threat under it."}, "stance": {"en": "Trades word of the lower fords for the name of the dry crossing. Does not press toward their fire."}, "options": [{"id": "stay", "label": "Give the salt and the oath", "tags": ["need:exhaustion", "need:hunger"], "stance": "Gives the salt. Gives the promise and means it. Sleeps with his boots on.", "commands": [{"type": "overnight_shelter", "name": "the hidden camp's fire", "description": "a place by a fire in a camp that is not supposed to be here", "indoor": false, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 2, "shadow_effect": 0}]}, {"id": "move_on", "label": "Take the crossing name and walk on", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0002-0000-4000-8000-0a1e00000002';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0003-0000-4000-8000-0a1e00000003:sit", "tags": [], "situation": {"en": "They need a stranger to walk that track because they will not send more of their own. They will not ask outright. They will let him work out that they need it."}, "stance": {"en": "Eats. Understands what is not being asked. Decides whether the track is his business."}, "commands": [{"type": "meal", "food": "food at their fire"}], "options": [{"id": "stay", "label": "Take the food and the hide", "tags": ["need:exhaustion", "need:hunger"], "stance": "Takes the food and the hide. Sleeps light, deciding nothing about the track.", "commands": [{"type": "overnight_shelter", "name": "the offered hide", "description": "a hide to sleep under, offered by people who need a stranger to walk a bad track", "indoor": false, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 2, "shadow_effect": 0}]}, {"id": "move_on", "label": "Take the warning and walk on", "tags": ["risk:cautious"], "stance": "Understands what is not being asked. Walks on before they can offer the hide.", "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0003-0000-4000-8000-0a1e00000003';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0004-0000-4000-8000-0a1e00000004:sit", "tags": [], "situation": {"en": "They are buying his indifference, not his friendship. Both sides know the coin is fair."}, "stance": {"en": "Names himself Dúnedain and nothing more. Takes the track they name."}, "commands": [{"type": "meal", "food": "curds and barley bread"}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0004-0000-4000-8000-0a1e00000004';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0005-0000-4000-8000-0a1e00000005:sit", "tags": [], "situation": {"en": "She could tell them exactly why. Telling them will confirm something they would rather have kept as a story."}, "stance": {"en": "Looks at the spring. Gives them the plain cause and the plain remedy. Lets the story die."}, "commands": [{"type": "meal", "food": "what they give"}], "options": [{"id": "stay", "label": "Sleep within the ring of the camp", "tags": ["need:exhaustion", "need:hunger", "need:unrest"], "stance": "Eats what they give. Sleeps within the ring of the camp. Lets the story die.", "commands": [{"type": "overnight_shelter", "name": "the camp ring", "description": "a place to sleep inside the ring of a camp that is afraid of being seen", "indoor": false, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 3, "shadow_effect": -1}]}, {"id": "move_on", "label": "Tell them the remedy and walk on", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0005-0000-4000-8000-0a1e00000005';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0006-0000-4000-8000-0a1e00000006:sit", "tags": [], "situation": {"en": "Her craft is real and old and she is short of everything that has to be forged rather than grown."}, "stance": {"en": "Trades the needles. Takes the yarrow. Listens to how she says it should be used."}}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0006-0000-4000-8000-0a1e00000006';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0007-0000-4000-8000-0a1e00000007:sit", "tags": [], "situation": {"en": "The gift costs them nothing and is a point of honour. Refusing it would be the insult."}, "stance": {"en": "Accepts. Answers where he is bound. Does not ask for an escort."}, "commands": [{"type": "item", "slug": "trail_rations", "qty": 2}, {"type": "water_refill"}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0007-0000-4000-8000-0a1e00000007';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0008-0000-4000-8000-0a1e00000008:sit", "tags": [], "situation": {"en": "They are counting hill-folk camps and he is the only source they have today. What he says may put riders on a track by tomorrow."}, "stance": {"en": "Gives only what he actually saw. Refuses to guess at numbers."}, "commands": [{"type": "meal", "food": "food and grain at their fire"}, {"type": "item", "slug": "trail_rations", "qty": 1}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0008-0000-4000-8000-0a1e00000008';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0009-0000-4000-8000-0a1e00000009:sit", "tags": [], "situation": {"en": "Their whole year turns on where the grazing is good. A traveller's eyes are worth a meal."}, "stance": {"en": "Describes the grass and the water honestly. Eats and moves on."}, "commands": [{"type": "meal", "food": "meat and mare's milk"}], "options": [{"id": "stay", "label": "Take the place at the fire", "tags": ["need:exhaustion", "need:hunger", "need:unrest"], "stance": "Takes the place at the fire. Eats their meat and drinks their mare's milk.", "commands": [{"type": "overnight_shelter", "name": "the herd-camp fire", "description": "a place at the fire of people who move with the grass", "indoor": false, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 2, "shadow_effect": -1}]}, {"id": "move_on", "label": "Describe the grazing and walk on", "tags": ["risk:bold"], "stance": "Describes the grass and the water honestly. Does not take the place at the fire.", "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0009-0000-4000-8000-0a1e00000009';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0010-0000-4000-8000-0a1e00000010:sit", "tags": [], "situation": {"en": "The gift is real and the silence is not unfriendliness. They are simply not a people who explain themselves."}, "stance": {"en": "Eats. Leaves a strip of dried meat where the food was set. Does not try to make talk."}, "commands": [{"type": "meal", "food": "roots and smoked meat"}, {"type": "water_refill"}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0010-0000-4000-8000-0a1e00000010';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0011-0000-4000-8000-0a1e00000011:sit", "tags": [], "situation": {"en": "Nothing is at stake for them and everything is interesting. The price of the bed is the story."}, "stance": {"en": "Gives an edited version of the road. Listens to the whole state of the Bree-land laid out unasked."}, "options": [{"id": "stay", "label": "Take the bed — a copper or two", "tags": ["need:exhaustion", "need:hunger", "need:unrest"], "stance": "Pays the coppers. Gives an edited version of the road. Sleeps warm.", "commands": [{"type": "overnight_shelter", "name": "the bed of straw", "description": "a bed of straw and the whole state of the Bree-land laid out unasked", "indoor": true, "lodging_cost": 2, "meal": true, "meal_slug": "shared_pot", "rest_quality": 3, "shadow_effect": -1}]}, {"id": "move_on", "label": "Give the short version and walk on", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0011-0000-4000-8000-0a1e00000011';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0012-0000-4000-8000-0a1e00000012:sit", "tags": [], "situation": {"en": "They want someone to take the matter seriously without them having to be the ones who made a fuss about it."}, "stance": {"en": "Takes the warning about the south road. Notes the month and the road. Walks on."}, "options": [{"id": "stay", "label": "Take the room", "tags": ["need:exhaustion", "need:hunger"], "stance": "Takes the room. Notes the month and the road. Says he will keep his eyes open, and means it.", "commands": [{"type": "overnight_shelter", "name": "the room", "description": "a roof for a fair price and a warning that comes free with it", "indoor": true, "lodging_cost": 5, "meal": true, "rest_quality": 4, "shadow_effect": -1}]}, {"id": "move_on", "label": "Take the warning and walk on", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0012-0000-4000-8000-0a1e00000012';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0013-0000-4000-8000-0a1e00000013:sit", "tags": [], "situation": {"en": "They will take him if he is useful and put him off at the next landing if he is not. It is not personal."}, "stance": {"en": "Takes the pole for three hours. Rides the barge as far as it goes."}, "commands": [{"type": "meal", "food": "a share of the fish"}], "options": [{"id": "stay", "label": "Take the dry place among the bales", "tags": ["need:exhaustion", "need:hunger"], "stance": "Takes the dry place among the bales. Takes the pole for three hours.", "commands": [{"type": "overnight_shelter", "name": "the bales", "description": "a dry place among the bales of a river barge, earned at the pole", "indoor": false, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 2, "shadow_effect": -1}]}, {"id": "move_on", "label": "Take the pole and get off at the landing", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0013-0000-4000-8000-0a1e00000013';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0014-0000-4000-8000-0a1e00000014:sit", "tags": [], "situation": {"en": "He is lonely and he is a trader and both of those are working on him at once."}, "stance": {"en": "Gets the boot mended. Sorts the rumours quietly into true and useless."}, "commands": [{"type": "coins", "amount": -1}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0014-0000-4000-8000-0a1e00000014';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0015-0000-4000-8000-0a1e00000015:sit", "tags": [], "situation": {"en": "The hospitality is generous and there are rules under it that are not open to discussion."}, "stance": {"en": "Eats what is set out. Answers about the hunting truthfully. Does not ask about the bees."}, "commands": [{"type": "meal", "food": "bread, cream and honey"}], "options": [{"id": "stay", "label": "Take the bed in the hay", "tags": ["need:exhaustion", "need:hunger", "need:unrest"], "stance": "Takes the bed in the hay. Eats what is set out. Answers about the hunting truthfully.", "commands": [{"type": "overnight_shelter", "name": "the hay", "description": "a bed in the hay of a board where no meat is set", "indoor": true, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 3, "shadow_effect": -1}]}, {"id": "move_on", "label": "Account for the hunt and walk on", "tags": ["risk:bold"], "stance": "Answers about the hunting truthfully. Does not ask about the bees. Finds his own ground.", "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0015-0000-4000-8000-0a1e00000015';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0016-0000-4000-8000-0a1e00000016:sit", "tags": [], "situation": {"en": "They live under the eaves of a wood that has been getting worse for a generation and they measure every kindness against the risk of being noticed."}, "stance": {"en": "Takes the directions. Marks the clearing for a harder night."}, "options": [{"id": "stay", "label": "Camp in the hidden clearing", "tags": ["need:exhaustion", "need:hunger", "need:unrest"], "stance": "Takes the share of the pot and the resin-torches. Camps in the one clearing a fire cannot be seen from.", "commands": [{"type": "overnight_shelter", "name": "the hidden clearing", "description": "the one clearing where a fire will not be seen from the eastern slopes", "indoor": false, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 3, "shadow_effect": -1}]}, {"id": "move_on", "label": "Mark the clearing and walk on", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0016-0000-4000-8000-0a1e00000016';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0017-0000-4000-8000-0a1e00000017:sit", "tags": [], "situation": {"en": "He wants talk more than he wants goods. The dog is offered because he cannot think what else to give."}, "stance": {"en": "Talks at the fire a while. Gives the honest answer about the lower fords."}, "options": [{"id": "stay", "label": "Take the dog and the second watch", "tags": ["need:exhaustion", "need:hunger", "need:unrest"], "stance": "Talks. Takes the dog. Returns it in the morning.", "commands": [{"type": "overnight_shelter", "name": "the shepherd's fire", "description": "a place at a shepherd's fire with a dog borrowed for the watch", "indoor": false, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 3, "shadow_effect": -1}]}, {"id": "move_on", "label": "Give the ford answer and camp alone", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0017-0000-4000-8000-0a1e00000017';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0018-0000-4000-8000-0a1e00000018:sit", "tags": [], "situation": {"en": "They are the only people who live here and they know exactly what it costs to be wrong about the weather. The trade is a lesson as much as a bargain."}, "stance": {"en": "Trades the hooks. Copies how they bank the fire."}, "options": [{"id": "stay", "label": "Take the place in the snow-house", "tags": ["need:exhaustion", "need:hunger", "need:unrest"], "stance": "Takes the place in the snow-house. Trades the hooks. Wears the overshirt.", "commands": [{"type": "overnight_shelter", "name": "the snow-house", "description": "a shared snow-house, built by people who know what weather costs", "indoor": true, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 4, "shadow_effect": -1}]}, {"id": "move_on", "label": "Trade the hooks and walk on", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0018-0000-4000-8000-0a1e00000018';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0019-0000-4000-8000-0a1e00000019:sit", "tags": [], "situation": {"en": "The marsh kills people who guess. They would rather ferry him than find him."}, "stance": {"en": "Takes the punt. Remembers which channel is which."}, "commands": [{"type": "meal", "food": "eel and flat reed-bread"}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0019-0000-4000-8000-0a1e00000019';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0020-0000-4000-8000-0a1e00000020:sit", "tags": [], "situation": {"en": "He wants nothing but a witness to the fact that nobody has come to mend the bridge since spring."}, "stance": {"en": "Buys the food. Uses the ford. Remembers the complaint."}, "commands": [{"type": "coins", "amount": -2}, {"type": "meal", "food": "bread, oil and dried figs"}, {"type": "water_refill"}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0020-0000-4000-8000-0a1e00000020';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0021-0000-4000-8000-0a1e00000021:sit", "tags": [], "situation": {"en": "Company on the road is worth food to them and food is worth company to him. The arrangement lasts exactly as long as it suits both."}, "stance": {"en": "Walks with the waggons while the road allows. Trades road news at their fires."}, "commands": [{"type": "meal", "food": "food from the cook-waggon"}], "options": [{"id": "stay", "label": "Stand the watch in the waggon circle", "tags": ["need:exhaustion", "need:hunger"], "stance": "Takes the watch in the waggon circle. Eats at the cook-fire. Walks with them as far as the roads run together.", "commands": [{"type": "overnight_shelter", "name": "the waggon circle", "description": "a place inside the waggon circle, earned standing their watch", "indoor": false, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 2, "shadow_effect": -1}]}, {"id": "move_on", "label": "Walk with them a while and camp alone", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0021-0000-4000-8000-0a1e00000021';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0022-0000-4000-8000-0a1e00000022:sit", "tags": [], "situation": {"en": "He is buying protection and calling it a trade. Both of them can see the men on the road."}, "stance": {"en": "Notes the three men behind the caravan. Keeps his own distance."}, "options": [{"id": "stay", "label": "Take the coin and walk the rear watch", "tags": ["need:hunger", "risk:bold"], "stance": "Takes the coin. Walks the rear watch. Does not let the three men out of counting.", "commands": [{"type": "overnight_shelter", "name": "the caravan's night picket", "description": "a place at the caravan's picket, paid for with a sword at the rear", "indoor": false, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 1, "shadow_effect": 0}]}, {"id": "move_on", "label": "Note the three men and camp elsewhere", "tags": ["risk:cautious"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0022-0000-4000-8000-0a1e00000022';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0023-0000-4000-8000-0a1e00000023:sit", "tags": [], "situation": {"en": "He is honest enough and he will still take whatever the market allows. The news is the real value and he knows it."}, "stance": {"en": "Pays a little over. Takes the news. Notes the mule is better shod than the man."}, "commands": [{"type": "coins", "amount": -3}, {"type": "item", "slug": "trail_rations", "qty": 1}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0023-0000-4000-8000-0a1e00000023';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0024-0000-4000-8000-0a1e00000024:sit", "tags": [], "situation": {"en": "She trades from a position of knowing more about this country than anyone he will meet today and she prices accordingly."}, "stance": {"en": "Gives the northern news. Takes the crossing. Does not haggle over the fish."}, "commands": [{"type": "item", "slug": "trail_rations", "qty": 1}], "options": [{"id": "stay", "label": "Take the bed in the byre", "tags": ["need:exhaustion", "need:hunger", "need:unrest"], "stance": "Gives the salt and the northern news. Takes the bed in the byre.", "commands": [{"type": "overnight_shelter", "name": "the byre", "description": "a bed in the byre of a woman who prices what she knows", "indoor": true, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 3, "shadow_effect": -1}]}, {"id": "move_on", "label": "Take the crossing line and walk on", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0024-0000-4000-8000-0a1e00000024';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0025-0000-4000-8000-0a1e00000025:sit", "tags": [], "situation": {"en": "They have carried bodies down off that pass. The rope is not a courtesy."}, "stance": {"en": "Takes the rope and the stick. Goes up at the hour they name."}, "commands": [{"type": "item", "slug": "trail_rations", "qty": 1}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0025-0000-4000-8000-0a1e00000025';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0026-0000-4000-8000-0a1e00000026:sit", "tags": [], "situation": {"en": "Between those who keep the same watch there is no bargaining, only accounting. The cache will be restocked by whoever passes next."}, "stance": {"en": "Takes only what he will use. Says what he has left behind him for the next man."}, "commands": [{"type": "item", "slug": "common_arrows", "qty": 6}, {"type": "item", "slug": "trail_rations", "qty": 1}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0026-0000-4000-8000-0a1e00000026';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0027-0000-4000-8000-0a1e00000027:sit", "tags": [], "situation": {"en": "Nobody is in charge of this arrangement and it works precisely because nobody asks anything beyond the morning."}, "stance": {"en": "Trades what he knows of the road behind for what they know of the road ahead."}, "options": [{"id": "stay", "label": "Put his rations in and take the second watch", "tags": ["need:exhaustion", "need:hunger", "need:unrest"], "stance": "Puts his rations into the pot. Takes the second watch. Parts from them at the crossroads.", "commands": [{"type": "overnight_shelter", "name": "the shared fire", "description": "a shared fire with watches split — nobody asks anything beyond the morning", "indoor": false, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 3, "shadow_effect": -1}]}, {"id": "move_on", "label": "Trade road news and camp alone", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0027-0000-4000-8000-0a1e00000027';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1e0028-0000-4000-8000-0a1e00000028:sit", "tags": [], "situation": {"en": "The river is their whole living and something upstream has changed. They would like a traveller who is going that way to look."}, "stance": {"en": "Eats the fish. Agrees to look upstream. Does not promise to come back."}, "commands": [{"type": "meal", "food": "the fresh fish"}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1e0028-0000-4000-8000-0a1e00000028';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a28f0a9-32d2-4b06-998e-abeb17ce2480:sit", "tags": [], "situation": {"en": "He has not mentioned this to anyone."}, "stance": {"en": "Waves back. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:0a28f0a9-32d2-4b06-998e-abeb17ce2480';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a53fc55-791c-491e-a821-10904c2030d6:sit", "tags": [], "situation": {"en": "They have not heard him. He is looking at something the Rangers have no record of — orcish lore-keepers in the act of keeping lore."}, "stance": {"en": "Does not enter. Listens. Maps the chamber location. Withdraws."}}]$interactive$::jsonb
WHERE id = 'cnt:0a53fc55-791c-491e-a821-10904c2030d6';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0b2e0001-0000-4000-8000-0b2e00000001:sit", "tags": [], "situation": {"en": "Water is the only real subject here and he is being assessed as a competitor for it."}, "stance": {"en": "Answers about the wells. Observes the courtesy without pretending to understand it."}}]$interactive$::jsonb
WHERE id = 'cnt:0b2e0001-0000-4000-8000-0b2e00000001';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0b2e0002-0000-4000-8000-0b2e00000002:sit", "tags": [], "situation": {"en": "They are being squeezed by their own overlords and a stranger is the safest possible audience for saying so."}, "stance": {"en": "Takes the cistern. Does not repeat what he heard to anyone in a uniform."}}]$interactive$::jsonb
WHERE id = 'cnt:0b2e0002-0000-4000-8000-0b2e00000002';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0b2e0003-0000-4000-8000-0b2e00000003:sit", "tags": [], "situation": {"en": "Everything is business and the business is pleasant. There is no hidden edge to this one."}, "stance": {"en": "Gives the road-news. Sends no letter. Buys nothing and is liked anyway."}}]$interactive$::jsonb
WHERE id = 'cnt:0b2e0003-0000-4000-8000-0b2e00000003';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0b2e0004-0000-4000-8000-0b2e00000004:sit", "tags": [], "situation": {"en": "There is a feud running in these hills and his answer places him in it whether he wants to be placed or not."}, "stance": {"en": "Answers only what he saw. Refuses to guess whose camp it was."}}]$interactive$::jsonb
WHERE id = 'cnt:0b2e0004-0000-4000-8000-0b2e00000004';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0b2e0005-0000-4000-8000-0b2e00000005:sit", "tags": [], "situation": {"en": "The youth is being tested by his own people and the traveller is the test. Both of them know it."}, "stance": {"en": "Answers the boy seriously. Gives him something to carry back."}}]$interactive$::jsonb
WHERE id = 'cnt:0b2e0005-0000-4000-8000-0b2e00000005';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0b2e0006-0000-4000-8000-0b2e00000006:sit", "tags": [], "situation": {"en": "Nine parts noise and one part gold, and the gold is the hiring. Sorting them is his problem."}, "stance": {"en": "Lets the story run. Keeps the name of the captain."}}]$interactive$::jsonb
WHERE id = 'cnt:0b2e0006-0000-4000-8000-0b2e00000006';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0b2e0007-0000-4000-8000-0b2e00000007:sit", "tags": [], "situation": {"en": "The procedure is dull and the men are decent. The warning is not part of their orders."}, "stance": {"en": "Answers all three questions. Thanks them for the part that was not official."}}]$interactive$::jsonb
WHERE id = 'cnt:0b2e0007-0000-4000-8000-0b2e00000007';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0b2e0008-0000-4000-8000-0b2e00000008:sit", "tags": [], "situation": {"en": "They are watching something and he is interfering with the watching. The information is given to move him along faster."}, "stance": {"en": "Is off the ground by dusk. Does not light a fire."}}]$interactive$::jsonb
WHERE id = 'cnt:0b2e0008-0000-4000-8000-0b2e00000008';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0b2e0009-0000-4000-8000-0b2e00000009:sit", "tags": [], "situation": {"en": "Two people who keep the same kind of faith, comparing ledgers on a road neither of them will describe to anyone else."}, "stance": {"en": "Trades the ledger honestly. Marks the missing name."}}]$interactive$::jsonb
WHERE id = 'cnt:0b2e0009-0000-4000-8000-0b2e00000009';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0b2e0010-0000-4000-8000-0b2e00000010:sit", "tags": [], "situation": {"en": "There is no calculation in it, which is rare enough on this road to be worth a moment of suspicion and then of shame."}, "stance": {"en": "Shares the bread. Asks about the stones. Stops suspecting."}}]$interactive$::jsonb
WHERE id = 'cnt:0b2e0010-0000-4000-8000-0b2e00000010';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0b2e0011-0000-4000-8000-0b2e00000011:sit", "tags": [], "situation": {"en": "Purely transactional and quite friendly with it. He is a source of road conditions and nothing more."}, "stance": {"en": "Answers about the waggon road. Keeps the market days."}}]$interactive$::jsonb
WHERE id = 'cnt:0b2e0011-0000-4000-8000-0b2e00000011';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0b2e0012-0000-4000-8000-0b2e00000012:sit", "tags": [], "situation": {"en": "Their whole living depends on the crossing and the crossing is failing. Strangers from the north are a subject with history."}, "stance": {"en": "Uses the good causeway. Says nothing about the north side."}}]$interactive$::jsonb
WHERE id = 'cnt:0b2e0012-0000-4000-8000-0b2e00000012';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0b2e0013-0000-4000-8000-0b2e00000013:sit", "tags": [], "situation": {"en": "The courtesy is genuine and the news was a mistake. Whether it was a mistake is worth thinking about later."}, "stance": {"en": "Accepts the well. Files the news. Does not react to it."}}]$interactive$::jsonb
WHERE id = 'cnt:0b2e0013-0000-4000-8000-0b2e00000013';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0b2e0014-0000-4000-8000-0b2e00000014:sit", "tags": [], "situation": {"en": "They speak to strangers rarely and never at length. Everything said is chosen for its usefulness."}, "stance": {"en": "Believes the weather warning over his own eyes. Moves."}}]$interactive$::jsonb
WHERE id = 'cnt:0b2e0014-0000-4000-8000-0b2e00000014';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0b5267a4-3083-4f4e-8fc5-e7e87f99382a:sit", "tags": [], "situation": {"en": "It is not threatening. It is homesick for something it can no longer reach."}, "stance": {"en": "Does not invite it closer. Does not drive it away. Lets it stand there."}}]$interactive$::jsonb
WHERE id = 'cnt:0b5267a4-3083-4f4e-8fc5-e7e87f99382a';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0b54e486-cbfd-41f0-86b4-82194d63be23:sit", "tags": [], "situation": {"en": "The Witch-king's lands extend further south than they did a year ago. Aranath is standing in them."}, "stance": {"en": "Measures the distance to the road's edge. Then measures the distance to the tower he can see behind the patrol. Leaves the road."}}]$interactive$::jsonb
WHERE id = 'cnt:0b54e486-cbfd-41f0-86b4-82194d63be23';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0b785a37-66d7-4cdd-8f2b-56a5ad1a2c64:sit", "tags": [], "situation": {"en": "The first pass determines whether there is a second."}, "stance": {"en": "Moves perpendicular to the approach vector on the first pass."}}]$interactive$::jsonb
WHERE id = 'cnt:0b785a37-66d7-4cdd-8f2b-56a5ad1a2c64';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0ba10001-0000-4000-8000-0ba100000001:sit", "tags": [], "situation": {"en": "There is nothing at stake for them beyond politeness, and politeness is taken very seriously."}, "stance": {"en": "Answers the plum question properly. Is remembered kindly for it."}}]$interactive$::jsonb
WHERE id = 'cnt:0ba10001-0000-4000-8000-0ba100000001';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0ba10002-0000-4000-8000-0ba100000002:sit", "tags": [], "situation": {"en": "They do not want to be involved in whatever this is. Saying it out loud is already more than they meant to do."}, "stance": {"en": "Takes the road. Does not ask them to describe the strangers twice."}}]$interactive$::jsonb
WHERE id = 'cnt:0ba10002-0000-4000-8000-0ba100000002';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0ba10003-0000-4000-8000-0ba100000003:sit", "tags": [], "situation": {"en": "They are more afraid than they will admit and the cake is what they have instead of words."}, "stance": {"en": "Takes the cake. Answers about the road honestly, gently."}, "commands": [{"type": "item", "slug": "trail_rations", "qty": 1}]}]$interactive$::jsonb
WHERE id = 'cnt:0ba10003-0000-4000-8000-0ba100000003';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0ba10004-0000-4000-8000-0ba100000004:sit", "tags": [], "situation": {"en": "Nothing here is dangerous and nothing here is trivial to them. The ditch is the most important news in the district."}, "stance": {"en": "Sits down. Listens about the ditch. Avoids the ditch."}}]$interactive$::jsonb
WHERE id = 'cnt:0ba10004-0000-4000-8000-0ba100000004';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0ba10005-0000-4000-8000-0ba100000005:sit", "tags": [], "situation": {"en": "Their curiosity outruns their caution. Somebody in that family is going to leave home eventually."}, "stance": {"en": "Answers the easy questions. Deflects one. Lets them walk a mile."}}]$interactive$::jsonb
WHERE id = 'cnt:0ba10005-0000-4000-8000-0ba100000005';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0ba10006-0000-4000-8000-0ba100000006:sit", "tags": [], "situation": {"en": "They notice everything on this water and mention about a third of it."}, "stance": {"en": "Asks about the cut reeds. Gets a longer answer than expected."}}]$interactive$::jsonb
WHERE id = 'cnt:0ba10006-0000-4000-8000-0ba100000006';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0ba10007-0000-4000-8000-0ba100000007:sit", "tags": [], "situation": {"en": "They live out here precisely to avoid conversations like this one. Every word is a concession."}, "stance": {"en": "Keeps his distance. Thanks them once. Lets them go."}}]$interactive$::jsonb
WHERE id = 'cnt:0ba10007-0000-4000-8000-0ba100000007';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0ba10008-0000-4000-8000-0ba100000008:sit", "tags": [], "situation": {"en": "He has no idea how far he actually is from home. Telling him the truth might turn him around, which would be the kindest outcome."}, "stance": {"en": "Tells him the truth about the road. Shares food. Does not laugh at the pack."}}]$interactive$::jsonb
WHERE id = 'cnt:0ba10008-0000-4000-8000-0ba100000008';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0bfde741-afc4-46c7-9fdf-1736dcf23764:sit", "tags": [], "situation": {"en": "The urgency and the secrecy are both real. What he is carrying is important enough to exhaust both horse and rider."}, "stance": {"en": "Tells him what the road ahead looks like. Does not ask what he is carrying."}}]$interactive$::jsonb
WHERE id = 'cnt:0bfde741-afc4-46c7-9fdf-1736dcf23764';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0bfe858a-a1c1-46ab-910f-a56bdf3bee02:sit", "tags": [], "situation": {"en": "They decide the traveller is not a problem and continue their work."}, "stance": {"en": "Continues without looking up."}}]$interactive$::jsonb
WHERE id = 'cnt:0bfe858a-a1c1-46ab-910f-a56bdf3bee02';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0c3f0001-0000-4000-8000-0c3f00000001:sit", "tags": [], "situation": {"en": "Nobody has drawn yet. What happens next depends on whether he looks like more trouble than a few coins are worth."}, "stance": {"en": "Pays the coin or refuses it, and either way keeps his hands where they can be seen."}}]$interactive$::jsonb
WHERE id = 'cnt:0c3f0001-0000-4000-8000-0c3f00000001';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0c3f0002-0000-4000-8000-0c3f00000002:sit", "tags": [], "situation": {"en": "The positions were taken before he arrived. Talking is still possible; walking away is not."}, "stance": {"en": "Names the contents. Gives up what is replaceable. Does not turn his back."}}]$interactive$::jsonb
WHERE id = 'cnt:0c3f0002-0000-4000-8000-0c3f00000002';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0c3f0003-0000-4000-8000-0c3f00000003:sit", "tags": [], "situation": {"en": "This is not robbery. Someone is looking for someone and he resembles the description closely enough."}, "stance": {"en": "Answers the first question and not the second. Chooses the ground he will stand on."}}]$interactive$::jsonb
WHERE id = 'cnt:0c3f0003-0000-4000-8000-0c3f00000003';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0c3f0004-0000-4000-8000-0c3f00000004:sit", "tags": [], "situation": {"en": "They are badly organised and there are five of them. The disorganisation is the opening and it will not last."}, "stance": {"en": "Marks the one who is actually leading. Speaks only to him."}}]$interactive$::jsonb
WHERE id = 'cnt:0c3f0004-0000-4000-8000-0c3f00000004';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0c3f0005-0000-4000-8000-0c3f00000005:sit", "tags": [], "situation": {"en": "They are deserters trading on an authority they no longer have. Naming that out loud would end the pretence and start something else."}, "stance": {"en": "Lets the pretence stand. Pays the false toll. Remembers the uniforms."}}]$interactive$::jsonb
WHERE id = 'cnt:0c3f0005-0000-4000-8000-0c3f00000005';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0c3f0006-0000-4000-8000-0c3f00000006:sit", "tags": [], "situation": {"en": "The talk is the weapon here. Answering it politely for too long is how travellers lose their packs."}, "stance": {"en": "Steps sideways so all three are in front of him. Keeps talking pleasantly."}}]$interactive$::jsonb
WHERE id = 'cnt:0c3f0006-0000-4000-8000-0c3f00000006';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0c3f0007-0000-4000-8000-0c3f00000007:sit", "tags": [], "situation": {"en": "Nobody wants a fight here. They want a witness who is either paid or gone, and they are offering him the choice."}, "stance": {"en": "Takes the coin or refuses it plainly. Does not pretend not to understand the offer."}}]$interactive$::jsonb
WHERE id = 'cnt:0c3f0007-0000-4000-8000-0c3f00000007';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0c3f0008-0000-4000-8000-0c3f00000008:sit", "tags": [], "situation": {"en": "This is an interrogation dressed as a courtesy. Every answer is being checked against something written down elsewhere."}, "stance": {"en": "Gives true answers that reveal nothing. Notices which questions he does not ask."}}]$interactive$::jsonb
WHERE id = 'cnt:0c3f0008-0000-4000-8000-0c3f00000008';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0c3f0009-0000-4000-8000-0c3f00000009:sit", "tags": [], "situation": {"en": "They are not looking for plunder. They are looking for an acknowledgment, and they will take it in words if he offers them."}, "stance": {"en": "Says the words. Means them. Walks the line they point out."}}]$interactive$::jsonb
WHERE id = 'cnt:0c3f0009-0000-4000-8000-0c3f00000009';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0c3f0010-0000-4000-8000-0c3f00000010:sit", "tags": [], "situation": {"en": "Refusal is permitted and has a known price. They will not be insulted by it; they will simply apply the price."}, "stance": {"en": "Chooses which tribute to pay. Does not attempt to negotiate the formula."}}]$interactive$::jsonb
WHERE id = 'cnt:0c3f0010-0000-4000-8000-0c3f00000010';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0c3f0011-0000-4000-8000-0c3f00000011:sit", "tags": [], "situation": {"en": "They cannot place him and they dislike what cannot be placed. The wrong answer here costs more than the pack."}, "stance": {"en": "Answers in a way that gives them a category to file him under. Keeps walking west."}}]$interactive$::jsonb
WHERE id = 'cnt:0c3f0011-0000-4000-8000-0c3f00000011';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0c3f0012-0000-4000-8000-0c3f00000012:sit", "tags": [], "situation": {"en": "He is being recorded, not robbed. Whatever he says here will be somewhere in a file by the next full moon."}, "stance": {"en": "Gives a plain and unremarkable account of himself. Does not embellish it."}}]$interactive$::jsonb
WHERE id = 'cnt:0c3f0012-0000-4000-8000-0c3f00000012';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0c3f0013-0000-4000-8000-0c3f00000013:sit", "tags": [], "situation": {"en": "They are the inheritors of a specific old treason and they can hear the North in his speech. The politeness will last exactly as long as it is useful."}, "stance": {"en": "Answers about his lineage as little as courtesy allows. Gives nothing they can use."}}]$interactive$::jsonb
WHERE id = 'cnt:0c3f0013-0000-4000-8000-0c3f00000013';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0c3f0014-0000-4000-8000-0c3f00000014:sit", "tags": [], "situation": {"en": "The demands are designed to produce a false answer they can act on. There are six of them and one road."}, "stance": {"en": "Tells the plainest possible truth about the four days. Gives them nothing to catch."}}]$interactive$::jsonb
WHERE id = 'cnt:0c3f0014-0000-4000-8000-0c3f00000014';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0c3f0015-0000-4000-8000-0c3f00000015:sit", "tags": [], "situation": {"en": "They are in a hurry, which makes them dangerous and also makes them stupid. The hurry is the lever."}, "stance": {"en": "Gives them the coin. Keeps the pack. Lets the hurry do the arguing."}}]$interactive$::jsonb
WHERE id = 'cnt:0c3f0015-0000-4000-8000-0c3f00000015';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0c3f0016-0000-4000-8000-0c3f00000016:sit", "tags": [], "situation": {"en": "There is no real threat in it and there is real danger anyway: cornered people do things they did not intend."}, "stance": {"en": "Puts food on the ground and steps back. Does not draw."}}]$interactive$::jsonb
WHERE id = 'cnt:0c3f0016-0000-4000-8000-0c3f00000016';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0c963fb6-d8c1-40ae-a2db-42e2e214c95f:sit", "tags": [], "situation": {"en": "Fifteen seconds to impact at this closing speed. The road has no cover on either side."}, "stance": {"en": "Moves off the road. Does not run on it."}}]$interactive$::jsonb
WHERE id = 'cnt:0c963fb6-d8c1-40ae-a2db-42e2e214c95f';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0ca10001-0000-4000-8000-0ca100000001:sit", "tags": [], "situation": {"en": "The help is freely given and the terms are not explained. Something is being served that has nothing to do with him."}, "stance": {"en": "Accepts it. Does not press for the reason."}, "commands": [{"type": "meal", "food": "the food he did not know he needed"}]}]$interactive$::jsonb
WHERE id = 'cnt:0ca10001-0000-4000-8000-0ca100000001';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0ca10002-0000-4000-8000-0ca100000002:sit", "tags": [], "situation": {"en": "He is being helped for reasons attached to something much larger than his journey. Refusing would be permitted and would cost him."}, "stance": {"en": "Eats. Rests in the shelter of their fire a while. Remembers the counsel word for word."}, "commands": [{"type": "meal", "food": "the hot meal that should not exist where it is standing"}], "options": [{"id": "stay", "label": "Take the shelter that should not exist", "tags": ["need:exhaustion", "need:unrest"], "stance": "Takes the night's shelter that should not exist where it is standing. Eats. Remembers the counsel word for word.", "commands": [{"type": "overnight_shelter", "name": "the shelter that should not exist", "description": "a night's shelter standing where no shelter should be", "indoor": true, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 4, "shadow_effect": -1}]}, {"id": "move_on", "label": "Keep the counsel and walk on", "tags": ["risk:bold"], "stance": "Remembers the counsel word for word. Does not ask what the shelter costs.", "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0ca10002-0000-4000-8000-0ca100000002';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0ca10003-0000-4000-8000-0ca100000003:sit", "tags": [], "situation": {"en": "The condition is the whole of it. He can have the help or he can have the road. Not both."}, "stance": {"en": "Weighs the condition. Chooses. Is not argued with either way."}}]$interactive$::jsonb
WHERE id = 'cnt:0ca10003-0000-4000-8000-0ca100000003';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0ca10004-0000-4000-8000-0ca100000004:sit", "tags": [], "situation": {"en": "He is entirely serious about the birds and the birds are entirely accurate. Taking him lightly is the only mistake available here."}, "stance": {"en": "Takes the herbs. Believes the crow. Says thank you to both of them."}, "commands": [{"type": "meal", "food": "a warm mash of something wholesome"}]}]$interactive$::jsonb
WHERE id = 'cnt:0ca10004-0000-4000-8000-0ca100000004';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0ca10005-0000-4000-8000-0ca100000005:sit", "tags": [], "situation": {"en": "The detour is real and inconvenient and it is also the whole test, though he does not think of it as one."}, "stance": {"en": "Carries the beast. Loses the two miles. Gets more than two miles of value back."}, "commands": [{"type": "heal"}]}]$interactive$::jsonb
WHERE id = 'cnt:0ca10005-0000-4000-8000-0ca100000005';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0ca10006-0000-4000-8000-0ca100000006:sit", "tags": [], "situation": {"en": "The gift is total and the terms are nonsense and the nonsense works. His country, his rules, and the rules are kind."}, "stance": {"en": "Eats far too much. Learns the rhyme. Walks on before the light goes."}, "commands": [{"type": "meal", "food": "yellow cream, honeycomb, bread and butter"}], "options": [{"id": "stay", "label": "Take the bed of dry rushes", "tags": ["need:exhaustion", "need:hunger", "need:unrest"], "stance": "Takes the bed of dry rushes. Eats far too much. Sleeps like the dead.", "commands": [{"type": "overnight_shelter", "name": "the house of Tom Bombadil", "description": "a bed of dry rushes in the one house the forest cannot touch", "indoor": true, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 5, "shadow_effect": -2}]}, {"id": "move_on", "label": "Eat, learn the rhyme, and go before dark", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0ca10006-0000-4000-8000-0ca100000006';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0ca10007-0000-4000-8000-0ca100000007:sit", "tags": [], "situation": {"en": "He will give everything and explain nothing. What he says about the willow and the barrows is not a story and should not be treated as one."}, "stance": {"en": "Follows the directions exactly. Does not improve on them."}, "options": [{"id": "stay", "label": "Take the night's lodging", "tags": ["need:exhaustion", "need:hunger", "need:unrest"], "stance": "Takes the night's lodging. Eats all he can hold. Follows the directions exactly come morning.", "commands": [{"type": "overnight_shelter", "name": "the house of Tom Bombadil", "description": "a night's lodging where gear dries by morning and directions must be followed exactly", "indoor": true, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 5, "shadow_effect": -2}]}, {"id": "move_on", "label": "Take the directions and keep walking", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0ca10007-0000-4000-8000-0ca100000007';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0ca10008-0000-4000-8000-0ca100000008:sit", "tags": [], "situation": {"en": "He is older than her grief and treats it as weather. It is the first time in a long while that nobody has been careful with her."}, "stance": {"en": "Eats. Laughs, which surprises her. Notes the remark about the water."}, "commands": [{"type": "meal", "food": "bread, honey and yellow cream"}]}]$interactive$::jsonb
WHERE id = 'cnt:0ca10008-0000-4000-8000-0ca100000008';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0ca10009-0000-4000-8000-0ca100000009:sit", "tags": [], "situation": {"en": "This is not generosity. It is a hand on the small of his back, and the destination is not his."}, "stance": {"en": "Notices how easy it has become. Breaks off eastward travel and pays for the harder road."}, "options": [{"id": "stay", "label": "Take the easy eastern line", "tags": ["need:exhaustion", "need:thirst", "need:unrest"], "stance": "Takes the water, the shelter, the dry wood. Lets the road go where it is being steered.", "commands": [{"type": "overnight_shelter", "name": "the offered ease", "description": "water, shelter and dry wood, suddenly available on the eastern line of march", "indoor": false, "lodging_cost": 0, "meal": false, "water": true, "rest_quality": 4, "shadow_effect": 2}]}, {"id": "move_on", "label": "Break east and pay for the harder road", "tags": ["risk:cautious"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0ca10009-0000-4000-8000-0ca100000009';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0ca10010-0000-4000-8000-0ca100000010:sit", "tags": [], "situation": {"en": "The bargain is being made with the part of him that is tired, not the part that decides. That is the whole method."}, "stance": {"en": "Marks the offered ground and does not take it. Walks on while the light holds."}, "options": [{"id": "stay", "label": "Take the offered rest", "tags": ["need:exhaustion", "need:unrest"], "stance": "Takes the offered ground. Sleeps deeply, the first real rest in weeks — and wakes not knowing what it cost.", "commands": [{"type": "overnight_shelter", "name": "the chosen ground", "description": "ground that some old instinct says was chosen for him", "indoor": false, "lodging_cost": 0, "meal": false, "rest_quality": 4, "shadow_effect": 3}]}, {"id": "move_on", "label": "Refuse the ground and sleep worse", "tags": ["risk:cautious"], "stance": "Refuses the ground. Sleeps badly somewhere worse and wakes up himself.", "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0ca10010-0000-4000-8000-0ca100000010';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0caadfa1-2a73-473e-a941-c1208663a445:sit", "tags": [], "situation": {"en": "The guards are watching the road, not the captives. The captives are watching the ground."}, "stance": {"en": "Does not go down to the road."}}]$interactive$::jsonb
WHERE id = 'cnt:0caadfa1-2a73-473e-a941-c1208663a445';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0d1a0001-0000-4000-8000-0d1a00000001:sit", "tags": [], "situation": {"en": "Everything he offers is accurate and nothing he withholds will be prised out. That is the whole shape of the exchange."}, "stance": {"en": "Trades road for road. Does not look at the oilcloth twice."}}]$interactive$::jsonb
WHERE id = 'cnt:0d1a0001-0000-4000-8000-0d1a00000001';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0d1a0002-0000-4000-8000-0d1a00000002:sit", "tags": [], "situation": {"en": "He wants a witness more than he wants sympathy. The grievance will be repeated in front of the right people eventually."}, "stance": {"en": "Notes the name and the crossing. Agrees the toll is theft. Moves on."}}]$interactive$::jsonb
WHERE id = 'cnt:0d1a0002-0000-4000-8000-0d1a00000002';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0d1a0003-0000-4000-8000-0d1a00000003:sit", "tags": [], "situation": {"en": "He has decided to give the warning and not the story. The story is his folk's business and not the traveller's."}, "stance": {"en": "Takes the warning. Does not ask him to elaborate."}}]$interactive$::jsonb
WHERE id = 'cnt:0d1a0003-0000-4000-8000-0d1a00000003';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0d1a0004-0000-4000-8000-0d1a00000004:sit", "tags": [], "situation": {"en": "He will not haggle and he will not cheat, and he considers the second a matter of honour and the first a waste of daylight."}, "stance": {"en": "Pays the named price. Gets full value. Learns not to bargain with him."}, "commands": [{"type": "coins", "amount": -2}, {"type": "item", "slug": "trail_rations", "qty": 1}]}]$interactive$::jsonb
WHERE id = 'cnt:0d1a0004-0000-4000-8000-0d1a00000004';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0d1a0005-0000-4000-8000-0d1a00000005:sit", "tags": [], "situation": {"en": "He needs someone else's eyes for four hours and he hates needing it. The trade is an admission he will not make in words."}, "stance": {"en": "Shares the road's news at the edge of his fire. Does not ask what is behind him."}, "options": [{"id": "stay", "label": "Take the first watch", "tags": ["need:exhaustion", "need:hunger"], "stance": "Takes the first watch. Eats at his fire. Wakes him only if it matters. Does not mention the pass.", "commands": [{"type": "overnight_shelter", "name": "the watch-fire", "description": "a place at a fire that needed another pair of eyes", "indoor": false, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 2, "shadow_effect": -1}]}, {"id": "move_on", "label": "Share the news and leave him his watch", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0d1a0005-0000-4000-8000-0d1a00000005';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0d1a0006-0000-4000-8000-0d1a00000006:sit", "tags": [], "situation": {"en": "He is not awed by her age; he is interested in it, which is rarer and easier to bear."}, "stance": {"en": "Gives him the old name. Takes the road-notes. Appreciates being asked as a source rather than a wonder."}, "commands": [{"type": "meal", "food": "food at his fire"}]}]$interactive$::jsonb
WHERE id = 'cnt:0d1a0006-0000-4000-8000-0d1a00000006';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0d1a0007-0000-4000-8000-0d1a00000007:sit", "tags": [], "situation": {"en": "They have nothing to fear on this road today and it shows in how much they are willing to say."}, "stance": {"en": "Lets him talk. Keeps the price of iron. Does not comment on the Lake-men."}}]$interactive$::jsonb
WHERE id = 'cnt:0d1a0007-0000-4000-8000-0d1a00000007';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0d1a0008-0000-4000-8000-0d1a00000008:sit", "tags": [], "situation": {"en": "He is asking about a doorway his folk lost long ago and will not say why he is counting the people who go near it."}, "stance": {"en": "Answers what he saw. Does not ask what he is planning."}}]$interactive$::jsonb
WHERE id = 'cnt:0d1a0008-0000-4000-8000-0d1a00000008';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0d1a0009-0000-4000-8000-0d1a00000009:sit", "tags": [], "situation": {"en": "This is a trading party and he is a small piece of a long ledger. The fairness is professional, not sentimental."}, "stance": {"en": "Buys the knife. Takes the road-news. Pays the carriage without complaint."}, "commands": [{"type": "coins", "amount": -3}, {"type": "item", "slug": "trail_rations", "qty": 1}]}]$interactive$::jsonb
WHERE id = 'cnt:0d1a0009-0000-4000-8000-0d1a00000009';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0d1a0010-0000-4000-8000-0d1a00000010:sit", "tags": [], "situation": {"en": "He is going to make a profit and be entirely honest about how much. The mirror is a matter of professional pride by now."}, "stance": {"en": "Buys the biscuit and the nails. Refuses the mirror twice. Buys the mirror."}, "commands": [{"type": "coins", "amount": -3}, {"type": "item", "slug": "trail_rations", "qty": 1}]}]$interactive$::jsonb
WHERE id = 'cnt:0d1a0010-0000-4000-8000-0d1a00000010';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0d1a0011-0000-4000-8000-0d1a00000011:sit", "tags": [], "situation": {"en": "He is standing on a find he has not registered with anyone and he is not subtle about guarding it."}, "stance": {"en": "Answers plainly. Shows no interest in the stream-head. Walks where he is told to walk."}}]$interactive$::jsonb
WHERE id = 'cnt:0d1a0011-0000-4000-8000-0d1a00000011';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0d1a0012-0000-4000-8000-0d1a00000012:sit", "tags": [], "situation": {"en": "They are keeping a border and he is a data point. The civility is real and so is the axe-handle."}, "stance": {"en": "Gives name and road. Names what he saw on the high tracks. Uses the open gate."}}]$interactive$::jsonb
WHERE id = 'cnt:0d1a0012-0000-4000-8000-0d1a00000012';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0d1a0013-0000-4000-8000-0d1a00000013:sit", "tags": [], "situation": {"en": "He is used to being taken for something less than he is and has stopped minding. The remark about the ice is not a joke."}, "stance": {"en": "Trades iron for the furs. Takes the remark seriously."}}]$interactive$::jsonb
WHERE id = 'cnt:0d1a0013-0000-4000-8000-0d1a00000013';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0d1a0014-0000-4000-8000-0d1a00000014:sit", "tags": [], "situation": {"en": "They are lonely, well-fed and slightly bored, and company is worth more to them than the lamp-oil."}, "stance": {"en": "Turns the windlass. Eats their food. Gives them every scrap of news he has."}, "commands": [{"type": "meal", "food": "the hot meal at the mine-mouth"}, {"type": "water_refill"}]}]$interactive$::jsonb
WHERE id = 'cnt:0d1a0014-0000-4000-8000-0d1a00000014';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0d354f5b-f6d3-41c3-afa9-96fa232cc2e4:sit", "tags": [], "situation": {"en": "Deer moving calmly means the forest ahead is quiet. That is worth knowing."}, "stance": {"en": "Notes the direction. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:0d354f5b-f6d3-41c3-afa9-96fa232cc2e4';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e09289f-fe08-4a40-a274-de43f9cf8497:sit", "tags": [], "situation": {"en": "They are leaving in the same direction the traveller is going. That is its own information."}, "stance": {"en": "Asks how many families have left. He thinks. Then says: seven."}}]$interactive$::jsonb
WHERE id = 'cnt:0e09289f-fe08-4a40-a274-de43f9cf8497';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e1f0001-0000-4000-8000-0e1f00000001:sit", "tags": [], "situation": {"en": "Nothing is asked in return, which is itself a kind of weight. The gift assumes he will do something worth the giving."}, "stance": {"en": "Accepts without protesting. Asks one question, well chosen."}, "commands": [{"type": "item", "slug": "lembas", "qty": 1}, {"type": "water_refill"}], "options": [{"id": "stay", "label": "Take the night under the hythe", "tags": ["need:exhaustion", "need:hunger", "need:unrest", "need:thirst"], "stance": "Takes the night under the hythe of woven branches. Asks one question, well chosen.", "commands": [{"type": "overnight_shelter", "name": "the hythe", "description": "a night under a hythe of woven branches, lent by elves", "indoor": false, "lodging_cost": 0, "meal": false, "water": true, "rest_quality": 4, "shadow_effect": -2}]}, {"id": "move_on", "label": "Take the waybread and walk on", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0e1f0001-0000-4000-8000-0e1f00000001';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e1f0002-0000-4000-8000-0e1f00000002:sit", "tags": [], "situation": {"en": "They have judged that his road is his own and are unwilling to be drawn along it. The help is real; the boundary is not negotiable."}, "stance": {"en": "Takes the healing. Accepts the boundary without argument."}, "commands": [{"type": "heal"}, {"type": "meal", "food": "food at their fire"}], "options": [{"id": "stay", "label": "Take the healing and a place at their fire", "tags": ["need:exhaustion", "need:hunger", "need:unrest"], "stance": "Takes the food and a place at their fire. Accepts the boundary without argument.", "commands": [{"type": "overnight_shelter", "name": "the healers' fire", "description": "a place at the fire of those who heal and then let go", "indoor": false, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 4, "shadow_effect": -2}]}, {"id": "move_on", "label": "Take the path they showed and walk on", "tags": ["risk:bold"], "stance": "Accepts the boundary without argument. Walks on with the path they showed her.", "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0e1f0002-0000-4000-8000-0e1f00000002';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e1f0003-0000-4000-8000-0e1f00000003:sit", "tags": [], "situation": {"en": "They can see what he is carrying and they are treating it, not discussing it. He may refuse, and refusing will cost him the night's rest."}, "stance": {"en": "Sits for it. Does not ask what they saw in him."}, "options": [{"id": "stay", "label": "Sit for the singing and sleep under their keep", "tags": ["need:exhaustion", "need:unrest"], "stance": "Sits for the singing. Sleeps under their keep and wakes lighter than he lay down.", "commands": [{"type": "overnight_shelter", "name": "the sung watch", "description": "a place to sleep kept by those who sing over what ails the traveller", "indoor": false, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 4, "shadow_effect": -2}]}, {"id": "move_on", "label": "Sit a while and walk on", "tags": ["risk:bold"], "stance": "Sits for it a while. Does not stay the night.", "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0e1f0003-0000-4000-8000-0e1f00000003';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e1f0004-0000-4000-8000-0e1f00000004:sit", "tags": [], "situation": {"en": "They deal with the Dúnedain as inheritors of an old agreement. He is being helped as an heir, not as a man."}, "stance": {"en": "Gives the greeting in Sindarin. Takes the arrows. Reports what the north looks like from his side."}, "commands": [{"type": "item", "slug": "common_arrows", "qty": 6}, {"type": "item", "slug": "trail_rations", "qty": 1}]}]$interactive$::jsonb
WHERE id = 'cnt:0e1f0004-0000-4000-8000-0e1f00000004';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e1f0005-0000-4000-8000-0e1f00000005:sit", "tags": [], "situation": {"en": "They are asking him to alter his errand for reasons they will not explain. They expect him to accept it on trust alone."}, "stance": {"en": "Takes the provisions. Changes the line. Files the fact that they would not say why."}, "commands": [{"type": "item", "slug": "trail_rations", "qty": 4}]}]$interactive$::jsonb
WHERE id = 'cnt:0e1f0005-0000-4000-8000-0e1f00000005';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e1f0006-0000-4000-8000-0e1f00000006:sit", "tags": [], "situation": {"en": "They assume she is going west eventually. Nobody says so. The assumption sits in the middle of the conversation."}, "stance": {"en": "Accepts the meal and the hot water. Answers about the road. Does not confirm the assumption."}, "commands": [{"type": "meal", "food": "a meal at the camp they made"}, {"type": "water_refill"}], "options": [{"id": "stay", "label": "Take the camp they made", "tags": ["need:exhaustion", "need:hunger", "need:thirst", "need:unrest"], "stance": "Takes the camp they made without being asked. Eats the meal. Drinks the hot water.", "commands": [{"type": "overnight_shelter", "name": "the camp they made", "description": "a proper camp made for her without being asked", "indoor": false, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "water": true, "rest_quality": 3, "shadow_effect": -1}]}, {"id": "move_on", "label": "Answer about the road and make her own camp", "tags": ["risk:bold"], "stance": "Answers about the road. Does not confirm the assumption. Makes her own camp.", "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0e1f0006-0000-4000-8000-0e1f00000006';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e1f0007-0000-4000-8000-0e1f00000007:sit", "tags": [], "situation": {"en": "The question is kindly meant and lands somewhere she does not want examined tonight."}, "stance": {"en": "Refuses the escort. Takes what they press on her for the road. Does not answer the question."}, "commands": [{"type": "item", "slug": "trail_rations", "qty": 2}], "options": [{"id": "stay", "label": "Take the shelter, refuse the escort", "tags": ["need:exhaustion", "need:unrest"], "stance": "Takes the shelter. Refuses the horse and the escort. Does not answer the question.", "commands": [{"type": "overnight_shelter", "name": "the offered shelter", "description": "shelter offered by elves who ask only one question too kind to answer", "indoor": false, "lodging_cost": 0, "meal": false, "rest_quality": 3, "shadow_effect": -1}]}, {"id": "move_on", "label": "Refuse the escort and walk on", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0e1f0007-0000-4000-8000-0e1f00000007';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e1f0008-0000-4000-8000-0e1f00000008:sit", "tags": [], "situation": {"en": "They have decided she should not be left alone tonight. They will not say that either."}, "stance": {"en": "Eats little. Rests at the edge of their firelight a while. Says nothing about why the place was made there."}, "options": [{"id": "stay", "label": "Take the place made ready", "tags": ["need:exhaustion", "need:unrest"], "stance": "Takes the place made ready in the middle of their camp. Eats little. Says nothing about why it was made there.", "commands": [{"type": "overnight_shelter", "name": "the place made ready", "description": "a place made ready in the middle of their camp — deliberately, so that she is surrounded", "indoor": false, "lodging_cost": 0, "meal": false, "rest_quality": 3, "shadow_effect": -2}]}, {"id": "move_on", "label": "Rest at the firelight edge and go", "tags": ["risk:bold"], "stance": "Eats little. Rests at the edge of their firelight a while. Walks on before the place made ready can hold her.", "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0e1f0008-0000-4000-8000-0e1f00000008';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e1f0009-0000-4000-8000-0e1f00000009:sit", "tags": [], "situation": {"en": "This is a household that has been doing this for two thousand years. The help is routine to them and remarkable to him."}, "stance": {"en": "Lets them repack it. Learns the landmarks by heart."}, "commands": [{"type": "heal"}, {"type": "item", "slug": "lembas", "qty": 1}]}]$interactive$::jsonb
WHERE id = 'cnt:0e1f0009-0000-4000-8000-0e1f00000009';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e1f0010-0000-4000-8000-0e1f00000010:sit", "tags": [], "situation": {"en": "Their errand is larger than his and they are buying his silence with real kindness. It is not a threat and it is not free either."}, "stance": {"en": "Accepts the terms. Takes the low road. Keeps it to himself."}, "commands": [{"type": "heal"}, {"type": "item", "slug": "trail_rations", "qty": 3}]}]$interactive$::jsonb
WHERE id = 'cnt:0e1f0010-0000-4000-8000-0e1f00000010';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e1f0011-0000-4000-8000-0e1f00000011:sit", "tags": [], "situation": {"en": "The gift and the rule are one thing. They are lending him their forest for a night on very specific terms."}, "stance": {"en": "Takes the lembas and the coil of grey rope. Promises the wood his feet and his knife."}, "commands": [{"type": "item", "slug": "lembas", "qty": 1}], "options": [{"id": "stay", "label": "Take the flet on their terms", "tags": ["need:exhaustion", "need:unrest"], "stance": "Sleeps where he is put. Cuts nothing. Leaves at the hour they name.", "commands": [{"type": "overnight_shelter", "name": "the flet", "description": "a talan above the ground, lent for a night on their terms", "indoor": false, "lodging_cost": 0, "meal": false, "rest_quality": 4, "shadow_effect": -2}]}, {"id": "move_on", "label": "Thank them and keep out of the wood", "tags": ["risk:cautious"], "stance": "Thanks them for the terms. Does not take the flet. Keeps walking while the light holds.", "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0e1f0011-0000-4000-8000-0e1f00000011';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e1f0012-0000-4000-8000-0e1f00000012:sit", "tags": [], "situation": {"en": "They are generous within their bounds and they have no intention of letting him wander their wood unescorted."}, "stance": {"en": "Drinks less than they pour. Gives the river honestly. Walks out where they lead him."}, "commands": [{"type": "meal", "food": "a hot meal at their fire", "drink": "their strong wine"}]}]$interactive$::jsonb
WHERE id = 'cnt:0e1f0012-0000-4000-8000-0e1f00000012';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e1f0013-0000-4000-8000-0e1f00000013:sit", "tags": [], "situation": {"en": "They are going west and he is going the other way. Whatever they give him, they will not be here to see it used."}, "stance": {"en": "Takes the lantern. Asks what is at the two places. Gets a straight answer."}, "commands": [{"type": "meal", "food": "food from their own store"}]}]$interactive$::jsonb
WHERE id = 'cnt:0e1f0013-0000-4000-8000-0e1f00000013';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e1f0014-0000-4000-8000-0e1f00000014:sit", "tags": [], "situation": {"en": "The kindness is a means of moving him off ground they are keeping. He gains a safe road and loses a day, and that is the whole bargain."}, "stance": {"en": "Takes the day's loss without arguing about it."}, "commands": [{"type": "meal", "food": "dried fruit"}, {"type": "water_refill"}]}]$interactive$::jsonb
WHERE id = 'cnt:0e1f0014-0000-4000-8000-0e1f00000014';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e1f0015-0000-4000-8000-0e1f00000015:sit", "tags": [], "situation": {"en": "Everything here is arranged around departure. He is being helped on his way by people arranging their own."}, "stance": {"en": "Takes the crossing. Does not ask when the next ship sails."}, "commands": [{"type": "meal", "food": "ship's bread and salt fish"}]}]$interactive$::jsonb
WHERE id = 'cnt:0e1f0015-0000-4000-8000-0e1f00000015';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e1f0016-0000-4000-8000-0e1f00000016:sit", "tags": [], "situation": {"en": "He has been alone in the wood a long time and gives what is useful because that is the only currency he keeps."}, "stance": {"en": "Takes the arrows. Marks the spring. Asks nothing about his errand."}, "commands": [{"type": "item", "slug": "common_arrows", "qty": 6}]}]$interactive$::jsonb
WHERE id = 'cnt:0e1f0016-0000-4000-8000-0e1f00000016';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e1f0017-0000-4000-8000-0e1f00000017:sit", "tags": [], "situation": {"en": "He wants the traveller's eyes and is paying properly for them. It is the most honest transaction of the journey."}, "stance": {"en": "Gives a full and accurate account. Takes the maps. Learns the stones."}}]$interactive$::jsonb
WHERE id = 'cnt:0e1f0017-0000-4000-8000-0e1f00000017';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e1f0018-0000-4000-8000-0e1f00000018:sit", "tags": [], "situation": {"en": "They are helping a traveller who would otherwise be dead by morning, and they are not sentimental about it."}, "stance": {"en": "Drinks it. Follows their line and not his own judgement."}, "commands": [{"type": "meal", "drink": "the hot drink he cannot identify"}]}]$interactive$::jsonb
WHERE id = 'cnt:0e1f0018-0000-4000-8000-0e1f00000018';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e1f0019-0000-4000-8000-0e1f00000019:sit", "tags": [], "situation": {"en": "The sea sets the terms here and the Elf simply knows them. He is being carried because walking would kill him."}, "stance": {"en": "Takes the boat. Bails when told to. Leaves something at the shrine-stone on landing."}, "commands": [{"type": "meal", "food": "grilled fish"}, {"type": "water_refill"}]}]$interactive$::jsonb
WHERE id = 'cnt:0e1f0019-0000-4000-8000-0e1f00000019';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e2f0001-0000-4000-8000-0e2f00000001:sit", "tags": [], "situation": {"en": "They are deciding, in the space of four sentences, whether he is the sort of traveller this country needs fewer of."}, "stance": {"en": "Answers about where he slept. Hears the warning inside the remark."}}]$interactive$::jsonb
WHERE id = 'cnt:0e2f0001-0000-4000-8000-0e2f00000001';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e2f0002-0000-4000-8000-0e2f00000002:sit", "tags": [], "situation": {"en": "They do not like strangers in the wood and they dislike deaths in it more. The help is given grudgingly and given."}, "stance": {"en": "States his business briefly. Does not step off the path."}}]$interactive$::jsonb
WHERE id = 'cnt:0e2f0002-0000-4000-8000-0e2f00000002';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e2f0003-0000-4000-8000-0e2f00000003:sit", "tags": [], "situation": {"en": "He has been in these lands since before the first Men walked them and is not entirely living in this century."}, "stance": {"en": "Lets the older name stand without correcting it. Listens."}}]$interactive$::jsonb
WHERE id = 'cnt:0e2f0003-0000-4000-8000-0e2f00000003';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e2f0004-0000-4000-8000-0e2f00000004:sit", "tags": [], "situation": {"en": "The interest is real and the distance is real. Both are permanent features."}, "stance": {"en": "Answers accurately. Resists the urge to perform."}}]$interactive$::jsonb
WHERE id = 'cnt:0e2f0004-0000-4000-8000-0e2f00000004';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e2f0005-0000-4000-8000-0e2f00000005:sit", "tags": [], "situation": {"en": "Nothing is urgent to them. The information is still exactly what he needs."}, "stance": {"en": "Asks about the light. Walks to it."}}]$interactive$::jsonb
WHERE id = 'cnt:0e2f0005-0000-4000-8000-0e2f00000005';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e2f0006-0000-4000-8000-0e2f00000006:sit", "tags": [], "situation": {"en": "They speak to almost nobody and this exchange costs them something. It is being spent on purpose."}, "stance": {"en": "Answers about the fires. Takes the ice seriously."}}]$interactive$::jsonb
WHERE id = 'cnt:0e2f0006-0000-4000-8000-0e2f00000006';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e2f0007-0000-4000-8000-0e2f00000007:sit", "tags": [], "situation": {"en": "The question is asked by someone who has had to make a choice about mortality, or will have to, and it lands harder than intended."}, "stance": {"en": "Answers honestly. Does not ask them the same thing back."}}]$interactive$::jsonb
WHERE id = 'cnt:0e2f0007-0000-4000-8000-0e2f00000007';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e2f0008-0000-4000-8000-0e2f00000008:sit", "tags": [], "situation": {"en": "Something in this one broke a long time ago. The errors are not ignorance and the courtesy is bait."}, "stance": {"en": "Declines pleasantly. Does not take the shorter way. Does not turn his back on the parting."}}]$interactive$::jsonb
WHERE id = 'cnt:0e2f0008-0000-4000-8000-0e2f00000008';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e2f0009-0000-4000-8000-0e2f00000009:sit", "tags": [], "situation": {"en": "They are running a border and he has walked through part of it. The trade of information is not optional so much as obvious."}, "stance": {"en": "Describes the ruin precisely. Accepts that they will not say how they knew his name."}}]$interactive$::jsonb
WHERE id = 'cnt:0e2f0009-0000-4000-8000-0e2f00000009';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e2f0010-0000-4000-8000-0e2f00000010:sit", "tags": [], "situation": {"en": "They are the last remnant of something and they hold their small piece of country absolutely. He is not being asked."}, "stance": {"en": "Takes the southern shore. Does not test the order."}}]$interactive$::jsonb
WHERE id = 'cnt:0e2f0010-0000-4000-8000-0e2f00000010';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e2f0011-0000-4000-8000-0e2f00000011:sit", "tags": [], "situation": {"en": "He is going to the harbour and will not be coming back. Nothing about the conversation is heavy and everything in it is final."}, "stance": {"en": "Walks with him a while. Does not ask why now."}}]$interactive$::jsonb
WHERE id = 'cnt:0e2f0011-0000-4000-8000-0e2f00000011';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e2f0012-0000-4000-8000-0e2f00000012:sit", "tags": [], "situation": {"en": "The condescension is unconscious and the information is excellent. Taking offence would cost him the second thing."}, "stance": {"en": "Answers formally. Takes the information. Lets the manner pass."}}]$interactive$::jsonb
WHERE id = 'cnt:0e2f0012-0000-4000-8000-0e2f00000012';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e2f0013-0000-4000-8000-0e2f00000013:sit", "tags": [], "situation": {"en": "They have lived beside Men for an age and are the last of their kin who do. The friendliness is genuine and elegiac."}, "stance": {"en": "Gives them the news they ask for. Notices what is not said about the quay."}}]$interactive$::jsonb
WHERE id = 'cnt:0e2f0013-0000-4000-8000-0e2f00000013';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e2f0014-0000-4000-8000-0e2f00000014:sit", "tags": [], "situation": {"en": "They are the oldest kind of woodland folk and they measure the sickness of a forest in centuries. This year is worse than last."}, "stance": {"en": "Follows the route. Believes the diagnosis."}}]$interactive$::jsonb
WHERE id = 'cnt:0e2f0014-0000-4000-8000-0e2f00000014';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0e6eb25d-4e0b-4640-88d5-8061d417a2f3:sit", "tags": [], "situation": {"en": "Whatever they were doing, they are east of here now and moving."}, "stance": {"en": "Notes the direction. Continues west."}}]$interactive$::jsonb
WHERE id = 'cnt:0e6eb25d-4e0b-4640-88d5-8061d417a2f3';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0f500a24-c61b-4c26-87c6-36b8c5a26244:sit", "tags": [], "situation": {"en": "It will not stop until it understands that the person it is looking for is gone. That understanding may take a long time to arrive."}, "stance": {"en": "Turns to face it. Says: that person is dead. Says it clearly. Waits to see if it can receive this."}}]$interactive$::jsonb
WHERE id = 'cnt:0f500a24-c61b-4c26-87c6-36b8c5a26244';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0f7027fb-37cf-4768-af4e-19e3d581d30a:sit", "tags": [], "situation": {"en": "The letter matters to him. He is not going to say what it contains or who it is for. The care is visible."}, "stance": {"en": "Tells him the road condition. Does not ask about the letter."}}]$interactive$::jsonb
WHERE id = 'cnt:0f7027fb-37cf-4768-af4e-19e3d581d30a';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0faa58d7-8912-4123-8985-53a95bee9784:sit", "tags": [], "situation": {"en": "The Woses who made these are somewhere close, watching through the constructs' awareness."}, "stance": {"en": "Stops. Addresses the forest directly. Says: I mean no harm to this wood. Then waits."}}]$interactive$::jsonb
WHERE id = 'cnt:0faa58d7-8912-4123-8985-53a95bee9784';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0fc10001-0000-4000-8000-0fc100000001:sit", "tags": [], "situation": {"en": "There is no negotiation available here. The talk is only the space before the rush."}, "stance": {"en": "Says nothing. Picks the ground. Watches the flanks rather than the loud one."}}]$interactive$::jsonb
WHERE id = 'cnt:0fc10001-0000-4000-8000-0fc100000001';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0fc10002-0000-4000-8000-0fc100000002:sit", "tags": [], "situation": {"en": "The order to take him alive is the only thing keeping this a conversation, and their discipline is thin."}, "stance": {"en": "Uses the argument between them. Does not answer any question directly."}}]$interactive$::jsonb
WHERE id = 'cnt:0fc10002-0000-4000-8000-0fc100000002';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0fc10003-0000-4000-8000-0fc100000003:sit", "tags": [], "situation": {"en": "They are more numerous than brave and they know exactly how the count stands. The shouting is to keep their own nerve up."}, "stance": {"en": "Stands still. Lets the argument at the back get louder. Chooses a moment."}}]$interactive$::jsonb
WHERE id = 'cnt:0fc10003-0000-4000-8000-0fc100000003';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0fc10004-0000-4000-8000-0fc100000004:sit", "tags": [], "situation": {"en": "Every second spent listening is a second they use to close the circle. The wargs will decide the timing, not the riders."}, "stance": {"en": "Stops listening. Gets his back to something solid."}}]$interactive$::jsonb
WHERE id = 'cnt:0fc10004-0000-4000-8000-0fc100000004';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0fc10005-0000-4000-8000-0fc100000005:sit", "tags": [], "situation": {"en": "They are scouts and a fight will bring attention neither side wants. There is an ugly little deal available here."}, "stance": {"en": "Considers turning back. Decides what the road ahead is worth."}}]$interactive$::jsonb
WHERE id = 'cnt:0fc10005-0000-4000-8000-0fc100000005';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0fc10006-0000-4000-8000-0fc100000006:sit", "tags": [], "situation": {"en": "This is not a patrol. Something is being confirmed, and the questions themselves say more than any answer would."}, "stance": {"en": "Refuses all three. Notes exactly what was asked."}}]$interactive$::jsonb
WHERE id = 'cnt:0fc10006-0000-4000-8000-0fc100000006';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0fc10007-0000-4000-8000-0fc100000007:sit", "tags": [], "situation": {"en": "He is an obstruction on a military road. Dignity is expensive here and the price is fixed."}, "stance": {"en": "Kneels or does not, and lives with the choice while the column goes by."}}]$interactive$::jsonb
WHERE id = 'cnt:0fc10007-0000-4000-8000-0fc100000007';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0fc10008-0000-4000-8000-0fc100000008:sit", "tags": [], "situation": {"en": "They trade on being mistaken for men and they resent it at the same time. The resentment is the dangerous part."}, "stance": {"en": "Does not comment on what they are. Deals with them exactly as he would with brigands."}}]$interactive$::jsonb
WHERE id = 'cnt:0fc10008-0000-4000-8000-0fc100000008';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0fc10009-0000-4000-8000-0fc100000009:sit", "tags": [], "situation": {"en": "They want him gone, not dead. Whatever is on those carts matters more to them than he does."}, "stance": {"en": "Gets off the road. Counts the carts. Sees what is on them."}}]$interactive$::jsonb
WHERE id = 'cnt:0fc10009-0000-4000-8000-0fc100000009';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0fc10010-0000-4000-8000-0fc100000010:sit", "tags": [], "situation": {"en": "These are not raiders. There is no confusion to exploit and no argument among them to use."}, "stance": {"en": "Answers or does not. Understands that this time the choice is the whole of it."}}]$interactive$::jsonb
WHERE id = 'cnt:0fc10010-0000-4000-8000-0fc100000010';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0fd55841-3de5-47ae-a9a5-45871e09ac99:sit", "tags": [], "situation": {"en": "A settlement that reinforces its gate in a hurry has seen something that changed its assessment of what the gate needs to stop."}, "stance": {"en": "Does not approach the gate. Continues on the road."}}]$interactive$::jsonb
WHERE id = 'cnt:0fd55841-3de5-47ae-a9a5-45871e09ac99';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:11eddcc2-ec37-4f80-8b56-dd48e4bc1cd6:sit", "tags": [], "situation": {"en": "The procedure is a distraction. The question is what happens when the procedure is satisfied."}, "stance": {"en": "Produces what papers exist. Watches how he reads them."}}]$interactive$::jsonb
WHERE id = 'cnt:11eddcc2-ec37-4f80-8b56-dd48e4bc1cd6';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:12289254-ea74-4e0a-a781-500f913a1b06:sit", "tags": [], "situation": {"en": "They are on their own land doing their own business. The traveller is a small fact in a large landscape."}, "stance": {"en": "Returns the acknowledgment. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:12289254-ea74-4e0a-a781-500f913a1b06';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:12e0a24c-cff4-4b1b-be39-82b6109882c3:sit", "tags": [], "situation": {"en": "They are afraid of something specific and they are not going to say what it is to a stranger. Their caution is its own warning."}, "stance": {"en": "Notes what they will not name. Takes it with them."}}]$interactive$::jsonb
WHERE id = 'cnt:12e0a24c-cff4-4b1b-be39-82b6109882c3';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:12f38939-860f-4bc5-b00f-aeeb7adeaee6:sit", "tags": [], "situation": {"en": "Nothing alarmed it before the traveller arrived. The forest behind it was quiet."}, "stance": {"en": "Notes the calm. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:12f38939-860f-4bc5-b00f-aeeb7adeaee6';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:134a6625-0ad1-4967-aa46-650b9aeef593:sit", "tags": [], "situation": {"en": "He is being checked against a description. If the dispatches are found the conversation ends differently."}, "stance": {"en": "Answers the question about cargo. Does not answer the question about origin. Keeps his hands visible."}}]$interactive$::jsonb
WHERE id = 'cnt:134a6625-0ad1-4967-aa46-650b9aeef593';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:139d5a73-5399-4ef6-b0d1-caba774e0467:sit", "tags": [], "situation": {"en": "He is absurdly ill-equipped for this road and he knows it and he is going anyway. The stubbornness is oddly affecting."}, "stance": {"en": "Gives him what food she can spare. Tells him which road is safer."}}]$interactive$::jsonb
WHERE id = 'cnt:139d5a73-5399-4ef6-b0d1-caba774e0467';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:141027f7-0e24-413d-bc03-09236c91eeb8:sit", "tags": [], "situation": {"en": "They want news from elsewhere. They will give road information freely in exchange."}, "stance": {"en": "Trades road news for road news."}}]$interactive$::jsonb
WHERE id = 'cnt:141027f7-0e24-413d-bc03-09236c91eeb8';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:150d5840-7aa2-4b6c-8b23-edaad825a3af:sit", "tags": [], "situation": {"en": "Someone on this road is being hunted. They are ahead of the trackers. Both of them are ahead of the traveller."}, "stance": {"en": "Reads the timing. Continues on the road knowing what is ahead of them."}}]$interactive$::jsonb
WHERE id = 'cnt:150d5840-7aa2-4b6c-8b23-edaad825a3af';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:159c944a-eadb-45e6-b518-581bd7bb67e5:sit", "tags": [], "situation": {"en": "A standing request means it has been standing for some time. Something on the northern road is being tracked through traveler reports."}, "stance": {"en": "Asks if this is about a specific event or a general watch."}}]$interactive$::jsonb
WHERE id = 'cnt:159c944a-eadb-45e6-b518-581bd7bb67e5';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:15c14f13-8bbe-4c24-be96-2f07054d35c4:sit", "tags": [], "situation": {"en": "The ambush was prepared. That means information was passed. The traveller was tracked or betrayed before this road."}, "stance": {"en": "Does not think about the implications now. Survives first."}}]$interactive$::jsonb
WHERE id = 'cnt:15c14f13-8bbe-4c24-be96-2f07054d35c4';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:1694c890-89ae-401b-a687-322d0050ffca:sit", "tags": [], "situation": {"en": "People who watch passes do not stop watching them without reason."}, "stance": {"en": "Moves through the pass faster than planned. Notes the absence."}}]$interactive$::jsonb
WHERE id = 'cnt:1694c890-89ae-401b-a687-322d0050ffca';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:16da0758-2793-4bfe-9803-e4457e599a80:sit", "tags": [], "situation": {"en": "The Old Forest does this. Fangorn does this. If the traveller is in neither of those places, they should wonder what has learned to do it here."}, "stance": {"en": "Cuts back the closing stems with a blade. Moves through. Does not linger."}}]$interactive$::jsonb
WHERE id = 'cnt:16da0758-2793-4bfe-9803-e4457e599a80';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:17480fb3-afdc-47e3-ac9e-a80f08980611:sit", "tags": [], "situation": {"en": "Interrupting a clan-moot uninvited is a social error. Not acknowledging them at all is a different kind of error."}, "stance": {"en": "Nods at the eldest. Continues without stopping unless invited."}}]$interactive$::jsonb
WHERE id = 'cnt:17480fb3-afdc-47e3-ac9e-a80f08980611';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:17652e32-e6bb-42c9-95a6-bf5b781309ad:sit", "tags": [], "situation": {"en": "The tree it belongs to is sixty feet back from the road. The root traveled a long way to get here."}, "stance": {"en": "Steps over the root. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:17652e32-e6bb-42c9-95a6-bf5b781309ad';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:17c9c9ab-221e-4971-a7be-32fd10179f8c:sit", "tags": [], "situation": {"en": "Running is interesting. Standing is boring. Boring might be survivable."}, "stance": {"en": "Does not run. Does not retreat. Stands."}}]$interactive$::jsonb
WHERE id = 'cnt:17c9c9ab-221e-4971-a7be-32fd10179f8c';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:186bc13e-db8e-4e42-bc10-f1d0c435f1ea:sit", "tags": [], "situation": {"en": "This is not a patrol check. This is a military closure. Something significant has happened on this road."}, "stance": {"en": "Asks when the closure will lift. The captain does not know."}}]$interactive$::jsonb
WHERE id = 'cnt:186bc13e-db8e-4e42-bc10-f1d0c435f1ea';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:18bec08e-a489-488c-918a-de4bc5f08c9f:sit", "tags": [], "situation": {"en": "A road closure with no explanation means the reason is either classified or unknown to the sergeant himself."}, "stance": {"en": "Asks when it will reopen. The sergeant does not know."}}]$interactive$::jsonb
WHERE id = 'cnt:18bec08e-a489-488c-918a-de4bc5f08c9f';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:18cc1eff-fb8f-4834-87d4-c7a4f32b0899:sit", "tags": [], "situation": {"en": "They are collecting information about Gondorian movements. They are doing it in the open, which means they are either very confident or very visible for a reason."}, "stance": {"en": "Names the destination. Describes the road honestly without counting soldiers."}}]$interactive$::jsonb
WHERE id = 'cnt:18cc1eff-fb8f-4834-87d4-c7a4f32b0899';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:18df42c9-bca8-4935-80ef-e05a281a3da7:sit", "tags": [], "situation": {"en": "Waiting is the answer. Three minutes and they are gone."}, "stance": {"en": "Stops. Waits at the road edge. Watches the swarm pass."}}]$interactive$::jsonb
WHERE id = 'cnt:18df42c9-bca8-4935-80ef-e05a281a3da7';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:1b87cde8-befb-4c3c-91d1-4e3a2705357d:sit", "tags": [], "situation": {"en": "He has been living next to the bog long enough to develop a working relationship with its dangers. He is not afraid of the lights. He is cautious, which is a different thing."}, "stance": {"en": "Asks how close. He tells her. Recalibrates where she will camp."}}]$interactive$::jsonb
WHERE id = 'cnt:1b87cde8-befb-4c3c-91d1-4e3a2705357d';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:1b9c2524-7749-4420-83fd-769f673d2bed:sit", "tags": [], "situation": {"en": "The question is information-gathering. He answers it and the answer will determine whether Aranath's road gets easier or harder."}, "stance": {"en": "Answers honestly. No soldiers seen. Watches the hand on the knife-belt relax slightly."}}]$interactive$::jsonb
WHERE id = 'cnt:1b9c2524-7749-4420-83fd-769f673d2bed';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:1c293fe3-7fdf-41cc-b648-db4f20e0780e:sit", "tags": [], "situation": {"en": "He is out of options and he knows it. She looks like someone who has answers to questions people do not usually ask."}, "stance": {"en": "Asks what the symptoms are. Listens. Asks about the mine shaft. Gives him what he needs without explaining how she knows it."}}]$interactive$::jsonb
WHERE id = 'cnt:1c293fe3-7fdf-41cc-b648-db4f20e0780e';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:1c312097-a795-495a-9676-98a234ec0ab8:sit", "tags": [], "situation": {"en": "He is not asking her to reconsider. He is witnessing her choice. The acknowledgment is both comfort and weight."}, "stance": {"en": "Holds his gaze. Then: I know."}}]$interactive$::jsonb
WHERE id = 'cnt:1c312097-a795-495a-9676-98a234ec0ab8';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:1c627fcb-df1b-4010-8934-d6d6fb2761f4:sit", "tags": [], "situation": {"en": "People hiding indoors in the middle of a working day have either seen something, been told something, or are waiting for something to pass."}, "stance": {"en": "Does not enter. Continues on the road. Moves with less visibility than usual."}}]$interactive$::jsonb
WHERE id = 'cnt:1c627fcb-df1b-4010-8934-d6d6fb2761f4';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:1cf43b0c-6866-49f5-ab8f-28f383db4d50:sit", "tags": [], "situation": {"en": "He walked into something he was not made for and came out the other side. He is still coming out the other side."}, "stance": {"en": "Does not ask what he found. Walks with him for half a mile. Then lets him go."}}]$interactive$::jsonb
WHERE id = 'cnt:1cf43b0c-6866-49f5-ab8f-28f383db4d50';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:1e14d589-fb9c-470c-bd8a-817fef5006e8:sit", "tags": [], "situation": {"en": "The wolf went into the trees. It did not go over the ridge."}, "stance": {"en": "Notes which side of the road it entered. Continues without relaxing."}}]$interactive$::jsonb
WHERE id = 'cnt:1e14d589-fb9c-470c-bd8a-817fef5006e8';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:1e67e79a-f67d-4fbd-a4c7-97c75c86d944:sit", "tags": [], "situation": {"en": "He will share everything he knows about the southern road in exchange. He is genuinely trying to get home safely and this is the best information-exchange available."}, "stance": {"en": "Gives him the northern rumour as he heard it. Gets the southern picture in return."}}]$interactive$::jsonb
WHERE id = 'cnt:1e67e79a-f67d-4fbd-a4c7-97c75c86d944';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:1f4c359b-6828-489e-acf6-1132336d8fc0:sit", "tags": [], "situation": {"en": "She watched the city when it was great."}, "stance": {"en": "Continues. Does not stop to watch."}}]$interactive$::jsonb
WHERE id = 'cnt:1f4c359b-6828-489e-acf6-1132336d8fc0';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:1fb73640-38aa-4607-9e59-70de28cb514b:sit", "tags": [], "situation": {"en": "Rangers have protocols for this. The protocol assumes one exit is always available."}, "stance": {"en": "Moves toward the forward exit before they realize he is there."}}]$interactive$::jsonb
WHERE id = 'cnt:1fb73640-38aa-4607-9e59-70de28cb514b';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:20052171-c161-43b8-a18a-1df68c109f8e:sit", "tags": [], "situation": {"en": "Old paths close for old reasons. The forest chose to close this one."}, "stance": {"en": "Turns back. Finds the point where the path was still open. Chooses differently."}}]$interactive$::jsonb
WHERE id = 'cnt:20052171-c161-43b8-a18a-1df68c109f8e';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:200573f0-0102-48cc-aa66-06536f86dc3c:sit", "tags": [], "situation": {"en": "He chose to warn the traveller. That is not nothing from a Wose."}, "stance": {"en": "Asks with gestures: what kind of three?"}}]$interactive$::jsonb
WHERE id = 'cnt:200573f0-0102-48cc-aa66-06536f86dc3c';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:2043ca0d-5e57-4351-8e2d-008afe1cf9e3:sit", "tags": [], "situation": {"en": "The water is its element. The bank is three steps away."}, "stance": {"en": "Drives the nearest hard object into the grip. Makes the three steps."}}]$interactive$::jsonb
WHERE id = 'cnt:2043ca0d-5e57-4351-8e2d-008afe1cf9e3';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:216f7ad6-531b-4e21-abc2-4c32e5bcfaee:sit", "tags": [], "situation": {"en": "This is the Woses giving what they give: knowledge of the land, in their own language, to those who know how to read it."}, "stance": {"en": "Reads the sign correctly. Leaves dried meat at the base of the marker stone. Walks on."}}]$interactive$::jsonb
WHERE id = 'cnt:216f7ad6-531b-4e21-abc2-4c32e5bcfaee';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:21b8b038-daf4-4ac7-aa06-5ea206277b68:sit", "tags": [], "situation": {"en": "The traveller may or may not be the right person. It is making that determination now."}, "stance": {"en": "Stops. Does not approach. Lets it make its determination without interference."}}]$interactive$::jsonb
WHERE id = 'cnt:21b8b038-daf4-4ac7-aa06-5ea206277b68';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:2225d686-9494-4c47-8de8-b316743d1de9:sit", "tags": [], "situation": {"en": "Merchants moving fast on a bad road are a weather-vane."}, "stance": {"en": "Notes the direction. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:2225d686-9494-4c47-8de8-b316743d1de9';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:229df95e-2c80-4cda-8d3f-a6a5ba4aa6f0:sit", "tags": [], "situation": {"en": "Heavily loaded Dwarven caravans move on roads they consider safe. Their presence is its own assessment of the route."}, "stance": {"en": "Passes them with a nod. Notes what the road looks like to creatures who have been on it longer today."}}]$interactive$::jsonb
WHERE id = 'cnt:229df95e-2c80-4cda-8d3f-a6a5ba4aa6f0';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:2321d8ea-ab71-4e36-b88c-065aa0ef428c:sit", "tags": [], "situation": {"en": "The shadow notices what is in it. The traveller is in it."}, "stance": {"en": "Does not move. Does not draw attention. Waits for the shadow to pass."}}]$interactive$::jsonb
WHERE id = 'cnt:2321d8ea-ab71-4e36-b88c-065aa0ef428c';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:24864a26-f5ab-4b5b-9dcf-718dfae01879:sit", "tags": [], "situation": {"en": "The ford is technically passable. Three days would be better."}, "stance": {"en": "Considers the three-day wait against the alternative. Wades."}}]$interactive$::jsonb
WHERE id = 'cnt:24864a26-f5ab-4b5b-9dcf-718dfae01879';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:258aeb28-d009-49d1-b1f8-ea7ffd791d3b:sit", "tags": [], "situation": {"en": "Animals read the shadow differently than people do. What the horses smelled is not visible."}, "stance": {"en": "Watches them go. Considers what they read in the scent."}}]$interactive$::jsonb
WHERE id = 'cnt:258aeb28-d009-49d1-b1f8-ea7ffd791d3b';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:26177980-959b-40af-8df7-6fd69ccb8742:sit", "tags": [], "situation": {"en": "Something named the traveller. Whatever that means in the context of where the traveller is standing, it is not nothing."}, "stance": {"en": "Does not answer. Does not stop. Puts distance between this place and the next camp."}}]$interactive$::jsonb
WHERE id = 'cnt:26177980-959b-40af-8df7-6fd69ccb8742';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:26d3f407-17b9-4ea8-bd4b-946907f5c565:sit", "tags": [], "situation": {"en": "The help will take an hour. The road information is worth it."}, "stance": {"en": "Decides whether an hour is affordable."}}]$interactive$::jsonb
WHERE id = 'cnt:26d3f407-17b9-4ea8-bd4b-946907f5c565';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:28fc4dd0-ab9f-49ac-b78f-6bc3a4c60e94:sit", "tags": [], "situation": {"en": "Someone checked this road recently and found it worth marking clean. That is useful information."}, "stance": {"en": "Reads it. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:28fc4dd0-ab9f-49ac-b78f-6bc3a4c60e94';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:291f9142-46d0-4fc6-bf8e-1f4134b78863:sit", "tags": [], "situation": {"en": "The mark is reassurance. It is also a reminder that the road needs checking."}, "stance": {"en": "Reads it. Continues on the cleared route."}}]$interactive$::jsonb
WHERE id = 'cnt:291f9142-46d0-4fc6-bf8e-1f4134b78863';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:298dcbe9-75c1-4181-96e5-1c97dfcac560:sit", "tags": [], "situation": {"en": "She has decided they are not. She tells them this, which is its own kind of assessment."}, "stance": {"en": "Accepts the verdict."}}]$interactive$::jsonb
WHERE id = 'cnt:298dcbe9-75c1-4181-96e5-1c97dfcac560';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:2a325d02-35d1-4f03-b1d5-9aee6f0b3f8b:sit", "tags": [], "situation": {"en": "Trolls are active at night. Dusk is the beginning of their day."}, "stance": {"en": "Moves off the road before the light fails. Camps away from the road."}}]$interactive$::jsonb
WHERE id = 'cnt:2a325d02-35d1-4f03-b1d5-9aee6f0b3f8b';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:2bb0e1f9-6339-475b-83fe-acecf8f7d14e:sit", "tags": [], "situation": {"en": "Someone taught a Wose a warning-sign from the First Age. That is not possible through memory alone. Something showed it to him recently."}, "stance": {"en": "Returns the sign. Asks with her hands: how recently. He holds up three fingers."}}]$interactive$::jsonb
WHERE id = 'cnt:2bb0e1f9-6339-475b-83fe-acecf8f7d14e';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:2bf19ef1-5ee2-44df-835e-d1fda51052b5:sit", "tags": [], "situation": {"en": "Someone is being looked for on this waterfront. The traveller almost matched the description."}, "stance": {"en": "Notes the look and the relaxation. Files the encounter."}}]$interactive$::jsonb
WHERE id = 'cnt:2bf19ef1-5ee2-44df-835e-d1fda51052b5';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:2c08d738-771c-44db-b063-ba0ca27c13c5:sit", "tags": [], "situation": {"en": "Three riders with a purpose, somewhere south on this road."}, "stance": {"en": "Notes the number and direction. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:2c08d738-771c-44db-b063-ba0ca27c13c5';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:2c2205e9-4c26-4ae6-9af3-a3291fa18a2f:sit", "tags": [], "situation": {"en": "She has a name for it. The name is not reassuring."}, "stance": {"en": "Tells them what it is. Watches them decide what to do with that information."}}]$interactive$::jsonb
WHERE id = 'cnt:2c2205e9-4c26-4ae6-9af3-a3291fa18a2f';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:2ce6e8f3-61e4-4a05-94e1-6746c4859ef8:sit", "tags": [], "situation": {"en": "He has two seconds to give them a reason not to make him the problem."}, "stance": {"en": "Does not slow. Does not look at them directly. Moves with the ease of someone who belongs on this road."}}]$interactive$::jsonb
WHERE id = 'cnt:2ce6e8f3-61e4-4a05-94e1-6746c4859ef8';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:2d782a24-f163-40e6-9c99-3ff65ce190eb:sit", "tags": [], "situation": {"en": "They want to know where she is going. They mean it as kin-concern, not challenge."}, "stance": {"en": "Tells them the direction but not the reason. There is kindness in not explaining."}}]$interactive$::jsonb
WHERE id = 'cnt:2d782a24-f163-40e6-9c99-3ff65ce190eb';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:2ed01f30-bf7d-433b-af35-b674e8b071cb:sit", "tags": [], "situation": {"en": "She knows what these marks mean. They have not been actively used since the Second Age."}, "stance": {"en": "Does not approach. Does not startle them. When they look up and see her seeing the marks, she gives them the old sign."}}]$interactive$::jsonb
WHERE id = 'cnt:2ed01f30-bf7d-433b-af35-b674e8b071cb';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:2f6e2c77-3601-4394-bda4-88d576a3038e:sit", "tags": [], "situation": {"en": "He is afraid of what will happen if he lets her pass and more afraid of what will happen if he tries to stop her and fails."}, "stance": {"en": "Lets the fear be visible to him. Then walks past."}}]$interactive$::jsonb
WHERE id = 'cnt:2f6e2c77-3601-4394-bda4-88d576a3038e';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:2f88b7ee-e60d-4b89-b509-5dbed8089345:sit", "tags": [], "situation": {"en": "A military column this organized on this road means the road belongs to someone the traveller has reason to avoid."}, "stance": {"en": "Steps well off the road. Does not make eye contact. Waits for them to pass."}}]$interactive$::jsonb
WHERE id = 'cnt:2f88b7ee-e60d-4b89-b509-5dbed8089345';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:306abdd0-0ed5-4838-be74-96c10559f696:sit", "tags": [], "situation": {"en": "The communication is ongoing. The topic has not been resolved."}, "stance": {"en": "Does not stop. Does not answer. Keeps moving through."}}]$interactive$::jsonb
WHERE id = 'cnt:306abdd0-0ed5-4838-be74-96c10559f696';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:30b6f60b-46a0-4b9d-8eea-feb29e4fec69:sit", "tags": [], "situation": {"en": "He is sharing information and looking for information. A straight exchange on a road where strangers have reason to help each other."}, "stance": {"en": "Gives him the honest read of the northern road. Gets his read of the south in return."}}]$interactive$::jsonb
WHERE id = 'cnt:30b6f60b-46a0-4b9d-8eea-feb29e4fec69';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:31474e21-320e-4aff-b187-0ec2cb885ffe:sit", "tags": [], "situation": {"en": "There may be others. The cocooning means the spider hunts this path regularly."}, "stance": {"en": "Does not approach the cocoon. Notes the height of the branch. Moves fast through this section."}}]$interactive$::jsonb
WHERE id = 'cnt:31474e21-320e-4aff-b187-0ec2cb885ffe';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:318f0782-8108-4736-951c-4cc2dc517273:sit", "tags": [], "situation": {"en": "The question is more perceptive than expected from a mortal on a cold road. She is not well. She is not going to say so."}, "stance": {"en": "Recognizes real attention. Gives him the minimum that is also true."}}]$interactive$::jsonb
WHERE id = 'cnt:318f0782-8108-4736-951c-4cc2dc517273';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:32d1e3d0-d58c-47f2-a89f-4517b6f9bf27:sit", "tags": [], "situation": {"en": "Arguing with Hill-trolls on their roads at night is how travelers become stories told by other travelers."}, "stance": {"en": "Does not argue. Turns back. Finds another way."}}]$interactive$::jsonb
WHERE id = 'cnt:32d1e3d0-d58c-47f2-a89f-4517b6f9bf27';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:33535c53-29c1-40cf-aedb-dfb428d9c466:sit", "tags": [], "situation": {"en": "He is asking because his clan's founding records reference an Elf who witnessed the first stone-cut. He wants to know if she is that Elf."}, "stance": {"en": "Considers the timeframe. Tells him she was not there at the beginning but knew those who were."}}]$interactive$::jsonb
WHERE id = 'cnt:33535c53-29c1-40cf-aedb-dfb428d9c466';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:338b3057-c4c3-48de-92fa-fb7f7e1328a4:sit", "tags": [], "situation": {"en": "The ledger is the problem. The information in it goes somewhere."}, "stance": {"en": "Provides what is required. Notes the ledger."}}]$interactive$::jsonb
WHERE id = 'cnt:338b3057-c4c3-48de-92fa-fb7f7e1328a4';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:338fac46-ab37-41ad-87d2-7afbaa66bf90:sit", "tags": [], "situation": {"en": "The observation has no follow-up. It goes back to what it was eating."}, "stance": {"en": "Agrees that yes, it is small. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:338fac46-ab37-41ad-87d2-7afbaa66bf90';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:34b7ca21-091a-4068-9a13-e6a0a8ec578e:sit", "tags": [], "situation": {"en": "She means the shadow, not the pack. She does not know the word shadow but she can read its signs."}, "stance": {"en": "Agrees that yes, the road has been long."}}]$interactive$::jsonb
WHERE id = 'cnt:34b7ca21-091a-4068-9a13-e6a0a8ec578e';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:36a860da-f94f-4561-a27a-d66819968ff2:sit", "tags": [], "situation": {"en": "It is deciding whether the traveller is worth the effort. That is a question the traveller should leave the passage before it answers."}, "stance": {"en": "Turns around. Finds another way."}}]$interactive$::jsonb
WHERE id = 'cnt:36a860da-f94f-4561-a27a-d66819968ff2';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:37546ba9-13a9-4520-8a04-dd10144474dd:sit", "tags": [], "situation": {"en": "The warg knows. The captain knows the warg knows. The moment the captain decides to trust the warg is the moment the conversation ends."}, "stance": {"en": "Has approximately ten seconds before the captain decides."}}]$interactive$::jsonb
WHERE id = 'cnt:37546ba9-13a9-4520-8a04-dd10144474dd';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:376ef05f-8292-4b9a-ba70-b89f525d7343:sit", "tags": [], "situation": {"en": "They have a destination. The direction is north, same as the traveller."}, "stance": {"en": "Notes the direction. Checks behind. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:376ef05f-8292-4b9a-ba70-b89f525d7343';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:3781f356-0a81-4631-868c-cae38db38d48:sit", "tags": [], "situation": {"en": "The Woses placed these carvings for a reason. Whatever this one is, it is not their work."}, "stance": {"en": "Does not touch it. Does not get closer. Leaves the forest edge."}}]$interactive$::jsonb
WHERE id = 'cnt:3781f356-0a81-4631-868c-cae38db38d48';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:37db9426-eeb9-411c-bf86-d2d76f71686c:sit", "tags": [], "situation": {"en": "The Ent has been asking this question for a long time. It has learned to tell the difference between an answer and a performance of an answer."}, "stance": {"en": "Takes the time the question deserves. Answers honestly."}}]$interactive$::jsonb
WHERE id = 'cnt:37db9426-eeb9-411c-bf86-d2d76f71686c';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:3858bc13-8ff9-4736-aab7-cae47506d285:sit", "tags": [], "situation": {"en": "A Ranger continuing a three-man circuit alone, on day six of silence from his partners, is a man running on duty and not much else."}, "stance": {"en": "Tells him what the road has looked like. Asks if he wants company for the northern section."}}]$interactive$::jsonb
WHERE id = 'cnt:3858bc13-8ff9-4736-aab7-cae47506d285';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:395740a2-067a-4217-a021-1324afdba499:sit", "tags": [], "situation": {"en": "The question is curious, not hostile. Curiosity is a window."}, "stance": {"en": "Tells him what she is. Asks what he is. He finds this extremely funny."}}]$interactive$::jsonb
WHERE id = 'cnt:395740a2-067a-4217-a021-1324afdba499';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:3a9700af-3ec3-416b-9f67-7d84a4d52f7e:sit", "tags": [], "situation": {"en": "The it does not need to be named."}, "stance": {"en": "Does not respond immediately. Then: I know."}}]$interactive$::jsonb
WHERE id = 'cnt:3a9700af-3ec3-416b-9f67-7d84a4d52f7e';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:3b17a92b-0135-4d05-a488-70e77787bdd3:sit", "tags": [], "situation": {"en": "Wolves that call to each other about a moving target are hunting it. The calls were honest about the direction."}, "stance": {"en": "Moves toward the nearest cover. Builds the fire larger than usual tonight."}}]$interactive$::jsonb
WHERE id = 'cnt:3b17a92b-0135-4d05-a488-70e77787bdd3';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:3c266dd6-8403-4b76-bc7d-bb3c49a20c2b:sit", "tags": [], "situation": {"en": "He is doing a job. The question is legitimate. He expects a direct answer."}, "stance": {"en": "Gives him the western road conditions directly. He nods, thanks them in Rohirric, and rides back."}}]$interactive$::jsonb
WHERE id = 'cnt:3c266dd6-8403-4b76-bc7d-bb3c49a20c2b';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:3d787249-2b2f-4aa4-9973-1006bdb6ba47:sit", "tags": [], "situation": {"en": "Smoke of that colour in a forest that should not be burning means something is being done here that has consequences."}, "stance": {"en": "Does not approach the smoke. Notes its direction and the approximate time."}}]$interactive$::jsonb
WHERE id = 'cnt:3d787249-2b2f-4aa4-9973-1006bdb6ba47';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:3e549f49-fba7-48f8-8be5-ded2e6d74a42:sit", "tags": [], "situation": {"en": "The change it noticed is recent enough to be meaningful. It is asking, in the way Ents ask, whether the traveller knows what is causing it."}, "stance": {"en": "Tells it what the road has looked like from ground-level. Takes the time the answer deserves."}}]$interactive$::jsonb
WHERE id = 'cnt:3e549f49-fba7-48f8-8be5-ded2e6d74a42';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:3e74c0c5-52df-46e5-9130-f82ca3a8aaa2:sit", "tags": [], "situation": {"en": "She is giving useful information without being asked. She wants company on the road to the next settlement, just until the exposed stretch is past."}, "stance": {"en": "Offers the company. Walks with her to the settlement. Does not speak much."}}]$interactive$::jsonb
WHERE id = 'cnt:3e74c0c5-52df-46e5-9130-f82ca3a8aaa2';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:3e8deb6e-174d-4724-8154-d9155d6a070d:sit", "tags": [], "situation": {"en": "Someone told him the traveller would be on this road. He was asked to pass a message. The message is: turn around."}, "stance": {"en": "Asks who sent the message. He will not say. Asks what is ahead. He will not say that either."}}]$interactive$::jsonb
WHERE id = 'cnt:3e8deb6e-174d-4724-8154-d9155d6a070d';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:3ec709e2-9e79-4e89-b9dc-65ba0157cea1:sit", "tags": [], "situation": {"en": "Tribes that clear their traces when they leave have a reason to not be found. Something in this region is looking for them or they believe it is."}, "stance": {"en": "Reads the direction of departure. Continues on the road."}}]$interactive$::jsonb
WHERE id = 'cnt:3ec709e2-9e79-4e89-b9dc-65ba0157cea1';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:404eda32-12ce-4ceb-895d-14026c08fc26:sit", "tags": [], "situation": {"en": "The road has outlasted the people who built the tower to protect it. That is not unusual in the north."}, "stance": {"en": "Notes the stonework. Takes the right fork."}}]$interactive$::jsonb
WHERE id = 'cnt:404eda32-12ce-4ceb-895d-14026c08fc26';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:416281e3-751e-4b4f-8d74-40953ce64bb2:sit", "tags": [], "situation": {"en": "She is telling a stranger because she has told everyone she knows and no one will help. She is not asking for anything. She is saying it out loud one more time."}, "stance": {"en": "Listens to the whole thing. Does not offer hope. Offers: I will remember his name."}}]$interactive$::jsonb
WHERE id = 'cnt:416281e3-751e-4b4f-8d74-40953ce64bb2';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:41b33da7-05f7-4321-9f50-ea8112cff44a:sit", "tags": [], "situation": {"en": "Someone a day ahead on this road with Gondorian training."}, "stance": {"en": "Notes the camp-quality. Notes the direction of departure."}}]$interactive$::jsonb
WHERE id = 'cnt:41b33da7-05f7-4321-9f50-ea8112cff44a';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:41f2dbdb-792b-43ba-adb9-7e5feacf3322:sit", "tags": [], "situation": {"en": "The path is clear. The snake is in the undergrowth watching."}, "stance": {"en": "Continues without incident."}}]$interactive$::jsonb
WHERE id = 'cnt:41f2dbdb-792b-43ba-adb9-7e5feacf3322';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:42888a52-b7d3-46d7-885b-b16cd5148327:sit", "tags": [], "situation": {"en": "Armed watchers above a road who ignore a traveller are waiting for someone or something else. The road ahead leads toward whatever that is."}, "stance": {"en": "Notes the number and position. Continues. Moves with less visibility than usual."}}]$interactive$::jsonb
WHERE id = 'cnt:42888a52-b7d3-46d7-885b-b16cd5148327';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:42b23029-9d78-43cf-9ff7-d32bb70a286e:sit", "tags": [], "situation": {"en": "Military drum communication means organized forces. Organized forces on this road means they know the road."}, "stance": {"en": "Notes the direction. Counts the repetitions. Adjusts the route."}}]$interactive$::jsonb
WHERE id = 'cnt:42b23029-9d78-43cf-9ff7-d32bb70a286e';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:4323ea0d-af66-4963-ae5e-3fb86fa78848:sit", "tags": [], "situation": {"en": "The rope is a formality. The closure is not."}, "stance": {"en": "Asks why. Gets: \"town business.\" Takes the lane around."}}]$interactive$::jsonb
WHERE id = 'cnt:4323ea0d-af66-4963-ae5e-3fb86fa78848';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:43a3c42e-bc94-4f7b-b3b5-e81527557449:sit", "tags": [], "situation": {"en": "The procedure is real. Satisfying the procedure is the goal."}, "stance": {"en": "Produces what papers exist. Waits while he records them."}}]$interactive$::jsonb
WHERE id = 'cnt:43a3c42e-bc94-4f7b-b3b5-e81527557449';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:4413d38a-9775-40fa-b3aa-01f16fec71d8:sit", "tags": [], "situation": {"en": "Lossoth who are settled and not mobile are in a phase of their seasonal cycle. They are neither welcoming nor hostile by default."}, "stance": {"en": "Approaches openly from a direction they can see clearly."}}]$interactive$::jsonb
WHERE id = 'cnt:4413d38a-9775-40fa-b3aa-01f16fec71d8';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:449b61eb-0096-494b-bb9c-5a236d1302dd:sit", "tags": [], "situation": {"en": "Being noted is not the same as being threatened. They are cataloguing, not deciding."}, "stance": {"en": "Continues on the road. Does not try to approach them."}}]$interactive$::jsonb
WHERE id = 'cnt:449b61eb-0096-494b-bb9c-5a236d1302dd';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:44c1991a-1b82-484f-90dd-aa61233a53c0:sit", "tags": [], "situation": {"en": "He chose to pass this on. Mountain-folk do not waste words on strangers without reason."}, "stance": {"en": "Asks if there is a way around the unstable section."}}]$interactive$::jsonb
WHERE id = 'cnt:44c1991a-1b82-484f-90dd-aa61233a53c0';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:44c8e116-6eaf-4fe2-93a6-0e32187387dc:sit", "tags": [], "situation": {"en": "They have not registered the traveller yet. When they do, their response will indicate how this territory treats strangers."}, "stance": {"en": "Approaches at normal pace. Does not try to overtake quietly."}}]$interactive$::jsonb
WHERE id = 'cnt:44c8e116-6eaf-4fe2-93a6-0e32187387dc';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:45218918-df59-43d0-bbcb-424d28ab380d:sit", "tags": [], "situation": {"en": "He has not acknowledged the traveller. The bard's protection is real but it applies to him, not to outsiders who wander into the recitation."}, "stance": {"en": "Stays at the edge of the firelight. Does not interrupt."}}]$interactive$::jsonb
WHERE id = 'cnt:45218918-df59-43d0-bbcb-424d28ab380d';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:45c38018-ac3f-4e0e-b5d5-da96c3615208:sit", "tags": [], "situation": {"en": "It will not move. It cannot move. It is bound to this place in a way that is complete."}, "stance": {"en": "Does not approach. Addresses it from outside the barrow's influence. Asks its name."}}]$interactive$::jsonb
WHERE id = 'cnt:45c38018-ac3f-4e0e-b5d5-da96c3615208';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:46c30465-b1fa-4bc3-b616-20629634b24c:sit", "tags": [], "situation": {"en": "He has run the calculation three times and the numbers are the same each time. Four guards, three captives, open road. The question is not whether he can do it — it is whether he can do it without the captives dying in the confusion."}, "stance": {"en": "Finds the angle. Finds the timing. Decides."}}]$interactive$::jsonb
WHERE id = 'cnt:46c30465-b1fa-4bc3-b616-20629634b24c';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:46d8f96b-3bbd-4245-a9ee-ede83071c3c0:sit", "tags": [], "situation": {"en": "It — or they — have been watching the approach for several minutes."}, "stance": {"en": "Does not stop under the tree. Does not look up. Keeps moving."}}]$interactive$::jsonb
WHERE id = 'cnt:46d8f96b-3bbd-4245-a9ee-ede83071c3c0';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:46f97784-ce34-40ae-a50a-b90e3ab6b881:sit", "tags": [], "situation": {"en": "It has been here a long time. Whatever it is waiting to say has not diminished in the waiting."}, "stance": {"en": "Acknowledges it. Waits."}}]$interactive$::jsonb
WHERE id = 'cnt:46f97784-ce34-40ae-a50a-b90e3ab6b881';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:474ea6d0-ad57-4251-9328-651b2983f3b6:sit", "tags": [], "situation": {"en": "The sweep is methodical. They have done this before. This passage has one exit behind and one exit forward."}, "stance": {"en": "Moves toward the forward exit. Does not run yet."}}]$interactive$::jsonb
WHERE id = 'cnt:474ea6d0-ad57-4251-9328-651b2983f3b6';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:47575155-fbfe-4447-ab91-53220c88fc1a:sit", "tags": [], "situation": {"en": "He is giving them this information because he believes travelers should know what the ravens know. He does not consider whether the traveler wants it."}, "stance": {"en": "Asks which direction it is organized toward."}}]$interactive$::jsonb
WHERE id = 'cnt:47575155-fbfe-4447-ab91-53220c88fc1a';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:47fd0a50-a8dc-4004-8e76-ec2a891b9d09:sit", "tags": [], "situation": {"en": "It is deciding. The decision will take approximately as long as it takes the traveller to cross the open ground."}, "stance": {"en": "Does not run. Does not stop. Maintains exactly the same pace across the open ground."}}]$interactive$::jsonb
WHERE id = 'cnt:47fd0a50-a8dc-4004-8e76-ec2a891b9d09';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:480e82d5-8f19-4f07-afea-41d88a5d1556:sit", "tags": [], "situation": {"en": "The message was crafted by someone intelligent. The messenger was chosen because he could deliver it without being dismissed as an animal."}, "stance": {"en": "Asks who sends it. The answer is not one she expected."}}]$interactive$::jsonb
WHERE id = 'cnt:480e82d5-8f19-4f07-afea-41d88a5d1556';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:48f3c0a4-d735-47be-a517-71f37ebcca05:sit", "tags": [], "situation": {"en": "She has watched this sequence more times than there are names for it. The scene is ordinary and inexorable at once."}, "stance": {"en": "Watches them until they disappear over the hill. Then continues."}}]$interactive$::jsonb
WHERE id = 'cnt:48f3c0a4-d735-47be-a517-71f37ebcca05';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:49c4cc3d-bc5c-4bb9-8074-f66d5a1d0f8a:sit", "tags": [], "situation": {"en": "Elves who move ahead of travelers on their roads are either escorting them or evaluating them. The distinction becomes clear when they stop."}, "stance": {"en": "Continues on the path. Does not look up again."}}]$interactive$::jsonb
WHERE id = 'cnt:49c4cc3d-bc5c-4bb9-8074-f66d5a1d0f8a';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:4ab1cf38-e3fe-4b4e-b98b-11b72cafdeb5:sit", "tags": [], "situation": {"en": "The way back requires cutting through. The way forward may be equally closed by now."}, "stance": {"en": "Does not attempt to cut through. Cuts at an angle toward the least-dense section of the forest."}}]$interactive$::jsonb
WHERE id = 'cnt:4ab1cf38-e3fe-4b4e-b98b-11b72cafdeb5';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:4ab51e4a-4649-4d2a-a000-9b10c519e541:sit", "tags": [], "situation": {"en": "Men coming south from the deep north are either Rangers, refugees, or carrying information. He does not look like a refugee."}, "stance": {"en": "Asks where north he started from. Gets a careful, partial answer."}}]$interactive$::jsonb
WHERE id = 'cnt:4ab51e4a-4649-4d2a-a000-9b10c519e541';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:4abe850d-9814-481e-a492-d4f64722b6e4:sit", "tags": [], "situation": {"en": "He is not asking to be saved right now. He is asking to be witnessed."}, "stance": {"en": "Says: I see you. I will remember this road."}}]$interactive$::jsonb
WHERE id = 'cnt:4abe850d-9814-481e-a492-d4f64722b6e4';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:4ca7e0a3-effe-499e-9887-00820a0e23b7:sit", "tags": [], "situation": {"en": "Road knowledge: honey at the next settlement is fresh and reliable."}, "stance": {"en": "Notes the keeper's mark. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:4ca7e0a3-effe-499e-9887-00820a0e23b7';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:4d9b636e-cfc2-4553-ba53-77f6b765ed83:sit", "tags": [], "situation": {"en": "Three Stone-trolls arguing about food are, for the moment, not paying attention to anything else. Dawn is four hours away."}, "stance": {"en": "Does not step on anything. Does not breathe loudly. Moves around the fire's light."}}]$interactive$::jsonb
WHERE id = 'cnt:4d9b636e-cfc2-4553-ba53-77f6b765ed83';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:4dbfc162-27d9-4d1b-b9ca-580fda4f51f9:sit", "tags": [], "situation": {"en": "The herd being calm means the road ahead has been undisturbed. Frightened animals do not return quickly to a feeding ground."}, "stance": {"en": "Passes without disturbing them. Uses the observation."}}]$interactive$::jsonb
WHERE id = 'cnt:4dbfc162-27d9-4d1b-b9ca-580fda4f51f9';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:4fa9870a-3951-48ca-9f98-f1e8e273e3aa:sit", "tags": [], "situation": {"en": "Taking a modest amount costs nothing. Leaving the plants rooted means they will be here for the next traveller."}, "stance": {"en": "Drinks from the spring. Leaves the stand rooted. Marks where athelas grows."}, "options": [{"id": "stay", "label": "Camp beside the spring", "tags": ["need:thirst", "need:exhaustion", "need:unrest"], "commands": [{"type": "overnight_shelter", "name": "the spring", "description": "clean water and a stand of athelas — the ground keeps itself", "indoor": false, "lodging_cost": 0, "meal": false, "water": true, "rest_quality": 2, "shadow_effect": -1}], "stance": "Camps beside the spring. The athelas stays rooted for the next traveller."}, {"id": "move_on", "label": "Drink, mark the stand, and move on", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:4fa9870a-3951-48ca-9f98-f1e8e273e3aa';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:4fc4cf68-5f60-4fa6-8038-f5c9f7be427f:sit", "tags": [], "situation": {"en": "A patrol holding a junction and watching approaches is either a checkpoint or an ambush depending on who is behind the traveller."}, "stance": {"en": "Does not approach the junction. Finds the detour."}}]$interactive$::jsonb
WHERE id = 'cnt:4fc4cf68-5f60-4fa6-8038-f5c9f7be427f';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:5012f41e-8c19-4496-829d-f44476f2a481:sit", "tags": [], "situation": {"en": "They are waiting for something. The traveller is not it, but might know something about it."}, "stance": {"en": "Names the road. Gives the road-news. Watches the anxiety resolve or deepen."}}]$interactive$::jsonb
WHERE id = 'cnt:5012f41e-8c19-4496-829d-f44476f2a481';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:503a28f5-b382-4ace-b031-7c26919b8793:sit", "tags": [], "situation": {"en": "Open roads and working markets mean the region is currently stable. That is worth knowing."}, "stance": {"en": "Walks through. Reads the goods. Notes the roads that are represented."}}]$interactive$::jsonb
WHERE id = 'cnt:503a28f5-b382-4ace-b031-7c26919b8793';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:50569545-b27b-4587-ad6a-81b16db2545a:sit", "tags": [], "situation": {"en": "He knew Khazad-dum when Dwarves still lived in it. She also knew Khazad-dum when Dwarves still lived in it. They are the only two in this passage who share that."}, "stance": {"en": "Sits across the junction. Asks him what he remembers of the forges on the third level."}}]$interactive$::jsonb
WHERE id = 'cnt:50569545-b27b-4587-ad6a-81b16db2545a';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:506492aa-3e5b-4b2e-8de5-97397749a0cc:sit", "tags": [], "situation": {"en": "Old trees have their own gravity. This section of forest pulls the road through it, not the other way."}, "stance": {"en": "Walks without stopping. Does not disturb the undergrowth."}}]$interactive$::jsonb
WHERE id = 'cnt:506492aa-3e5b-4b2e-8de5-97397749a0cc';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:509e2745-6f88-4477-94ee-32f4f078e9d6:sit", "tags": [], "situation": {"en": "A pirate lost on a road is still a pirate. The helplessness may or may not be the whole story."}, "stance": {"en": "Gives him directions. Notes which direction he was actually heading before asking."}}]$interactive$::jsonb
WHERE id = 'cnt:509e2745-6f88-4477-94ee-32f4f078e9d6';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:523e91f6-262f-4491-8821-2545c6627597:sit", "tags": [], "situation": {"en": "He is doing his duty. She is a resource he would not normally have. There is no warmth in it but the respect is real."}, "stance": {"en": "Answers what she knows. Sees in him the grandson of the man she knew. Does not say so."}}]$interactive$::jsonb
WHERE id = 'cnt:523e91f6-262f-4491-8821-2545c6627597';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:525b97e5-83a3-4961-81fb-ee95042f9be3:sit", "tags": [], "situation": {"en": "A garrison watching the road more carefully than usual has a reason. The reason is not posted."}, "stance": {"en": "Passes at normal pace. Does not give the garrison reason to stop them."}}]$interactive$::jsonb
WHERE id = 'cnt:525b97e5-83a3-4961-81fb-ee95042f9be3';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:52a175a0-ff39-4d2e-a73a-1db21316327b:sit", "tags": [], "situation": {"en": "He knows the Dunedain lineage better than expected. He is offering this as conversation, not as a credential."}, "stance": {"en": "Asks what he knew of that man."}}]$interactive$::jsonb
WHERE id = 'cnt:52a175a0-ff39-4d2e-a73a-1db21316327b';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:53160f4d-4202-4ec5-845d-b1aacd176eef:sit", "tags": [], "situation": {"en": "They are asking in good faith. They know they are viewed with suspicion here and have chosen competence over charm as their approach."}, "stance": {"en": "Gives them the honest state of the northern markets."}}]$interactive$::jsonb
WHERE id = 'cnt:53160f4d-4202-4ec5-845d-b1aacd176eef';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:53a310c3-4305-4439-8dba-976b79c3a425:sit", "tags": [], "situation": {"en": "He is deciding whether this is someone who can help identify old artifacts or someone who will try to take them."}, "stance": {"en": "Describes the shaft's location without mentioning the artifact. Watches the Dwarf decide whether to trust further."}}]$interactive$::jsonb
WHERE id = 'cnt:53a310c3-4305-4439-8dba-976b79c3a425';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:550493da-b300-40de-adce-dcffca05f7d1:sit", "tags": [], "situation": {"en": "The offer is genuine. He likes the company and the news from outside."}, "stance": {"en": "Considers the offer. Accepts or continues."}}]$interactive$::jsonb
WHERE id = 'cnt:550493da-b300-40de-adce-dcffca05f7d1';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:5634a6c8-0170-45c8-89be-8c405083c0b8:sit", "tags": [], "situation": {"en": "They have told him what they can tell him. He continues from this point alone."}, "stance": {"en": "Notes where they stopped. Approaches the barrow with full attention."}}]$interactive$::jsonb
WHERE id = 'cnt:5634a6c8-0170-45c8-89be-8c405083c0b8';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:56d65548-18a6-42cc-8462-c5a49d1c40eb:sit", "tags": [], "situation": {"en": "The question that confirms or denies will come. The answer determines what happens next."}, "stance": {"en": "Answers the confirmation question honestly. Watches the sergeant decide."}}]$interactive$::jsonb
WHERE id = 'cnt:56d65548-18a6-42cc-8462-c5a49d1c40eb';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:571f5dd2-9e06-4838-ba7e-eded9308b6f8:sit", "tags": [], "situation": {"en": "Running is the wrong answer. Running is what it expects."}, "stance": {"en": "Stops. Does not look at it directly. Identifies the strongest light source available and moves toward it."}}]$interactive$::jsonb
WHERE id = 'cnt:571f5dd2-9e06-4838-ba7e-eded9308b6f8';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:5786ea63-9338-4ce8-8928-e2f46d0e46a2:sit", "tags": [], "situation": {"en": "He shares the gap in coverage as a peer, not a report. Expects Aranath to know what it means."}, "stance": {"en": "Gives the countersign. Receives the patrol intelligence. Files the missing men."}}]$interactive$::jsonb
WHERE id = 'cnt:5786ea63-9338-4ce8-8928-e2f46d0e46a2';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:57de184d-0fb3-4a6e-a1fd-4f8267735989:sit", "tags": [], "situation": {"en": "She has been looked at this way before by things that served darker masters than this one. The calibration runs automatically."}, "stance": {"en": "Answers the first question before he asks it. Watches whether that unsettles him."}}]$interactive$::jsonb
WHERE id = 'cnt:57de184d-0fb3-4a6e-a1fd-4f8267735989';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:57e3ae33-8a45-4bd7-912d-0a0135087d4e:sit", "tags": [], "situation": {"en": "He does not know yet that the person he is asking knows what he is."}, "stance": {"en": "Answers the questions with plausible misdirection. Files the encounter."}}]$interactive$::jsonb
WHERE id = 'cnt:57e3ae33-8a45-4bd7-912d-0a0135087d4e';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:5904a2e6-134d-4845-8758-a2bdbc8c3308:sit", "tags": [], "situation": {"en": "They will decide. The traveller's behavior during the pause will influence the decision."}, "stance": {"en": "Continues at the same pace. Does not change direction. Does not reach for anything."}}]$interactive$::jsonb
WHERE id = 'cnt:5904a2e6-134d-4845-8758-a2bdbc8c3308';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:597a7f99-d6ae-44d6-bfdd-c7283448099f:sit", "tags": [], "situation": {"en": "He is not going to say what was in the western passages. He is telling her he was there so she knows someone has been there recently."}, "stance": {"en": "Does not ask what was in the passages. Asks where the western passages exit on the surface."}}]$interactive$::jsonb
WHERE id = 'cnt:597a7f99-d6ae-44d6-bfdd-c7283448099f';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:5b6db599-4a0c-485f-9b62-4d0b787e4462:sit", "tags": [], "situation": {"en": "He cannot stop them. He can get ahead of them."}, "stance": {"en": "Counts them. Identifies the banner. Moves."}}]$interactive$::jsonb
WHERE id = 'cnt:5b6db599-4a0c-485f-9b62-4d0b787e4462';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:5c0ca874-21d2-4a24-a061-97d711949852:sit", "tags": [], "situation": {"en": "It is above the treeline, or it was. The marks face the direction the traveller is heading."}, "stance": {"en": "Reads the height and spacing. Continues with the ridge on their right."}}]$interactive$::jsonb
WHERE id = 'cnt:5c0ca874-21d2-4a24-a061-97d711949852';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:5cb07cd0-6dc8-493e-a19b-05b7de15febe:sit", "tags": [], "situation": {"en": "The hollow is empty now. The road is undisturbed."}, "stance": {"en": "Watches it go. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:5cb07cd0-6dc8-493e-a19b-05b7de15febe';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:5d922ce5-d59f-4c9d-9529-1f79c14a4479:sit", "tags": [], "situation": {"en": "She is not asking for help. She is sharing a pattern. She has done everything she can for the people in front of her. The pattern is for whoever can use it."}, "stance": {"en": "Listens to the description. Carries it."}}]$interactive$::jsonb
WHERE id = 'cnt:5d922ce5-d59f-4c9d-9529-1f79c14a4479';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:5e3eac8e-a282-41ef-afe6-7b5ed3688148:sit", "tags": [], "situation": {"en": "They are more useful than they appear. The suspicion they have learned to manage has made them observant."}, "stance": {"en": "Trades road news. Gets a detailed account of the southern road."}}]$interactive$::jsonb
WHERE id = 'cnt:5e3eac8e-a282-41ef-afe6-7b5ed3688148';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:5ebc25fe-0b80-4692-b45d-d534dd487886:sit", "tags": [], "situation": {"en": "It did not try to hide, exactly. It simply did not move. The forest made it invisible by being itself around it."}, "stance": {"en": "Has approximately four options. Three of them are bad."}}]$interactive$::jsonb
WHERE id = 'cnt:5ebc25fe-0b80-4692-b45d-d534dd487886';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:5f1d0058-87e1-45e3-8689-2f7c4589dfeb:sit", "tags": [], "situation": {"en": "Something moved this for a reason. The reason was not to block the road — it is offset to the side. The reason was to move it."}, "stance": {"en": "Notes the clean fracture. Continues. Stays under the cliff-face rather than in the open."}}]$interactive$::jsonb
WHERE id = 'cnt:5f1d0058-87e1-45e3-8689-2f7c4589dfeb';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:5f490b2f-b23c-4374-ab8c-0777651a7092:sit", "tags": [], "situation": {"en": "The restraint is not mercy. It is orders. The orders may be more dangerous than simple violence."}, "stance": {"en": "Hears the difference between kill-on-sight and bring-back. Adjusts accordingly."}}]$interactive$::jsonb
WHERE id = 'cnt:5f490b2f-b23c-4374-ab8c-0777651a7092';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:60000ba7-aaf5-4c9c-ae3b-9b5699180953:sit", "tags": [], "situation": {"en": "Looking away is the mechanism. Keeping it in continuous sight may not be possible."}, "stance": {"en": "Does not look away. Does not blink. Moves toward the nearest threshold — a door, a crossroads, running water."}}]$interactive$::jsonb
WHERE id = 'cnt:60000ba7-aaf5-4c9c-ae3b-9b5699180953';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:616aacce-5834-4161-876d-dfe2e7de64c4:sit", "tags": [], "situation": {"en": "Dúnedain meeting in numbers and in haste means a circuit has found something that requires more than one Ranger."}, "stance": {"en": "Does not enter. Notes the horse-count and condition. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:616aacce-5834-4161-876d-dfe2e7de64c4';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:6261f906-20e1-47f2-8d63-4dbc5c897ba2:sit", "tags": [], "situation": {"en": "Three minutes before the colony arrives. Two of those minutes have already passed."}, "stance": {"en": "Moves off the path at ninety degrees. Fast. Downwind."}}]$interactive$::jsonb
WHERE id = 'cnt:6261f906-20e1-47f2-8d63-4dbc5c897ba2';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:6400eadd-01e1-42bb-9d5b-7b64c0a4aef1:sit", "tags": [], "situation": {"en": "He knows what those marks mean. She knows what those marks mean. They are possibly the only two on this road who do."}, "stance": {"en": "Stops. Looks at the staff without pointing at it. Then meets his eyes."}}]$interactive$::jsonb
WHERE id = 'cnt:6400eadd-01e1-42bb-9d5b-7b64c0a4aef1';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:64127b82-7198-4ecd-8c9c-985cb107cc43:sit", "tags": [], "situation": {"en": "The Man is doing a job. The orc behind him knows what she is and is deciding whether to say so to the Man."}, "stance": {"en": "Keeps her attention on the Man. Does not look at the orc."}}]$interactive$::jsonb
WHERE id = 'cnt:64127b82-7198-4ecd-8c9c-985cb107cc43';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:64f8bc5e-7a4a-46c3-a065-7707298b2207:sit", "tags": [], "situation": {"en": "They know this forest better than anyone. When people who know a forest this well close a track, the reason is real."}, "stance": {"en": "Asks what they have seen. Gets a partial answer."}}]$interactive$::jsonb
WHERE id = 'cnt:64f8bc5e-7a4a-46c3-a065-7707298b2207';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:651fff04-f169-4d58-8188-9e7b0ebf0c89:sit", "tags": [], "situation": {"en": "Half-orcs. She is looking for a half-orc who used the road as cover."}, "stance": {"en": "Describes the mercenary from the wayhouse two days back. Watches her recognize it."}}]$interactive$::jsonb
WHERE id = 'cnt:651fff04-f169-4d58-8188-9e7b0ebf0c89';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:65ce9399-1a79-403a-b90d-c00579498e1d:sit", "tags": [], "situation": {"en": "An armed gathering of Northmen that the traveller did not know was here means information has been moving through this region that did not reach the road."}, "stance": {"en": "Does not approach. Notes the number and the directions the horses came from."}}]$interactive$::jsonb
WHERE id = 'cnt:65ce9399-1a79-403a-b90d-c00579498e1d';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:6605ceee-a9fb-46ae-a65e-879a991b2a20:sit", "tags": [], "situation": {"en": "He made a decision. He decided not to interact. The reason is his own."}, "stance": {"en": "Continues without stopping. Does not interpret the withdrawal as hostile."}}]$interactive$::jsonb
WHERE id = 'cnt:6605ceee-a9fb-46ae-a65e-879a991b2a20';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:663552a2-0794-49ae-84d5-a179424c0c68:sit", "tags": [], "situation": {"en": "Nothing is wrong here. The normalcy is its own information about the road recently travelled."}, "stance": {"en": "Passes through without stopping. Reads the settlement's mood as a road-condition report."}}]$interactive$::jsonb
WHERE id = 'cnt:663552a2-0794-49ae-84d5-a179424c0c68';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:66548a9d-d032-42da-a216-bf8a716ce79d:sit", "tags": [], "situation": {"en": "He is asking before taking. This is as much courtesy as Stone-trolls offer."}, "stance": {"en": "Names what can be spared. Gives it over. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:66548a9d-d032-42da-a216-bf8a716ce79d';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:67598ec0-a227-4955-8a4c-fedcce5cfa0d:sit", "tags": [], "situation": {"en": "It was heading north. The road ahead goes north."}, "stance": {"en": "Notes the direction. Notes the approximate size. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:67598ec0-a227-4955-8a4c-fedcce5cfa0d';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:678e6849-a392-45f0-a7b1-c3d184a1c594:sit", "tags": [], "situation": {"en": "He is being assessed from cover. The assessment determines what the road ahead costs him."}, "stance": {"en": "Takes the western branch at the split. Watches them disappear from the eastern treeline."}}]$interactive$::jsonb
WHERE id = 'cnt:678e6849-a392-45f0-a7b1-c3d184a1c594';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:6805699b-c80f-4a07-adf5-ad2a85cb8dde:sit", "tags": [], "situation": {"en": "Trade caravans with defensive escorts mean the road is not completely safe. But they are also moving, which means it is not completely unsafe."}, "stance": {"en": "Notes the direction and escort configuration. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:6805699b-c80f-4a07-adf5-ad2a85cb8dde';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:6820e9c9-610b-4767-91e3-300f1ed298b9:sit", "tags": [], "situation": {"en": "The path is gone here. The way around requires going fifty metres off-track into steep ground."}, "stance": {"en": "Steps back from the crumbling edge. Goes around. Does not hurry — the ground here is clearly not reliable."}}]$interactive$::jsonb
WHERE id = 'cnt:6820e9c9-610b-4767-91e3-300f1ed298b9';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:68ca394e-67f0-42c8-871a-421437d0868a:sit", "tags": [], "situation": {"en": "A night spent here costs a small coin and restores something that cannot be easily named."}, "stance": {"en": "Weighs the coin against the miles left in the day. Trades the road news owed at the door. Marks the lamp for the road back."}, "options": [{"id": "stay", "label": "Take the bed — a small coin", "tags": ["need:exhaustion", "need:hunger", "need:unrest"], "commands": [{"type": "overnight_shelter", "name": "the wayhouse", "description": "a lamp lit for whoever comes in off the road", "indoor": true, "lodging_cost": 5, "meal": true, "rest_quality": 4, "shadow_effect": -2}], "stance": "Takes the bed. Eats what the pot offers. The coin is spent without regret."}, {"id": "move_on", "label": "Mark the lamp and keep to the road", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:68ca394e-67f0-42c8-871a-421437d0868a';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:68fe1be2-82e2-42c5-8491-77f5da09b968:sit", "tags": [], "situation": {"en": "They live so entirely in the immediate that the weight she carries does not register on them. She is briefly just a person near a fire."}, "stance": {"en": "Sits down at the edge of the fire uninvited. Nobody objects."}}]$interactive$::jsonb
WHERE id = 'cnt:68fe1be2-82e2-42c5-8491-77f5da09b968';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:69262165-23b1-4df7-b30d-5bf2e92d9f78:sit", "tags": [], "situation": {"en": "She does not respond to it. Responding confirms the contact. She has been doing this long enough to know that."}, "stance": {"en": "Does not look south-east. Does not acknowledge. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:69262165-23b1-4df7-b30d-5bf2e92d9f78';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:69299021-61df-4c79-a280-4f9c50cbfce0:sit", "tags": [], "situation": {"en": "A useful read on the region."}, "stance": {"en": "Notes the condition of the horses. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:69299021-61df-4c79-a280-4f9c50cbfce0';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:6934d31f-0307-4b9b-8dab-fc606781dc59:sit", "tags": [], "situation": {"en": "She died before Celebrian came to this road. She has been at this crossroads since. The husband she is waiting for is dust."}, "stance": {"en": "Tells her which road leads east. Does not tell her the rest."}}]$interactive$::jsonb
WHERE id = 'cnt:6934d31f-0307-4b9b-8dab-fc606781dc59';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:69a39e8b-cfaf-4c5f-ba59-f2e0373cc42e:sit", "tags": [], "situation": {"en": "They are deciding whether the traveller is worth the effort of the snowfield between them."}, "stance": {"en": "Does not run. Running on a snowfield goes badly. Continues at the same pace."}}]$interactive$::jsonb
WHERE id = 'cnt:69a39e8b-cfaf-4c5f-ba59-f2e0373cc42e';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:6a8f0427-386d-487a-985b-39734b40f893:sit", "tags": [], "situation": {"en": "He is not avoiding the traveller. He is avoiding the road itself, or something on it behind the traveller."}, "stance": {"en": "Notes the direction he went. Notes the direction he was watching."}}]$interactive$::jsonb
WHERE id = 'cnt:6a8f0427-386d-487a-985b-39734b40f893';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:6c00caf3-d344-405a-af67-95be303eec0e:sit", "tags": [], "situation": {"en": "The pass the traveller needs goes under those crags."}, "stance": {"en": "Watches where it goes. Times the crossing of the open ground."}}]$interactive$::jsonb
WHERE id = 'cnt:6c00caf3-d344-405a-af67-95be303eec0e';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:6c6a5c0e-cc7a-4114-986b-1b1d7b375543:sit", "tags": [], "situation": {"en": "They are binding themselves to something. When the Daen Iontis bind themselves, it becomes a military problem within months."}, "stance": {"en": "Maps the location. Continues. This goes in the next report."}}]$interactive$::jsonb
WHERE id = 'cnt:6c6a5c0e-cc7a-4114-986b-1b1d7b375543';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:6c77b940-96d2-4acb-84d1-b6749482fcdf:sit", "tags": [], "situation": {"en": "He is not asking to rob it. He genuinely wants a good knife. The previous man gave it to him voluntarily. The memory is oddly specific."}, "stance": {"en": "Thinks about what he can spare. Considers what walking out of the Trollshaws is worth."}}]$interactive$::jsonb
WHERE id = 'cnt:6c77b940-96d2-4acb-84d1-b6749482fcdf';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:6cf7f0fe-3aee-402f-9ebb-1a9a981034c8:sit", "tags": [], "situation": {"en": "The decision will happen. It is happening now. The window where walking away is still possible is brief."}, "stance": {"en": "Does not run. Does not approach. Holds position. Makes the size of the decision as clear as possible."}}]$interactive$::jsonb
WHERE id = 'cnt:6cf7f0fe-3aee-402f-9ebb-1a9a981034c8';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:6ddc2925-1860-4e53-ace9-d3e854ea74ff:sit", "tags": [], "situation": {"en": "Something large enough to pull down a nest this size either wanted the grubs or didn't notice it. Neither is reassuring."}, "stance": {"en": "Gives the dispersed stragglers a wide berth. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:6ddc2925-1860-4e53-ace9-d3e854ea74ff';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:6e2a8a08-7be2-4f9a-95cc-584d2c976eaa:sit", "tags": [], "situation": {"en": "People have crossed here before — there are marks on the verge where travelers pushed through. The marks are old."}, "stance": {"en": "Tests each step. Moves to the verge when the road softens. Takes twice the time."}}]$interactive$::jsonb
WHERE id = 'cnt:6e2a8a08-7be2-4f9a-95cc-584d2c976eaa';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:6f28ff13-c880-4596-a628-a08cc86e8f5c:sit", "tags": [], "situation": {"en": "The sergeant is not hostile — he is following procedure. The procedure may lead somewhere the traveller does not want to go."}, "stance": {"en": "Does not run. Asks to read the order."}}]$interactive$::jsonb
WHERE id = 'cnt:6f28ff13-c880-4596-a628-a08cc86e8f5c';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:6f34d86c-c5df-4595-a228-6a3d6e9f8132:sit", "tags": [], "situation": {"en": "Three Stone-trolls who understand tactics are qualitatively different from three Stone-trolls who argue about cooking."}, "stance": {"en": "Does not freeze. Identifies the weakest corner. Moves toward it."}}]$interactive$::jsonb
WHERE id = 'cnt:6f34d86c-c5df-4595-a228-6a3d6e9f8132';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:6f487255-2430-46f0-9c24-83dd0905f1ec:sit", "tags": [], "situation": {"en": "It knows about the Rangers. Not this Ranger specifically — the Rangers as a category of thing it has observed."}, "stance": {"en": "Confirms it. Asks what the Ents have seen on the eastern edge recently."}}]$interactive$::jsonb
WHERE id = 'cnt:6f487255-2430-46f0-9c24-83dd0905f1ec';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:6fd9ac1b-f80a-4b13-aac7-117d61bd4794:sit", "tags": [], "situation": {"en": "The indifference is a good sign. A habituated, well-fed bear in berry season is the least dangerous version of a bear encounter."}, "stance": {"en": "Continues at the same pace. Does not make eye contact. Does not run."}}]$interactive$::jsonb
WHERE id = 'cnt:6fd9ac1b-f80a-4b13-aac7-117d61bd4794';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:7167d9b5-f681-40da-9f4f-fb45e44e3f9d:sit", "tags": [], "situation": {"en": "He is a Bree-lander — he does not scare easily. He is scared."}, "stance": {"en": "Asks what kind of questions. Gets: who came through recently and which way they went."}}]$interactive$::jsonb
WHERE id = 'cnt:7167d9b5-f681-40da-9f4f-fb45e44e3f9d';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:71d1042e-bbef-42b4-81b2-3665ca343eaf:sit", "tags": [], "situation": {"en": "Otters in good numbers mean the river is healthy — clean water, good fish, no upstream disruption."}, "stance": {"en": "Notes the health of the river. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:71d1042e-bbef-42b4-81b2-3665ca343eaf';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:71fc3a30-9e89-4f1c-a877-c75beb5d0037:sit", "tags": [], "situation": {"en": "The emptiness is recent — the bird-droppings on the rocks show last week's activity, nothing this week."}, "stance": {"en": "Does not fish here. Does not fill water from this stretch. Moves on."}}]$interactive$::jsonb
WHERE id = 'cnt:71fc3a30-9e89-4f1c-a877-c75beb5d0037';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:721d8397-bffb-4f49-b7e0-00389579b630:sit", "tags": [], "situation": {"en": "Looking at it directly does not stop it. Not looking at it is worse."}, "stance": {"en": "Keeps it in sight. Moves toward open ground where the air is different."}}]$interactive$::jsonb
WHERE id = 'cnt:721d8397-bffb-4f49-b7e0-00389579b630';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:72c7435b-d968-48fc-ba6a-481d82180d40:sit", "tags": [], "situation": {"en": "She has something he needs and is willing to deal. The deal is information for information."}, "stance": {"en": "Names what he knows from the north. Watches her decide if it is enough."}}]$interactive$::jsonb
WHERE id = 'cnt:72c7435b-d968-48fc-ba6a-481d82180d40';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:7343f32b-9924-4dca-a48d-86d0460c758f:sit", "tags": [], "situation": {"en": "The other one is circling. The circling is the real danger."}, "stance": {"en": "Does not look at the circling one. Keeps eyes on the one that spoke."}}]$interactive$::jsonb
WHERE id = 'cnt:7343f32b-9924-4dca-a48d-86d0460c758f';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:73ee692a-b760-4497-9129-507618bd848c:sit", "tags": [], "situation": {"en": "She has lived through ages beyond counting and a hobbit's abandoned lunch is briefly, absurdly touching."}, "stance": {"en": "Picks up the apple. Sets it on a stone off the road so it is findable. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:73ee692a-b760-4497-9129-507618bd848c';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:747af644-cb74-4af4-b112-ef1bec368f55:sit", "tags": [], "situation": {"en": "The pass ahead narrows. Whatever is above is still above."}, "stance": {"en": "Does not respond. Moves through the narrows quickly."}}]$interactive$::jsonb
WHERE id = 'cnt:747af644-cb74-4af4-b112-ef1bec368f55';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:74bfe262-03c6-4dfa-9a84-e2ddb68f8554:sit", "tags": [], "situation": {"en": "A village that stops talking when a stranger approaches and resumes when they pass is a village sitting on something."}, "stance": {"en": "Does not stop. Notes the behavior. Takes it with them."}}]$interactive$::jsonb
WHERE id = 'cnt:74bfe262-03c6-4dfa-9a84-e2ddb68f8554';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:74e78551-5d07-4a6a-9b77-fddd5785bf04:sit", "tags": [], "situation": {"en": "It knows who he is. It has taken the time to know who he is. That is not a good sign."}, "stance": {"en": "Answers with his name said back at it. Watches whether that matters."}}]$interactive$::jsonb
WHERE id = 'cnt:74e78551-5d07-4a6a-9b77-fddd5785bf04';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:754f4d84-936d-4543-942d-b9b616105ec8:sit", "tags": [], "situation": {"en": "It corrects itself after a moment. That moment was not nothing."}, "stance": {"en": "Does not look directly at the place the shadow bent. Keeps moving."}}]$interactive$::jsonb
WHERE id = 'cnt:754f4d84-936d-4543-942d-b9b616105ec8';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:756abfb9-c9c2-49c5-a703-83aefe010ade:sit", "tags": [], "situation": {"en": "Dawn is five hours away. The road goes around the fire on the right side if done quietly."}, "stance": {"en": "Does not step on anything. Goes around."}}]$interactive$::jsonb
WHERE id = 'cnt:756abfb9-c9c2-49c5-a703-83aefe010ade';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:7606a4fc-5828-4450-9e47-9392b6981ec3:sit", "tags": [], "situation": {"en": "This is a tactical problem with a tactical solution. He does not need to fight them."}, "stance": {"en": "Takes the ford upstream. Adds an hour. They never know he was there."}}]$interactive$::jsonb
WHERE id = 'cnt:7606a4fc-5828-4450-9e47-9392b6981ec3';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:7618df16-2232-4650-8fa9-1396a9994596:sit", "tags": [], "situation": {"en": "It is not dangerous to stop here. It is uncomfortable in a way that has nothing to do with physical danger."}, "stance": {"en": "Does not stop under the gate-arch. Passes it on the open side."}}]$interactive$::jsonb
WHERE id = 'cnt:7618df16-2232-4650-8fa9-1396a9994596';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:7619b755-3ade-43d4-aa96-95884dba3da7:sit", "tags": [], "situation": {"en": "She has not received a letter from the Havens in a very long time."}, "stance": {"en": "Takes the letter. Does not open it while he watches."}}]$interactive$::jsonb
WHERE id = 'cnt:7619b755-3ade-43d4-aa96-95884dba3da7';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:77053995-9559-48e6-b682-783295c647ef:sit", "tags": [], "situation": {"en": "Old battleground, perhaps. Or something was buried here. Or the shadow of something passed over it once and the ground remembers."}, "stance": {"en": "Does not investigate. Passes through it quickly."}}]$interactive$::jsonb
WHERE id = 'cnt:77053995-9559-48e6-b682-783295c647ef';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:7706ef7e-3b50-4f94-997f-8054fc86ec9e:sit", "tags": [], "situation": {"en": "She is not going to walk past."}, "stance": {"en": "Goes down to the road."}}]$interactive$::jsonb
WHERE id = 'cnt:7706ef7e-3b50-4f94-997f-8054fc86ec9e';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:77a71537-4faf-4904-afb2-fa9ff25fd13e:sit", "tags": [], "situation": {"en": "They are occupied. Interrupting would gain him nothing. But knowing they are on this road means something."}, "stance": {"en": "Watches from respectful distance. Does not interrupt. Continues with the information filed."}}]$interactive$::jsonb
WHERE id = 'cnt:77a71537-4faf-4904-afb2-fa9ff25fd13e';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:77af4681-1530-45df-89eb-7e3cb1aafeaf:sit", "tags": [], "situation": {"en": "The message is orderly. The instruction is reasonable enough to follow. That is what makes it worse than a simple ambush."}, "stance": {"en": "Stops. Asks on whose authority."}}]$interactive$::jsonb
WHERE id = 'cnt:77af4681-1530-45df-89eb-7e3cb1aafeaf';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:77bd5749-c44e-4d99-8246-16a393a4c893:sit", "tags": [], "situation": {"en": "The ghost is not threatening him. It is warning him. The distinction is the most unsettling part."}, "stance": {"en": "Asks it what is on this road."}}]$interactive$::jsonb
WHERE id = 'cnt:77bd5749-c44e-4d99-8246-16a393a4c893';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:7879367d-fa03-4261-bf15-2950b3ddb713:sit", "tags": [], "situation": {"en": "They have found something they do not understand and are building a belief system around it. The belief system will cause deaths."}, "stance": {"en": "Passes without acknowledging. What they are doing is not her concern. What they will do because of it may be."}}]$interactive$::jsonb
WHERE id = 'cnt:7879367d-fa03-4261-bf15-2950b3ddb713';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:788b8c5f-c022-4d63-b7e0-a60aa7e3d6de:sit", "tags": [], "situation": {"en": "They are trapped between two fears and they have chosen stillness over either direction."}, "stance": {"en": "Does not try to convince them to move. Asks what is on the road ahead."}}]$interactive$::jsonb
WHERE id = 'cnt:788b8c5f-c022-4d63-b7e0-a60aa7e3d6de';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:78c9a325-3ebe-484e-8dd2-2e53f034af5e:sit", "tags": [], "situation": {"en": "It has been patient for three hours. Its patience has run out."}, "stance": {"en": "Does not run. Running is its preferred prey-state. Stops and faces it."}}]$interactive$::jsonb
WHERE id = 'cnt:78c9a325-3ebe-484e-8dd2-2e53f034af5e';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:78ec1b9e-2df3-4772-9be2-ea92e4c45e8e:sit", "tags": [], "situation": {"en": "He is not ashamed of not wanting to go alone. He is being practical."}, "stance": {"en": "Asks what the schedule is. Goes with him."}}]$interactive$::jsonb
WHERE id = 'cnt:78ec1b9e-2df3-4772-9be2-ea92e4c45e8e';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:795bce09-9970-4be3-bb78-9c1a16124596:sit", "tags": [], "situation": {"en": "Nothing threatening here. The Shire is close, or a Hobbit community is."}, "stance": {"en": "Notes the direction. If the road leads that way, good hospitality may follow."}}]$interactive$::jsonb
WHERE id = 'cnt:795bce09-9970-4be3-bb78-9c1a16124596';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:7ba1a3ef-590e-4a83-bb71-4cdca5d1a7d3:sit", "tags": [], "situation": {"en": "Whatever it is, it is waiting for something — a change in terrain, a moment of inattention, a decision to stop."}, "stance": {"en": "Does not stop. Does not look back directly. Moves onto open ground where the follower will have to cross open space to close the distance."}}]$interactive$::jsonb
WHERE id = 'cnt:7ba1a3ef-590e-4a83-bb71-4cdca5d1a7d3';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:7ba1ddf6-f2f0-442d-936c-6be56fdf4ce7:sit", "tags": [], "situation": {"en": "It knows what she is and what she chose and it is using that choice against her."}, "stance": {"en": "Answers it in the same tongue. Says: so should you."}}]$interactive$::jsonb
WHERE id = 'cnt:7ba1ddf6-f2f0-442d-936c-6be56fdf4ce7';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:7bedd435-2f2e-4f34-96b4-37b238bff6bb:sit", "tags": [], "situation": {"en": "He is not certain Aranath knows. He is asking by telling him."}, "stance": {"en": "Asks what the old protocols were. Gets an answer he half-remembers."}}]$interactive$::jsonb
WHERE id = 'cnt:7bedd435-2f2e-4f34-96b4-37b238bff6bb';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:7c097e18-ed29-4f06-b7f9-8b14884697e6:sit", "tags": [], "situation": {"en": "He is not afraid. He is curious in the way of someone who has catalogued every dangerous thing in this valley and found one he has not catalogued yet."}, "stance": {"en": "Tells him what the southern road looked like at night."}}]$interactive$::jsonb
WHERE id = 'cnt:7c097e18-ed29-4f06-b7f9-8b14884697e6';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:7c6adbfd-7b5e-483f-a952-0a94337537c1:sit", "tags": [], "situation": {"en": "The procedure is real and the sergeant is competent. The answer will be recorded and reported."}, "stance": {"en": "Gives the honest road report. Notes what they are specifically interested in."}}]$interactive$::jsonb
WHERE id = 'cnt:7c6adbfd-7b5e-483f-a952-0a94337537c1';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:7d4b39bc-1bc0-4a9d-9d8a-df6474ff504c:sit", "tags": [], "situation": {"en": "The road is still technically passable. The word technically is doing a great deal of work."}, "stance": {"en": "Tests the edge with a stick. Crosses close to the high side where the ground is more solid."}}]$interactive$::jsonb
WHERE id = 'cnt:7d4b39bc-1bc0-4a9d-9d8a-df6474ff504c';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:7d8d519b-6fd9-46fb-bdb6-ad8bd9f2bdf0:sit", "tags": [], "situation": {"en": "She is not afraid of three Corsairs. He cannot know this yet. What he can see is that she has not moved and has not looked away from him."}, "stance": {"en": "Has already counted them and identified what each of them will do. Waits for his decision."}}]$interactive$::jsonb
WHERE id = 'cnt:7d8d519b-6fd9-46fb-bdb6-ad8bd9f2bdf0';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:7e24a5e7-b1f3-49f1-8060-4fc90a06b0d8:sit", "tags": [], "situation": {"en": "He is on claimed ground. The claim will be enforced if he is seen on it."}, "stance": {"en": "Reads the territorial mark. Adjusts the route to skirt the claim."}}]$interactive$::jsonb
WHERE id = 'cnt:7e24a5e7-b1f3-49f1-8060-4fc90a06b0d8';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:7e974812-07a8-4edf-af25-0c5a1843783b:sit", "tags": [], "situation": {"en": "The fireflies are the evening news: nothing alarming, air is clean, moisture is good."}, "stance": {"en": "Watches them for a moment. Sets up camp."}}]$interactive$::jsonb
WHERE id = 'cnt:7e974812-07a8-4edf-af25-0c5a1843783b';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:7ec69621-0aef-43ae-9b53-112e0aa2e870:sit", "tags": [], "situation": {"en": "The animal intelligence is specific and accurate. The information about what disturbed the nest is more useful than he realizes he has given."}, "stance": {"en": "Asks what two-footed thing moves at night for three nights in the same area."}}]$interactive$::jsonb
WHERE id = 'cnt:7ec69621-0aef-43ae-9b53-112e0aa2e870';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:7ed42d71-f6dd-4530-8df4-fce39cfa3ae7:sit", "tags": [], "situation": {"en": "He does not know what he is looking for precisely. She is clearly old enough to be what the report describes. He is deciding if challenging her is worth it."}, "stance": {"en": "Lets him decide. Does not help him decide."}}]$interactive$::jsonb
WHERE id = 'cnt:7ed42d71-f6dd-4530-8df4-fce39cfa3ae7';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:7f1c514b-1ae1-4546-ada4-59a516725faa:sit", "tags": [], "situation": {"en": "He knows that name. That name should be known only by those who were there when it was given. She was there. He was not."}, "stance": {"en": "Asks him where he heard that name. The answer is worse than any she would have constructed herself."}}]$interactive$::jsonb
WHERE id = 'cnt:7f1c514b-1ae1-4546-ada4-59a516725faa';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:7f53ddb7-3b2f-4a64-8841-fdfcd3f4efcd:sit", "tags": [], "situation": {"en": "The description matches someone the traveller may or may not have seen. The sergeant does not know this."}, "stance": {"en": "Thinks through the recent road. Gives an honest answer."}}]$interactive$::jsonb
WHERE id = 'cnt:7f53ddb7-3b2f-4a64-8841-fdfcd3f4efcd';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:7fd311be-3d8c-4e49-a624-4a634081a994:sit", "tags": [], "situation": {"en": "Smoke to the north that nobody can explain and a village watching the road with attention is a village that already suspects something."}, "stance": {"en": "Tells them what the northern road looked like."}}]$interactive$::jsonb
WHERE id = 'cnt:7fd311be-3d8c-4e49-a624-4a634081a994';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:800c0c70-c896-4056-8153-cbe0851003bf:sit", "tags": [], "situation": {"en": "The risk is real but brief. The alternative is a long detour."}, "stance": {"en": "Crosses fast, under the overhang, without stopping."}}]$interactive$::jsonb
WHERE id = 'cnt:800c0c70-c896-4056-8153-cbe0851003bf';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:8109ae88-afbc-46c0-b907-3e41bebc1e26:sit", "tags": [], "situation": {"en": "Riders moving parallel to the road in this direction may converge with it further on."}, "stance": {"en": "Notes the direction. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:8109ae88-afbc-46c0-b907-3e41bebc1e26';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:81c20d0f-c33a-44cf-abd8-1694e94183da:sit", "tags": [], "situation": {"en": "She has not seen one of those tokens in ages beyond counting. Its presence here, in T.A. 1950, worn by a Wose in Minhiriath, is something that requires more thought than she can give it right now."}, "stance": {"en": "Does not react to the token. Gives them the old sign. Waits."}}]$interactive$::jsonb
WHERE id = 'cnt:81c20d0f-c33a-44cf-abd8-1694e94183da';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:8297a25e-b394-401d-a486-16988b0d90f5:sit", "tags": [], "situation": {"en": "The merchant does not want to be on this road long enough to explain himself."}, "stance": {"en": "Notes the junction. Notes the direction."}}]$interactive$::jsonb
WHERE id = 'cnt:8297a25e-b394-401d-a486-16988b0d90f5';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:83829eb6-599b-41c4-bfa2-04da8025498d:sit", "tags": [], "situation": {"en": "The speed of their departure is its own description."}, "stance": {"en": "Notes the direction they came from. Continues north."}}]$interactive$::jsonb
WHERE id = 'cnt:83829eb6-599b-41c4-bfa2-04da8025498d';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:83a47cba-9f5c-40dc-af03-ef040c0b3042:sit", "tags": [], "situation": {"en": "The watching is benign. It is the watching of someone who will describe this to seven people tonight."}, "stance": {"en": "Returns the look. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:83a47cba-9f5c-40dc-af03-ef040c0b3042';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:8404ac09-c04b-431c-8f4f-e9b3d49d2073:sit", "tags": [], "situation": {"en": "They know about the ford. Whether they will say depends entirely on how he asks."}, "stance": {"en": "Asks about the ford. Gets an answer, with conditions attached."}}]$interactive$::jsonb
WHERE id = 'cnt:8404ac09-c04b-431c-8f4f-e9b3d49d2073';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:8488e34c-ca87-4f43-a79d-24ab2e67bb04:sit", "tags": [], "situation": {"en": "They are passing as human. They are nearly doing it successfully."}, "stance": {"en": "Notes what is wrong about the face. Does not indicate it. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:8488e34c-ca87-4f43-a79d-24ab2e67bb04';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:84b39d55-abad-48bc-b9de-f8e340377e20:sit", "tags": [], "situation": {"en": "He is big and armed on their road. That is enough. He does not need to be a threat to be a problem."}, "stance": {"en": "Does not slow. Does not make eye contact with the face in the bracken. Passes at normal pace."}}]$interactive$::jsonb
WHERE id = 'cnt:84b39d55-abad-48bc-b9de-f8e340377e20';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:84d32587-f4d5-475d-9b85-50910ee49cc0:sit", "tags": [], "situation": {"en": "People who leave a road simultaneously and silently do it for one of two reasons. Either is worth knowing."}, "stance": {"en": "Stops. Reads the prints carefully. Notes the direction they went. Continues with awareness raised."}}]$interactive$::jsonb
WHERE id = 'cnt:84d32587-f4d5-475d-9b85-50910ee49cc0';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:85085423-9724-46b5-881d-6c474861830a:sit", "tags": [], "situation": {"en": "He is the third person today to have said something about the eastern road without stopping to elaborate."}, "stance": {"en": "Takes the ridge track."}}]$interactive$::jsonb
WHERE id = 'cnt:85085423-9724-46b5-881d-6c474861830a';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:87982532-ff51-4cf4-bb1a-4b2c1ce85d0a:sit", "tags": [], "situation": {"en": "Something very large is marking this path as its territory. The marks face the direction of travel."}, "stance": {"en": "Does not touch the marks. Continues. Moves quietly."}}]$interactive$::jsonb
WHERE id = 'cnt:87982532-ff51-4cf4-bb1a-4b2c1ce85d0a';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:88bf030f-6991-4b13-aeb3-8b5caf5a2502:sit", "tags": [], "situation": {"en": "Animals that watch roads from ridges without moving are worth taking note of. This one is not afraid of the road."}, "stance": {"en": "Notes the size and direction. Keeps moving."}}]$interactive$::jsonb
WHERE id = 'cnt:88bf030f-6991-4b13-aeb3-8b5caf5a2502';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:88e84f59-5f60-427e-8062-3b2af5586ef5:sit", "tags": [], "situation": {"en": "He wants to know if she has felt it too. He is asking because if she has not felt it, he can continue to dismiss it. If she has, he cannot."}, "stance": {"en": "Tells him what she has felt. Watches him decide what to do with the confirmation."}}]$interactive$::jsonb
WHERE id = 'cnt:88e84f59-5f60-427e-8062-3b2af5586ef5';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:892c635d-bef6-46d0-8a86-5615fb9f91da:sit", "tags": [], "situation": {"en": "Orc-sign above the tree-line means scouts, not raiders. Scouts report back."}, "stance": {"en": "Trades road information. Takes the Orc-sign."}}]$interactive$::jsonb
WHERE id = 'cnt:892c635d-bef6-46d0-8a86-5615fb9f91da';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:89ca1012-c9d9-42f9-8a7b-2116cea276f5:sit", "tags": [], "situation": {"en": "He has not seen Aranath. If he reports back, the road ahead is compromised. If he does not report back, the group he serves knows within hours."}, "stance": {"en": "Has three options. Runs the cost of each. Chooses the one that costs the road least."}}]$interactive$::jsonb
WHERE id = 'cnt:89ca1012-c9d9-42f9-8a7b-2116cea276f5';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:8a159438-c7d4-49b7-8ce1-a5278eebfc5a:sit", "tags": [], "situation": {"en": "Twenty soldiers moving on this road are not going somewhere unimportant."}, "stance": {"en": "Notes the direction. Considers whether the same road serves both purposes."}}]$interactive$::jsonb
WHERE id = 'cnt:8a159438-c7d4-49b7-8ce1-a5278eebfc5a';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:8b940ad0-b6fe-4ba2-92c6-9cb0fe2c85e3:sit", "tags": [], "situation": {"en": "A forest that is paying attention is a forest that has a reason to pay attention."}, "stance": {"en": "Moves through without stopping. Does not break anything."}}]$interactive$::jsonb
WHERE id = 'cnt:8b940ad0-b6fe-4ba2-92c6-9cb0fe2c85e3';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:8d0cb1e7-abee-4e9a-a6f9-9595fa87157f:sit", "tags": [], "situation": {"en": "They give him the information because he is Dúnedain and it concerns his land. Not a gift — what is done between those who watch the same darkness."}, "stance": {"en": "Receives the news. Thanks them in Sindarin. Watches their faces when he does."}}]$interactive$::jsonb
WHERE id = 'cnt:8d0cb1e7-abee-4e9a-a6f9-9595fa87157f';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:8df6e2ad-232d-4e87-bb35-8c00460ee6e4:sit", "tags": [], "situation": {"en": "Two seconds of real danger, then it is past. The path is narrower on the other side of the gap."}, "stance": {"en": "Pushes back hard. Finds the solid edge. Does not look down. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:8df6e2ad-232d-4e87-bb35-8c00460ee6e4';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:8df83305-fa14-4d5c-9cf5-436db0275425:sit", "tags": [], "situation": {"en": "Eight seconds is enough if used correctly."}, "stance": {"en": "Uses them correctly."}}]$interactive$::jsonb
WHERE id = 'cnt:8df83305-fa14-4d5c-9cf5-436db0275425';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:8dfe0b15-f7b5-47ff-819a-3353dd9a9f9b:sit", "tags": [], "situation": {"en": "Nothing is wrong here. The road through this region is stable."}, "stance": {"en": "Passes without stopping. Notes the horse-condition as a regional health indicator."}}]$interactive$::jsonb
WHERE id = 'cnt:8dfe0b15-f7b5-47ff-819a-3353dd9a9f9b';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:8e9b5e64-23a0-4c14-8829-9b057cddb079:sit", "tags": [], "situation": {"en": "Nothing hostile here. A functioning crossing is an opportunity for information."}, "stance": {"en": "Takes the ferry. Trades a coin for passage and road-news."}}]$interactive$::jsonb
WHERE id = 'cnt:8e9b5e64-23a0-4c14-8829-9b057cddb079';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:8ee3c909-e2e5-4640-b9de-7fab0c327120:sit", "tags": [], "situation": {"en": "Someone gave it instructions. Someone expected the road to be clear. The traveller is the problem in that plan."}, "stance": {"en": "Asks who said the road would be clear. Watches it decide whether to answer."}}]$interactive$::jsonb
WHERE id = 'cnt:8ee3c909-e2e5-4640-b9de-7fab0c327120';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:90f8a791-067a-4417-94f7-88ca03863cf4:sit", "tags": [], "situation": {"en": "Birds in mass flight tell the story of what is below them."}, "stance": {"en": "Reads the direction of the murmuration's drift. Continues with that information."}}]$interactive$::jsonb
WHERE id = 'cnt:90f8a791-067a-4417-94f7-88ca03863cf4';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:911aa104-9340-45d6-9675-6e9e3a0e63e7:sit", "tags": [], "situation": {"en": "He is asking a question and waiting for an answer. He is not going to move until he gets one. He is also blocking a road at night, which is its own problem regardless of his intentions."}, "stance": {"en": "Answers the question. Tells him the direction. Watches him go."}}]$interactive$::jsonb
WHERE id = 'cnt:911aa104-9340-45d6-9675-6e9e3a0e63e7';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:92017349-8c73-404e-9195-809171f8e6b0:sit", "tags": [], "situation": {"en": "A hawk hunting means the field is quiet. Nothing larger has disturbed it recently."}, "stance": {"en": "Notes the calm. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:92017349-8c73-404e-9195-809171f8e6b0';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:940e02d1-51f3-4bff-b96c-a2beb68ef386:sit", "tags": [], "situation": {"en": "Something happened here recently. The caution is fresh."}, "stance": {"en": "Does not approach the gate. Continues on the road past the village. Watches the faces watch."}}]$interactive$::jsonb
WHERE id = 'cnt:940e02d1-51f3-4bff-b96c-a2beb68ef386';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:9436d082-a432-4156-9925-41057129f49c:sit", "tags": [], "situation": {"en": "Fell-beasts have riders. The rider can see in darkness better than the traveller can."}, "stance": {"en": "Kills the fire. Does not move. Waits."}}]$interactive$::jsonb
WHERE id = 'cnt:9436d082-a432-4156-9925-41057129f49c';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:962120e6-6973-4c6c-856a-eee823ddd568:sit", "tags": [], "situation": {"en": "The marsh is clean and safe. The frogs are saying so loudly."}, "stance": {"en": "Notes the chorus. Uses the noise as a cover for their own movement."}}]$interactive$::jsonb
WHERE id = 'cnt:962120e6-6973-4c6c-856a-eee823ddd568';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:97d59925-1e6e-41bc-bfc7-da42a0d1842e:sit", "tags": [], "situation": {"en": "The road passes approximately a mile east of whatever it is watching."}, "stance": {"en": "Adjusts the route to pass east of the circling point."}}]$interactive$::jsonb
WHERE id = 'cnt:97d59925-1e6e-41bc-bfc7-da42a0d1842e';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:98ac0ce1-d02f-4196-979c-c965d3582401:sit", "tags": [], "situation": {"en": "The toll is fair. He is not going to negotiate but he is not going to threaten either. It is simply what the road costs here."}, "stance": {"en": "Pays the toll. Continues on a better road than most."}}]$interactive$::jsonb
WHERE id = 'cnt:98ac0ce1-d02f-4196-979c-c965d3582401';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:990d84f4-d138-44cf-880e-0db4e5c2ae29:sit", "tags": [], "situation": {"en": "The next shot will not be a ranging shot."}, "stance": {"en": "Does not stop. Does not run straight. Moves toward the nearest cover at an angle."}}]$interactive$::jsonb
WHERE id = 'cnt:990d84f4-d138-44cf-880e-0db4e5c2ae29';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:9a0833ee-b837-436a-a6f4-e6de4b988c5b:sit", "tags": [], "situation": {"en": "He wants Aranath on the northern circuit while he continues south. He cannot cover both and he does not trust anyone else he has met on this road in a month."}, "stance": {"en": "Runs the calculation of what the northern circuit costs in time. Then agrees."}}]$interactive$::jsonb
WHERE id = 'cnt:9a0833ee-b837-436a-a6f4-e6de4b988c5b';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:9a1e8a86-3578-4a4e-87f4-34c64797f594:sit", "tags": [], "situation": {"en": "Whatever the Witch-king wants from this road today, the traveller is now in the calculation."}, "stance": {"en": "Does not move. Does not flee. Waits for it to speak."}}]$interactive$::jsonb
WHERE id = 'cnt:9a1e8a86-3578-4a4e-87f4-34c64797f594';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:9a444f6c-c15f-4469-8b47-d27f36839b6d:sit", "tags": [], "situation": {"en": "It has not attacked. The constructs do not attack unless the boundary is crossed. The question is where the boundary is."}, "stance": {"en": "Does not cross the path. Goes around."}}]$interactive$::jsonb
WHERE id = 'cnt:9a444f6c-c15f-4469-8b47-d27f36839b6d';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:9aa81891-5eba-4955-b233-2bc44caf8ebd:sit", "tags": [], "situation": {"en": "She will not say who she is waiting for. The question is whether the traveller saw anyone on the road behind them."}, "stance": {"en": "Names the road. Describes who was on it. Lets her draw her own conclusions."}}]$interactive$::jsonb
WHERE id = 'cnt:9aa81891-5eba-4955-b233-2bc44caf8ebd';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:9ae1b4bb-5e10-4333-bb34-954b358efd60:sit", "tags": [], "situation": {"en": "Whatever made them leave fast enough to leave the animals — it was visible, not rumoured."}, "stance": {"en": "Does not enter. Notes the direction of the footprints leaving. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:9ae1b4bb-5e10-4333-bb34-954b358efd60';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:9c813861-c525-4a54-b097-d1eb4984022f:sit", "tags": [], "situation": {"en": "She has not seen that specific token in two thousand years. It should not be here. It is here."}, "stance": {"en": "Gives them the acknowledgment sign. Waits."}}]$interactive$::jsonb
WHERE id = 'cnt:9c813861-c525-4a54-b097-d1eb4984022f';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:9cf2e8cb-8905-479b-9646-a116ef3c58c1:sit", "tags": [], "situation": {"en": "Neither route is dangerous, only awkward. The road is clear on the far side."}, "stance": {"en": "Goes around the root-ball on the lower side where the ground is firmer."}}]$interactive$::jsonb
WHERE id = 'cnt:9cf2e8cb-8905-479b-9646-a116ef3c58c1';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:9d8e8cf1-a1c9-48bc-9587-236bb2a68e2e:sit", "tags": [], "situation": {"en": "They are scouts, not raiders. They are following to report, not to engage. Not yet."}, "stance": {"en": "Does not change pace. Changes route at the next junction."}}]$interactive$::jsonb
WHERE id = 'cnt:9d8e8cf1-a1c9-48bc-9587-236bb2a68e2e';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:9df27aa8-2391-403e-8ab4-2e9a96c073d9:sit", "tags": [], "situation": {"en": "A calendar observation as much as a wildlife encounter."}, "stance": {"en": "Notes the season in the body rather than the mind. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:9df27aa8-2391-403e-8ab4-2e9a96c073d9';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:9e4c107e-051c-4e07-9125-178e38e2b8d8:sit", "tags": [], "situation": {"en": "He has crossed a line — either geographically or politically — and has decided his best option is the official one."}, "stance": {"en": "Tells him where the nearest garrison is. Does not ask what he did."}}]$interactive$::jsonb
WHERE id = 'cnt:9e4c107e-051c-4e07-9125-178e38e2b8d8';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:9e5a73ad-dacb-475c-83d8-a36a63120281:sit", "tags": [], "situation": {"en": "They are asking the traveller if they came from the east. The question is genuine and the fear behind it is genuine."}, "stance": {"en": "Tells them what the eastern road looked like. Watches them receive it."}}]$interactive$::jsonb
WHERE id = 'cnt:9e5a73ad-dacb-475c-83d8-a36a63120281';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:9e7bd804-285a-4f74-9133-10a7cb4ee60d:sit", "tags": [], "situation": {"en": "This is a test. Reading the marks correctly may open something. Missing them closes it."}, "stance": {"en": "Stops. Looks at the marked stone. Then looks up at the watcher. Moves the stone to the secondary position. Waits."}}]$interactive$::jsonb
WHERE id = 'cnt:9e7bd804-285a-4f74-9133-10a7cb4ee60d';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:9e949237-1899-4d62-9863-ae436559e210:sit", "tags": [], "situation": {"en": "The information is more significant than his tone suggests. He knows this. He is telling the traveller because travelers carry information forward."}, "stance": {"en": "Asks what outside means."}}]$interactive$::jsonb
WHERE id = 'cnt:9e949237-1899-4d62-9863-ae436559e210';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:9eae7da7-7742-43b1-a587-0a89b18782b5:sit", "tags": [], "situation": {"en": "The shadow, perhaps. Or something that the boar could smell that the traveller cannot name."}, "stance": {"en": "Notes the encounter. Continues. Wonders what the boar smelled."}}]$interactive$::jsonb
WHERE id = 'cnt:9eae7da7-7742-43b1-a587-0a89b18782b5';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:9f968c79-4c43-4d99-889e-12f91e158629:sit", "tags": [], "situation": {"en": "Whatever fed here is still in the region. Elk this size are not easy prey."}, "stance": {"en": "Does not linger. Moves into denser cover and away from the open hillside."}}]$interactive$::jsonb
WHERE id = 'cnt:9f968c79-4c43-4d99-889e-12f91e158629';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:a0078a09-cb1b-42b6-ac80-83834bb4fafc:sit", "tags": [], "situation": {"en": "The coordination means the traveller was identified before they arrived here. The route was anticipated."}, "stance": {"en": "Asks who. Gets a title, not a name."}}]$interactive$::jsonb
WHERE id = 'cnt:a0078a09-cb1b-42b6-ac80-83834bb4fafc';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:a010f6fd-217d-4e4a-a32c-369a1e57e07f:sit", "tags": [], "situation": {"en": "It went up, not down. It is above the traveller on this cliff."}, "stance": {"en": "Moves away from the cliff-base. Does not look up."}}]$interactive$::jsonb
WHERE id = 'cnt:a010f6fd-217d-4e4a-a32c-369a1e57e07f';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:a08592dc-7a81-4b89-b592-82884fa7e359:sit", "tags": [], "situation": {"en": "Someone thought to leave the beam. It is still there. The traveller is glad of it."}, "stance": {"en": "Rests a while in the dry lee. Reads the road it is set to watch. Marks the overhang for a harder night."}, "options": [{"id": "stay", "label": "Make camp under the stone", "tags": ["need:exhaustion", "need:unrest"], "commands": [{"type": "overnight_shelter", "name": "the overhang", "description": "a dry lee above the road, fire-rings old as the path itself", "indoor": false, "lodging_cost": 0, "meal": false, "rest_quality": 3, "shadow_effect": -1}], "stance": "Makes camp under the stone. The beam serves as it was left to serve."}, {"id": "move_on", "label": "Rest a while, mark it, and move on", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:a08592dc-7a81-4b89-b592-82884fa7e359';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:a12ac888-3322-4c9f-8231-1faf1f1c94aa:sit", "tags": [], "situation": {"en": "Three young trolls about to start fighting over food is a window. The road goes around them on the right."}, "stance": {"en": "Takes the right side. Moves fast."}}]$interactive$::jsonb
WHERE id = 'cnt:a12ac888-3322-4c9f-8231-1faf1f1c94aa';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:a1e202be-e30a-4677-a6b5-11d2a6a55069:sit", "tags": [], "situation": {"en": "Normal caution. Nothing hostile. The farmstead is aware the traveller passed."}, "stance": {"en": "Continues. Does not approach the farmstead."}}]$interactive$::jsonb
WHERE id = 'cnt:a1e202be-e30a-4677-a6b5-11d2a6a55069';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:a22da3bf-f989-4bc9-90c8-7b4e92963d2a:sit", "tags": [], "situation": {"en": "They are telling the traveller because someone told them the same thing and it saved time. Road courtesy."}, "stance": {"en": "Thanks them. Notes the mill crossing."}}]$interactive$::jsonb
WHERE id = 'cnt:a22da3bf-f989-4bc9-90c8-7b4e92963d2a';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:a2adc79c-e22b-4486-b8d9-302db195680d:sit", "tags": [], "situation": {"en": "A breach in their network, reported to the only other Ranger he has trusted with it. The breach could mean desertion, capture, or something else entirely."}, "stance": {"en": "Does not fill the silence after. Lets the weight of the missing report sit between them."}}]$interactive$::jsonb
WHERE id = 'cnt:a2adc79c-e22b-4486-b8d9-302db195680d';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:a2c005ce-870d-4d1b-8d5c-1b654bf002c7:sit", "tags": [], "situation": {"en": "She is asking because she has run out of her own leads. This is unusual for a forest ranger."}, "stance": {"en": "Thinks back over the night road. Tells her what was unusual."}}]$interactive$::jsonb
WHERE id = 'cnt:a2c005ce-870d-4d1b-8d5c-1b654bf002c7';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:a376c3b9-67ce-46dc-9fa3-aa548b45b0ba:sit", "tags": [], "situation": {"en": "The roots are connected. What moves through one moves through all. The forest is aware of the traveller's passage in a way it has not been further back."}, "stance": {"en": "Does not stop. Does not make noise. Passes through without meeting the rhythm."}}]$interactive$::jsonb
WHERE id = 'cnt:a376c3b9-67ce-46dc-9fa3-aa548b45b0ba';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:a3bc2dbe-1167-460c-90bd-36bf3ea3b69c:sit", "tags": [], "situation": {"en": "She is afraid and trying not to show it. Saying it out loud makes it more real."}, "stance": {"en": "Lets the silence last a beat. Then: I know what those lights are. I will not tell you it is safe to go near them."}}]$interactive$::jsonb
WHERE id = 'cnt:a3bc2dbe-1167-460c-90bd-36bf3ea3b69c';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:a4585492-b353-4a72-a435-d1d628bdd7af:sit", "tags": [], "situation": {"en": "Stopping is the wrong answer. Stopping means it has time to drop."}, "stance": {"en": "Does not stop. Does not look up directly. Moves at a pace that says: aware but not afraid."}}]$interactive$::jsonb
WHERE id = 'cnt:a4585492-b353-4a72-a435-d1d628bdd7af';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:a53efd41-22ee-420f-a247-501f6705abc3:sit", "tags": [], "situation": {"en": "He needs someone to know. He is not asking for help — just for a witness."}, "stance": {"en": "Notes the direction and the duration. Continues north."}}]$interactive$::jsonb
WHERE id = 'cnt:a53efd41-22ee-420f-a247-501f6705abc3';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:a55bbc9f-b1ec-43ba-b53f-6f7134740658:sit", "tags": [], "situation": {"en": "The purpose that takes a disciplined patrol east on this road at dawn is worth knowing."}, "stance": {"en": "Notes the direction and discipline. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:a55bbc9f-b1ec-43ba-b53f-6f7134740658';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:a5a2ddee-368a-4cf2-b18a-48fa053f9c02:sit", "tags": [], "situation": {"en": "He is not going into the deep forest himself right now. He is saying this without embarrassment."}, "stance": {"en": "Asks what direction the disturbances are coming from."}}]$interactive$::jsonb
WHERE id = 'cnt:a5a2ddee-368a-4cf2-b18a-48fa053f9c02';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:a6ed0f26-d3cf-46be-94be-1ea32c443461:sit", "tags": [], "situation": {"en": "This is a weapon pointed at a road. The traveller is on the road."}, "stance": {"en": "Looks for what is behind it — what it is guarding. Then looks for the way around."}}]$interactive$::jsonb
WHERE id = 'cnt:a6ed0f26-d3cf-46be-94be-1ea32c443461';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:a7d8a484-61bd-4bb0-892a-09bdca08820f:sit", "tags": [], "situation": {"en": "Stability in the settlements means the road is safe. This is indirect evidence but it is evidence."}, "stance": {"en": "Notes the settlement's implied prosperity. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:a7d8a484-61bd-4bb0-892a-09bdca08820f';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:a971a406-e132-4aca-a0f4-bbd5695dae4d:sit", "tags": [], "situation": {"en": "He wants to know where armed men are, not merchants. Something on the road behind him."}, "stance": {"en": "Tells him the garrison direction. Asks what is on the road behind him."}}]$interactive$::jsonb
WHERE id = 'cnt:a971a406-e132-4aca-a0f4-bbd5695dae4d';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:a99d21ff-5cd8-4273-9fe2-c396bfcd9a97:sit", "tags": [], "situation": {"en": "He has been alone long enough that his judgement about people has compressed into very fast pattern-matching. He is checking the traveller against a pattern."}, "stance": {"en": "Stays still. Does not explain anything until asked."}}]$interactive$::jsonb
WHERE id = 'cnt:a99d21ff-5cd8-4273-9fe2-c396bfcd9a97';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:a9eee241-aaae-4865-8a20-9bb5b97a499f:sit", "tags": [], "situation": {"en": "It moved. Between when the traveller entered the valley and now, it moved here."}, "stance": {"en": "Studies it without approaching. Takes the western path. Does not go back the way it came."}}]$interactive$::jsonb
WHERE id = 'cnt:a9eee241-aaae-4865-8a20-9bb5b97a499f';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:aafe5f64-5905-4d82-a543-1432a8e32bb7:sit", "tags": [], "situation": {"en": "Fishermen who do not fish when the weather permits have seen something on the water worth not going near."}, "stance": {"en": "Does not approach the waterfront. Continues inland."}}]$interactive$::jsonb
WHERE id = 'cnt:aafe5f64-5905-4d82-a543-1432a8e32bb7';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:ab7b28e6-9418-45e9-a8f1-0ac17d948293:sit", "tags": [], "situation": {"en": "A quiet road ahead. The bees say so."}, "stance": {"en": "Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:ab7b28e6-9418-45e9-a8f1-0ac17d948293';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:ac5388e5-249c-4739-bf1f-fddc6f6c7b16:sit", "tags": [], "situation": {"en": "Nothing hostile. A working waterway means the route is open and commerce is moving."}, "stance": {"en": "Passes through. Notes what the cargo is and which direction it is going."}}]$interactive$::jsonb
WHERE id = 'cnt:ac5388e5-249c-4739-bf1f-fddc6f6c7b16';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:ac9fb43b-0dcc-4bbf-8e3c-383c29a8bb6c:sit", "tags": [], "situation": {"en": "They are a forward element. What they are waiting for is behind the traveller on this road."}, "stance": {"en": "Does not look up. Does not slow. Finds cover before the junction."}}]$interactive$::jsonb
WHERE id = 'cnt:ac9fb43b-0dcc-4bbf-8e3c-383c29a8bb6c';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:acaca425-d161-4ccf-accd-cf6aa21f9bb3:sit", "tags": [], "situation": {"en": "Aranath does not know what it is. He knows what it feels like and he knows what Rangers are told to do when a road feels like this: leave it and circle wide."}, "stance": {"en": "Marks the road on his mental map. Circles wide."}}]$interactive$::jsonb
WHERE id = 'cnt:acaca425-d161-4ccf-accd-cf6aa21f9bb3';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:af15eaef-6829-43b2-817a-fac3067718d5:sit", "tags": [], "situation": {"en": "A single wolf taking from a flock is normal. A wolf that moves south after is unusual."}, "stance": {"en": "Tells him what the southern road looked like."}}]$interactive$::jsonb
WHERE id = 'cnt:af15eaef-6829-43b2-817a-fac3067718d5';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:af2a2b22-574d-43aa-b9e8-5e249d5439fa:sit", "tags": [], "situation": {"en": "Something has happened on the road ahead that Gondor does not want known yet. The restriction is new."}, "stance": {"en": "Asks how long the restriction will last. The sergeant genuinely does not know."}}]$interactive$::jsonb
WHERE id = 'cnt:af2a2b22-574d-43aa-b9e8-5e249d5439fa';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:af2e455a-b521-485b-8098-ad085ca2c6f4:sit", "tags": [], "situation": {"en": "Active roads are safe roads. The horses confirm it."}, "stance": {"en": "Notes the herd's comfort. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:af2e455a-b521-485b-8098-ad085ca2c6f4';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:b0494970-8986-41ff-93c2-dceaae5a67f6:sit", "tags": [], "situation": {"en": "It will not move unless approached or disturbed. The gap between the rock and the road verge is sufficient."}, "stance": {"en": "Passes below the rock without approaching. The snake does not respond."}}]$interactive$::jsonb
WHERE id = 'cnt:b0494970-8986-41ff-93c2-dceaae5a67f6';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:b137d429-3502-4235-97b4-f538bff74fec:sit", "tags": [], "situation": {"en": "The gap is narrow. If one of them stood and moved to the cliff edge, the road would be directly below it."}, "stance": {"en": "Times the crossing. Moves when both are seated."}}]$interactive$::jsonb
WHERE id = 'cnt:b137d429-3502-4235-97b4-f538bff74fec';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:b160eeba-ef2b-4a50-ad75-91e164a3c36b:sit", "tags": [], "situation": {"en": "They are following a trail. The traveller may have been on the same road as whatever left it."}, "stance": {"en": "Names the time. Describes what was on the road. Lets the sergeant connect what he connects."}}]$interactive$::jsonb
WHERE id = 'cnt:b160eeba-ef2b-4a50-ad75-91e164a3c36b';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:b17bffba-9161-4447-8972-167248f1a763:sit", "tags": [], "situation": {"en": "Something taught these men a ritual from the First Age without giving them the meaning. That is not accidental."}, "stance": {"en": "Does not stop. Does not show recognition. Files it."}}]$interactive$::jsonb
WHERE id = 'cnt:b17bffba-9161-4447-8972-167248f1a763';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:b28f1d50-2251-439b-8248-671d597f47b8:sit", "tags": [], "situation": {"en": "Who removes a bridge and why is the question. The answer is somewhere upstream near the ford."}, "stance": {"en": "Does not cross. Turns upstream. Moves carefully."}}]$interactive$::jsonb
WHERE id = 'cnt:b28f1d50-2251-439b-8248-671d597f47b8';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:b2cd3ee2-d99b-4703-9543-c5f7006b2c6d:sit", "tags": [], "situation": {"en": "It is a ghost that has learned to wear a shape it found in her memory. Ghosts do not do this spontaneously."}, "stance": {"en": "Does not engage with the shape. Asks what it actually is."}}]$interactive$::jsonb
WHERE id = 'cnt:b2cd3ee2-d99b-4703-9543-c5f7006b2c6d';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:b31d8f92-2d8e-49cf-8ed9-43f39c9027e4:sit", "tags": [], "situation": {"en": "An Ent saying this is not hyperbole. It has comparative data spanning thousands of years."}, "stance": {"en": "Asks it: what does wrong smell like, specifically? What did it smell like in the second age?"}}]$interactive$::jsonb
WHERE id = 'cnt:b31d8f92-2d8e-49cf-8ed9-43f39c9027e4';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:b48a66d5-cdd0-49f0-8d56-fd2bc2adf8d1:sit", "tags": [], "situation": {"en": "Precise, practical, no wasted words. She has been doing this for twenty years and has no patience for anything that does not help her get her cloth to market."}, "stance": {"en": "Trades road conditions. Gets a detailed picture of the next three days."}}]$interactive$::jsonb
WHERE id = 'cnt:b48a66d5-cdd0-49f0-8d56-fd2bc2adf8d1';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:b52acf38-96aa-49e9-a26a-b1324bdd5835:sit", "tags": [], "situation": {"en": "It saw what it came to see. The traveller may or may not be what it was looking for."}, "stance": {"en": "Notes the direction it faced. Notes where it was standing on the boundary."}}]$interactive$::jsonb
WHERE id = 'cnt:b52acf38-96aa-49e9-a26a-b1324bdd5835';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:b644aeb9-f713-4321-8218-a1f4f8f66df5:sit", "tags": [], "situation": {"en": "The farm has a barn. The barn is dry. The farmer has news from the eastern road that the traveller has not come from."}, "stance": {"en": "Answers the raised hand. An hour at the fence trading road news — the barn stays an offer, the day is not done."}, "options": [{"id": "stay", "label": "Take the barn's dry corner", "tags": ["need:exhaustion", "need:hunger", "need:unrest"], "commands": [{"type": "overnight_shelter", "name": "the farmstead barn", "description": "a dry corner under the hay, the yard lamp long out", "indoor": true, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 3, "shadow_effect": -1}], "stance": "Takes the barn's dry corner. Shares the pot and the road's news until the lamp goes out."}, {"id": "move_on", "label": "Trade news at the fence and walk on", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:b644aeb9-f713-4321-8218-a1f4f8f66df5';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:b6e79ed5-7f71-4ae8-b888-d1ea7256c0e0:sit", "tags": [], "situation": {"en": "Exact, bounded, symmetrical. He will not give more than he gets and will not try to take more than offered."}, "stance": {"en": "Gives him the road conditions precisely. Watches him update a small book."}}]$interactive$::jsonb
WHERE id = 'cnt:b6e79ed5-7f71-4ae8-b888-d1ea7256c0e0';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:b899abfd-2281-4d74-a054-b9db11186092:sit", "tags": [], "situation": {"en": "Something reconstituted that banner. Something that remembers the Second Age well enough to reconstruct its symbols."}, "stance": {"en": "Files the banner. Continues. This is not a coincidence."}}]$interactive$::jsonb
WHERE id = 'cnt:b899abfd-2281-4d74-a054-b9db11186092';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:bae4fd5d-046e-4093-9d08-b42395009128:sit", "tags": [], "situation": {"en": "Dunlendings sort travellers by what they are, not who they are. The category matters here."}, "stance": {"en": "Names himself Dúnedain, not Gondorian. Watches their faces."}}]$interactive$::jsonb
WHERE id = 'cnt:bae4fd5d-046e-4093-9d08-b42395009128';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:bb296972-fb7b-4890-aae1-3428b54908b9:sit", "tags": [], "situation": {"en": "Driven animals mean something was behind them. The direction they came from is worth noting."}, "stance": {"en": "Reads the direction of the herd's arrival. Considers what was behind them."}}]$interactive$::jsonb
WHERE id = 'cnt:bb296972-fb7b-4890-aae1-3428b54908b9';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:bc4c1314-0cbb-4cdb-b7f9-7a2d31d50596:sit", "tags": [], "situation": {"en": "He is not afraid of whatever closed the shaft. He is annoyed by it because it means his survey is incomplete. He wants someone to know the shaft is sealed in case it matters to someone who understands these things."}, "stance": {"en": "Asks where the shaft is. Files it."}}]$interactive$::jsonb
WHERE id = 'cnt:bc4c1314-0cbb-4cdb-b7f9-7a2d31d50596';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:bc6c861e-d14b-4b6b-9082-e1d0ce7b4025:sit", "tags": [], "situation": {"en": "He is following orders, not impulse. She is an obstacle in his orders. The question is whether she is an obstacle worth the effort."}, "stance": {"en": "Asks whose road this is. Waits to see how he answers."}}]$interactive$::jsonb
WHERE id = 'cnt:bc6c861e-d14b-4b6b-9082-e1d0ce7b4025';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:bcdf2c28-4c0c-4823-853c-e065fc49bbb6:sit", "tags": [], "situation": {"en": "It has been watching this junction for a very long time."}, "stance": {"en": "Adds nothing to the marks. The tree has enough."}}]$interactive$::jsonb
WHERE id = 'cnt:bcdf2c28-4c0c-4823-853c-e065fc49bbb6';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:bcefb91a-eb9d-463f-b1f2-c9bc75154447:sit", "tags": [], "situation": {"en": "The Watcher in the Water is a name given to things like this. The name implies others have been watched from the same bank."}, "stance": {"en": "Moves away from the lake's edge. Takes the high path."}}]$interactive$::jsonb
WHERE id = 'cnt:bcefb91a-eb9d-463f-b1f2-c9bc75154447';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:be10e81d-96f4-4952-ac3c-8af340478c47:sit", "tags": [], "situation": {"en": "The withdrawal was fast and clean. Whatever it was, it knew how to move through this undergrowth."}, "stance": {"en": "Waits for the shaking to stop. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:be10e81d-96f4-4952-ac3c-8af340478c47';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:be8f7c53-e71a-458a-b2f6-b1c6cf10498f:sit", "tags": [], "situation": {"en": "He is doing a job and doing it correctly. The information about the bridge is a professional courtesy."}, "stance": {"en": "Answers the questions directly. Notes the bridge."}}]$interactive$::jsonb
WHERE id = 'cnt:be8f7c53-e71a-458a-b2f6-b1c6cf10498f';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:bef67f41-fe15-42d4-852f-367588e13df8:sit", "tags": [], "situation": {"en": "He is frightened enough to keep moving but not so frightened he said nothing."}, "stance": {"en": "Notes what he could not say clearly. Takes the western road."}}]$interactive$::jsonb
WHERE id = 'cnt:bef67f41-fe15-42d4-852f-367588e13df8';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:bf8a4b0f-ffc1-44e6-91e4-19265d33e5bf:sit", "tags": [], "situation": {"en": "Quiet road."}, "stance": {"en": "Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:bf8a4b0f-ffc1-44e6-91e4-19265d33e5bf';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c027c10f-aa48-4b29-b5d6-d471715c1946:sit", "tags": [], "situation": {"en": "The look acknowledges this without being able to do anything about it."}, "stance": {"en": "Meets the look. Moves aside to let him pass."}}]$interactive$::jsonb
WHERE id = 'cnt:c027c10f-aa48-4b29-b5d6-d471715c1946';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c0ece7e8-a54f-40a6-b000-bd3c484b2569:sit", "tags": [], "situation": {"en": "He wants to know what it was actually like. She is the only person he has ever met who could tell him. He is slightly afraid she will refuse."}, "stance": {"en": "Considers whether to answer fully. Gives him one true thing and watches what he does with it."}}]$interactive$::jsonb
WHERE id = 'cnt:c0ece7e8-a54f-40a6-b000-bd3c484b2569';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c11938de-3d07-4ace-b968-ce78a28bc6c6:sit", "tags": [], "situation": {"en": "The tree was healthy. Whatever broke it did so without effort."}, "stance": {"en": "Notes the break-height. Notes the direction of travel. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:c11938de-3d07-4ace-b968-ce78a28bc6c6';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c177294b-afb8-4a4f-8f6a-27fcc1944a9c:sit", "tags": [], "situation": {"en": "They will not stop unless he speaks. The pause was acknowledgment, not invitation."}, "stance": {"en": "Watches them pass without speaking. Is not certain he could have."}}]$interactive$::jsonb
WHERE id = 'cnt:c177294b-afb8-4a4f-8f6a-27fcc1944a9c';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c19f557d-f0d5-484c-960d-c382b5553c83:sit", "tags": [], "situation": {"en": "The leaking is recent. The warding held for decades before now."}, "stance": {"en": "Does not stop near the barrow. Increases distance from it. Notes it for whoever should know."}}]$interactive$::jsonb
WHERE id = 'cnt:c19f557d-f0d5-484c-960d-c382b5553c83';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c26e0001-0000-4000-8000-000000000001:sit", "tags": [], "situation": {"en": "Worked land has owners. Owners mean questions — or a roof, if the evening goes that way."}, "stance": {"en": "Reads who works this ground and how well. Notes the sheltered corner. Continues."}, "options": [{"id": "stay", "label": "Take the sheltered corner for the night", "tags": ["need:exhaustion", "need:unrest"], "stance": "Takes the dry corner for the night. Sleeps rough but out of the wind.", "commands": [{"type": "overnight_shelter", "name": "the sheltered corner", "indoor": false, "description": "a lee of tended ground, out of the wind", "lodging_cost": 0, "rest_quality": 1, "shadow_effect": 0, "meal": false}]}, {"id": "move_on", "label": "Mark it and keep to the road", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:c26e0001-0000-4000-8000-000000000001';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c26e0002-0000-4000-8000-000000000002:sit", "tags": [], "situation": {"en": "Tended ground says the region is fed and governed. The road is safer where the land is kept."}, "stance": {"en": "Notes the state of the work. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:c26e0002-0000-4000-8000-000000000002';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c26e0003-0000-4000-8000-000000000003:sit", "tags": [], "situation": {"en": "A made place remembers use. What it once kept out can still be kept out of one corner of it."}, "stance": {"en": "Marks the sheltered corner for a harder night. Continues."}, "options": [{"id": "stay", "label": "Take the sheltered corner for the night", "tags": ["need:exhaustion", "need:unrest"], "stance": "Takes the dry corner of the old work for the night. Sleeps rough but roofed against the dew.", "commands": [{"type": "overnight_shelter", "name": "the standing stone", "indoor": false, "description": "a lee of old masonry, weather-worn but dry", "lodging_cost": 0, "rest_quality": 1, "shadow_effect": 0, "meal": false}]}, {"id": "move_on", "label": "Mark it and keep to the road", "tags": ["risk:bold"], "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:c26e0003-0000-4000-8000-000000000003';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c26e0004-0000-4000-8000-000000000004:sit", "tags": [], "situation": {"en": "A used place has users. Users keep watch over what they use."}, "stance": {"en": "Notes that the place is in use. Continues on the road's side of it."}}]$interactive$::jsonb
WHERE id = 'cnt:c26e0004-0000-4000-8000-000000000004';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c26e0005-0000-4000-8000-000000000005:sit", "tags": [], "situation": {"en": "The north is full of places people meant to keep."}, "stance": {"en": "Reads the place for what it was. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:c26e0005-0000-4000-8000-000000000005';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c26e0006-0000-4000-8000-000000000006:sit", "tags": [], "situation": {"en": "A calm sky is information too."}, "stance": {"en": "Notes the sky is calm. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:c26e0006-0000-4000-8000-000000000006';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c26e0007-0000-4000-8000-000000000007:sit", "tags": [], "situation": {"en": "What the birds are doing says what has been through here lately. Lately: nothing."}, "stance": {"en": "Notes the calm. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:c26e0007-0000-4000-8000-000000000007';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c26e0008-0000-4000-8000-000000000008:sit", "tags": [], "situation": {"en": "A sound that leaves is better than a sound that circles."}, "stance": {"en": "Listens until it fades. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:c26e0008-0000-4000-8000-000000000008';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c26e0009-0000-4000-8000-000000000009:sit", "tags": [], "situation": {"en": "A single startled bird means the traveller was the only surprise."}, "stance": {"en": "Notes the direction it chose. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:c26e0009-0000-4000-8000-000000000009';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c26e000a-0000-4000-8000-000000000010:sit", "tags": [], "situation": {"en": "Calm tracks mean a calm wood ahead."}, "stance": {"en": "Notes direction and count. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:c26e000a-0000-4000-8000-000000000010';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c2f98ed8-3747-4f35-94f9-9e9402e55829:sit", "tags": [], "situation": {"en": "He is not afraid. He is thorough. Something is wrong here and he is collecting testimony."}, "stance": {"en": "Tells him what was unusual. He listens without interrupting."}}]$interactive$::jsonb
WHERE id = 'cnt:c2f98ed8-3747-4f35-94f9-9e9402e55829';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c2faee22-9951-4de3-8716-61c11fbae44b:sit", "tags": [], "situation": {"en": "The Woses know this forest better than anyone. If he says the way is wrong, the way is wrong."}, "stance": {"en": "Asks what is wrong about it."}}]$interactive$::jsonb
WHERE id = 'cnt:c2faee22-9951-4de3-8716-61c11fbae44b';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c31faf8a-89a4-4718-8e77-d289efdb853f:sit", "tags": [], "situation": {"en": "She needed to tell someone. The fear has been sitting in her chest for a week."}, "stance": {"en": "Asks her which direction the lights move. Gets the answer. Adjusts the route."}}]$interactive$::jsonb
WHERE id = 'cnt:c31faf8a-89a4-4718-8e77-d289efdb853f';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c33e7256-ab71-46c2-bb73-abfc3e9322bd:sit", "tags": [], "situation": {"en": "He is not looking for advice. He is saying it out loud to a stranger because strangers on roads are the right audience for things you need to say out loud."}, "stance": {"en": "Listens without offering an opinion. That is what is wanted."}}]$interactive$::jsonb
WHERE id = 'cnt:c33e7256-ab71-46c2-bb73-abfc3e9322bd';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c368375f-3daa-4fb5-b683-7d1f6139b384:sit", "tags": [], "situation": {"en": "They are not going to let the traveller go back toward whatever they are guarding. Forward is the only option they are offering."}, "stance": {"en": "Goes forward. Notes where they would not let them go back."}}]$interactive$::jsonb
WHERE id = 'cnt:c368375f-3daa-4fb5-b683-7d1f6139b384';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c3f838c3-9c29-4ff1-a5ab-1fb9c08715a2:sit", "tags": [], "situation": {"en": "Moving toward it makes it worse. Moving away from it is also moving away from the exit."}, "stance": {"en": "Does not move toward it. Finds the secondary exit that all Khazad passages have."}}]$interactive$::jsonb
WHERE id = 'cnt:c3f838c3-9c29-4ff1-a5ab-1fb9c08715a2';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c497a538-84fe-440e-8d34-87ca294d1178:sit", "tags": [], "situation": {"en": "He is right that she can. He is asking because he has exhausted every other option."}, "stance": {"en": "Asks which stones. He describes them. She knows exactly what they are. Tells him what the inscription says."}}]$interactive$::jsonb
WHERE id = 'cnt:c497a538-84fe-440e-8d34-87ca294d1178';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c4ab7ca0-9789-4f72-88cd-6dd557e9d22b:sit", "tags": [], "situation": {"en": "They will ignore the traveller entirely unless addressed."}, "stance": {"en": "Continues without addressing them."}}]$interactive$::jsonb
WHERE id = 'cnt:c4ab7ca0-9789-4f72-88cd-6dd557e9d22b';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c5df923f-16da-4c2d-9d29-d771520f4e1f:sit", "tags": [], "situation": {"en": "Small reptiles in quantity on a sunny wall are a proxy for a calm stretch of road."}, "stance": {"en": "Notes the calm. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:c5df923f-16da-4c2d-9d29-d771520f4e1f';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c63f8b5f-9829-4469-8a0e-2958bc9bdb4c:sit", "tags": [], "situation": {"en": "They have registered the traveller. The registration is neutral. So far."}, "stance": {"en": "Continues. Does not make sudden movements."}}]$interactive$::jsonb
WHERE id = 'cnt:c63f8b5f-9829-4469-8a0e-2958bc9bdb4c';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c7b907df-0a3e-45cb-a2d6-d7b9e5ae667f:sit", "tags": [], "situation": {"en": "Aranath has seen half-orcs before. This one does not yet know he has been identified."}, "stance": {"en": "Takes the seat across the fire. Speaks first. Watches what the mercenary does with the initiative."}}]$interactive$::jsonb
WHERE id = 'cnt:c7b907df-0a3e-45cb-a2d6-d7b9e5ae667f';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c868af40-9af9-42b5-94ee-d60024499f21:sit", "tags": [], "situation": {"en": "The tongue on the map is Quenya. She recognizes three of the four landmarks. The fourth no longer exists."}, "stance": {"en": "Reads the map. Names what she can. Tells him what the missing landmark was."}}]$interactive$::jsonb
WHERE id = 'cnt:c868af40-9af9-42b5-94ee-d60024499f21';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c883f683-0985-4398-8a57-c2d41cbd5f7b:sit", "tags": [], "situation": {"en": "He is checking whether the road behind the traveller is clear. The reason he needs it clear is not stated."}, "stance": {"en": "Names what was on the road behind. Does not ask why he wants to know."}}]$interactive$::jsonb
WHERE id = 'cnt:c883f683-0985-4398-8a57-c2d41cbd5f7b';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c932d570-ecc8-4744-85d0-5c20524a2b4b:sit", "tags": [], "situation": {"en": "A minor cost of time and wet boots, nothing more. The road continues beyond it unchanged."}, "stance": {"en": "Finds the shallowest crossing. Wades."}}]$interactive$::jsonb
WHERE id = 'cnt:c932d570-ecc8-4744-85d0-5c20524a2b4b';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:c9d20a4b-3e34-4e84-968e-f2180a5633c6:sit", "tags": [], "situation": {"en": "A bear large enough to turn a deer's hide inside-out and crush the long bones is significantly larger than average."}, "stance": {"en": "Reads the size from the print-depth in the mud beside the kill. Continues. Keeps the road open on both sides."}}]$interactive$::jsonb
WHERE id = 'cnt:c9d20a4b-3e34-4e84-968e-f2180a5633c6';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:ca9b8fef-bfbb-41f9-a417-c8da79e999f2:sit", "tags": [], "situation": {"en": "He has not been inland in months. He is genuinely curious."}, "stance": {"en": "Trades inland news for river news. Gets more than was given."}}]$interactive$::jsonb
WHERE id = 'cnt:ca9b8fef-bfbb-41f9-a417-c8da79e999f2';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:cab0d8c3-a28d-4bc7-840a-2a7bc33a9d1e:sit", "tags": [], "situation": {"en": "The captive saw them. The guards did not. The captive made a choice not to endanger the traveller. That choice cost something."}, "stance": {"en": "Holds the gaze for the three seconds. Then continues."}}]$interactive$::jsonb
WHERE id = 'cnt:cab0d8c3-a28d-4bc7-840a-2a7bc33a9d1e';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:cb9a0fdd-e3ed-4000-b668-3181b61420fa:sit", "tags": [], "situation": {"en": "The formation is the argument. What Aranath says in the next thirty seconds determines whether this stays a conversation."}, "stance": {"en": "Has already counted them and found the formation wanting. Answers the first question with a question of his own."}}]$interactive$::jsonb
WHERE id = 'cnt:cb9a0fdd-e3ed-4000-b668-3181b61420fa';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:cbc2e1eb-1d7e-40d9-bdab-0f325774f55a:sit", "tags": [], "situation": {"en": "Somewhere ahead of or behind the traveller, the scout's information is being received."}, "stance": {"en": "Changes route unpredictably. Tests whether the shadow follows the change."}}]$interactive$::jsonb
WHERE id = 'cnt:cbc2e1eb-1d7e-40d9-bdab-0f325774f55a';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:cc67f316-2423-4511-a96d-ac35487a1638:sit", "tags": [], "situation": {"en": "Herbivores do not starve in good country in this season unless something has made them too frightened to graze."}, "stance": {"en": "Studies the ground. Notes the direction the elk was facing when it stopped. Continues with the ridge on one side."}}]$interactive$::jsonb
WHERE id = 'cnt:cc67f316-2423-4511-a96d-ac35487a1638';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:cd04a982-a85a-4ec5-afac-9a0454e8ed2d:sit", "tags": [], "situation": {"en": "The confirmation question will come. The answer determines whether this ends as a conversation or something else."}, "stance": {"en": "Answers the first question before it is asked. Watches the captain decide whether the answer fits."}}]$interactive$::jsonb
WHERE id = 'cnt:cd04a982-a85a-4ec5-afac-9a0454e8ed2d';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:cd32dd92-a688-4bde-87c7-16459c442412:sit", "tags": [], "situation": {"en": "Captives being moved north on an enemy-held road means a supply chain is operating that has not been disrupted."}, "stance": {"en": "Watches from cover until they pass. Does not intervene. Does not forget."}}]$interactive$::jsonb
WHERE id = 'cnt:cd32dd92-a688-4bde-87c7-16459c442412';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:cdba5d63-5142-40f3-8f35-a2cbf3b5f19e:sit", "tags": [], "situation": {"en": "It has not moved. This is not reassurance. They do not move until they decide."}, "stance": {"en": "Does not slow. Does not look up. Calculates the distance to the next cover."}}]$interactive$::jsonb
WHERE id = 'cnt:cdba5d63-5142-40f3-8f35-a2cbf3b5f19e';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:ce13aa7e-be88-449f-956d-fa1b3e7e1258:sit", "tags": [], "situation": {"en": "He is running the geometry of the encounter before it happens."}, "stance": {"en": "Identifies where the crossbow must be given the bolt-case position. Plans accordingly."}}]$interactive$::jsonb
WHERE id = 'cnt:ce13aa7e-be88-449f-956d-fa1b3e7e1258';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:ce26f3d1-f930-4902-bdf4-d09a14d72e70:sit", "tags": [], "situation": {"en": "The pass goes between those high points. The sound comes from both sides."}, "stance": {"en": "Waits until the rhythm goes quiet before entering the pass."}}]$interactive$::jsonb
WHERE id = 'cnt:ce26f3d1-f930-4902-bdf4-d09a14d72e70';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:ce33d53f-25c1-4db8-aea6-33a84c353590:sit", "tags": [], "situation": {"en": "Eight Orcs moving confidently on a ridge in daylight is a message about who controls this ground."}, "stance": {"en": "Does not skyline. Stays in the valley-bottom until the patrol is out of sight."}}]$interactive$::jsonb
WHERE id = 'cnt:ce33d53f-25c1-4db8-aea6-33a84c353590';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:ce72aad0-8ed9-4272-9ab6-dc5ef48f0902:sit", "tags": [], "situation": {"en": "He is old enough to prefer manipulation to violence when manipulation is available. That is more dangerous, not less."}, "stance": {"en": "Listens to what the negotiation is. Does not agree to anything immediately."}}]$interactive$::jsonb
WHERE id = 'cnt:ce72aad0-8ed9-4272-9ab6-dc5ef48f0902';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:ced7c29e-7ef8-4b05-90f8-2c89fd0c928e:sit", "tags": [], "situation": {"en": "He is asking indirectly whether the traveller has seen anything on the northern road that would explain the absence."}, "stance": {"en": "Tells him what the northern road looked like. Watches him calculate."}}]$interactive$::jsonb
WHERE id = 'cnt:ced7c29e-7ef8-4b05-90f8-2c89fd0c928e';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:cf222662-7ba1-4a68-b9ae-463a46849af4:sit", "tags": [], "situation": {"en": "If she passes, he will see her and report. The question is whether she is willing to be reported."}, "stance": {"en": "Walks the road at the exact pace that makes her uninteresting. Does not look at the hollow."}}]$interactive$::jsonb
WHERE id = 'cnt:cf222662-7ba1-4a68-b9ae-463a46849af4';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:cf4dd543-0f7c-4fe3-a313-7daaaffe6db9:sit", "tags": [], "situation": {"en": "Something in Dol Guldur knows the traveller is on this road. It has not decided yet what to do about it."}, "stance": {"en": "Continues. Does not look toward the south-east."}}]$interactive$::jsonb
WHERE id = 'cnt:cf4dd543-0f7c-4fe3-a313-7daaaffe6db9';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:d010d53e-d7d2-4a38-9af1-f42576998cbd:sit", "tags": [], "situation": {"en": "Nothing to be done about it. It either hits or it doesn't."}, "stance": {"en": "Moves out from under the canopy. Keeps moving."}}]$interactive$::jsonb
WHERE id = 'cnt:d010d53e-d7d2-4a38-9af1-f42576998cbd';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:d01cc96e-ba0e-428b-b766-1ebbf76490d0:sit", "tags": [], "situation": {"en": "Yet."}, "stance": {"en": "Moves away from the fire. Moves fast."}}]$interactive$::jsonb
WHERE id = 'cnt:d01cc96e-ba0e-428b-b766-1ebbf76490d0';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:d025bf18-9e22-4ad8-8197-a38bbc37b852:sit", "tags": [], "situation": {"en": "He was here recently. He may have left for a reason or he may return."}, "stance": {"en": "Notes the direction the birds are moving. Considers whether to follow the same direction."}}]$interactive$::jsonb
WHERE id = 'cnt:d025bf18-9e22-4ad8-8197-a38bbc37b852';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:d054bf83-34b2-40d0-bf45-22bb4f1ab0df:sit", "tags": [], "situation": {"en": "This is not a patrol. This is occupation. The difference matters for what comes next."}, "stance": {"en": "Does not approach the bridge. Looks for the ford."}}]$interactive$::jsonb
WHERE id = 'cnt:d054bf83-34b2-40d0-bf45-22bb4f1ab0df';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:d0769fe1-3b6d-442a-abf3-9832e0939de9:sit", "tags": [], "situation": {"en": "They are not going to stop and explain. They are running."}, "stance": {"en": "Notes what they are running from is north. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:d0769fe1-3b6d-442a-abf3-9832e0939de9';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:d0ad3d17-2737-41df-9627-9f28270b5d4d:sit", "tags": [], "situation": {"en": "Dwarves working in a specific location have a purpose for that location. The purpose shapes how they will respond to the traveller."}, "stance": {"en": "Approaches openly. Does not enter the camp without invitation."}}]$interactive$::jsonb
WHERE id = 'cnt:d0ad3d17-2737-41df-9627-9f28270b5d4d';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:d1417f6c-be87-414e-9913-31ce066b35ee:sit", "tags": [], "situation": {"en": "The pack is heavy and he is not making detours. Whatever he is carrying, the destination is specific."}, "stance": {"en": "Trades road-news. Does not ask about the pack."}}]$interactive$::jsonb
WHERE id = 'cnt:d1417f6c-be87-414e-9913-31ce066b35ee';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:d1c1c9f7-dad8-4638-b27f-19aec8f1bc76:sit", "tags": [], "situation": {"en": "They have not heard the traveller. The dialect they are using is a version of something she knows."}, "stance": {"en": "Does not enter the chamber. Does not reveal presence. Listens."}}]$interactive$::jsonb
WHERE id = 'cnt:d1c1c9f7-dad8-4638-b27f-19aec8f1bc76';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:d268400f-8f50-4385-b696-623e660e7f94:sit", "tags": [], "situation": {"en": "He is going regardless. The question is only whether she is curious enough about what is in that mine to go with him."}, "stance": {"en": "Considers it. Does not decide immediately."}}]$interactive$::jsonb
WHERE id = 'cnt:d268400f-8f50-4385-b696-623e660e7f94';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:d3e71ecc-8533-4688-b5be-7d5c7830cc06:sit", "tags": [], "situation": {"en": "It is not coming closer. It is where it is, doing what it does. The question is whether the road passes under it."}, "stance": {"en": "Identifies the direction. Checks whether the road goes under it. Plans accordingly."}}]$interactive$::jsonb
WHERE id = 'cnt:d3e71ecc-8533-4688-b5be-7d5c7830cc06';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:d3eff0de-0457-40d7-8bb1-541ac33d5791:sit", "tags": [], "situation": {"en": "He does not know this is a strange question to ask. To him it is simply efficient."}, "stance": {"en": "Was alive when Moria fell. Tells him the name the first landmark had before the map was drawn."}}]$interactive$::jsonb
WHERE id = 'cnt:d3eff0de-0457-40d7-8bb1-541ac33d5791';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:d41ee943-6a45-4939-be8b-55a15fccf483:sit", "tags": [], "situation": {"en": "The name costs him nothing to give and he wants to give it."}, "stance": {"en": "Buys the drink. Gets the name."}}]$interactive$::jsonb
WHERE id = 'cnt:d41ee943-6a45-4939-be8b-55a15fccf483';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:d5cb4b83-34c9-47d2-9464-10fdad5bb4fd:sit", "tags": [], "situation": {"en": "Nothing here is dangerous. But this tree has been at this crossroads for longer than the road has existed."}, "stance": {"en": "Passes it with the particular care that old things deserve."}}]$interactive$::jsonb
WHERE id = 'cnt:d5cb4b83-34c9-47d2-9464-10fdad5bb4fd';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:d6a1a584-c05d-45eb-af82-ee3ebef3fe31:sit", "tags": [], "situation": {"en": "She has decided what she will do before they finish arranging themselves. The decision is not about fear."}, "stance": {"en": "Has already decided. Lets them begin."}}]$interactive$::jsonb
WHERE id = 'cnt:d6a1a584-c05d-45eb-af82-ee3ebef3fe31';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:d7a54a3c-9e2c-4d8d-a62c-f06eb2a138c4:sit", "tags": [], "situation": {"en": "The past tense is involuntary. She already knows he is dead. The question is how she knows."}, "stance": {"en": "Reads the notice. Asks if she filed it."}}]$interactive$::jsonb
WHERE id = 'cnt:d7a54a3c-9e2c-4d8d-a62c-f06eb2a138c4';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:d9a6563b-d055-4bfa-a12e-a461a3962b00:sit", "tags": [], "situation": {"en": "The centre of the ford is now above whatever is moving below. The banks are twenty feet in either direction."}, "stance": {"en": "Does not stop moving. Reaches the bank before the shift completes."}}]$interactive$::jsonb
WHERE id = 'cnt:d9a6563b-d055-4bfa-a12e-a461a3962b00';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:daacd94f-77ed-40ff-8ddb-bc1542af2666:sit", "tags": [], "situation": {"en": "He is not sure what it means. He is sure enough to stop a Ranger and say it."}, "stance": {"en": "Asks where the quiet starts."}}]$interactive$::jsonb
WHERE id = 'cnt:daacd94f-77ed-40ff-8ddb-bc1542af2666';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:dc3eb41a-187b-45c1-89ef-def83aa873f0:sit", "tags": [], "situation": {"en": "Patrols above roads watch the road. What they are watching for is the question."}, "stance": {"en": "Continues on the road. Does not look up for more than a glance."}}]$interactive$::jsonb
WHERE id = 'cnt:dc3eb41a-187b-45c1-89ef-def83aa873f0';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:dd5d7207-dd26-4182-b594-f49596346158:sit", "tags": [], "situation": {"en": "Whatever it wants from this road today, the traveller is in it now."}, "stance": {"en": "Does not move. Does not flee. Waits for it to declare itself."}}]$interactive$::jsonb
WHERE id = 'cnt:dd5d7207-dd26-4182-b594-f49596346158';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:dea3d240-5689-4d92-82a2-f87026699fa2:sit", "tags": [], "situation": {"en": "They were looking for something on this road. The traveller was not it."}, "stance": {"en": "Returns the nod. Continues. Notes what direction they were watching."}}]$interactive$::jsonb
WHERE id = 'cnt:dea3d240-5689-4d92-82a2-f87026699fa2';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:df0909ea-fed4-4de8-9d00-5e4c4abcc8f5:sit", "tags": [], "situation": {"en": "Territorial observation and hostile observation look identical at this distance."}, "stance": {"en": "Continues at normal pace. Does not acknowledge the observation."}}]$interactive$::jsonb
WHERE id = 'cnt:df0909ea-fed4-4de8-9d00-5e4c4abcc8f5';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:dfa760b2-77d7-4b36-9933-0636af2cf4c4:sit", "tags": [], "situation": {"en": "Three Gondorian couriers who have finished their errand and are not returning is an unusual configuration."}, "stance": {"en": "Sits at the same fire. Does not ask the question directly."}}]$interactive$::jsonb
WHERE id = 'cnt:dfa760b2-77d7-4b36-9933-0636af2cf4c4';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:dfb31f10-f978-40e3-b635-b5311ac5daa4:sit", "tags": [], "situation": {"en": "It will emerge somewhere ahead. The question is where the passage opens."}, "stance": {"en": "Moves off the road onto higher ground. Watches for where the passage opens below."}}]$interactive$::jsonb
WHERE id = 'cnt:dfb31f10-f978-40e3-b635-b5311ac5daa4';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:dff9a95b-6114-4801-a7a5-50502c9b6d5c:sit", "tags": [], "situation": {"en": "A community that moves quietly and watches its roads is a community that knows it is in a landscape that notices things."}, "stance": {"en": "Passes without stopping. Does not linger near the road-watchers."}}]$interactive$::jsonb
WHERE id = 'cnt:dff9a95b-6114-4801-a7a5-50502c9b6d5c';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:e073672a-b354-410b-a70c-a099954d774e:sit", "tags": [], "situation": {"en": "This is a weapon pointed at a road. The traveller is on the road."}, "stance": {"en": "Looks for what it is guarding. Then finds the way around."}}]$interactive$::jsonb
WHERE id = 'cnt:e073672a-b354-410b-a70c-a099954d774e';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:e0afca8c-d668-48c8-81df-ac99b2093dc9:sit", "tags": [], "situation": {"en": "The toads have priorities. The traveller is not among them."}, "stance": {"en": "Picks a way through without stopping. The toads ignore them."}}]$interactive$::jsonb
WHERE id = 'cnt:e0afca8c-d668-48c8-81df-ac99b2093dc9';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:e0e3dec1-7725-4511-8888-96d26f14c7c2:sit", "tags": [], "situation": {"en": "The raven is right. The apology is genuine. He is faintly embarrassed by his own ability."}, "stance": {"en": "Tells the raven it is correct. Watches Radagast receive this secondhand."}}]$interactive$::jsonb
WHERE id = 'cnt:e0e3dec1-7725-4511-8888-96d26f14c7c2';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:e13e24b1-6208-4f3d-8b9c-c7d009e6f53d:sit", "tags": [], "situation": {"en": "Their pattern and the things she has noticed point to the same source."}, "stance": {"en": "Tells them what she has seen. Watches them understand what it means."}}]$interactive$::jsonb
WHERE id = 'cnt:e13e24b1-6208-4f3d-8b9c-c7d009e6f53d';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:e19fe0df-9568-4be5-affc-0234ed0ce0c0:sit", "tags": [], "situation": {"en": "The circling one is the actual problem. The one in front is the distraction."}, "stance": {"en": "Does not look at the distraction."}}]$interactive$::jsonb
WHERE id = 'cnt:e19fe0df-9568-4be5-affc-0234ed0ce0c0';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:e2502490-a550-4a1d-8a04-f311eada5e69:sit", "tags": [], "situation": {"en": "He is angry and he will tell anyone who will listen exactly where on the road the new toll-men are and what they look like."}, "stance": {"en": "Listens to the full description. Files the location."}}]$interactive$::jsonb
WHERE id = 'cnt:e2502490-a550-4a1d-8a04-f311eada5e69';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:e286ab70-a47f-4a6e-bbf2-34ef73e93a8c:sit", "tags": [], "situation": {"en": "The decision, when it comes, will be final. In the meantime, the forest simply watches."}, "stance": {"en": "Moves without haste. Does not break branches. Does not take anything."}}]$interactive$::jsonb
WHERE id = 'cnt:e286ab70-a47f-4a6e-bbf2-34ef73e93a8c';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:e37118d6-53f2-4cb9-9e0a-34a09c3e8029:sit", "tags": [], "situation": {"en": "Being assessed and found acceptable is reassuring. Being assessed at all means the ridge is being watched."}, "stance": {"en": "Continues. Notes which section of the road was under observation."}}]$interactive$::jsonb
WHERE id = 'cnt:e37118d6-53f2-4cb9-9e0a-34a09c3e8029';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:e3c95814-9d5e-42c5-a680-e37900fea59f:sit", "tags": [], "situation": {"en": "The marks he describes match something specific. What it is depends on where the farm is."}, "stance": {"en": "Asks which direction the marks are on the post."}}]$interactive$::jsonb
WHERE id = 'cnt:e3c95814-9d5e-42c5-a680-e37900fea59f';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:e3e51857-c27a-4de8-aba7-722f560c4f0f:sit", "tags": [], "situation": {"en": "He is deciding. The decision is not yet made."}, "stance": {"en": "Gives nothing useful. Keeps moving."}}]$interactive$::jsonb
WHERE id = 'cnt:e3e51857-c27a-4de8-aba7-722f560c4f0f';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:e45c8fbb-9295-4236-a9c1-7a8eef830072:sit", "tags": [], "situation": {"en": "They passed through. They are ahead now, not behind. The road is clear but the ridge is not."}, "stance": {"en": "Reads the tracks. Adjusts the route to keep the ridge on the left."}}]$interactive$::jsonb
WHERE id = 'cnt:e45c8fbb-9295-4236-a9c1-7a8eef830072';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:e46682cb-c575-4c55-8430-290c0ca0f56c:sit", "tags": [], "situation": {"en": "They are watching for something specific. The traveller does not match it."}, "stance": {"en": "Returns the nod. Continues without stopping."}}]$interactive$::jsonb
WHERE id = 'cnt:e46682cb-c575-4c55-8430-290c0ca0f56c';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:e496974b-c05c-4da6-a7f9-441322c5e94a:sit", "tags": [], "situation": {"en": "A warband this size moving openly means someone has decided the road belongs to the Enemy again. That decision was made recently."}, "stance": {"en": "Does not go down to the road. Watches until the column passes. Then waits another hour."}}]$interactive$::jsonb
WHERE id = 'cnt:e496974b-c05c-4da6-a7f9-441322c5e94a';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:e4c8ba7d-f0d3-40c8-86d5-42fd80da2fbd:sit", "tags": [], "situation": {"en": "Ravens know things. What they are gathered about is ahead."}, "stance": {"en": "Notes the direction of their attention. Continues toward it with awareness up."}}]$interactive$::jsonb
WHERE id = 'cnt:e4c8ba7d-f0d3-40c8-86d5-42fd80da2fbd';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:e5b864d5-bf10-437a-84d7-17fdbcab4133:sit", "tags": [], "situation": {"en": "The shadow that made them run is still somewhere in the heights above."}, "stance": {"en": "Does not go into the valley. Takes the ridge track east."}}]$interactive$::jsonb
WHERE id = 'cnt:e5b864d5-bf10-437a-84d7-17fdbcab4133';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:e62e93b2-f164-4929-a9f4-1b78d6448ced:sit", "tags": [], "situation": {"en": "He is telling Aranath because Aranath looks like someone who deals with strangers-on-roads-at-night. He is right."}, "stance": {"en": "Asks which direction they moved. Thanks him. Adjusts the patrol."}}]$interactive$::jsonb
WHERE id = 'cnt:e62e93b2-f164-4929-a9f4-1b78d6448ced';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:e6f479ef-d37f-4066-9b0e-6cdc75b7ac8b:sit", "tags": [], "situation": {"en": "The scent they are following went through here recently. If the traveller knows where it leads, they are suddenly useful alive."}, "stance": {"en": "Lets them decide. Does not volunteer information about the trail."}}]$interactive$::jsonb
WHERE id = 'cnt:e6f479ef-d37f-4066-9b0e-6cdc75b7ac8b';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:e70566fc-65eb-4842-81cf-844a148fce39:sit", "tags": [], "situation": {"en": "She is not offering this as gossip — she is sharing it the way everyone in Bree shares information, which is as a kind of currency. She expects something in return."}, "stance": {"en": "Trades what the northern road looked like. Gets the full picture of what Bree currently knows."}}]$interactive$::jsonb
WHERE id = 'cnt:e70566fc-65eb-4842-81cf-844a148fce39';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:e7441abe-5d59-4e9c-b123-4e327e28b2d1:sit", "tags": [], "situation": {"en": "The forest ahead is old. Old forest has its own rules."}, "stance": {"en": "Notes the lichen. Enters the forest accordingly."}}]$interactive$::jsonb
WHERE id = 'cnt:e7441abe-5d59-4e9c-b123-4e327e28b2d1';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:e8935919-fba5-4b31-957f-6b0d726289bf:sit", "tags": [], "situation": {"en": "Useful road knowledge: ford conditions changed upstream."}, "stance": {"en": "Notes the new dam. Adjusts the ford expectation."}}]$interactive$::jsonb
WHERE id = 'cnt:e8935919-fba5-4b31-957f-6b0d726289bf';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:e93a2bf5-c964-4b4d-9ccf-42f2c0ac3d1c:sit", "tags": [], "situation": {"en": "An active snake moving means the ground ahead is warm and undisturbed."}, "stance": {"en": "Steps around the track's crossing-point. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:e93a2bf5-c964-4b4d-9ccf-42f2c0ac3d1c';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:e97ca5ff-818c-4caf-af4f-60686926158b:sit", "tags": [], "situation": {"en": "She is giving the bad news and holding the actionable news back. The actionable news costs something."}, "stance": {"en": "Notices what is not said. Asks for it."}}]$interactive$::jsonb
WHERE id = 'cnt:e97ca5ff-818c-4caf-af4f-60686926158b';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:ea018ee3-a751-425a-bbd6-2dbe215b3dc3:sit", "tags": [], "situation": {"en": "She is asking him to carry a message that matters to her survival. She knows he might refuse. She asks anyway."}, "stance": {"en": "Agrees to carry it. Specifies what north means."}}]$interactive$::jsonb
WHERE id = 'cnt:ea018ee3-a751-425a-bbd6-2dbe215b3dc3';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:ea08fcfe-410a-4833-a5f3-c7735e79847d:sit", "tags": [], "situation": {"en": "Men watching roads who the Dunlendings do not recognise are a category worth paying attention to."}, "stance": {"en": "Asks what manner of men. Gets a description that is sparse but accurate."}}]$interactive$::jsonb
WHERE id = 'cnt:ea08fcfe-410a-4833-a5f3-c7735e79847d';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:eb173843-c7db-44b6-b10a-4683e393f0a0:sit", "tags": [], "situation": {"en": "He can tell he is talking to someone who is not Dunlending. He is deciding how much of the summary to give."}, "stance": {"en": "Asks what the something is."}}]$interactive$::jsonb
WHERE id = 'cnt:eb173843-c7db-44b6-b10a-4683e393f0a0';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:ebb7b1b3-97b6-4308-8e3a-db5ae549c2db:sit", "tags": [], "situation": {"en": "The valley is between the traveller and the next road section."}, "stance": {"en": "Waits until the sound stops. Gives it another ten minutes. Takes the ridge route."}}]$interactive$::jsonb
WHERE id = 'cnt:ebb7b1b3-97b6-4308-8e3a-db5ae549c2db';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:ec610e45-c9d8-4de5-a596-7efc75312903:sit", "tags": [], "situation": {"en": "They are not asking for anything. They are just on the road."}, "stance": {"en": "Gives them what food can be spared. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:ec610e45-c9d8-4de5-a596-7efc75312903';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:ec8174f4-9cb7-4653-a7ac-cca8ed08ca18:sit", "tags": [], "situation": {"en": "They are a symptom. She does not know yet of what."}, "stance": {"en": "Notes the duration. Walks past on the far side of the ruin wall. They do not see her."}}]$interactive$::jsonb
WHERE id = 'cnt:ec8174f4-9cb7-4653-a7ac-cca8ed08ca18';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:ec994ce1-881b-46b4-9880-e166d7f7a638:sit", "tags": [], "situation": {"en": "He is not afraid for her. He is telling her because she should know. He will not tell her who is asking because he does not know."}, "stance": {"en": "Asks when the questions started."}}]$interactive$::jsonb
WHERE id = 'cnt:ec994ce1-881b-46b4-9880-e166d7f7a638';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:ecef4115-a1e9-41cf-affb-44719a055ccf:sit", "tags": [], "situation": {"en": "An Easterling far west of his usual range who does not know who holds the road is either a scout, a refugee, or both."}, "stance": {"en": "Names the nominal authority on this road. Watches how he receives it."}}]$interactive$::jsonb
WHERE id = 'cnt:ecef4115-a1e9-41cf-affb-44719a055ccf';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:ecf5efe3-86e9-47ad-bc48-e7df68ea28f6:sit", "tags": [], "situation": {"en": "The distinction between a territorial question and a robbery depends entirely on the answer."}, "stance": {"en": "Names the destination. Names the load honestly."}}]$interactive$::jsonb
WHERE id = 'cnt:ecf5efe3-86e9-47ad-bc48-e7df68ea28f6';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:ee6e88cf-0eeb-43e3-a2ef-da03a213e369:sit", "tags": [], "situation": {"en": "It knows the road because it has used the road. That is worse than if it didn't."}, "stance": {"en": "Watches until it disappears. Chooses a route that diverges from its direction."}}]$interactive$::jsonb
WHERE id = 'cnt:ee6e88cf-0eeb-43e3-a2ef-da03a213e369';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:ee8eb056-728a-4130-bf72-109ed8c9eeb9:sit", "tags": [], "situation": {"en": "He is more determined than afraid and it is the determination that is concerning. He is going to keep looking."}, "stance": {"en": "Has not seen the camp. Asks for a description. Decides to watch for it."}}]$interactive$::jsonb
WHERE id = 'cnt:ee8eb056-728a-4130-bf72-109ed8c9eeb9';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:eeef5665-9266-4805-9990-36529c48c2e1:sit", "tags": [], "situation": {"en": "He does not know what caused the leaving. He left because everyone was leaving."}, "stance": {"en": "Asks which road he came from. Notes it."}}]$interactive$::jsonb
WHERE id = 'cnt:eeef5665-9266-4805-9990-36529c48c2e1';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:eef98792-b086-4602-affd-839000b9cb99:sit", "tags": [], "situation": {"en": "This is not an obstacle. It is an invitation that the traveller did not accept."}, "stance": {"en": "Does not enter. Finds the way around."}}]$interactive$::jsonb
WHERE id = 'cnt:eef98792-b086-4602-affd-839000b9cb99';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:ef83b9e2-2904-4485-850c-d00c1535e0b9:sit", "tags": [], "situation": {"en": "He knows which fork to take. He is deciding whether to share that with an outsider."}, "stance": {"en": "Waits. Does not press. Lets him decide."}}]$interactive$::jsonb
WHERE id = 'cnt:ef83b9e2-2904-4485-850c-d00c1535e0b9';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:f053a3e3-c3a2-49df-b51e-0333969e75be:sit", "tags": [], "situation": {"en": "Crocodiles at a ford are not a fight worth having. There is a boat crossing a mile downstream."}, "stance": {"en": "Does not attempt the ford. Finds the boat crossing."}}]$interactive$::jsonb
WHERE id = 'cnt:f053a3e3-c3a2-49df-b51e-0333969e75be';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:f0e8494c-2072-40e8-83b1-2144cbe56021:sit", "tags": [], "situation": {"en": "The warning was given. The explanation was not. He has enough."}, "stance": {"en": "Stops. Waits. Takes the longer path around."}}]$interactive$::jsonb
WHERE id = 'cnt:f0e8494c-2072-40e8-83b1-2144cbe56021';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:f1086f27-74e0-4daf-89b9-ebe57e14f115:sit", "tags": [], "situation": {"en": "Normal commerce on a working road. The delay is genuine and brief."}, "stance": {"en": "Waits at the edge of the work. Watches the operation."}}]$interactive$::jsonb
WHERE id = 'cnt:f1086f27-74e0-4daf-89b9-ebe57e14f115';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:f17e57d8-e45a-4d19-b670-913b8786f8ca:sit", "tags": [], "situation": {"en": "The strands are old enough to be dry but not decayed. The marking was made within a week."}, "stance": {"en": "Ducks under the strands. Does not break them. Moves carefully."}}]$interactive$::jsonb
WHERE id = 'cnt:f17e57d8-e45a-4d19-b670-913b8786f8ca';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:f1df75ce-22a3-454d-b963-646d385d633a:sit", "tags": [], "situation": {"en": "A practical question about a bureaucratic system he was never taught. Slightly embarrassing to ask."}, "stance": {"en": "Gives him the garrison location and says the permit expired but they will reissue in person."}}]$interactive$::jsonb
WHERE id = 'cnt:f1df75ce-22a3-454d-b963-646d385d633a';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:f295ac46-6227-41cf-81a4-caf6ff65ac17:sit", "tags": [], "situation": {"en": "Something the traveller is carrying, or the shadow the traveller carries, read as dangerous to an animal that is not easily frightened."}, "stance": {"en": "Watches it go. Considers what it smelled."}}]$interactive$::jsonb
WHERE id = 'cnt:f295ac46-6227-41cf-81a4-caf6ff65ac17';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:f3332d07-c333-470a-914a-edd47210d4b0:sit", "tags": [], "situation": {"en": "Two seconds before the next strand drops."}, "stance": {"en": "Ducks under it. Runs. Does not look up."}}]$interactive$::jsonb
WHERE id = 'cnt:f3332d07-c333-470a-914a-edd47210d4b0';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:f3bb9dcf-b387-4c50-8e24-48edcb56ef84:sit", "tags": [], "situation": {"en": "She does not cross marked territory she has not been invited into. Not from fear — from respect for a kind of claim she understands better than they know."}, "stance": {"en": "Takes the long way around."}}]$interactive$::jsonb
WHERE id = 'cnt:f3bb9dcf-b387-4c50-8e24-48edcb56ef84';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:f587e05a-bff2-47a2-b757-ce2ad9ce3fb8:sit", "tags": [], "situation": {"en": "This is a practiced technique. These animals have done this before."}, "stance": {"en": "Does not watch right. Moves to the center of the road. Increases pace."}}]$interactive$::jsonb
WHERE id = 'cnt:f587e05a-bff2-47a2-b757-ce2ad9ce3fb8';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:f5c1cf19-5331-4fb5-aa19-57f484fbe061:sit", "tags": [], "situation": {"en": "Their territory, their road. The traveller is a guest whether they know it or not."}, "stance": {"en": "Continues on the road below. Does not cut up toward the settlement without invitation."}}]$interactive$::jsonb
WHERE id = 'cnt:f5c1cf19-5331-4fb5-aa19-57f484fbe061';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:f5fe6369-19a0-4414-bc05-d59f37bc4f9d:sit", "tags": [], "situation": {"en": "The land up there is good. Nothing has disturbed it today."}, "stance": {"en": "Notes the count. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:f5fe6369-19a0-4414-bc05-d59f37bc4f9d';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:f7dd916c-a145-4850-b7c7-4cae07efb1a2:sit", "tags": [], "situation": {"en": "The tower has been rubble for a hundred and forty years. He does not know this."}, "stance": {"en": "Tells him the tower fell. Watches the ghost receive this."}}]$interactive$::jsonb
WHERE id = 'cnt:f7dd916c-a145-4850-b7c7-4cae07efb1a2';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:f7ffd42b-7af4-4bc2-9b69-048ddd9f7f1e:sit", "tags": [], "situation": {"en": "She is part of a very long consequence. She knows this. It is something else entirely to have a tree tell her so."}, "stance": {"en": "Sits down at its roots. Asks what the forest saw."}}]$interactive$::jsonb
WHERE id = 'cnt:f7ffd42b-7af4-4bc2-9b69-048ddd9f7f1e';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:f8be543f-3be3-4a96-8d4d-559bf2731cc1:sit", "tags": [], "situation": {"en": "The question buys thirty seconds. The answer determines whether those seconds cost anything."}, "stance": {"en": "Does not answer the question. Reads the spacing. Decides which one to move toward."}}]$interactive$::jsonb
WHERE id = 'cnt:f8be543f-3be3-4a96-8d4d-559bf2731cc1';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:f93b3404-659a-4565-8955-6d547ce1f028:sit", "tags": [], "situation": {"en": "She has seen this before, in better centuries and worse. The question of whether to intervene has different weight depending on who is asking it."}, "stance": {"en": "Counts the men. Notes the captive's condition. Makes a decision."}}]$interactive$::jsonb
WHERE id = 'cnt:f93b3404-659a-4565-8955-6d547ce1f028';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:faadaca2-67d3-4888-a6ba-b13e894bdb20:sit", "tags": [], "situation": {"en": "The message is important to him and he cannot go himself because the herd cannot be left. He is trusting a stranger with something that matters."}, "stance": {"en": "Memorizes the message. Agrees to deliver it."}}]$interactive$::jsonb
WHERE id = 'cnt:faadaca2-67d3-4888-a6ba-b13e894bdb20';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:fb0a97ee-6d99-4e20-9637-d364f5ab6f94:sit", "tags": [], "situation": {"en": "She has been looked at this way before, in better centuries. The accusation is older than the people making it."}, "stance": {"en": "Walks past slowly. Does not give him evidence. Does not correct him."}}]$interactive$::jsonb
WHERE id = 'cnt:fb0a97ee-6d99-4e20-9637-d364f5ab6f94';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:fb4c39d7-352e-4443-8d5b-4d8643a6b017:sit", "tags": [], "situation": {"en": "Things inside barrows do not open barrows from inside unless something has changed."}, "stance": {"en": "Does not approach the opening. Notes the direction the capstone moved. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:fb4c39d7-352e-4443-8d5b-4d8643a6b017';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:fbab3d19-a8a6-4e03-a8a7-b5e30784f2d7:sit", "tags": [], "situation": {"en": "Survey teams precede mining operations. Mining operations change roads."}, "stance": {"en": "Notes the marks. Continues."}}]$interactive$::jsonb
WHERE id = 'cnt:fbab3d19-a8a6-4e03-a8a7-b5e30784f2d7';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:fc53a16a-5154-4578-8ed3-beee90e4170a:sit", "tags": [], "situation": {"en": "He is the most helpful and least explicable thing on this road. The help is genuine. The inexplicability is permanent."}, "stance": {"en": "Accepts the dinner. Does not ask how he knew."}}]$interactive$::jsonb
WHERE id = 'cnt:fc53a16a-5154-4578-8ed3-beee90e4170a';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:fcffc69e-5295-4807-abf5-1367988567b0:sit", "tags": [], "situation": {"en": "He is not being cruel. He thought she should know. She is not yet certain she is grateful."}, "stance": {"en": "Does not react immediately. Then asks: when. Listens to the answer."}}]$interactive$::jsonb
WHERE id = 'cnt:fcffc69e-5295-4807-abf5-1367988567b0';

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:fe3600b6-fa45-49dc-97a4-91b94ed505b3:sit", "tags": [], "situation": {"en": "Nothing else spooked them. This was the traveller."}, "stance": {"en": "Continues without pursuing them."}}]$interactive$::jsonb
WHERE id = 'cnt:fe3600b6-fa45-49dc-97a4-91b94ed505b3';

COMMIT;
-- 618 contact rows synced