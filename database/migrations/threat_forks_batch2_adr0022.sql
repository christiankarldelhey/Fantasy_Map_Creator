-- ADR-0022 threats batch 2: wargs, bears, spiders, orcs fork on the road.
-- Mirrors the authored rows in seeds/data/json/entities_narration.json
-- and interactions.json (single source of truth). Additive only.

INSERT INTO entities_narration (
  id, kind, entity_id, entity_ids, entity_type, mover_leg_id, region_id, location_id, cultural_family, form, priority, tags, aspect, presence, lore, facts, channel, variants, situations, disposition, payload
) SELECT 'cnt:5c606a41-d7ca-4cf9-879b-a25d7977e879',
       'contact',
       NULL,
       ARRAY['e9e4f1d8-e500-4392-a9fc-0a4641491683'::uuid, 'ec5bf6f3-dc3a-47a7-9b5c-00e8fdc7feef'::uuid]::uuid[],
       'carnivores',
       NULL,
       NULL,
       NULL,
       NULL,
       'attacks',
       0,
       ARRAY['felt:afraid'],
       NULL,
       '{"en": "Wargs — not wolves. Bigger at the shoulder, broader in the head, and something in the way they move that says they are thinking about it."}'::jsonb,
       NULL,
       '{"topic": "threat_and_jeer"}'::jsonb,
       NULL,
       NULL,
       '[{"id": "cnt:5c606a41-d7ca-4cf9-879b-a25d7977e879:sit", "tags": [], "situation": {"en": "They spread wide as they come, patient, in no hurry at all. They mean to take their time and take the traveller in the end."}}]'::jsonb,
       '{"en": "They do not bother with silence. The first howl comes from the left and is answered from the right — the pack already knows where the traveller is, and wants it known."}'::jsonb,
       '{"source": "hand_authored", "adr": "0022", "batch": "wargs"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM entities_narration WHERE id = 'cnt:5c606a41-d7ca-4cf9-879b-a25d7977e879');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:5c606a41-d7ca-4cf9-879b-a25d7977e879:sit:run_for_it',
       NULL,
       'cnt:5c606a41-d7ca-4cf9-879b-a25d7977e879',
       'avoid',
       '{"en": "Run for it", "es": "Salir corriendo"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "endurance", "difficulty": 13}'::jsonb,
       '{"success": {"text": {"en": "Runs and does not stop running — over the rise, through the gorse, lungs burning, until the howls fall behind and do not come closer again. The pack let it go: a meal that costs this much is a lesson, not dinner.", "es": "Corre y no deja de correr — por la loma, entre los tojos, los pulmones ardiendo, hasta que los aullidos quedan atrás y no vuelven a acercarse. La manada la deja ir: una presa que cuesta tanto es una lección, no una cena."}, "effects": [{"type": "energy", "amount": -15}]}, "failure": {"text": {"en": "They run it down in the open — no hunger in it, almost no hurry, one going for the legs while another waits for the fall.", "es": "La corren hasta darle caza en campo abierto — sin hambre en ello, casi sin prisa, una yendo por las piernas mientras otra espera la caída."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "energy", "amount": -15}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:5c606a41-d7ca-4cf9-879b-a25d7977e879:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:5c606a41-d7ca-4cf9-879b-a25d7977e879:sit:run_for_it');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:5c606a41-d7ca-4cf9-879b-a25d7977e879:sit:slip_out_of_sight',
       NULL,
       'cnt:5c606a41-d7ca-4cf9-879b-a25d7977e879',
       'avoid',
       '{"en": "Slip out of sight", "es": "Perderse de vista"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "stealth", "difficulty": 13}'::jsonb,
       '{"success": {"text": {"en": "Downwind, still as stone, moving only in the moments the pack quarters away. They cast back and forth for an hour and never once come close. Wargs hate losing a scent; these lose one.", "es": "A favor del viento, quieta como piedra, moviéndose solo en los momentos en que la manada peina lejos. Van y vienen por una hora sin acercarse ni una vez. A los wargs les odia perder un rastro; estos lo pierden."}, "effects": [{"type": "energy", "amount": -5}]}, "failure": {"text": {"en": "They do not fall for it. The circling tightens instead of widening — they knew all along — and there is nothing left but to fight clear of the nearest one and run.", "es": "No caen en el truco. El cerco se estrecha en vez de abrirse — lo supieron siempre — y no queda otra que abrirse paso a golpes contra la más cercana y correr."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "energy", "amount": -5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:5c606a41-d7ca-4cf9-879b-a25d7977e879:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:5c606a41-d7ca-4cf9-879b-a25d7977e879:sit:slip_out_of_sight');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:5c606a41-d7ca-4cf9-879b-a25d7977e879:sit:stand_and_fight',
       NULL,
       'cnt:5c606a41-d7ca-4cf9-879b-a25d7977e879',
       'defy',
       '{"en": "Stand and fight", "es": "Plantarse y pelear"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "melee", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "The first to come in dies for it — one good stroke, cleanly given — and the pack closes no further. Wargs count their dead, and they do not spend them cheaply.", "es": "La primera en entrar muere por ello — un buen golpe, dado limpio — y la manada no se acerca más. Los wargs cuentan sus muertos, y no los gastan barato."}, "effects": [{"type": "energy", "amount": -15}]}, "failure": {"text": {"en": "One dies and there is no end to the others. They come in waves of two, patient as wolves are not, until the ground itself seems to be turning underfoot.", "es": "Una muere y no hay fin para las otras. Vienen en olas de a dos, pacientes como los lobos no son, hasta que el suelo mismo parece girar bajo los pies."}, "effects": [{"type": "wound", "level": "badly wounded"}, {"type": "energy", "amount": -15}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:5c606a41-d7ca-4cf9-879b-a25d7977e879:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:5c606a41-d7ca-4cf9-879b-a25d7977e879:sit:stand_and_fight');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:5c606a41-d7ca-4cf9-879b-a25d7977e879:sit:face_them_down',
       NULL,
       'cnt:5c606a41-d7ca-4cf9-879b-a25d7977e879',
       'defy',
       '{"en": "Face them down", "es": "Hacerles frente"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "intimidation", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "Stands tall, weapon bare, and gives them the stare back — the one thing a hunting mind does not expect. They circle, weighing it, and decide whatever this is, it has teeth.", "es": "Se yergue, el arma desnuda, y les devuelve la mirada — lo único que una mente de caza no espera. Circulan, sopesando, y deciden que sea lo que sea esto, tiene dientes."}, "effects": []}, "failure": {"text": {"en": "They are not wolves to be bluffed. The boldest comes straight in at the shout itself, and the rest close behind it.", "es": "No son lobos para farolearlos. La más osada entra directa contra el grito mismo, y las demás cierran detrás."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:5c606a41-d7ca-4cf9-879b-a25d7977e879:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:5c606a41-d7ca-4cf9-879b-a25d7977e879:sit:face_them_down');

