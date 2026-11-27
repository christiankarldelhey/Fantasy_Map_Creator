-- ADR-0022 threats batch 3: legacy attack rows become real forks.
-- trolls, undead, drakes, water creatures, demons, and the orc/spider
-- fallbacks all gain authored options; uruk-hai and warg-riders get
-- their own whitelist rows. The 11 legacy :sole interactions are the
-- only deletions; the narration rows keep their voice. Two situations
-- are reworded where they contradicted the new options.

-- delete ONLY the legacy sole interactions
DELETE FROM interactions WHERE id IN ('cnt:0c963fb6-d8c1-40ae-a2db-42e2e214c95f:sit:sole', 'cnt:6f34d86c-c5df-4595-a228-6a3d6e9f8132:sit:sole', 'cnt:990d84f4-d138-44cf-880e-0db4e5c2ae29:sit:sole', 'cnt:15c14f13-8bbe-4c24-be96-2f07054d35c4:sit:sole', 'cnt:721d8397-bffb-4f49-b7e0-00389579b630:sit:sole', 'cnt:f3332d07-c333-470a-914a-edd47210d4b0:sit:sole', 'cnt:4ab1cf38-e3fe-4b4e-b98b-11b72cafdeb5:sit:sole', 'cnt:571f5dd2-9e06-4838-ba7e-eded9308b6f8:sit:sole', 'cnt:d9a6563b-d055-4bfa-a12e-a461a3962b00:sit:sole', 'cnt:2043ca0d-5e57-4351-8e2d-008afe1cf9e3:sit:sole', 'cnt:0b785a37-66d7-4cdd-8f2b-56a5ad1a2c64:sit:sole');

-- reword the two situations that contradicted the new options
UPDATE entities_narration SET situations = '[{"id": "cnt:0c963fb6-d8c1-40ae-a2db-42e2e214c95f:sit", "tags": [], "situation": {"en": "Fifteen seconds to impact at this closing speed. Whatever happens next, it happens now."}}]'::jsonb
WHERE id = 'cnt:0c963fb6-d8c1-40ae-a2db-42e2e214c95f';

UPDATE entities_narration SET situations = '[{"id": "cnt:4ab1cf38-e3fe-4b4e-b98b-11b72cafdeb5:sit", "tags": [], "situation": {"en": "The way back may already be web. The way forward may be equally closed by now — or may not."}}]'::jsonb
WHERE id = 'cnt:4ab1cf38-e3fe-4b4e-b98b-11b72cafdeb5';

INSERT INTO entities_narration (
  id, kind, entity_id, entity_ids, entity_type, mover_leg_id, region_id, location_id, cultural_family, form, priority, tags, aspect, presence, lore, facts, channel, variants, situations, disposition, payload
) SELECT 'cnt:7e3d53c4-2edb-4500-8cc7-98bc003aae91',
       'contact',
       NULL,
       ARRAY['bdb8190e-09bf-451c-836b-72ee6fcb1710'::uuid, 'c89ff2d0-b1cb-4ea0-bab6-9306ac788564'::uuid]::uuid[],
       'orcs',
       NULL,
       NULL,
       NULL,
       NULL,
       'attacks',
       0,
       ARRAY['felt:afraid'],
       NULL,
       '{"en": "Uruk-hai. Bred for this, whoever bred them: taller than common orcs, broader, unbothered by the sun. They do not look hungry. They look employed."}'::jsonb,
       NULL,
       '{"topic": "threat_and_jeer"}'::jsonb,
       NULL,
       NULL,
       '[{"id": "cnt:7e3d53c4-2edb-4500-8cc7-98bc003aae91:sit", "tags": [], "situation": {"en": "They have already measured the ground and the traveller both. There will be no confusion and no mercy in what happens next."}}]'::jsonb,
       '{"en": "No whistle, no jeering. A horn-note, once, and then the sound of ironshod boots in step — actual step — coming up the slope in a line that does not waver."}'::jsonb,
       '{"source": "hand_authored", "adr": "0022", "batch": "uruk_hai"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM entities_narration WHERE id = 'cnt:7e3d53c4-2edb-4500-8cc7-98bc003aae91');

