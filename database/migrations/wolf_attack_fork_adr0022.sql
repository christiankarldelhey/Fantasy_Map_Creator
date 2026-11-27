-- ADR-0022 wolf pilot: the pack attack forks on the road.
-- Mirrors the authored rows in seeds/data/json/entities_narration.json
-- and interactions.json (single source of truth). Additive only:
-- inserts the contact voice and its four forked interactions if absent.

INSERT INTO entities_narration (
  id, kind, entity_id, entity_ids, entity_type, mover_leg_id, region_id, location_id, cultural_family, form, priority, tags, aspect, presence, lore, facts, channel, variants, situations, disposition, payload
) SELECT 'cnt:fb19da18-c124-4dba-9763-c885ac9e7749',
       'contact',
       NULL,
       ARRAY['ffe19566-6953-4771-a0eb-90c896b20e51'::uuid, 'ea4a6259-4ccb-4a6f-b229-727f767fedda'::uuid, 'db69cd68-1ad6-4f80-8814-61035bd24e8c'::uuid, '91dc6bfb-1c36-4e84-b238-17ae408a8758'::uuid, '5c4c3611-6c66-48b2-bfe5-2df5a9e98042'::uuid, '6fdb39f3-bc3c-5bf6-9afe-b9482dca22c9'::uuid]::uuid[],
       'carnivores',
       NULL,
       NULL,
       NULL,
       NULL,
       'attacks',
       0,
       ARRAY['felt:afraid'],
       NULL,
       '{"en": "Wolves hunting, not wandering — lean from a hard season, working as a pack, closing the angles before closing the distance."}'::jsonb,
       NULL,
       '{"topic": "threat_and_jeer"}'::jsonb,
       NULL,
       NULL,
       '[{"id": "cnt:fb19da18-c124-4dba-9763-c885ac9e7749:sit", "tags": [], "situation": {"en": "They mean to cut the traveller off and take the quarry from the side. The ground is open every way that matters."}}]'::jsonb,
       '{"en": "The first one is already in the open before the grass stops moving — low, silent, no warning bark. Two more come wide on either side."}'::jsonb,
       '{"source": "hand_authored", "adr": "0022", "pilot": "wolves"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM entities_narration WHERE id = 'cnt:fb19da18-c124-4dba-9763-c885ac9e7749');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:fb19da18-c124-4dba-9763-c885ac9e7749:sit:run_for_it',
       NULL,
       'cnt:fb19da18-c124-4dba-9763-c885ac9e7749',
       'avoid',
       '{"en": "Run for it", "es": "Salir corriendo"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "endurance", "difficulty": 11}'::jsonb,
       '{"success": {"text": {"en": "Runs for the broken ground and does not look back. The pack tests the chase for a hundred yards, then decides a quarry this fast is not worth the spending.", "es": "Corre hacia el terreno quebrado y no mira atrás. La manada prueba la persecución por cien yardas y decide que una presa tan rápida no vale el gasto."}, "effects": [{"type": "energy", "amount": -10}]}, "failure": {"text": {"en": "The lead wolf closes the distance at the first bad ground — down, up, and away with teeth snapping shut on empty air twice. The pack does not follow far.", "es": "El lobo alfa alcanza al viajero en el primer terreno malo — cae, se levanta, y escapa con los dientes cerrándose en el aire dos veces. La manada no lo sigue lejos."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "energy", "amount": -10}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:fb19da18-c124-4dba-9763-c885ac9e7749:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:fb19da18-c124-4dba-9763-c885ac9e7749:sit:run_for_it');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:fb19da18-c124-4dba-9763-c885ac9e7749:sit:slip_out_of_sight',
       NULL,
       'cnt:fb19da18-c124-4dba-9763-c885ac9e7749',
       'avoid',
       '{"en": "Slip out of sight", "es": "Perderse de vista"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "stealth", "difficulty": 11}'::jsonb,
       '{"success": {"text": {"en": "Drops into the low scrub and moves only when the wind moves. The pack quarters the slope twice and gives up on what it cannot find.", "es": "Se deja caer en el matorral bajo y se mueve solo cuando se mueve el viento. La manada peina la ladera dos veces y renuncia a lo que no puede encontrar."}, "effects": [{"type": "energy", "amount": -5}]}, "failure": {"text": {"en": "The wind turns. They come straight to the hiding place, and there is no second trick — a running, snapping fight out of the scrub before they let go.", "es": "El viento cambia. Vienen directo al escondite, y no hay segundo truco — una pelea a la carrera, entre mordiscos, para salir del matorral antes de que lo suelten."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "energy", "amount": -5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:fb19da18-c124-4dba-9763-c885ac9e7749:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:fb19da18-c124-4dba-9763-c885ac9e7749:sit:slip_out_of_sight');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:fb19da18-c124-4dba-9763-c885ac9e7749:sit:stand_and_fight',
       NULL,
       'cnt:fb19da18-c124-4dba-9763-c885ac9e7749',
       'defy',
       '{"en": "Stand and fight", "es": "Plantarse y pelear"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "melee", "difficulty": 8}'::jsonb,
       '{"success": {"text": {"en": "Meets the first one with the blade as it comes in. The others circle once around the dead one and are gone.", "es": "Recibe al primero con la hoja cuando entra. Los otros circulan una vez alrededor del muerto y se van."}, "effects": [{"type": "energy", "amount": -15}]}, "failure": {"text": {"en": "The first one dies on the blade and the second is already in — the pack breaks off at last, the traveller still standing, barely.", "es": "El primero muere en la hoja y el segundo ya está encima — la manada por fin se retira, el viajero todavía de pie, apenas."}, "effects": [{"type": "wound", "level": "badly wounded"}, {"type": "energy", "amount": -15}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:fb19da18-c124-4dba-9763-c885ac9e7749:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:fb19da18-c124-4dba-9763-c885ac9e7749:sit:stand_and_fight');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:fb19da18-c124-4dba-9763-c885ac9e7749:sit:face_them_down',
       NULL,
       'cnt:fb19da18-c124-4dba-9763-c885ac9e7749',
       'defy',
       '{"en": "Face them down", "es": "Hacerles frente"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "intimidation", "difficulty": 8}'::jsonb,
       '{"success": {"text": {"en": "Plants both feet, shouts, makes tall and wide of what the pack sized up as a small meal. They circle twice, testing, and decide whatever this is, it is not food.", "es": "Planta los dos pies, grita, se hace alto y ancho ante lo que la manada midió como una presa chica. Circulan dos veces, probando, y deciden que sea lo que sea esto, no es comida."}, "effects": []}, "failure": {"text": {"en": "The bluff holds for a minute and no more. They come in low from two sides, and it is a shuffling, snapping retreat up the slope, backwards all the way.", "es": "El farol aguanta un minuto y no más. Entran bajo por los dos costados, y es una retirada arrastrada, entre mordiscos, ladera arriba, de espaldas todo el camino."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:fb19da18-c124-4dba-9763-c885ac9e7749:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:fb19da18-c124-4dba-9763-c885ac9e7749:sit:face_them_down');
