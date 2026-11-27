-- ADR-0022: carnivores fallback — the safety net for the 33 small
-- carnivores without a family whitelist (lynxes, jackals, foxes, otters).
-- entity_type row, no whitelist: it only fires where nothing specific
-- matches. Small beasts never badly wound — the worst is a bad bite.

INSERT INTO entities_narration (
  id, kind, entity_id, entity_ids, entity_type, mover_leg_id, region_id, location_id, cultural_family, form, priority, tags, aspect, presence, lore, facts, channel, variants, situations, disposition, payload
) SELECT 'cnt:dfbc8d7d-610c-411b-a91a-d78f0954b577',
       'contact',
       NULL,
       NULL,
       'carnivores',
       NULL,
       NULL,
       NULL,
       NULL,
       'attacks',
       0,
       ARRAY['felt:afraid'],
       NULL,
       '{"en": "A cornered or desperate animal — small enough to kill with one good blow, fast enough that the blow may never land."}'::jsonb,
       NULL,
       '{"topic": "threat_and_jeer"}'::jsonb,
       NULL,
       NULL,
       '[{"id": "cnt:dfbc8d7d-610c-411b-a91a-d78f0954b577:sit", "tags": [], "situation": {"en": "It is small and it is fast and it does not seem to know it should be afraid. That makes it more dangerous, not less."}}]'::jsonb,
       '{"en": "It comes out of the scrub low and fast — not a wolf, not anything with a name worth fearing, just a lean wild thing with its teeth bared. Something is wrong with it: hunger, or madness, or a den too close."}'::jsonb,
       '{"source": "hand_authored", "adr": "0022", "batch": "carnivores_fallback"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM entities_narration WHERE id = 'cnt:dfbc8d7d-610c-411b-a91a-d78f0954b577');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:dfbc8d7d-610c-411b-a91a-d78f0954b577:sit:run_for_it',
       NULL,
       'cnt:dfbc8d7d-610c-411b-a91a-d78f0954b577',
       'avoid',
       '{"en": "Run for it", "es": "Salir corriendo"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "endurance", "difficulty": 8}'::jsonb,
       '{"success": {"text": {"en": "Runs — and that alone is enough. A thing that size does not want a chase; it wants a meal that does not fight back. It gives up within fifty yards.", "es": "Corre — y eso solo alcanza. Una cosa de ese tamaño no quiere una persecución; quiere una presa que no se defienda. Desiste dentro de las cincuenta yardas."}, "effects": [{"type": "energy", "amount": -5}]}, "failure": {"text": {"en": "It is faster than it looks, and it goes for the ankle the way small things do — one quick snap and gone, leaving the bite to swell and burn.", "es": "Es más rápida de lo que parece, y va por el tobillo como hacen las cosas chicas — un mordisco rápido y se va, dejando la mordida hincharse y arder."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "energy", "amount": -5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:dfbc8d7d-610c-411b-a91a-d78f0954b577:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       3
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:dfbc8d7d-610c-411b-a91a-d78f0954b577:sit:run_for_it');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:dfbc8d7d-610c-411b-a91a-d78f0954b577:sit:scare_it_off',
       NULL,
       'cnt:dfbc8d7d-610c-411b-a91a-d78f0954b577',
       'defy',
       '{"en": "Scare it off", "es": "Ahuyentarla"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "intimidation", "difficulty": 7}'::jsonb,
       '{"success": {"text": {"en": "Shouts, stamps, hurls the first stone that comes to hand — and it breaks, suddenly remembering everything it is afraid of, gone into the scrub like smoke.", "es": "Grita, patalea, arroja la primera piedra que encuentra — y la bestia se quiebra, recordando de golpe todo lo que le da miedo, desaparecida en el matorral como humo."}, "effects": []}, "failure": {"text": {"en": "It does not break. Whatever is wrong with it is bigger than its fear, and it comes in anyway, low and snapping.", "es": "No se quiebra. Lo que sea que le pasa es más grande que su miedo, y entra igual, baja y mordiendo."}, "effects": [{"type": "wound", "level": "wounded"}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:dfbc8d7d-610c-411b-a91a-d78f0954b577:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       3
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:dfbc8d7d-610c-411b-a91a-d78f0954b577:sit:scare_it_off');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:dfbc8d7d-610c-411b-a91a-d78f0954b577:sit:fight_it_off',
       NULL,
       'cnt:dfbc8d7d-610c-411b-a91a-d78f0954b577',
       'defy',
       '{"en": "Fight it off", "es": "Rechazarla a golpes"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "melee", "difficulty": 8}'::jsonb,
       '{"success": {"text": {"en": "Meets it in mid-leap with the blade flat and then the point. It is quick, savage work, over in seconds — the thing limps away or does not, and the scrub is quiet again.", "es": "La recibe en medio del salto con el plano de la hoja y luego la punta. Es trabajo rápido y salvaje, terminado en segundos — la cosa se aleja cojeando o no, y el matorral queda quieto otra vez."}, "effects": [{"type": "energy", "amount": -5}]}, "failure": {"text": {"en": "It is everywhere at once — too low to strike clean, too fast to pin. By the time it finally tears free and runs, it has left its teeth in something.", "es": "Está en todas partes a la vez — demasiado baja para golpear limpio, demasiado rápida para inmovilizar. Para cuando por fin se arranca y corre, ya dejó los dientes en algo."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "energy", "amount": -5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:dfbc8d7d-610c-411b-a91a-d78f0954b577:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       3
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:dfbc8d7d-610c-411b-a91a-d78f0954b577:sit:fight_it_off');