INSERT INTO entities_narration (
  id, kind, entity_id, entity_ids, entity_type, mover_leg_id, region_id, location_id, cultural_family, form, priority, tags, aspect, presence, lore, facts, channel, variants, situations, disposition, payload
) SELECT 'cnt:2f3960fe-8f02-44c6-afe1-45eb795d8ad6',
       'contact',
       NULL,
       ARRAY['180e506d-071e-46a2-8a3f-7b655d80c966'::uuid]::uuid[],
       'orcs',
       NULL,
       NULL,
       NULL,
       NULL,
       'attacks',
       0,
       ARRAY['felt:afraid'],
       NULL,
       '{"en": "Warg-riders, a scouting pack of them. The mounts are worse than the riders; the riders know it and use it."}'::jsonb,
       NULL,
       '{"topic": "threat_and_jeer"}'::jsonb,
       NULL,
       NULL,
       '[{"id": "cnt:2f3960fe-8f02-44c6-afe1-45eb795d8ad6:sit", "tags": [], "situation": {"en": "They spread into a loose crescent without a word spoken. On open ground they are faster than anything on two legs, and they know it."}}]'::jsonb,
       '{"en": "Dust first, then the sound — not hooves but claws, a loping wrongness of gait — and then the shapes themselves: wolves the size of ponies, and on their backs, bows already strung."}'::jsonb,
       '{"source": "hand_authored", "adr": "0022", "batch": "warg_riders"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM entities_narration WHERE id = 'cnt:2f3960fe-8f02-44c6-afe1-45eb795d8ad6');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:0c963fb6-d8c1-40ae-a2db-42e2e214c95f:sit:run_for_it',
       NULL,
       'cnt:0c963fb6-d8c1-40ae-a2db-42e2e214c95f',
       'avoid',
       '{"en": "Run for it", "es": "Salir corriendo"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "endurance", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "Runs while the ground is still forgiving — a troll is fast for three steps and then it is only heavy, and the distance grows with every stride.", "es": "Corre mientras el terreno todavía perdona — un troll es rápido por tres pasos y después solo es pesado, y la distancia crece a cada zancada."}, "effects": [{"type": "energy", "amount": -10}]}, "failure": {"text": {"en": "Fast for three steps is fast enough when the steps are eight feet long. It is the arm, not the legs, that does the work — a swipe like a falling branch.", "es": "Rápido por tres pasos alcanza cuando los pasos miden ocho pies. Es el brazo, no las piernas, el que hace el trabajo — un manotazo como una rama que cae."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "energy", "amount": -10}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:0c963fb6-d8c1-40ae-a2db-42e2e214c95f:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:0c963fb6-d8c1-40ae-a2db-42e2e214c95f:sit:run_for_it');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:0c963fb6-d8c1-40ae-a2db-42e2e214c95f:sit:hide',
       NULL,
       'cnt:0c963fb6-d8c1-40ae-a2db-42e2e214c95f',
       'avoid',
       '{"en": "Hide", "es": "Esconderse"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "stealth", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "Behind the nearest boulder big enough to argue with, still as the stone itself. It passes close enough to smell — cold earth and old meat — and never once looks down.", "es": "Tras el peñasco más cercano lo bastante grande para discutirle, quieta como la piedra misma. Pasa tan cerca que se lo huele — tierra fría y carne vieja — y ni una vez mira abajo."}, "effects": [{"type": "energy", "amount": -5}]}, "failure": {"text": {"en": "Trolls are stupid the way water is wet, but they are not blind. It stops. It sniffs. And then it is simply a matter of running before the thinking catches up.", "es": "Los trolls son tontos como el agua es mojada, pero no son ciegos. Se detiene. Resopla. Y después es simplemente cuestión de correr antes de que el pensamiento lo alcance."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "energy", "amount": -5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:0c963fb6-d8c1-40ae-a2db-42e2e214c95f:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:0c963fb6-d8c1-40ae-a2db-42e2e214c95f:sit:hide');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:0c963fb6-d8c1-40ae-a2db-42e2e214c95f:sit:stand_and_fight',
       NULL,
       'cnt:0c963fb6-d8c1-40ae-a2db-42e2e214c95f',
       'defy',
       '{"en": "Stand and fight", "es": "Plantarse y pelear"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "melee", "difficulty": 13}'::jsonb,
       '{"success": {"text": {"en": "Not a fight — butchery reversed: the one gap in the arm-hide, behind the knee, given in passing. The giant goes down like dropped scaffolding, and nothing that size is fast twice in a day.", "es": "No es pelea — es carnicería al revés: el único hueco en la piel de cuero, tras la rodilla, dado de pasada. El gigante cae como un andamio desarmado, y nada de ese tamaño es rápido dos veces en un día."}, "effects": [{"type": "energy", "amount": -15}]}, "failure": {"text": {"en": "Steel bites it the way a pin bites a man. The answer is one backhand — not even aimed, just the irritation of something small that stings.", "es": "El acero lo pica como un alfiler pica a un hombre. La respuesta es un revés — ni siquiera apuntado, apenas la irritación de algo pequeño que pincha."}, "effects": [{"type": "wound", "level": "badly wounded"}, {"type": "energy", "amount": -15}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:0c963fb6-d8c1-40ae-a2db-42e2e214c95f:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:0c963fb6-d8c1-40ae-a2db-42e2e214c95f:sit:stand_and_fight');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:0c963fb6-d8c1-40ae-a2db-42e2e214c95f:sit:trick_them',
       NULL,
       'cnt:0c963fb6-d8c1-40ae-a2db-42e2e214c95f',
       'talk',
       '{"en": "Trick them into arguing", "es": "Engatusarlos a discutir"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "deception", "difficulty": 11}'::jsonb,
       '{"success": {"text": {"en": "Talking fast and foolish — arguments about the best way to cook a traveller, questions with long answers, anything to keep the slow wits turning. Trolls argue the way they walk: loudly and nowhere fast. By the time they agree, the traveller is a distant problem.", "es": "Hablando rápido y en tonterías — discusiones sobre la mejor manera de cocinar un viajero, preguntas de respuesta larga, lo que sea para mantener los sesos lentos girando. Los trolls discuten como caminan: fuerte y sin llegar a ningún lado. Para cuando se ponen de acuerdo, el viajero es un problema distante."}, "effects": [{"type": "energy", "amount": -5}]}, "failure": {"text": {"en": "The clever talk lasts until one of them stops listening and simply reaches. Trolls may be slow to think, but they are not required to think.", "es": "La charla ingeniosa dura hasta que uno deja de escuchar y simplemente estira la mano. Los trolls serán lentos para pensar, pero no están obligados a pensar."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:0c963fb6-d8c1-40ae-a2db-42e2e214c95f:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:0c963fb6-d8c1-40ae-a2db-42e2e214c95f:sit:trick_them');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:6f34d86c-c5df-4595-a228-6a3d6e9f8132:sit:run_for_it',
       NULL,
       'cnt:6f34d86c-c5df-4595-a228-6a3d6e9f8132',
       'avoid',
       '{"en": "Run for it", "es": "Salir corriendo"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "endurance", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "Runs while the ground is still forgiving — a troll is fast for three steps and then it is only heavy, and the distance grows with every stride.", "es": "Corre mientras el terreno todavía perdona — un troll es rápido por tres pasos y después solo es pesado, y la distancia crece a cada zancada."}, "effects": [{"type": "energy", "amount": -10}]}, "failure": {"text": {"en": "Fast for three steps is fast enough when the steps are eight feet long. It is the arm, not the legs, that does the work — a swipe like a falling branch.", "es": "Rápido por tres pasos alcanza cuando los pasos miden ocho pies. Es el brazo, no las piernas, el que hace el trabajo — un manotazo como una rama que cae."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "energy", "amount": -10}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:6f34d86c-c5df-4595-a228-6a3d6e9f8132:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:6f34d86c-c5df-4595-a228-6a3d6e9f8132:sit:run_for_it');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:6f34d86c-c5df-4595-a228-6a3d6e9f8132:sit:hide',
       NULL,
       'cnt:6f34d86c-c5df-4595-a228-6a3d6e9f8132',
       'avoid',
       '{"en": "Hide", "es": "Esconderse"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "stealth", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "Behind the nearest boulder big enough to argue with, still as the stone itself. It passes close enough to smell — cold earth and old meat — and never once looks down.", "es": "Tras el peñasco más cercano lo bastante grande para discutirle, quieta como la piedra misma. Pasa tan cerca que se lo huele — tierra fría y carne vieja — y ni una vez mira abajo."}, "effects": [{"type": "energy", "amount": -5}]}, "failure": {"text": {"en": "Trolls are stupid the way water is wet, but they are not blind. It stops. It sniffs. And then it is simply a matter of running before the thinking catches up.", "es": "Los trolls son tontos como el agua es mojada, pero no son ciegos. Se detiene. Resopla. Y después es simplemente cuestión de correr antes de que el pensamiento lo alcance."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "energy", "amount": -5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:6f34d86c-c5df-4595-a228-6a3d6e9f8132:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:6f34d86c-c5df-4595-a228-6a3d6e9f8132:sit:hide');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:6f34d86c-c5df-4595-a228-6a3d6e9f8132:sit:stand_and_fight',
       NULL,
       'cnt:6f34d86c-c5df-4595-a228-6a3d6e9f8132',
       'defy',
       '{"en": "Stand and fight", "es": "Plantarse y pelear"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "melee", "difficulty": 13}'::jsonb,
       '{"success": {"text": {"en": "Not a fight — butchery reversed: the one gap in the arm-hide, behind the knee, given in passing. The giant goes down like dropped scaffolding, and nothing that size is fast twice in a day.", "es": "No es pelea — es carnicería al revés: el único hueco en la piel de cuero, tras la rodilla, dado de pasada. El gigante cae como un andamio desarmado, y nada de ese tamaño es rápido dos veces en un día."}, "effects": [{"type": "energy", "amount": -15}]}, "failure": {"text": {"en": "Steel bites it the way a pin bites a man. The answer is one backhand — not even aimed, just the irritation of something small that stings.", "es": "El acero lo pica como un alfiler pica a un hombre. La respuesta es un revés — ni siquiera apuntado, apenas la irritación de algo pequeño que pincha."}, "effects": [{"type": "wound", "level": "badly wounded"}, {"type": "energy", "amount": -15}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:6f34d86c-c5df-4595-a228-6a3d6e9f8132:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:6f34d86c-c5df-4595-a228-6a3d6e9f8132:sit:stand_and_fight');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:6f34d86c-c5df-4595-a228-6a3d6e9f8132:sit:trick_them',
       NULL,
       'cnt:6f34d86c-c5df-4595-a228-6a3d6e9f8132',
       'talk',
       '{"en": "Trick them into arguing", "es": "Engatusarlos a discutir"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "deception", "difficulty": 11}'::jsonb,
       '{"success": {"text": {"en": "Talking fast and foolish — arguments about the best way to cook a traveller, questions with long answers, anything to keep the slow wits turning. Trolls argue the way they walk: loudly and nowhere fast. By the time they agree, the traveller is a distant problem.", "es": "Hablando rápido y en tonterías — discusiones sobre la mejor manera de cocinar un viajero, preguntas de respuesta larga, lo que sea para mantener los sesos lentos girando. Los trolls discuten como caminan: fuerte y sin llegar a ningún lado. Para cuando se ponen de acuerdo, el viajero es un problema distante."}, "effects": [{"type": "energy", "amount": -5}]}, "failure": {"text": {"en": "The clever talk lasts until one of them stops listening and simply reaches. Trolls may be slow to think, but they are not required to think.", "es": "La charla ingeniosa dura hasta que uno deja de escuchar y simplemente estira la mano. Los trolls serán lentos para pensar, pero no están obligados a pensar."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:6f34d86c-c5df-4595-a228-6a3d6e9f8132:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:6f34d86c-c5df-4595-a228-6a3d6e9f8132:sit:trick_them');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:990d84f4-d138-44cf-880e-0db4e5c2ae29:sit:run_for_it',
       NULL,
       'cnt:990d84f4-d138-44cf-880e-0db4e5c2ae29',
       'avoid',
       '{"en": "Run for it", "es": "Salir corriendo"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "endurance", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "Runs while the distance is still kind — orc boots are ironshod and slow on bare rock, and the gap widens with every mile until the shouting falls away.", "es": "Corre mientras la distancia todavía es amable — las botas orcas van herradas y son lentas sobre roca desnuda, y la ventaja crece a cada milla hasta que los gritos se apagan."}, "effects": [{"type": "energy", "amount": -10}]}, "failure": {"text": {"en": "They run in relays, the fresh ones always forward — orcish cunning applied to legs. The end comes on a bare slope with nowhere left to go.", "es": "Corren en relevos, los frescos siempre adelante — astucia orca aplicada a las piernas. El final llega en una ladera desnuda sin adónde ir."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "energy", "amount": -10}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:990d84f4-d138-44cf-880e-0db4e5c2ae29:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:990d84f4-d138-44cf-880e-0db4e5c2ae29:sit:run_for_it');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:990d84f4-d138-44cf-880e-0db4e5c2ae29:sit:hide',
       NULL,
       'cnt:990d84f4-d138-44cf-880e-0db4e5c2ae29',
       'avoid',
       '{"en": "Hide", "es": "Esconderse"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "stealth", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "Flat in the heather, breathing through the mouth, while ironshod boots pass close enough to count the nails. They curse, cast about once or twice, and move on — orcs hate a cold trail.", "es": "Pegada al brezo, respirando por la boca, mientras las botas herradas pasan tan cerca que se cuentan los clavos. Maldicen, rastrean una o dos veces, y siguen — los orcos odian un rastro frío."}, "effects": [{"type": "energy", "amount": -5}]}, "failure": {"text": {"en": "A tracker finds the sign — bent grass, a scrape of mud — and the whistle goes up. What follows is a running, scrambling fight out of a closing ring.", "es": "Un rastreador encuentra la señal — pasto doblado, un raspón de barro — y el silbato se alza. Lo que sigue es una pelea a la carrera y a los tropiezos para salir de un anillo que se cierra."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "energy", "amount": -5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:990d84f4-d138-44cf-880e-0db4e5c2ae29:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:990d84f4-d138-44cf-880e-0db4e5c2ae29:sit:hide');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:990d84f4-d138-44cf-880e-0db4e5c2ae29:sit:stand_and_fight',
       NULL,
       'cnt:990d84f4-d138-44cf-880e-0db4e5c2ae29',
       'defy',
       '{"en": "Stand and fight", "es": "Plantarse y pelear"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "melee", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "The first two come in careless, expecting meat, and die for the mistake. The rest do what orcs do when the price of meat goes up: they argue, they circle, and in the end they remember urgent business elsewhere.", "es": "Los dos primeros entran descuidados, esperando carne, y mueren por el error. El resto hace lo que los orcos hacen cuando el precio de la carne sube: discuten, circulan, y al final recuerdan asuntos urgentes en otra parte."}, "effects": [{"type": "energy", "amount": -15}]}, "failure": {"text": {"en": "There are too many. It is shield-side and knife-work and a red haze, and when they finally drag off their dead the traveller is left counting what is broken.", "es": "Son demasiados. Es cubrirse con el escudo y trabajo de cuchillo y una bruma roja, y cuando por fin arrastran a sus muertos, el viajero queda contando lo que se le quebró."}, "effects": [{"type": "wound", "level": "badly wounded"}, {"type": "energy", "amount": -15}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:990d84f4-d138-44cf-880e-0db4e5c2ae29:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:990d84f4-d138-44cf-880e-0db4e5c2ae29:sit:stand_and_fight');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:990d84f4-d138-44cf-880e-0db4e5c2ae29:sit:bluff_your_way_out',
       NULL,
       'cnt:990d84f4-d138-44cf-880e-0db4e5c2ae29',
       'talk',
       '{"en": "Bluff your way out", "es": "Salir con un engaño"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "deception", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "A name and an errand spun out of thin air — a servant of the wrong master, on business too urgent to delay and too important to eat. Orcs fear their betters far more than they fear death, and they let it pass.", "es": "Un nombre y un mandado hilados de la nada — un sirviente del amo equivocado, con asuntos demasiado urgentes para demorar y demasiado importantes para comérselo. Los orcos temen a sus superiores mucho más que a la muerte, y la dejan pasar."}, "effects": [{"type": "shadow", "amount": 5}]}, "failure": {"text": {"en": "The bluff lasts three sentences. Orcs are liars born and they know the sound of it — the nearest one grins like a splitting melon and reaches for a rope.", "es": "El engaño dura tres frases. Los orcos son mentirosos natos y conocen el sonido de la mentira — el más cercano sonríe como una calabaza que se parte y tira de una soga."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:990d84f4-d138-44cf-880e-0db4e5c2ae29:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:990d84f4-d138-44cf-880e-0db4e5c2ae29:sit:bluff_your_way_out');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:15c14f13-8bbe-4c24-be96-2f07054d35c4:sit:run_for_it',
       NULL,
       'cnt:15c14f13-8bbe-4c24-be96-2f07054d35c4',
       'avoid',
       '{"en": "Run for it", "es": "Salir corriendo"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "endurance", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "Runs while the distance is still kind — orc boots are ironshod and slow on bare rock, and the gap widens with every mile until the shouting falls away.", "es": "Corre mientras la distancia todavía es amable — las botas orcas van herradas y son lentas sobre roca desnuda, y la ventaja crece a cada milla hasta que los gritos se apagan."}, "effects": [{"type": "energy", "amount": -10}]}, "failure": {"text": {"en": "They run in relays, the fresh ones always forward — orcish cunning applied to legs. The end comes on a bare slope with nowhere left to go.", "es": "Corren en relevos, los frescos siempre adelante — astucia orca aplicada a las piernas. El final llega en una ladera desnuda sin adónde ir."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "energy", "amount": -10}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:15c14f13-8bbe-4c24-be96-2f07054d35c4:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:15c14f13-8bbe-4c24-be96-2f07054d35c4:sit:run_for_it');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:15c14f13-8bbe-4c24-be96-2f07054d35c4:sit:hide',
       NULL,
       'cnt:15c14f13-8bbe-4c24-be96-2f07054d35c4',
       'avoid',
       '{"en": "Hide", "es": "Esconderse"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "stealth", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "Flat in the heather, breathing through the mouth, while ironshod boots pass close enough to count the nails. They curse, cast about once or twice, and move on — orcs hate a cold trail.", "es": "Pegada al brezo, respirando por la boca, mientras las botas herradas pasan tan cerca que se cuentan los clavos. Maldicen, rastrean una o dos veces, y siguen — los orcos odian un rastro frío."}, "effects": [{"type": "energy", "amount": -5}]}, "failure": {"text": {"en": "A tracker finds the sign — bent grass, a scrape of mud — and the whistle goes up. What follows is a running, scrambling fight out of a closing ring.", "es": "Un rastreador encuentra la señal — pasto doblado, un raspón de barro — y el silbato se alza. Lo que sigue es una pelea a la carrera y a los tropiezos para salir de un anillo que se cierra."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "energy", "amount": -5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:15c14f13-8bbe-4c24-be96-2f07054d35c4:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:15c14f13-8bbe-4c24-be96-2f07054d35c4:sit:hide');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:15c14f13-8bbe-4c24-be96-2f07054d35c4:sit:stand_and_fight',
       NULL,
       'cnt:15c14f13-8bbe-4c24-be96-2f07054d35c4',
       'defy',
       '{"en": "Stand and fight", "es": "Plantarse y pelear"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "melee", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "The first two come in careless, expecting meat, and die for the mistake. The rest do what orcs do when the price of meat goes up: they argue, they circle, and in the end they remember urgent business elsewhere.", "es": "Los dos primeros entran descuidados, esperando carne, y mueren por el error. El resto hace lo que los orcos hacen cuando el precio de la carne sube: discuten, circulan, y al final recuerdan asuntos urgentes en otra parte."}, "effects": [{"type": "energy", "amount": -15}]}, "failure": {"text": {"en": "There are too many. It is shield-side and knife-work and a red haze, and when they finally drag off their dead the traveller is left counting what is broken.", "es": "Son demasiados. Es cubrirse con el escudo y trabajo de cuchillo y una bruma roja, y cuando por fin arrastran a sus muertos, el viajero queda contando lo que se le quebró."}, "effects": [{"type": "wound", "level": "badly wounded"}, {"type": "energy", "amount": -15}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:15c14f13-8bbe-4c24-be96-2f07054d35c4:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:15c14f13-8bbe-4c24-be96-2f07054d35c4:sit:stand_and_fight');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:15c14f13-8bbe-4c24-be96-2f07054d35c4:sit:bluff_your_way_out',
       NULL,
       'cnt:15c14f13-8bbe-4c24-be96-2f07054d35c4',
       'talk',
       '{"en": "Bluff your way out", "es": "Salir con un engaño"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "deception", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "A name and an errand spun out of thin air — a servant of the wrong master, on business too urgent to delay and too important to eat. Orcs fear their betters far more than they fear death, and they let it pass.", "es": "Un nombre y un mandado hilados de la nada — un sirviente del amo equivocado, con asuntos demasiado urgentes para demorar y demasiado importantes para comérselo. Los orcos temen a sus superiores mucho más que a la muerte, y la dejan pasar."}, "effects": [{"type": "shadow", "amount": 5}]}, "failure": {"text": {"en": "The bluff lasts three sentences. Orcs are liars born and they know the sound of it — the nearest one grins like a splitting melon and reaches for a rope.", "es": "El engaño dura tres frases. Los orcos son mentirosos natos y conocen el sonido de la mentira — el más cercano sonríe como una calabaza que se parte y tira de una soga."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:15c14f13-8bbe-4c24-be96-2f07054d35c4:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:15c14f13-8bbe-4c24-be96-2f07054d35c4:sit:bluff_your_way_out');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:721d8397-bffb-4f49-b7e0-00389579b630:sit:run_for_it',
       NULL,
       'cnt:721d8397-bffb-4f49-b7e0-00389579b630',
       'avoid',
       '{"en": "Run for it", "es": "Salir corriendo"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "endurance", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "Runs, and does not look back no matter what the voice behind says or whose voice it borrows. The dead are patient but they are slow, and dawn is not so far.", "es": "Corre, y no mira atrás sin importar qué diga la voz de atrás ni a quién le haya pedido la voz prestada. Los muertos son pacientes pero son lentos, y el alba no está tan lejos."}, "effects": [{"type": "shadow", "amount": 2}, {"type": "energy", "amount": -10}]}, "failure": {"text": {"en": "It does not chase — it is simply there, around the next turning and the next, closer each time, never hurrying. The cold of it gets into the lungs long before the touch.", "es": "No persigue — simplemente está ahí, tras el próximo recodo y el siguiente, más cerca cada vez, sin apurarse jamás. El frío se le mete a uno en los pulmones mucho antes que el tacto."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 5}, {"type": "energy", "amount": -10}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:721d8397-bffb-4f49-b7e0-00389579b630:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:721d8397-bffb-4f49-b7e0-00389579b630:sit:run_for_it');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:721d8397-bffb-4f49-b7e0-00389579b630:sit:hide',
       NULL,
       'cnt:721d8397-bffb-4f49-b7e0-00389579b630',
       'avoid',
       '{"en": "Hide", "es": "Esconderse"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "stealth", "difficulty": 11}'::jsonb,
       '{"success": {"text": {"en": "Buries the living warmth under wet earth and dead leaves, breathing shallow, heartbeat slow. It passes — close, wrong, cold — drawn by nothing it can name.", "es": "Entierra el calor de la vida bajo tierra húmeda y hojas muertas, respirando poco, el corazón lento. Pasa — cerca, mal, frío — atraído por nada que pueda nombrar."}, "effects": [{"type": "shadow", "amount": 2}]}, "failure": {"text": {"en": "The dead do not find with eyes. It turns — not toward the hiding place, it was always toward the hiding place — and the cold arrives before the shape does.", "es": "Los muertos no encuentran con ojos. Se gira — no hacia el escondite: siempre estuvo hacia el escondite — y el frío llega antes que la forma."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:721d8397-bffb-4f49-b7e0-00389579b630:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:721d8397-bffb-4f49-b7e0-00389579b630:sit:hide');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:721d8397-bffb-4f49-b7e0-00389579b630:sit:stand_and_fight',
       NULL,
       'cnt:721d8397-bffb-4f49-b7e0-00389579b630',
       'defy',
       '{"en": "Stand and fight", "es": "Plantarse y pelear"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "melee", "difficulty": 12}'::jsonb,
       '{"success": {"text": {"en": "The blade passes through and something tears in it nonetheless — not flesh: the shape of it, the will that holds it together. It comes apart like smoke in wind. There is no victory in it, only an ending, and a deep cold in the hand that holds the sword.", "es": "La hoja lo atraviesa y aun así algo se rasga en la cosa — no carne: su forma, la voluntad que la mantiene unida. Se deshace como humo al viento. No hay victoria en ello, solo un final, y un frío profundo en la mano que sostiene la espada."}, "effects": [{"type": "shadow", "amount": 2}, {"type": "energy", "amount": -15}]}, "failure": {"text": {"en": "The sword means nothing to it. The touch means everything to the sword-arm: cold that is not cold but absence, going up to the shoulder like a black frost.", "es": "La espada no significa nada para eso. El tacto significa todo para el brazo de la espada: un frío que no es frío sino ausencia, subiendo hasta el hombro como una escarcha negra."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 10}, {"type": "energy", "amount": -15}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:721d8397-bffb-4f49-b7e0-00389579b630:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:721d8397-bffb-4f49-b7e0-00389579b630:sit:stand_and_fight');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:721d8397-bffb-4f49-b7e0-00389579b630:sit:stand_fast',
       NULL,
       'cnt:721d8397-bffb-4f49-b7e0-00389579b630',
       'defy',
       '{"en": "Stand fast and name it", "es": "Resistir y nombrarlo"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "insight", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "Does not run. Does not look away. Names it — truly, by what it is and what it was — and the naming is a wall it cannot simply pass. It stays. Hours or minutes, who can say — and then it is thinner, and then it is not there.", "es": "No corre. No aparta la mirada. Lo nombra — de verdad, por lo que es y lo que fue — y el nombrarlo es un muro que no puede simplemente cruzar. Se queda. Horas o minutos, quién sabe — y luego es más tenue, y luego ya no está."}, "effects": [{"type": "shadow", "amount": 2}]}, "failure": {"text": {"en": "The will holds for a moment and then the doubt comes in — and doubt is the door it was waiting for. What follows is not fighting; it is drowning in cold water while standing up.", "es": "La voluntad aguanta un momento y luego entra la duda — y la duda es la puerta que la cosa estaba esperando. Lo que sigue no es pelear; es ahogarse en agua fría estando de pie."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 10}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:721d8397-bffb-4f49-b7e0-00389579b630:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:721d8397-bffb-4f49-b7e0-00389579b630:sit:stand_fast');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:f3332d07-c333-470a-914a-edd47210d4b0:sit:back_out',
       NULL,
       'cnt:f3332d07-c333-470a-914a-edd47210d4b0',
       'avoid',
       '{"en": "Back out", "es": "Salir de espaldas"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "endurance", "difficulty": 8}'::jsonb,
       '{"success": {"text": {"en": "Backs out of the webbed ground the way it came, slow and sharp-eyed, and the thing above never commits. Some hungers will not leave the web for.", "es": "Sale de espaldas del terreno telarañado por donde vino, lenta y con ojos afilados, y la cosa de arriba jamás se decide. Hay hambres por las que no se abandona la tela."}, "effects": []}, "failure": {"text": {"en": "It drops. There is a thrashing, biting tangle in the leaf-mould — a terrible strength in something so light — and then it is free and scrabbling away, and the pain in the bite blooms like a coal.", "es": "Cae encima. Hay un forcejeo de mordiscos entre la hojarasca — una fuerza terrible en algo tan liviano — y luego queda libre y escapando a ras de suelo, con el dolor de la picadura abriendo como un carbón."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:f3332d07-c333-470a-914a-edd47210d4b0:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:f3332d07-c333-470a-914a-edd47210d4b0:sit:back_out');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:f3332d07-c333-470a-914a-edd47210d4b0:sit:thread_around',
       NULL,
       'cnt:f3332d07-c333-470a-914a-edd47210d4b0',
       'avoid',
       '{"en": "Thread around the web", "es": "Rodear la tela"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "stealth", "difficulty": 8}'::jsonb,
       '{"success": {"text": {"en": "Threads around the webbed stretch wide through the trees, placing each foot like a thief. The web never trembles.", "es": "Rodea el tramo de telaraña bien abierto entre los árboles, poniendo cada pie como un ladrón. La tela jamás tiembla."}, "effects": []}, "failure": {"text": {"en": "One thread, one touch — and the whole web sings it. The spider comes down the nearest trunk like water poured out, and the escape is a running fight through sticky ground.", "es": "Un hilo, un roce — y la tela entera lo canta. La araña baja por el tronco más cercano como agua vertida, y el escape es una pelea a la carrera por suelo pegajoso."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:f3332d07-c333-470a-914a-edd47210d4b0:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:f3332d07-c333-470a-914a-edd47210d4b0:sit:thread_around');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:f3332d07-c333-470a-914a-edd47210d4b0:sit:cut_it_down',
       NULL,
       'cnt:f3332d07-c333-470a-914a-edd47210d4b0',
       'defy',
       '{"en": "Cut it down", "es": "Cortarla"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "melee", "difficulty": 8}'::jsonb,
       '{"success": {"text": {"en": "It comes down and the blade is already waiting — once, twice, the legs curling in death like a closing fist. The wood is very quiet after.", "es": "Baja y la hoja ya está esperando — una vez, dos veces, las patas cerrándose en la muerte como un puño. El bosque queda muy quieto después."}, "effects": [{"type": "energy", "amount": -10}]}, "failure": {"text": {"en": "It is faster than it has any right to be — inside the guard and the fangs strike before the blade can turn. The venom burns all the rest of the day.", "es": "Es más rápida de lo que tiene derecho a ser — dentro de la guardia y los colmillos golpean antes de que la hoja pueda girar. El veneno quema todo el resto del día."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 5}, {"type": "energy", "amount": -10}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:f3332d07-c333-470a-914a-edd47210d4b0:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:f3332d07-c333-470a-914a-edd47210d4b0:sit:cut_it_down');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:4ab1cf38-e3fe-4b4e-b98b-11b72cafdeb5:sit:back_out',
       NULL,
       'cnt:4ab1cf38-e3fe-4b4e-b98b-11b72cafdeb5',
       'avoid',
       '{"en": "Back out", "es": "Salir de espaldas"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "endurance", "difficulty": 8}'::jsonb,
       '{"success": {"text": {"en": "Backs out of the webbed ground the way it came, slow and sharp-eyed, and the thing above never commits. Some hungers will not leave the web for.", "es": "Sale de espaldas del terreno telarañado por donde vino, lenta y con ojos afilados, y la cosa de arriba jamás se decide. Hay hambres por las que no se abandona la tela."}, "effects": []}, "failure": {"text": {"en": "It drops. There is a thrashing, biting tangle in the leaf-mould — a terrible strength in something so light — and then it is free and scrabbling away, and the pain in the bite blooms like a coal.", "es": "Cae encima. Hay un forcejeo de mordiscos entre la hojarasca — una fuerza terrible en algo tan liviano — y luego queda libre y escapando a ras de suelo, con el dolor de la picadura abriendo como un carbón."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:4ab1cf38-e3fe-4b4e-b98b-11b72cafdeb5:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:4ab1cf38-e3fe-4b4e-b98b-11b72cafdeb5:sit:back_out');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:4ab1cf38-e3fe-4b4e-b98b-11b72cafdeb5:sit:thread_around',
       NULL,
       'cnt:4ab1cf38-e3fe-4b4e-b98b-11b72cafdeb5',
       'avoid',
       '{"en": "Thread around the web", "es": "Rodear la tela"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "stealth", "difficulty": 8}'::jsonb,
       '{"success": {"text": {"en": "Threads around the webbed stretch wide through the trees, placing each foot like a thief. The web never trembles.", "es": "Rodea el tramo de telaraña bien abierto entre los árboles, poniendo cada pie como un ladrón. La tela jamás tiembla."}, "effects": []}, "failure": {"text": {"en": "One thread, one touch — and the whole web sings it. The spider comes down the nearest trunk like water poured out, and the escape is a running fight through sticky ground.", "es": "Un hilo, un roce — y la tela entera lo canta. La araña baja por el tronco más cercano como agua vertida, y el escape es una pelea a la carrera por suelo pegajoso."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:4ab1cf38-e3fe-4b4e-b98b-11b72cafdeb5:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:4ab1cf38-e3fe-4b4e-b98b-11b72cafdeb5:sit:thread_around');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:4ab1cf38-e3fe-4b4e-b98b-11b72cafdeb5:sit:cut_it_down',
       NULL,
       'cnt:4ab1cf38-e3fe-4b4e-b98b-11b72cafdeb5',
       'defy',
       '{"en": "Cut it down", "es": "Cortarla"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "melee", "difficulty": 8}'::jsonb,
       '{"success": {"text": {"en": "It comes down and the blade is already waiting — once, twice, the legs curling in death like a closing fist. The wood is very quiet after.", "es": "Baja y la hoja ya está esperando — una vez, dos veces, las patas cerrándose en la muerte como un puño. El bosque queda muy quieto después."}, "effects": [{"type": "energy", "amount": -10}]}, "failure": {"text": {"en": "It is faster than it has any right to be — inside the guard and the fangs strike before the blade can turn. The venom burns all the rest of the day.", "es": "Es más rápida de lo que tiene derecho a ser — dentro de la guardia y los colmillos golpean antes de que la hoja pueda girar. El veneno quema todo el resto del día."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 5}, {"type": "energy", "amount": -10}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:4ab1cf38-e3fe-4b4e-b98b-11b72cafdeb5:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:4ab1cf38-e3fe-4b4e-b98b-11b72cafdeb5:sit:cut_it_down');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:571f5dd2-9e06-4838-ba7e-eded9308b6f8:sit:run_for_it',
       NULL,
       'cnt:571f5dd2-9e06-4838-ba7e-eded9308b6f8',
       'avoid',
       '{"en": "Run for it", "es": "Salir corriendo"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "endurance", "difficulty": 12}'::jsonb,
       '{"success": {"text": {"en": "Runs. There is no plan in it, no craft — only the legs and the terror, and the terror is faster. When it finally stops, hours later, the darkness behind is only darkness.", "es": "Corre. No hay plan en ello, no hay arte — solo las piernas y el terror, y el terror es más rápido. Cuando por fin se detiene, horas después, la oscuridad detrás es solo oscuridad."}, "effects": [{"type": "shadow", "amount": 5}, {"type": "energy", "amount": -15}]}, "failure": {"text": {"en": "It does not pursue. It simply arrives — ahead, always ahead, as if the dark itself were carrying the traveller backwards. The burning is not always fire; sometimes it is only the nearness of it.", "es": "No persigue. Simplemente llega — adelante, siempre adelante, como si la oscuridad misma estuviera llevando al viajero hacia atrás. El ardor no siempre es fuego; a veces es solo la cercanía de eso."}, "effects": [{"type": "wound", "level": "badly wounded"}, {"type": "shadow", "amount": 10}, {"type": "energy", "amount": -15}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:571f5dd2-9e06-4838-ba7e-eded9308b6f8:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:571f5dd2-9e06-4838-ba7e-eded9308b6f8:sit:run_for_it');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:571f5dd2-9e06-4838-ba7e-eded9308b6f8:sit:hide',
       NULL,
       'cnt:571f5dd2-9e06-4838-ba7e-eded9308b6f8',
       'avoid',
       '{"en": "Hide", "es": "Esconderse"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "stealth", "difficulty": 12}'::jsonb,
       '{"success": {"text": {"en": "Small, still, cold as the stones — being nothing, feeling nothing, offering nothing for the malice to catch on. It passes. The air where it passed does not warm for a long time.", "es": "Chica, quieta, fría como las piedras — siendo nada, sintiendo nada, ofreciendo nada a lo que la malicia pueda asirse. Pasa. El aire por donde pasó no se entibia por un largo tiempo."}, "effects": [{"type": "shadow", "amount": 2}]}, "failure": {"text": {"en": "It knows. It has always known. The darkness leans down like a hand closing, and what comes after, the mind will not keep.", "es": "Lo sabe. Lo supo siempre. La oscuridad se inclina como una mano que se cierra, y lo que viene después, la mente no lo guarda."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 10}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:571f5dd2-9e06-4838-ba7e-eded9308b6f8:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:571f5dd2-9e06-4838-ba7e-eded9308b6f8:sit:hide');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:571f5dd2-9e06-4838-ba7e-eded9308b6f8:sit:stand_and_fight',
       NULL,
       'cnt:571f5dd2-9e06-4838-ba7e-eded9308b6f8',
       'defy',
       '{"en": "Stand and fight", "es": "Plantarse y pelear"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "melee", "difficulty": 14}'::jsonb,
       '{"success": {"text": {"en": "Some things are not victories but survivals that look like them — one blow struck true at the heart of the shadow, and for a moment, a moment only, it gives ground. Enough ground. Barely enough.", "es": "Hay cosas que no son victorias sino supervivencias que les parecen — un golpe dado de verdad al corazón de la sombra, y por un momento, solo un momento, cede terreno. Suficiente terreno. Apenas suficiente."}, "effects": [{"type": "shadow", "amount": 5}, {"type": "energy", "amount": -15}]}, "failure": {"text": {"en": "Steel does not matter here. What matters here, the blade is not made of. The fall is very long.", "es": "El acero no importa aquí. De lo que importa aquí no está hecha la hoja. La caída es muy larga."}, "effects": [{"type": "wound", "level": "badly wounded"}, {"type": "shadow", "amount": 10}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:571f5dd2-9e06-4838-ba7e-eded9308b6f8:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:571f5dd2-9e06-4838-ba7e-eded9308b6f8:sit:stand_and_fight');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:d9a6563b-d055-4bfa-a12e-a461a3962b00:sit:get_clear',
       NULL,
       'cnt:d9a6563b-d055-4bfa-a12e-a461a3962b00',
       'avoid',
       '{"en": "Get clear of the water", "es": "Salir del agua"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "endurance", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "Three steps to the bank, taken like twelve, water dragging at every stride — and then stone underfoot and the thrashing behind, already losing interest.", "es": "Tres pasos hasta la orilla, dados como doce, el agua tirando de cada zancada — y luego piedra bajo el pie y el forcejeo atrás, ya perdiendo interés."}, "effects": [{"type": "energy", "amount": -10}]}, "failure": {"text": {"en": "The grip does not tear free clean. The ankle comes out of it because the ankle has no choice, and the bank is gained on a leg that will not bear weight properly for days.", "es": "La presa no se suelta limpia. El tobillo sale de ella porque no tiene otra opción, y la orilla se gana con una pierna que no va a cargar peso como debe por días."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "energy", "amount": -10}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:d9a6563b-d055-4bfa-a12e-a461a3962b00:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:d9a6563b-d055-4bfa-a12e-a461a3962b00:sit:get_clear');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:d9a6563b-d055-4bfa-a12e-a461a3962b00:sit:fight_it_off',
       NULL,
       'cnt:d9a6563b-d055-4bfa-a12e-a461a3962b00',
       'defy',
       '{"en": "Fight it off", "es": "Rechazarla a golpes"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "melee", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "Slashing down into the murk where the arm meets the water — once, twice — and the grip loosens. Whatever it is, it does not like pain, and it lets go.", "es": "Cortando hacia abajo en la turbiedad donde el brazo toca el agua — una, dos veces — y la presa afloja. Lo que sea que sea, no le gusta el dolor, y suelta."}, "effects": [{"type": "energy", "amount": -10}]}, "failure": {"text": {"en": "Cutting at water is mostly cutting water. The thing under the surface has no such problem, and the pull toward the deep is patient and strong.", "es": "Cortar el agua es mayormente cortar agua. La cosa bajo la superficie no tiene ese problema, y el tirón hacia lo hondo es paciente y fuerte."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 5}, {"type": "energy", "amount": -10}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:d9a6563b-d055-4bfa-a12e-a461a3962b00:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:d9a6563b-d055-4bfa-a12e-a461a3962b00:sit:fight_it_off');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:d9a6563b-d055-4bfa-a12e-a461a3962b00:sit:push_across',
       NULL,
       'cnt:d9a6563b-d055-4bfa-a12e-a461a3962b00',
       'defy',
       '{"en": "Push across", "es": "Cruzar de todos modos"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "endurance", "difficulty": 12}'::jsonb,
       '{"success": {"text": {"en": "The far bank is closer than the near one — the arithmetic of desperation. Forward, always forward, the bottom sliding and shifting, until the water shallows and the thing will not follow into the shallows.", "es": "La orilla lejana está más cerca que la cercana — la aritmética de la desesperación. Adelante, siempre adelante, el fondo corriéndose y moviéndose, hasta que el agua baja y la cosa no la sigue a lo bajo."}, "effects": [{"type": "energy", "amount": -15}]}, "failure": {"text": {"en": "Halfway across, the bottom simply stops being there. What follows is not swimming; it is being towed, dragged, and finally spat out on the far side more dead than alive.", "es": "A mitad del cruce, el fondo simplemente deja de estar. Lo que sigue no es nadar; es ser remolcado, arrastrado, y finalmente escupido en el otro lado más muerto que vivo."}, "effects": [{"type": "wound", "level": "badly wounded"}, {"type": "shadow", "amount": 5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:d9a6563b-d055-4bfa-a12e-a461a3962b00:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:d9a6563b-d055-4bfa-a12e-a461a3962b00:sit:push_across');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:2043ca0d-5e57-4351-8e2d-008afe1cf9e3:sit:get_clear',
       NULL,
       'cnt:2043ca0d-5e57-4351-8e2d-008afe1cf9e3',
       'avoid',
       '{"en": "Get clear of the water", "es": "Salir del agua"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "endurance", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "Three steps to the bank, taken like twelve, water dragging at every stride — and then stone underfoot and the thrashing behind, already losing interest.", "es": "Tres pasos hasta la orilla, dados como doce, el agua tirando de cada zancada — y luego piedra bajo el pie y el forcejeo atrás, ya perdiendo interés."}, "effects": [{"type": "energy", "amount": -10}]}, "failure": {"text": {"en": "The grip does not tear free clean. The ankle comes out of it because the ankle has no choice, and the bank is gained on a leg that will not bear weight properly for days.", "es": "La presa no se suelta limpia. El tobillo sale de ella porque no tiene otra opción, y la orilla se gana con una pierna que no va a cargar peso como debe por días."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "energy", "amount": -10}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:2043ca0d-5e57-4351-8e2d-008afe1cf9e3:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:2043ca0d-5e57-4351-8e2d-008afe1cf9e3:sit:get_clear');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:2043ca0d-5e57-4351-8e2d-008afe1cf9e3:sit:fight_it_off',
       NULL,
       'cnt:2043ca0d-5e57-4351-8e2d-008afe1cf9e3',
       'defy',
       '{"en": "Fight it off", "es": "Rechazarla a golpes"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "melee", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "Slashing down into the murk where the arm meets the water — once, twice — and the grip loosens. Whatever it is, it does not like pain, and it lets go.", "es": "Cortando hacia abajo en la turbiedad donde el brazo toca el agua — una, dos veces — y la presa afloja. Lo que sea que sea, no le gusta el dolor, y suelta."}, "effects": [{"type": "energy", "amount": -10}]}, "failure": {"text": {"en": "Cutting at water is mostly cutting water. The thing under the surface has no such problem, and the pull toward the deep is patient and strong.", "es": "Cortar el agua es mayormente cortar agua. La cosa bajo la superficie no tiene ese problema, y el tirón hacia lo hondo es paciente y fuerte."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 5}, {"type": "energy", "amount": -10}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:2043ca0d-5e57-4351-8e2d-008afe1cf9e3:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:2043ca0d-5e57-4351-8e2d-008afe1cf9e3:sit:fight_it_off');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:2043ca0d-5e57-4351-8e2d-008afe1cf9e3:sit:push_across',
       NULL,
       'cnt:2043ca0d-5e57-4351-8e2d-008afe1cf9e3',
       'defy',
       '{"en": "Push across", "es": "Cruzar de todos modos"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "endurance", "difficulty": 12}'::jsonb,
       '{"success": {"text": {"en": "The far bank is closer than the near one — the arithmetic of desperation. Forward, always forward, the bottom sliding and shifting, until the water shallows and the thing will not follow into the shallows.", "es": "La orilla lejana está más cerca que la cercana — la aritmética de la desesperación. Adelante, siempre adelante, el fondo corriéndose y moviéndose, hasta que el agua baja y la cosa no la sigue a lo bajo."}, "effects": [{"type": "energy", "amount": -15}]}, "failure": {"text": {"en": "Halfway across, the bottom simply stops being there. What follows is not swimming; it is being towed, dragged, and finally spat out on the far side more dead than alive.", "es": "A mitad del cruce, el fondo simplemente deja de estar. Lo que sigue no es nadar; es ser remolcado, arrastrado, y finalmente escupido en el otro lado más muerto que vivo."}, "effects": [{"type": "wound", "level": "badly wounded"}, {"type": "shadow", "amount": 5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:2043ca0d-5e57-4351-8e2d-008afe1cf9e3:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:2043ca0d-5e57-4351-8e2d-008afe1cf9e3:sit:push_across');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:0b785a37-66d7-4cdd-8f2b-56a5ad1a2c64:sit:run_for_it',
       NULL,
       'cnt:0b785a37-66d7-4cdd-8f2b-56a5ad1a2c64',
       'avoid',
       '{"en": "Run for it", "es": "Salir corriendo"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "endurance", "difficulty": 11}'::jsonb,
       '{"success": {"text": {"en": "Runs the moment the shadow passes — into the broken ground, over stone where even that weight cannot land. It circles once, twice, screaming, and abandons what it cannot comfortably reach.", "es": "Corre en cuanto pasa la sombra — hacia el terreno quebrado, sobre piedra donde ni ese peso puede posarse. Circula una vez, dos, chillando, y abandona lo que no puede alcanzar cómodamente."}, "effects": [{"type": "energy", "amount": -15}]}, "failure": {"text": {"en": "It does not dive twice — it does not need to. The second pass is unhurried, and the wingtip alone is like a cart hitting at full speed.", "es": "No se lanza dos veces — no lo necesita. El segundo paso es sin apuro, y la punta del ala sola es como un carro embistiendo a toda velocidad."}, "effects": [{"type": "wound", "level": "badly wounded"}, {"type": "energy", "amount": -15}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:0b785a37-66d7-4cdd-8f2b-56a5ad1a2c64:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:0b785a37-66d7-4cdd-8f2b-56a5ad1a2c64:sit:run_for_it');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:0b785a37-66d7-4cdd-8f2b-56a5ad1a2c64:sit:hide',
       NULL,
       'cnt:0b785a37-66d7-4cdd-8f2b-56a5ad1a2c64',
       'avoid',
       '{"en": "Hide", "es": "Esconderse"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "stealth", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "Flat against the rock, under the overhang, still as a stone among stones. It is hunger that flies it, not malice; what it cannot see, it does not waste a dive on.", "es": "Pegada contra la roca, bajo el saliente, quieta como una piedra entre piedras. Es hambre lo que lo hace volar, no malicia; lo que no puede ver, no gasta un picado en ello."}, "effects": []}, "failure": {"text": {"en": "It lands. That is worse than the diving — up close there is no dodging the deliberate, reptile patience of it. The escape costs flesh.", "es": "Aterriza. Eso es peor que los picados — de cerca no se esquiva la paciencia deliberada y reptiliana de la cosa. El escape cuesta carne."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "shadow", "amount": 5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:0b785a37-66d7-4cdd-8f2b-56a5ad1a2c64:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:0b785a37-66d7-4cdd-8f2b-56a5ad1a2c64:sit:hide');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:0b785a37-66d7-4cdd-8f2b-56a5ad1a2c64:sit:stand_and_fight',
       NULL,
       'cnt:0b785a37-66d7-4cdd-8f2b-56a5ad1a2c64',
       'defy',
       '{"en": "Stand and fight", "es": "Plantarse y pelear"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "melee", "difficulty": 14}'::jsonb,
       '{"success": {"text": {"en": "One chance in a thousand, taken: the soft underside as it rears back, the old wound-line every drake carries. The scream of it tears the sky. It does not die — nothing this big dies to one blow — but it leaves, bleeding, remembering.", "es": "Una oportunidad en mil, tomada: el vientre blando cuando se encabrita, la vieja línea de herida que todo draco carga. El grito desgarra el cielo. No muere — nada tan grande muere de un solo golpe — pero se va, sangrando, recordando."}, "effects": [{"type": "energy", "amount": -15}]}, "failure": {"text": {"en": "The hide is armour, the size is a landslide, and the worst of it is that it is fast. There is no second mistake to make.", "es": "La piel es armadura, el tamaño es un derrumbe, y lo peor es que es rápido. No hay segundo error que cometer."}, "effects": [{"type": "wound", "level": "badly wounded"}, {"type": "shadow", "amount": 5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:0b785a37-66d7-4cdd-8f2b-56a5ad1a2c64:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:0b785a37-66d7-4cdd-8f2b-56a5ad1a2c64:sit:stand_and_fight');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:7e3d53c4-2edb-4500-8cc7-98bc003aae91:sit:run_for_it',
       NULL,
       'cnt:7e3d53c4-2edb-4500-8cc7-98bc003aae91',
       'avoid',
       '{"en": "Run for it", "es": "Salir corriendo"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "endurance", "difficulty": 12}'::jsonb,
       '{"success": {"text": {"en": "Runs, and keeps running — that is the whole trick. The uruk-hai do not tire, but they do not fly either, and broken country is broken for everyone. By dark, the drums are distant.", "es": "Corre, y sigue corriendo — ese es todo el truco. Los uruk-hai no se cansan, pero tampoco vuelan, y el terreno quebrado es quebrado para todos. Al anochecer, los tambores son distantes."}, "effects": [{"type": "energy", "amount": -15}]}, "failure": {"text": {"en": "They run all day. That is what they are bred for. The distance never opens, never closes — until it closes, all at once, when the legs finally say no.", "es": "Corren todo el día. Para eso fueron criados. La distancia no se abre nunca, no se cierra nunca — hasta que se cierra, de golpe, cuando las piernas finalmente dicen que no."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "energy", "amount": -15}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:7e3d53c4-2edb-4500-8cc7-98bc003aae91:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:7e3d53c4-2edb-4500-8cc7-98bc003aae91:sit:run_for_it');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:7e3d53c4-2edb-4500-8cc7-98bc003aae91:sit:hide',
       NULL,
       'cnt:7e3d53c4-2edb-4500-8cc7-98bc003aae91',
       'avoid',
       '{"en": "Hide", "es": "Esconderse"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "stealth", "difficulty": 11}'::jsonb,
       '{"success": {"text": {"en": "Off the line of march, down in the dead ground, while the column passes in step — actual step, ironshod, like one enormous machine. Discipline is blind in straight lines.", "es": "Fuera de la línea de marcha, abajo en el terreno muerto, mientras la columna pasa al paso — paso de verdad, herrado, como una máquina enorme. La disciplina es ciega en línea recta."}, "effects": [{"type": "energy", "amount": -5}]}, "failure": {"text": {"en": "They sweep the ground the way soldiers do — in pairs, in lines, no gaps. The discovery is almost polite in its efficiency: a whistle, a converging, no shouting at all.", "es": "Peinan el terreno como lo hacen los soldados — en parejas, en líneas, sin huecos. El descubrimiento es casi cortés en su eficiencia: un silbato, una convergencia, ni un grito."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "energy", "amount": -5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:7e3d53c4-2edb-4500-8cc7-98bc003aae91:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:7e3d53c4-2edb-4500-8cc7-98bc003aae91:sit:hide');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:7e3d53c4-2edb-4500-8cc7-98bc003aae91:sit:stand_and_fight',
       NULL,
       'cnt:7e3d53c4-2edb-4500-8cc7-98bc003aae91',
       'defy',
       '{"en": "Stand and fight", "es": "Plantarse y pelear"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "melee", "difficulty": 12}'::jsonb,
       '{"success": {"text": {"en": "The first rank expects obedience, not resistance — two down before they understand, and discipline cracks along the seam it always cracks along: nobody wants to be third. They let the traveller go and report a victory.", "es": "La primera fila espera obediencia, no resistencia — dos caídos antes de que entiendan, y la disciplina se agrieta por la costura por donde siempre se agrieta: nadie quiere ser el tercero. Dejan ir al viajero y reportan una victoria."}, "effects": [{"type": "energy", "amount": -15}]}, "failure": {"text": {"en": "They do not charge wildly and they do not tire. It is shield-work and patience, and one person cannot hold a line.", "es": "No cargan enloquecidos y no se cansan. Es trabajo de escudo y paciencia, y una sola persona no puede sostener una línea."}, "effects": [{"type": "wound", "level": "badly wounded"}, {"type": "energy", "amount": -15}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:7e3d53c4-2edb-4500-8cc7-98bc003aae91:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:7e3d53c4-2edb-4500-8cc7-98bc003aae91:sit:stand_and_fight');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:2f3960fe-8f02-44c6-afe1-45eb795d8ad6:sit:run_for_it',
       NULL,
       'cnt:2f3960fe-8f02-44c6-afe1-45eb795d8ad6',
       'avoid',
       '{"en": "Run for it", "es": "Salir corriendo"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "endurance", "difficulty": 13}'::jsonb,
       '{"success": {"text": {"en": "Into the worst ground available — rocks, holes, anything that turns four legs into a liability. The wargs hate it, the riders hate it worse, and the pursuit loses its enthusiasm stone by stone.", "es": "Hacia el peor terreno disponible — rocas, pozos, cualquier cosa que vuelva cuatro patas un problema. Los wargs lo odian, los jinetes peor, y la persecución pierde entusiasmo piedra a piedra."}, "effects": [{"type": "energy", "amount": -15}]}, "failure": {"text": {"en": "On open ground a mounted hunter does not chase — it herds. The end is quick and almost casual.", "es": "En campo abierto un cazador montado no persigue — arrea. El final es rápido y casi casual."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "energy", "amount": -15}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:2f3960fe-8f02-44c6-afe1-45eb795d8ad6:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:2f3960fe-8f02-44c6-afe1-45eb795d8ad6:sit:run_for_it');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:2f3960fe-8f02-44c6-afe1-45eb795d8ad6:sit:hide',
       NULL,
       'cnt:2f3960fe-8f02-44c6-afe1-45eb795d8ad6',
       'avoid',
       '{"en": "Hide", "es": "Esconderse"}'::jsonb,
       ARRAY['risk:cautious'],
       '{"name": "stealth", "difficulty": 10}'::jsonb,
       '{"success": {"text": {"en": "Downwind in the rocks, motionless through three passes of the patrol. Wargs hunt by scent but riders hunt by eyes, and eyes lose interest long before noses do.", "es": "A favor del viento entre las rocas, inmóvil por tres pasadas de la patrulla. Los wargs cazan por olfato pero los jinetes cazan por los ojos, y los ojos pierden interés mucho antes que las narices."}, "effects": [{"type": "energy", "amount": -5}]}, "failure": {"text": {"en": "The warg has the scent before the rider has the guess. After that it is only a matter of which direction to run, and there is no good answer to that.", "es": "El warg tiene el rastro antes de que el jinete tenga la sospecha. Después de eso es solo cuestión de hacia dónde correr, y no hay buena respuesta para eso."}, "effects": [{"type": "wound", "level": "wounded"}, {"type": "energy", "amount": -5}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:2f3960fe-8f02-44c6-afe1-45eb795d8ad6:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:2f3960fe-8f02-44c6-afe1-45eb795d8ad6:sit:hide');

