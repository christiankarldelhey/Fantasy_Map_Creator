-- The Dúnedain dusk contact's shelter gains a keeper: the household
-- that keeps faith with a ruined kingdom is kept by someone. `host`
-- rides the overnight_shelter command; applyShelterChoice forwards it
-- to overnight_location.host, so the rest event remembers the person
-- by name ('npc:edrahil') like a location's resident host — earned
-- when the traveller takes the roof, anonymous when they walk on.
-- interactive is set verbatim from the authored seed for this row.

BEGIN;

UPDATE entities_narration SET interactive = $interactive$[{"id": "cnt:0a1d0016-0000-4000-8000-0a1d00000016:sit", "tags": [], "situation": {"en": "These are folk who have kept faith with a ruined kingdom for generations and want to hear that it still counts for something."}, "stance": {"en": "Takes the arrows. Gives a true answer about the north even where the truth is thin."}, "commands": [{"type": "meal", "food": "the household's hot food"}, {"type": "item", "slug": "common_arrows", "qty": 8}], "options": [{"id": "stay", "label": "Take the dry loft", "tags": ["need:exhaustion", "need:hunger", "need:unrest"], "stance": "Takes the dry loft and the arrows. Gives a true answer about the north even where the truth is thin.", "commands": [{"type": "overnight_shelter", "name": "the dry loft", "description": "a dry loft over a house that keeps faith with a ruined kingdom", "host": {"name": "Edrahil", "gloss": "a keeper of the northern road", "people": "dunedain", "gender": "m"}, "indoor": true, "lodging_cost": 0, "meal": true, "meal_slug": "shared_pot", "rest_quality": 3, "shadow_effect": -1}]}, {"id": "move_on", "label": "Give the north honestly and walk on", "tags": ["risk:bold"], "stance": "Gives a true answer about the north even where the truth is thin. Leaves the bundle where it lies.", "commands": []}]}]$interactive$::jsonb
WHERE id = 'cnt:0a1d0016-0000-4000-8000-0a1d00000016';

COMMIT;