INSERT INTO entities_narration (
  id, kind, entity_id, entity_ids, entity_type, mover_leg_id, region_id, location_id, cultural_family, form, priority, tags, aspect, presence, lore, facts, channel, variants, situations, disposition, payload
) SELECT 'cnt:716399a3-4f9d-4ab7-9a59-82e011bfcf08',
       'contact',
       NULL,
       ARRAY['f7b850f6-81d6-4473-b115-07ec5220bd35'::uuid, 'b7f03af7-8d83-4ba9-8485-5822f69b651c'::uuid, '70d83c41-7dff-42dd-b551-88c2b70d9de6'::uuid, '836d92d0-4b45-48dc-b50c-c1b6e12d07f4'::uuid, '2323a2e1-afe3-4775-9cd6-13983830e830'::uuid, 'f3ff2bc3-dc5e-4f32-8b97-319f4c359bd3'::uuid]::uuid[],
       'carnivores',
       NULL,
       NULL,
       NULL,
       NULL,
       'attacks',
       0,
       ARRAY['felt:afraid'],
       NULL,
       '{"en": "A bear, full-grown, close enough to smell. It is not hunting. It is deciding whether the traveller is a threat, a meal, or nothing at all."}'::jsonb,
       NULL,
       '{"topic": "threat_and_jeer"}'::jsonb,
       NULL,
       NULL,
       '[{"id": "cnt:716399a3-4f9d-4ab7-9a59-82e011bfcf08:sit", "tags": [], "situation": {"en": "Everything depends on the next few breaths. A bear that decides wrongly can cover ground faster than a horse."}}]'::jsonb,
       '{"en": "It stands up out of the bracken ahead — not charging, not fleeing, simply there, vast and breathing, between the traveller and the rest of the road."}'::jsonb,
       '{"source": "hand_authored", "adr": "0022", "batch": "bears"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM entities_narration WHERE id = 'cnt:716399a3-4f9d-4ab7-9a59-82e011bfcf08');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:716399a3-4f9d-4ab7-9a59-82e011bfcf08:sit:back_away_slow',
       NULL,
       'cnt:716399a3-4f9d-4ab7-9a59-82e011bfcf08',
       'avoid',
       '{"en": "Back away slow", "es": "Retroceder despacio"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "endurance", "difficulty": 8}'::jsonb,
       '{"success": {"text": {"en": "Backs away slow, sideways, unhurried — nothing in the gait that says prey. The bear watches for a long moment, then drops to all fours and goes back to whatever it was eating.", "es": "Retrocede despacio, de costado, sin prisa — nada en el paso que diga presa. El oso mira un largo momento, luego cae en cuatro patas y vuelve a lo que estaba comiendo."}, "effects": [{"type": "energy", "amount": -5}]}, "failure": {"text": {"en": "A step too fast, a stone turned underfoot — and it comes. The sprint downhill is the worst kind of luck: fast, but not fast enough.", "es": "Un paso demasiado rápido, una piedra que gira bajo el pie — y viene. La carrera cuesta abajo es la peor clase de suerte: rápida, pero no lo bastante."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "energy", "amount": -10}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:716399a3-4f9d-4ab7-9a59-82e011bfcf08:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:716399a3-4f9d-4ab7-9a59-82e011bfcf08:sit:back_away_slow');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:716399a3-4f9d-4ab7-9a59-82e011bfcf08:sit:slip_wide',
       NULL,
       'cnt:716399a3-4f9d-4ab7-9a59-82e011bfcf08',
       'avoid',
       '{"en": "Slip wide of it", "es": "Rodearla de lejos"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "stealth", "difficulty": 8}'::jsonb,
       '{"success": {"text": {"en": "Gives it a wide berth through the scrub, downwind all the way. The bear never raises its head.", "es": "Le da un rodeo amplio entre el matorral, a favor del viento todo el camino. El oso jamás levanta la cabeza."}, "effects": [{"type": "energy", "amount": -5}]}, "failure": {"text": {"en": "The wind shifts halfway around. The head comes up, the nose tests the air — and then it is a crashing, stumbling race through the bracken with the sound of it close behind.", "es": "El viento cambia a mitad del rodeo. La cabeza se alza, la nariz prueba el aire — y entonces es una carrera a los tropiezos, entre estruendo de ramas, con el sonido del oso cerca detrás."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "energy", "amount": -5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:716399a3-4f9d-4ab7-9a59-82e011bfcf08:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:716399a3-4f9d-4ab7-9a59-82e011bfcf08:sit:slip_wide');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:716399a3-4f9d-4ab7-9a59-82e011bfcf08:sit:stand_and_fight',
       NULL,
       'cnt:716399a3-4f9d-4ab7-9a59-82e011bfcf08',
       'defy',
       '{"en": "Stand and fight", "es": "Plantarse y pelear"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "melee", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "One chance and no more: the point takes it in the chest as it rears, and the weight of the fall nearly takes the blade with it. It is over in a breath, and the silence after is enormous.", "es": "Una oportunidad y no más: la punta lo toma en el pecho cuando se yergue, y el peso de la caída casi se lleva la hoja con él. Todo termina en un aliento, y el silencio después es enorme."}, "effects": [{"type": "energy", "amount": -15}]}, "failure": {"text": {"en": "Steel is not enough for this much animal. One blow from the paw — not even meant, just swatting the small thing aside — and the world spins.", "es": "El acero no alcanza para tanto animal. Un zarpazo — ni siquiera intencional, apenas apartando a la cosa pequeña — y el mundo gira."}, "effects": [{"type": "wound", "level": "badly wounded"}, {"type": "energy", "amount": -15}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:716399a3-4f9d-4ab7-9a59-82e011bfcf08:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:716399a3-4f9d-4ab7-9a59-82e011bfcf08:sit:stand_and_fight');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:716399a3-4f9d-4ab7-9a59-82e011bfcf08:sit:shout_it_off',
       NULL,
       'cnt:716399a3-4f9d-4ab7-9a59-82e011bfcf08',
       'defy',
       '{"en": "Shout it off", "es": "Ahuyentarlo a gritos"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "intimidation", "difficulty": 8}'::jsonb,
       '{"success": {"text": {"en": "Arms wide, voice huge — everything the bear does not want to be bothered with. It huffs, swings its head, and shambles off the way it came.", "es": "Brazos abiertos, voz enorme — todo lo que el oso no quiere tener que soportar. Resopla, sacude la cabeza, y se va arrastrando por donde vino."}, "effects": []}, "failure": {"text": {"en": "It is not impressed. The roar answers the shout and it comes on at a gallop — a noise like a falling tree with teeth.", "es": "No queda impresionado. El rugido responde al grito y viene al galope — un ruido como de árbol que cae, con dientes."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:716399a3-4f9d-4ab7-9a59-82e011bfcf08:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:716399a3-4f9d-4ab7-9a59-82e011bfcf08:sit:shout_it_off');

