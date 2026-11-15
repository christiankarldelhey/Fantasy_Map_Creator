# entities_narration — boceto estacionado

*Brainstorm del usuario, estacionado para retomar. No es un ADR; es la
semilla de uno. Estado: idea, nada implementado.*

## La incomodidad que lo dispara

Los eventos llegan a la mente con demasiada data específica de cada
tipo. Ejemplo real de un `encounter` (águilas a lo lejos):

```json
"data": {
  "entity": "eagle",
  "entity_id": "37065964-…",
  "entity_name": "Eagles",
  "entity_type": "flying_animals",
  "family": "eagles",
  "danger": 0,
  "form": "glimpsed_far",
  "outcome": null,
  "prose_hint": "Seen on the wing or perched at a distance…",
  "intensity": 0,
  "topic": "care_of_living_things",
  "substance": { "attitude": null, "content": null, … },
  "decision": null,
  "check": { "skill": "tracking", "difficulty": 7 },
  "reading": "Eagles — Great Eagles watch roads and passes…"
}
```

¿Toda esta data es para el prompter? ¿Y no puede haber **un lenguaje
común** — lo más natural language posible — entre lo que consume el
prompter y lo que consume la mente? Sin perder lo imprescindible
(estado, mecánica), que eso es agnóstico de cualquier personaje.

## El diagnóstico ya mapeado (del thread del wire)

`data` hoy mezcla cuatro clases de cosas con la misma llave:

- **Contenido** — lo que conecta y se siente: `reading`, `tags`,
  `entity`, `family`, `entity_type`, `place`, `name`, `food`, `topic`,
  `form`, `outcome`, `substance`.
- **Cableado** — instrucciones para mecanismos: `check`, `thread`,
  `resolves`, `urgency`, `decision`, `scope`, `lodging`.
- **Números para reglas** — hechos medibles del mundo: `danger`,
  `shadow_effect`, `precipitation`, `temperature_2m`, `wind_speed_10m`
  (severidad, `affect.field:`, la regla `exposure`).
- **Peso muerto** — sobras: `cloud_cover`, `hours`, `rest_quality`,
  `population`, `distance_km` (ya limpiado: `aspect`/`presence` ya no
  taggean).

## La intuición central

> Todo evento es **algo con lo que el personaje puede entablar
> relación**: el clima, una comida, una región, un lugar, los orcos,
> un hobbit. Si todo es para y por la mente, el evento debería tener
> un vocabulario común y chico.

Lo que le parece bien del ejemplo:

- `type: encounter` — qué clase de suceso fue.
- `entity` / `entity_type` / `family` — **el sujeto**: aquello hacia
  lo que puede nacer una relación. Idea: universalizarlo — un lugar,
  un clima, una comida también tendrían "sujeto" (ver la familia
  `subject` del registro de tags).
- `reading` — la lectura agnóstica previa a la mente, compartida con
  el prompter.

Lo que "se siente un montón": `intensity`, `substance`, `decision`,
`check`, `entity_id`, `entity_name` redundante con `entity`.

Dudas registradas:

- `prose_hint`: ¿debería existir para todos los eventos, o fundirse
  en `reading`?
- ¿Un grupo de eventos podría llevar el **título** que tendrán en el
  prompter ("places crossed today")? — para que el prompter trabaje
  menos y sea más agnóstico.

## La propuesta grande: `entities_narration`

Hacer con los seres lo que `places_narration` hizo con los lugares.

Hoy el encuentro son **mil tablas**:

| tabla | qué es | tamaño |
|---|---|---|
| `entities` | el gazetteer de seres (tipo, familia, peligro, shadow_weight) | 541 |
| `encounter_forms` | el vocabulario de contacto (attacks, watches, glimpsed_far…) | 147 |
| `npc_interactions` | diálogo/interacción (actitud, contenido, commands, decisions) | 649 |
| `movers` + trail | los seres del Mapa Vivo (los Nueve, Gollum, huestes) | 37 movers |

más dos motores: `encounters.js` (spawn: quién, cuándo, dónde) e
`interactionResolver.js` (cómo fue el contacto).