INSERT INTO interactions
  (id, places_narration_id, entities_narration_id, act, label, need_tags, skill, outcomes, payload, intensity)
SELECT 'cnt:2f3960fe-8f02-44c6-afe1-45eb795d8ad6:sit:stand_and_fight',
       NULL,
       'cnt:2f3960fe-8f02-44c6-afe1-45eb795d8ad6',
       'defy',
       '{"en": "Stand and fight", "es": "Plantarse y pelear"}'::jsonb,
       ARRAY['risk:bold'],
       '{"name": "melee", "difficulty": 12}'::jsonb,
       '{"success": {"text": {"en": "The warg comes in low and the rider high — answer in that order. The beast dies under the first stroke and the rider''s own weight does the rest, pinned under what he rode. The others do not care for the arithmetic.", "es": "El warg entra bajo y el jinete alto — se responde en ese orden. La bestia muere bajo el primer golpe y el propio peso del jinete hace el resto, apresado bajo su montura. A los otros no les gusta la aritmética."}, "effects": [{"type": "energy", "amount": -15}]}, "failure": {"text": {"en": "Two enemies for the price of every one, and the pairing is practiced. Blade or fang, high or low — choose wrong once and there is no second choice.", "es": "Dos enemigos por el precio de cada uno, y la pareja está ensayada. Hoja o colmillo, alto o bajo — elegí mal una vez y no hay segunda elección."}, "effects": [{"type": "wound", "level": "badly wounded"}, {"type": "energy", "amount": -15}]}}'::jsonb,
       '{"origin": "seed:interactions", "situation": "cnt:2f3960fe-8f02-44c6-afe1-45eb795d8ad6:sit", "mapped_from_form": "attacks", "felt": "afraid", "adr": "0022"}'::jsonb,
       4
WHERE NOT EXISTS (SELECT 1 FROM interactions WHERE id = 'cnt:2f3960fe-8f02-44c6-afe1-45eb795d8ad6:sit:stand_and_fight');