INSERT INTO entities_narration (
  id, kind, entity_id, entity_ids, entity_type, mover_leg_id, region_id, location_id, cultural_family, form, priority, tags, aspect, presence, lore, facts, channel, variants, situations, disposition, payload
) SELECT 'cnt:8ea762bf-af3d-4224-9428-c4c153d86c04',
       'contact',
       NULL,
       ARRAY['c3928a43-6d5a-4d60-8099-9253a09bb58f'::uuid, 'a75aeee3-2613-4cd7-9a26-3e5a52813af5'::uuid, '91aa42fc-d516-4215-808b-e13614d1ec79'::uuid]::uuid[],
       'giant_spiders',
       NULL,
       NULL,
       NULL,
       NULL,
       'attacks',
       0,
       ARRAY['felt:afraid'],
       NULL,
       '{"en": "It is already above the path, hanging dead-still, legs wide as a shield. It has been waiting since before the traveller was a sound in the wood."}'::jsonb,
       NULL,
       '{"topic": "threat_and_jeer"}'::jsonb,
       NULL,
       NULL,
       '[{"id": "cnt:8ea762bf-af3d-4224-9428-c4c153d86c04:sit", "tags": [], "situation": {"en": "The web closes the way ahead. Behind, the path is still open — for now."}}]'::jsonb,
       '{"en": "The first sign is not the spider but the web — a grey rope of it across the path, too thick, too low, too fresh. The second sign is the silence of birds."}'::jsonb,
       '{"source": "hand_authored", "adr": "0022", "batch": "spiders"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM entities_narration WHERE id = 'cnt:8ea762bf-af3d-4224-9428-c4c153d86c04');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:8ea762bf-af3d-4224-9428-c4c153d86c04:sit:back_out',
       NULL,
       'cnt:8ea762bf-af3d-4224-9428-c4c153d86c04',
       'avoid',
       '{"en": "Back out", "es": "Salir de espaldas"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "endurance", "difficulty": 8}'::jsonb,
       '{"success": {"text": {"en": "Backs out of the webbed ground the way it came, slow and sharp-eyed, and the thing above never commits. Some hungers will not leave the web for.", "es": "Sale de espaldas del terreno telarañado por donde vino, lenta y con ojos afilados, y la cosa de arriba jamás se decide. Hay hambres por las que no se abandona la tela."}, "effects": []}, "failure": {"text": {"en": "It drops. There is a thrashing, biting tangle in the leaf-mould — a terrible strength in something so light — and then it is free and scrabbling away, and the pain in the bite blooms like a coal.", "es": "Cae encima. Hay un forcejeo de mordiscos entre la hojarasca — una fuerza terrible en algo tan liviano — y luego queda libre y escapando a ras de suelo, con el dolor de la picadura abriendo como un carbón."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:8ea762bf-af3d-4224-9428-c4c153d86c04:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:8ea762bf-af3d-4224-9428-c4c153d86c04:sit:back_out');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:8ea762bf-af3d-4224-9428-c4c153d86c04:sit:thread_around',
       NULL,
       'cnt:8ea762bf-af3d-4224-9428-c4c153d86c04',
       'avoid',
       '{"en": "Thread around the web", "es": "Rodear la tela"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "stealth", "difficulty": 8}'::jsonb,
       '{"success": {"text": {"en": "Threads around the webbed stretch wide through the trees, placing each foot like a thief. The web never trembles.", "es": "Rodea el tramo de telaraña bien abierto entre los árboles, poniendo cada pie como un ladrón. La tela jamás tiembla."}, "effects": []}, "failure": {"text": {"en": "One thread, one touch — and the whole web sings it. The spider comes down the nearest trunk like water poured out, and the escape is a running fight through sticky ground.", "es": "Un hilo, un roce — y la tela entera lo canta. La araña baja por el tronco más cercano como agua vertida, y el escape es una pelea a la carrera por suelo pegajoso."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:8ea762bf-af3d-4224-9428-c4c153d86c04:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:8ea762bf-af3d-4224-9428-c4c153d86c04:sit:thread_around');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:8ea762bf-af3d-4224-9428-c4c153d86c04:sit:cut_it_down',
       NULL,
       'cnt:8ea762bf-af3d-4224-9428-c4c153d86c04',
       'defy',
       '{"en": "Cut it down", "es": "Cortarla"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "melee", "difficulty": 8}'::jsonb,
       '{"success": {"text": {"en": "It comes down and the blade is already waiting — once, twice, the legs curling in death like a closing fist. The wood is very quiet after.", "es": "Baja y la hoja ya está esperando — una vez, dos veces, las patas cerrándose en la muerte como un puño. El bosque queda muy quieto después."}, "effects": [{"type": "energy", "amount": -10}]}, "failure": {"text": {"en": "It is faster than it has any right to be — inside the guard and the fangs strike before the blade can turn. The venom burns all the rest of the day.", "es": "Es más rápida de lo que tiene derecho a ser — dentro de la guardia y los colmillos golpean antes de que la hoja pueda girar. El veneno quema todo el resto del día."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 5}, {"type": "energy", "amount": -10}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:8ea762bf-af3d-4224-9428-c4c153d86c04:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:8ea762bf-af3d-4224-9428-c4c153d86c04:sit:cut_it_down');