La idea:

- **`encounters` (o el spawn) queda "duro"**: dice sólo el hecho —
  *con qué te encontraste y dónde* (identidad + presencia + lugar).
- **`entities_narration` responde el quién y el cómo**: la voz del
  ser, las opciones si las hay, la forma de la interacción — con
  reglas casi calcadas a `places_narration` (scoping por región/
  familia/tipo, prioridades, situaciones tag-gateadas, outcomes con
  texto + efectos).
- Los **movers** entran al sistema narrativo: un ser real del mapa y
  un encuentro sorteado hablarían por el mismo rail (identidad
  estable → persecuciones, "algo me sigue").
- Resultado buscado: el prompter trabaja menos, la mente también, y
  el evento que sale de encounters llega **preparado** — no un volcado
  de todas las tablas que lo produjeron.

## Segunda vuelta — decisiones del usuario (esta sesión)

**Definición canónica propuesta:**

> Un **evento** es todo lo que transcurre en el tiempo y cuya fuente
> pueda tener una relación emocional con la mente o el personaje.

Por esa vara, `travel` (km + horas: el outcome del día) y `body`
(energía/sombra/rachas: el estado del personaje) **no son eventos** —
y el código ya lo sabe: `memory.py` los marca "no reading by design" y
`voice.py` los excluye de la prosa. Van a la raíz / al canal de estado.

**Inventario real de tipos hoy (11):** `climate`, `encounter`, `meal`,
`place`, `region`, `water`, `moment`, `terrain`, `rest`, `travel`,
`body`.

**Decidido:**

- `encounter` → **type `entity`**: encuentros regionales + movers por
  el mismo rail.
