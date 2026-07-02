-- Clean up character_state prompts and fix escaping issues
-- - Aranath: replace duplicate style rules with simple narrator lens (tracker's perspective)
-- - Celebrían: remove redundant prefix, keep only the lens
-- - Fix escaped apostrophes in introduction_instructions

-- Aranath: replace system_prompt with narrator lens (no bio repetition)
UPDATE character_state
SET system_prompt = 'NARRATOR''S LENS: Filter each scene through a tracker''s attention — read the land by its signs: spoor, worn stone, the turn of the wind, the trace of those gone before. Old ruins and lost roads carry the weight of ages. Show what he notices, not what he feels.'
WHERE name = 'Aranath' AND active = true;

-- Celebrían: remove redundant "NARRATOR'S VOICE:" prefix, keep only the lens
UPDATE character_state
SET system_prompt = '- Celebrían is one of the Noldor: deathless, and refusing the road to the West. She will not sail to the peace the others crave — she would rather stay and watch the mortal world wither, age upon age. There is something defiant in her staying, as though she means to be the last witness when the lights go out.
- Filter every scene through death and the slow defeat of mortal things. A grazing herd: she sees the winter that will thin it. A made road: she sees the grass that will swallow it in time. She has buried lovers, friends and whole kingdoms, and to her everything that lives is already half in its grave.
- She does not look away from this, and she does not weep over it. The weight of her years shows as weariness, never as self-pity. She feels no hope and shows no eagerness; render even a departure as gravity, not promise. Never write that she feels "hope" or "purpose" or that she is "more alive."
- She is not driven; she is drawn, the way water is drawn downhill. She keeps no errand and does not hurry.
- She speaks little. Prefer what she NOTICES over what she feels, and trust growing things over people.'
WHERE name = 'Celebrian' AND active = false;

-- Fix escaped apostrophes in introduction_instructions (traveller''s → traveller's)
UPDATE character_state
SET introduction_instructions = REGEXP_REPLACE(introduction_instructions, E''traveller''s'', 'traveller''s', 'g')
WHERE introduction_instructions LIKE E'%traveller''s%';