INSERT INTO entities_narration (
  id, kind, entity_id, entity_ids, entity_type, mover_leg_id, region_id, location_id, cultural_family, form, priority, tags, aspect, presence, lore, facts, channel, variants, situations, disposition, payload
) SELECT 'cnt:2d87c77b-f128-4875-9538-349bcfed530a',
       'contact',
       NULL,
       ARRAY['d3a35ef0-2b84-4234-b079-6f9602e120ce'::uuid, '267142a7-6b80-4b64-ae25-1e9531c778b1'::uuid, 'b64c6dea-1ac4-44ea-ad56-af303a424eff'::uuid, 'f3fd6129-aa5c-475d-b750-a2588eaf9787'::uuid, '3a6bae34-7ee5-4654-8f73-4eda362ac011'::uuid, '66f75c77-d90b-4ff5-acaf-5106c523a9d8'::uuid, 'd7ddc76f-97f4-4814-80a1-bcc66bcbf207'::uuid, 'eec8aa66-8041-4537-9387-a4f6aa02230d'::uuid, 'b0fa4b6c-76c4-44f2-b55c-3427f607c433'::uuid, 'f38aad29-da9e-449d-9bbd-e38f92cea941'::uuid, 'ba0f7acd-7d65-4b3b-8425-bf2363bc04b2'::uuid, 'fcdd4c2a-4a10-408b-8a33-6fb81c70f563'::uuid]::uuid[],
       'orcs',
       NULL,
       NULL,
       NULL,
       NULL,
       'attacks',
       0,
       ARRAY['felt:afraid'],
       NULL,
       '{"en": "Orcs — a patrol or a warband, hard to say how many. They have the look of those who have done this before and expect no trouble."}'::jsonb,
       NULL,
       '{"topic": "threat_and_jeer"}'::jsonb,
       NULL,
       NULL,
       '[{"id": "cnt:2d87c77b-f128-4875-9538-349bcfed530a:sit", "tags": [], "situation": {"en": "They have not seen the traveller clearly yet — or they have, and are herding. Either way the next moments decide it."}}]'::jsonb,
       '{"en": "A whistle from the rocks — not a bird, nothing like a bird, though it tries. Then movement: grey-green shapes spreading out along the slope, unhurried, already sure."}'::jsonb,
       '{"source": "hand_authored", "adr": "0022", "batch": "orcs"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM entities_narration WHERE id = 'cnt:2d87c77b-f128-4875-9538-349bcfed530a');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:2d87c77b-f128-4875-9538-349bcfed530a:sit:run_for_it',
       NULL,
       'cnt:2d87c77b-f128-4875-9538-349bcfed530a',
       'avoid',
       '{"en": "Run for it", "es": "Salir corriendo"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "endurance", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "Runs while the distance is still kind — orc boots are ironshod and slow on bare rock, and the gap widens with every mile until the shouting falls away.", "es": "Corre mientras la distancia todavía es amable — las botas orcas van herradas y son lentas sobre roca desnuda, y la ventaja crece a cada milla hasta que los gritos se apagan."}, "effects": [{"type": "energy", "amount": -10}]}, "failure": {"text": {"en": "They run in relays, the fresh ones always forward — orcish cunning applied to legs. The end comes on a bare slope with nowhere left to go.", "es": "Corren en relevos, los frescos siempre adelante — astucia orca aplicada a las piernas. El final llega en una ladera desnuda sin adónde ir."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "energy", "amount": -10}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:2d87c77b-f128-4875-9538-349bcfed530a:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:2d87c77b-f128-4875-9538-349bcfed530a:sit:run_for_it');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:2d87c77b-f128-4875-9538-349bcfed530a:sit:hide',
       NULL,
       'cnt:2d87c77b-f128-4875-9538-349bcfed530a',
       'avoid',
       '{"en": "Hide", "es": "Esconderse"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "stealth", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "Flat in the heather, breathing through the mouth, while ironshod boots pass close enough to count the nails. They curse, cast about once or twice, and move on — orcs hate a cold trail.", "es": "Pegada al brezo, respirando por la boca, mientras las botas herradas pasan tan cerca que se cuentan los clavos. Maldicen, rastrean una o dos veces, y siguen — los orcos odian un rastro frío."}, "effects": [{"type": "energy", "amount": -5}]}, "failure": {"text": {"en": "A tracker finds the sign — bent grass, a scrape of mud — and the whistle goes up. What follows is a running, scrambling fight out of a closing ring.", "es": "Un rastreador encuentra la señal — pasto doblado, un raspón de barro — y el silbato se alza. Lo que sigue es una pelea a la carrera y a los tropiezos para salir de un anillo que se cierra."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "energy", "amount": -5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:2d87c77b-f128-4875-9538-349bcfed530a:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:2d87c77b-f128-4875-9538-349bcfed530a:sit:hide');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:2d87c77b-f128-4875-9538-349bcfed530a:sit:stand_and_fight',
       NULL,
       'cnt:2d87c77b-f128-4875-9538-349bcfed530a',
       'defy',
       '{"en": "Stand and fight", "es": "Plantarse y pelear"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "melee", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "The first two come in careless, expecting meat, and die for the mistake. The rest do what orcs do when the price of meat goes up: they argue, they circle, and in the end they remember urgent business elsewhere.", "es": "Los dos primeros entran descuidados, esperando carne, y mueren por el error. El resto hace lo que los orcos hacen cuando el precio de la carne sube: discuten, circulan, y al final recuerdan asuntos urgentes en otra parte."}, "effects": [{"type": "energy", "amount": -15}]}, "failure": {"text": {"en": "There are too many. It is shield-side and knife-work and a red haze, and when they finally drag off their dead the traveller is left counting what is broken.", "es": "Son demasiados. Es cubrirse con el escudo y trabajo de cuchillo y una bruma roja, y cuando por fin arrastran a sus muertos, el viajero queda contando lo que se le quebró."}, "effects": [{"type": "wound", "level": "badly wounded"}, {"type": "energy", "amount": -15}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:2d87c77b-f128-4875-9538-349bcfed530a:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:2d87c77b-f128-4875-9538-349bcfed530a:sit:stand_and_fight');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:2d87c77b-f128-4875-9538-349bcfed530a:sit:bluff_your_way_out',
       NULL,
       'cnt:2d87c77b-f128-4875-9538-349bcfed530a',
       'talk',
       '{"en": "Bluff your way out", "es": "Salir con un engaño"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "deception", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "A name and an errand spun out of thin air — a servant of the wrong master, on business too urgent to delay and too important to eat. Orcs fear their betters far more than they fear death, and they let it pass.", "es": "Un nombre y un mandado hilados de la nada — un sirviente del amo equivocado, con asuntos demasiado urgentes para demorar y demasiado importantes para comérselo. Los orcos temen a sus superiores mucho más que a la muerte, y la dejan pasar."}, "effects": [{"type": "shadow", "amount": 5}]}, "failure": {"text": {"en": "The bluff lasts three sentences. Orcs are liars born and they know the sound of it — the nearest one grins like a splitting melon and reaches for a rope.", "es": "El engaño dura tres frases. Los orcos son mentirosos natos y conocen el sonido de la mentira — el más cercano sonríe como una calabaza que se parte y tira de una soga."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:2d87c77b-f128-4875-9538-349bcfed530a:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:2d87c77b-f128-4875-9538-349bcfed530a:sit:bluff_your_way_out');