- Tabla `encounters` queda **dura y map-related**: región + entity_id
  + when — incluidos encuentros agendados ("Gandalf pasa por Hobbiton
  tal día y si estás, lo ves") y movers sin descripción.
- **`entities_narrative`** (hermana de `places_narration`): toda la
  voz e interacción de los seres, movers incluidos. Colapsa lo que
  hoy son `entities`+`encounter_forms`+`npc_interactions`.
- `entities` queda **tabla de consulta / padrón vivo**: muere como
  *descriptor* (su prosa migra a `entities_narration`; sus spawn
  facts a `encounters`) pero sigue sirviendo — es el espacio de
  ids para Relations y la consulta mecánica (type, family, danger,
  shadow_weight, is_npc). (La descripción del conejo en el prompt
  gastaba tokens y la narración la ignoraba.)
- `terrain`, `region`, `moment`, `water` → familia **place** con
  subtype (verificado: los dos primeros ya leen `places_narration`;
  `moment` son las situaciones ambient resueltas).
- `body` → raíz/estado (ya existe `condition.body`; el evento queda
  solo porque `needs.py` lo lee — hay que apuntar needs a condition).

## Anatomía real del encuentro (verificado en schema + resolvers)

**`entities` (541)** — el gazetteer de seres:
- Identidad: `id`, `name`, `slug`, `type` (25 valores), `parent_id`,
  `is_npc`, `family`
- Spawn facts: `region_ids[]`, `biomes[]`,
  `probability_by_region[]` (nivel 1-8 por región), `active`
  (day/night/all-day)
- Personalidad mecánica: `danger` 0-5, `shadow_weight` (con signo)
- Voz: `description`, `description_summary` (esto se volvió el
  `reading` del evento — el texto del conejo que nadie leía)

**`encounter_forms` (147)** — el vocabulario de contacto, clave
`(entity_type, form)`:
- Mecánica del sorteo de forma: `weight`, `intensity` 0-4,
  `min_danger`/`max_danger`, `triggers_roll`
- Voz: `prose_hint` ("Seen on the wing or perched at a distance…")

**`npc_interactions` (649)** — la sustancia:
- Scope: `entity_id` | `entity_ids[]` (whitelist) | `entity_type`
  (genérico) + `interaction_form` + `shadow_band` (low/mid/high) +
  contexto opcional `character_id`, `cultural_family`, `region_id`
- Contenido: `npc_attitude`, `concrete_content`, `tension`,
  `traveller_stance`, `topic`, `topic_prose_hint`
- Interacción: `options[]` (decisiones), `commands[]` (efectos
  incondicionales: comida, regalos)
- Resolución: escalera de 6 intentos — entity_id+band → relax band →
  entity_type+band+contexto → relax → entity_type sin contexto →
  relax — con `specificityScore` (character > cultural > region) y
  pick random entre empates.

**`movers` (37)** — los seres del mapa vivo:
- `movers`: identidad (kind: person/company/host, canon, motivation)
- `mover_legs`: presencia con ventana de fechas — kind
  (march/presence/resident), region/location, radios
  (notice/contact), visibility (visible/signs/hidden), greeting,
  active_phases, hostile
- `mover_beats`: texto autorado por leg `{variant, title, text,
  effects}` — **esto YA es narración**
- `mover_trails`: geometría día a día

**`places_narration`** (el modelo a espejar):
- Scope: `location_id`, `region_id`/`region_ids[]`,
  `cultural_family`, `type`, `priority`, radios
- Prosa: `aspect`, `presence`, `lore`, `secret`, `sections`,
  `channel`, `traveller_use`, `notes`
- Condicional: `variants[]` (tags/not_tags/when), `rotation[]`
- `interactive[]`: situaciones tag-gateadas con options → outcomes
  {success, failure} {text, effects}

## Tercera vuelta — refinamientos del usuario (encounters-first)

- **La ficha `entity` es scope-bound**, no genérica: "quién es el
  sujeto *en ese lugar*" — orcos muertos de frío en las Montañas
  Nubladas ≠ orcos en Mordor. Se inspira en el encuentro en sí y en
  la tabla `entities`.
- **Los encuentros se vuelven mayormente interactivos**: muere la
  reacción hardcodeada por personaje (Aranath/Celebrian). Como en
  places: la mente revisa skills/state/beliefs/raza y toma la opción
  con más peso. Un encuentro con liebres probablemente no es
  interactivo — ¿qué lo decide? ¿el form?
- **`form` es la riqueza distintiva** respecto a places: el tipo de
  encuentro (glimpsed_far, stalks, parley…) — y el usuario intuye
  que se relaciona con `aspect`/`presence` de places (ver de lejos =
  la cara vista de afuera). Meta: tablas lo más parecidas posible;
  si places necesita algo, se agrega.
- **El grano se va definiendo** — split `entity`/`contact` propuesto,
  en refinamiento.

## Cuarta vuelta — decisiones (esta sesión)

- **`form` queda**: canal del contacto + key de los registros
  `contact`. La ficha `entity` usa los mismos slots que places
  (`aspect`/`presence`/`lore`) y el form decide cuál se lee
  (`glimpsed_far` → `aspect`). El vocabulario de forms puede
  compartirse entre las dos tablas.
- **`lore` se lee condicional al conocimiento del personaje** —
  y conocer = *tener una Belief con ese Subject* (CONTEXT.md ya lo
  modela: Subject + Source heard/lived). **La habilidad/array
  "lore" muere**: colapsa en Relation — la amplitud del lore del
  personaje es la cantidad de sujetos sobre los que cree algo.
  Raza/trasfondo = seed beliefs heard. Gate: `belief:<subject>`
  (familia existente).
- **Interactividad la decide el `form`** (presence-forms →
  interactivas; `glimpsed_far` → no, con puerta abierta a opciones
  futuras tipo "seguirlos").
- **`npc_attitude` → `disposition`** — DECIDIDO (corregido sobre
  datos reales): **prosa** `JSONB {en, es}` en el registro
  contact. `npc_attitude` hoy es texto autorado por fila
  ("Waits without hand on weapon"), no una lista cerrada — va a
  un slot de voz como `aspect`/`presence`. El dato mecánico
  (wary/hostile) queda para después: `tags` o campo aparte si la
  mente algún día lo pesa. NO `trait` como nombre: el glosario ya
  usa **Trait** para los diales de la mente. `disposition` queda
  compartido con places cuando las tierras la declaren.

- **`shadow_band` se DROPEA** — ni columna ni tag. Gatear la voz por
  el estado de ánimo del personaje autorrefuerza la sombra ("estás
  mal → el mundo te habla peor → estás peor") y hace el mundo
  demasiado destinado. La mente se encarga de sentir la sombra; el
  mundo no la anticipa. (Las 649 filas pierden ese eje de scope.)

- **`encounters` NO se crea (revisado)**: la tabla dura de
  presencia quedó descartada — `entities` conserva la data cruda
  de presencia procedural (`region_ids`, `biomes`,
  `probability_by_region`, `active`) y la presencia *agendada*
  ya la hace `mover_legs` (100% en tal lugar, tal ventana de
  fechas; `kind='resident'` cubre el fantasma en la ruina de
  Eregion). Una sola tabla nueva entonces: `entities_narration`.

- **`movers` (la tabla de identidad) MUERE → `entities`**: todo
  ser — canon o genérico — es una fila de `entities` (type
  `npc`, etc.). `mover_legs`/`mover_trails` sobreviven como la
  presencia agendada + geometría, re-apuntando `mover_id` →
  `entity_id`. Los legs conservan SOLO hechos (fechas, scope,
  radios, fases, visibilidad) — `greeting`/`trace`/prosa emigra
  a `entities_narration`.

- **`mover_leg_id` = columna scope con FK** en
  `entities_narration`: la dimensión más específica de la
  escalera ("este contact solo existe mientras ese leg vive").
  Cada leg genera una fila `kind='contact'` y sus `mover_beats`
  entran como `variants` (variant/effects mapean 1:1).

- **Movers → entities (a)**: un solo espacio de sujetos. Todo ser —
  NPC o no, canon o genérico — es una fila de `entities` (type,
  family, is_npc). `movers`/legs/trails quedan como mecánica del
  mapa vivo; las presence rows de `encounters` apuntan a
  `mover_leg`. `mover_beats` → `variants`. Consecuencia: Gandalf
  puede tener seed belief `belief:gandalf` heard y su ficha con
  aspect/lore/demeanor como cualquier sujeto.
- **El `knows` también decide el NOMBRE**: "si tenés el lore sabés
  quién es Gandalf, sino ves un barbudo a caballo" — el sujeto
  (entity_id) es siempre el mismo para la Relation, pero la voz que
  lo describe depende de si la mente lo conoce.

- **Caras conocidas/desconocidas → variants tag-gateados (a)**:
  "un barbudo a caballo" = variant sin gate; "Gandalf el Gris" =
  variant `tags: [belief:gandalf]`. Escala a niveles de
  conocimiento (oyó hablar / trató / amigo).
- **`character_id` muere como eje → race-gates**: la sustancia
  escrita para Celebrian/Aranath se reexpresa como opciones/
  variants gateados por `race:elf` / `race:dunedain` + default.
  **Capítulo futuro**: la función compartida de opciones — cada
  option declara *en qué se fija* (skills, state, race, beliefs…)
  y la mente pesa. Por ahora: funcional, calcado a places.

## Preguntas abiertas (cuando se retome)

1. ¿Cuál es el vocabulario común mínimo de un evento? Candidato:
   `type` + `subject` (universal: ser/lugar/región/comida/clima) +
   `reading` + `tags` + mechanics aparte.
2. ¿`facts`/`mechanics` como sub-canales de `data` (los números y el
   cableado fuera del contenido)?
3. ¿`encounters` como tabla dura convive con el spawn procedural, o
   el spawn pasa a ser sólo *quién aparece* y `entities_narration`
   decide la escena?
4. ¿Los movers viven dentro de `places_narration`/`entities_narration`
   o sólo se conectan al rail de encuentros con identidad estable?
5. ¿Quién compone el `reading`? Hoy `toEvents` lo arma
   (subject + prose_hint/substance); con `entities_narration` la
   voz saldría del registro mismo.
6. ¿Qué se hace con `substance`, `intensity`, `decision`, `check`?
   (probablemente: `check`/`decision` → mechanics; `substance` →
   contenido si hubo intercambio real; `intensity` → facts o nada.)
