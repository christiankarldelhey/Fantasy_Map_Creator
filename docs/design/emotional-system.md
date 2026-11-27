# El sistema emocional — mapa del estado actual y esquema objetivo

> Análisis del Mind Engine `mind-engine/` contra el modelo deseado:
> events con kind y schema claros → elegibilidad como recuerdos →
> emocionalidad según el Character → mundo interno (settings, weights,
> relaciones, mood, temperamento) → cierre del día que decae y
> fortalece → mood en tiempo real.
>
> **Conclusión central**: el esquema objetivo ya está decidido — es
> [ADR-0017](../adr/0017-emotional-engine-vector-substrate.md), "un
> alfabeto, un camino de escritura, un estado". Está aprobado e
> implementado **a medias**. Este documento separa lo hecho, lo que
> quedó a mitad de camino, lo hardcodeado que debería ser dato, y los
> canales redundantes. Glosario: `CONTEXT.md`.

---

## 1. El pipeline actual (lo que hoy pasa)

```
Host (Node)                         Mind Engine (FastAPI)
───────────                         ─────────────────────
toEvents.js → events[]    POST /episodes ──► PERCIPIE
   climate                                    derive_tags
   land (terrain/place/water/region)          check → noticed/misread/unnoticed
   meal/rest/encounter                        semantic_delta → Relation.feed  (canal mundo)
   ambience (voces ambientales)               felt:* → pull al punto de la rueda (canal sentido)
   decision (data)                            salience → perceived_day
   (condition en el envelope)                 body projection + need_items
                                   ────────►  RETRIEVE + NEEDS
                                              evocación re-alimenta Relations y Mood
                                   ────────►  BRIEF (Focus + líneas → lens_block)
                        POST /narrate ──►     prompt → LLM → prosa
                        POST /close   ──►     ENCODE + DECAY + PATTERNS
                                              needs resolve + REFLECTION (LLM → beliefs)
```

### 1.1 El wire: events sin registro de kinds

`EventIn` = `{type: str libre, when, where, data: dict libre}`
(`app/mind/models.py`). ADR-0016 decidió deliberadamente: el `type` no es
enum, las "formas conocidas" se declaraban en `mind.facets`... pero
`facets` se **eliminó en la migración 0019** ("drop nl_bands, facets...").
El comentario en `models.py` cita un mecanismo muerto.

Hoy los kinds viven dispersos e implícitos:

| Kind | Quién lo emite | Schema real | Subjects |
|---|---|---|---|
| `climate` | `climateEvent()` | campos numéricos OpenMeteo + `tags` (weather:*, threat, detectable) | ninguno (frame) |
| `land` | `terrainEvent()` | `subtype`: terrain/place/water/region; place lleva `place_name/place_type` | `tag:place:*` solo con named place |
| `meal` | `mealEvents()` | `entity`, `food`, `meal`, `scope`, `outcome`, `danger`, `tags` | `tag:food:*` |
| `rest` | `restEvent()` | `tags` (rest:*/lodging:*), `rest:quality` | — |
| `encounter` | `encounterEvent()` | `entity`, `entity_type`, `family`, `form`, `outcome`, `danger`… | `entity:*`, `tag:entity_type/family/race:*` |
| `ambience` | `ambienceEvents()` | `text`, `record`, `situation`, `region`, `entity` | `entity:*` |
| *(sintéticos)* | el propio motor | `need`, `recurrence` — pseudo-events internos | `need:*`, subject tags |

No hay `source` declarado en el evento: `ambience` lleva `record`/`situation`
como procedencia informal, y los items sintéticos son indistinguibles del
mundo salvo por el `type`.

### 1.2 Percepción — el punto donde el evento se vuelve emocional

`perceive.py` por cada evento, **en el orden del array** (el Host decide el
orden del día):

1. **derive_tags** — convierte data en tags canónicos (`type:*`, `entity:*`,
   `tag:<field>:<value>`, `region:*`, `tag:place:*`). Campos no listados
   mueren ahí salvo `data.tags` explícitos del Host.
2. **check** — noticed / misread / unnoticed. Dificultad: `perception_difficulty`
   > `detectable` > `FORM_DIFFICULTY[form]`, suavizado por `perception_smoothing`.
   RNG determinista sembrado por (episode_id, posición) — reproducible.
   Durmiente: `wake_forms`/`sleep_wake_forms` o `shadow_effect` la despiertan.
3. **semantic_delta** — el paquete semántico compartido
   (`DEFAULT_SEMANTICS` + tabla `mind.semantics`) mapea tags →
   `{delta, weight, body}`. Es la "verdad objetiva" del mundo: `attacks`
   ES un daño (weight .9), `sighted_far` pesa .2. Numéricos:
   `DEFAULT_SEMANTIC_FIELDS` (`danger`, `shadow_effect`).
4. **Relations.feed** — el mundo sedimenta: el subject más angosto absorbe
   el delta entero; los más anchos reciben un splash (C42).
   Especificidad: entity > family/race > entity_type/place/food > drink/kind
   > region.
5. **felt pull** — los tags `felt:*` (y el pack `mind.felt_map`) nombran
   puntos de la rueda de ánimo; cada uno tira del mood una fracción del
   camino (`gain`), refractado por la Relation en pie → `valence` e
   `imprint` del item percibido (#184).
6. **salience** — `w_severity·sev + w_novelty·nov + w_emotional·charge
   + w_theme·theme_weight + w_perception·bonus`, pisos `salience_min.*`.
7. **body** — `project_body(Condition, BODY_PROJECTION)` + golpes agudos
   (`body_hit`) con decaimiento propio.
8. **recurrence** — items sintéticos de presión de repetición / ruptura.

Los dos canales del ADR están implementados: **mundo** (delta objetivo →
Relation) y **sentido** (delta deformado → mood/imprint).

### 1.3 El mundo interno — estado actual

| Concepto | Tabla/campo | Estado |
|---|---|---|
| **Relation** (sedimento por subject) | `mind.relations` | `{affection,trust,fear,familiarity}` + `feeling` derivado + `origin` + relojes `last_fed`/`last_surfaced`. Alimentada por percepción y evocación. Decae a .98/cierre. |
| **Mood** | `mind.mood` | `{valence,arousal,dominance,cause,feeling}` — se mueve por pulls `felt:*` (trayectoria `mood_arc` en el open), arrastrado por body (`weigh_body`) y threads; causa = item que más lo movió, con reloj de calendario. |
| **Temperament** | `mind.temperament` | punto de reposo; el mood regresa a él por `moodiness`. |
| **Personality** | `mind.personality` | resistance, moodiness, choice_variability, skills. |
| **Body** | `mind.body` | proyección continua del Condition (no es propiedad de la mente) + golpes agudos. |
| **Need** | `mind.needs` | detector-kind (Condition) + composite rules (racha de días) + threads (eventos). Urgencia; abren/cierran como bucles. |
| **Memory** | `mind.memories` | `{desc, imprint, subjects, importance, strength, tags, embedding, depth, consolidated}` + `valence` (resumen derivado, sigue consumiéndose como primario en varios sitios). |
| **Belief** | `mind.beliefs` | enunciado + strength + facets `subject/stance/source`. **Convive con** la tier `conviction` de memories (doble representación, ver §3). |
| **Musing** | `mind.musings` | línea autoreada, evocable por tags de contacto; `context:solitude` dispara en días sin contacto. Inmutable, sin evidence. Reflection nunca la ve. |
| **Feeling** | derivado | léxico `FEELING_LEXICON` hardcodeado en `engine.py` (patrones sobre dims vivas). |

### 1.4 El cierre del día — qué decae, qué se fortalece

`POST /close` ejecuta, en orden:

| Paso | Decae | Se fortalece |
|---|---|---|
| `resolve_needs` | needs satisfechos → resolved | — |
| `update_streaks` | needs envejecen +1/día | — |
| `update_rule_streaks` | `counters['rule:*']` reset si no disparó | racha +1 |
| `encode_episode` | — | items con `salience>0` → Memory (o se funden en una existente por signature); boost ×1.3 si fue Focus |
| `_release_resolved_needs` | — | memorias de needs resueltas → consolidated |
| `_compact_duplicates` | — | mismas palabras+mismos tags se funden |
| `detect_patterns` | patrones caducados → faded | tema recurrente → memory `pattern` consolidada |
| `decay_pass` | volatile ×decay/sticky; consolidated ×.98; <umbral → `forgotten_memories` | `evocations≥k` → consolidated |
| `belief_fade_pass` | beliefs transient ×decay | — |
| mood | regresa a Temperament ×moodiness | — |
| `decay_all` | Relations ×.98 → indiferencia | — |
| `maybe_reflect` | beliefs no tocadas ×.95 (transient ×.8); sobre `belief_cap` → weakened | LLM: create/reinforce/contradict/invert sobre beliefs con evidencia (importance≥.4 o \|valence\|≥.2); cada 5 episodios o pico de salience ≥.85 |

La "reflection" del esquema deseado existe y es dos cosas: la pasada
determinista (encode/decay/consolidate) y la reflexión LLM (solo reescribe
Beliefs; Reflection es el único mecanismo que **crea** creencias nuevas del
mundo vivido).

### 1.5 Mood en tiempo real

Implementado dentro del episodio: `mood_arc` aplica los `mood_pull` de cada
item percibido en orden de fases y deja `trace`/`arc`/`turn` — el narrador
recibe "una mañana amable, una tarde amarga". El mood del episodio es el
**landing** de la trayectoria, presionado por body (`weigh_body`) y threads;
en el cierre regresa al Temperament. **No hay actualización entre el open y
el close del mismo día** — es un modelo de "un día vivido de una vez", no
de ticks.

---

## 2. Contra el esquema deseado

| # | Pedido | Estado | Brecha |
|---|---|---|---|
| 1 | Kinds + schemas claros | ✗ | `type` es string libre; la tabla `facets` que los declaraba se dropeó (0019); el schema vive solo en comentarios de `toEvents.js` |
| 2 | Kind + source + elegible + emocionalidad propia | ~ | Emocionalidad ✓ (semantic pack + Relations + Personality). Falta `source` declarado; la elegibilidad es implícita (reading + salience>0), no parte del kind |
| 3 | Settings, weights, relations, mood, temperamento | ~ | Todo existe excepto el modelo de "weights": hoy `theme_weights` + `salience_min` + `attention_weights` + `boosts` son **cuatro canales superpuestos** de "esto me importa" |
| 4 | Cierre que decae y fortalece | ✓ | Completo (tabla §1.4) |
| 5 | Mood en tiempo real | ✓ | Por evento dentro del episodio; sin ticks intra-día |
| 6 | Limpiar hardcodeado/legacy/redundante | — | Inventario en §3 |

---

## 3. Inventario de deuda

### 3.1 La migración ADR-0017 quedó a medias

| Item | Estado | El residuo |
|---|---|---|
| `theme_weights` (Concerns) | debía volverse *Personality weight biases* | Sigue como JSONB separado + `PresetThemeWeight` + `PATCH /concerns` + editor del Studio + `KNOWN_CONCERNS` hardcodeado en `labels.ts`. Es el cuarto canal de atención redundante |
| `beliefs` table | debía plegarse a `relations` + memories tier `conviction` | Nunca se plegó: cada seed escribe **un Belief Y una Memory conviction** (`seed_starter_beliefs`); reflection sincroniza ambos a mano en weaken/invert (C37); `stance` se copia a una Relation seed (C36). Dos representaciones del mismo dato |
| `need_affect_scale`/`need_affect_cap` | listado como *dead machinery* en el ADR | Sigue vivo en `episode_mood` — y `piel` escribe estos knobs: **maquinaria declarada muerta pero cableada a un trait vivo**. Además el hambre pesa por TRES canales: need pressure + body.weight + imprint del need item |
| Rachas/aburrimiento | "emergen de `familiarity`" según el ADR | No emergieron: coexisten TRES sistemas de repetición — recurrence items (presión/ruptura), composite rules (rachas→needs), pattern memories |
| Detectors → Body | "evolucionan al mapping declarado" | Conviven dos lectores del Condition: detectors (umbrales→needs) y `BODY_PROJECTION` (continuo→body dims) |
| `affect.*`, `mood_blend`, `end_vitals`, `MOOD_LABELS`, counters de streak por sujeto | muertos | efectivamente eliminados ✓ |

### 3.2 Hardcodeado que debería ser dato

| Item | Dónde | Qué es |
|---|---|---|
| `salience_min.*` + `severity.*` (~30 entradas: orcs, hobbits, maiar…) | `DEFAULT_WIRING` en `provisioning.py` | Semántica de juego (¡vocabulario de la Tierra Media!) dentro del wiring genérico del motor. Es pack data: corresponde a columnas `salience_floor`/`severity` en `mind.semantics` |
| `BODY_PROJECTION` | `perceive.py` | Mapa Condition→body dims con campos del juego (`days_without_food`, `shadow`, `energy`) en el motor genérico → pack data como los detectors |
| `FEELING_LEXICON` | `engine.py` | Léxico de sentimientos en inglés hardcodeado → pack de voz |
| `PHRASES` + `MOOD_BANDS` | `voice.py` | El banco de frases del motor: "no per-game pack, no overrides" — la migración NL→datos (A3/A4/C10) llegó al narrador pero **no a la voz propia de la mente** |
| `_DISPOSITION_RENDER` | `lens.py` | Plantillas feeling→oración en inglés en código |
| `SEVERITY_FIELDS` | `perceive.py` | Lista hardcodeada que se solapa con `DEFAULT_SEMANTIC_FIELDS` (`danger` cuenta dos veces por vías distintas) |
| `FORM_DIFFICULTY` | `perceive.py` | Dificultad por forma — podría vivir en la fila semántica del `form:*` |
| `MUSING_PACKS` + `ATTITUDE_PACKS` + `LEGACY_REWRITES` | `musings.py` (~550 líneas) | Contenido autoreado por personaje en el código del motor, cargado vía migraciones → `database/seeds` |
| `KNOWN_CONCERNS`, `LIVING_TRAITS`, `DORMANT_TRAITS`, labels | `mind-studio/src/lib/labels.ts` | Vocabulario del juego y catálogo de traits duplicados en la app Vue |

### 3.3 Canales redundantes de "esto me importa más"

Hoy cinco mecanismos compiten por subir la atención de un tema:

1. `theme_weights` → `w_theme` en salience (+ decisions + boosts)
2. `salience_min.<tag>` floors (wiring)
3. `attention_weights` (Relations → salience)
4. `belief.boosts` {tag: magnitude} (dobla theme_weights)
5. `severity.<tag>` floors (wiring)

El esquema objetivo necesita dos: **el pack declara** cuánto pesa un tipo de
contacto para cualquiera (semantics: weight + salience/severity floor) y
**la mente declara** su sesgo — donde la Relation *es* el sesgo (una hobbit
que ama la comida nace con una Relation de `food` que ya levanta atención vía
`attention_weights`). `theme_weights` puede morir sin perder expresividad:
un seed relation hace lo mismo y además siente.

### 3.4 Legacy / tolerancia a wire v1

- `character_state` acepta evento `body` legacy (el backend no lo emite).
- `narrate_episode` tolera `day`, `world_notes`, `previousDay` como alias
  del payload v1; `resolve_event_reading` entiende `travel`/`note` (nadie
  los emite).
- `when.episode`/`when.date` fallbacks de índice/fecha legacy.
- `OpenCharacter` lleva campos planos (`energy`, `shadow`, `wounded`…)
  además de `state` — declarado "para los hosts del pack built-in",
  pero es vocabulario del juego en el contrato genérico.
- `thought_packs.py` — shim declarado para migraciones viejas (0017/0018
  lo importan). Correcto; no tocar migraciones.
- `sleep_wake_forms` — lista hardcodeada que duplica `FORM_DIFFICULTY`;
  `wakes_sleeper` podría ser una columna de la fila semántica.

### 3.5 Dormido / medio usado

- **Traits dormidos** (`impulso`, `deliberacion`, `integridad`, `coraje`,
  `corruptibilidad`) — se guardan, se muestran en el Studio, nadie los lee.
  `deliberacion` es *exactamente* el dial de reflexividad del issue #7.
- `decisions.py` — el motor de recomendación funciona, pero puntúa con
  `theme_weights` (canal condenado) + beliefs + needs.
- `mind.counters` — bolsa opaca de contadores (`rule:*`,
  `last_reflection_episode`).
- Embeddings — hasher de buckets determinista (fallback deliberado sin
  pgvector); `retrieval.py` marca `TODO(jev): LLM rerank`.

### 3.6 El eslabón que falta (voz interior) — resuelto en #158

- ~~**El clima no puede evocar musings**~~: las musings matchean sobre
  *todo lo percibido* (frame incluido) con el tagset completo — una
  musing `tag:weather:storm` o `type:body` ya habla. El Focus sigue
  excluyendo frames; la voz es un canal aparte del Focus.
- ~~**No hay dial de reflexividad**~~: `personality.reflectiveness`
  (default 1.0) multiplica el score de las musings — inclusive las de
  soledad. **Retirado**: la spec murió — la cadencia de reflexión es
  agenda del wiring (`reflection_every`), no carácter, y los musings
  hablan sin ganancia de personalidad.
- ~~**Colisión de nombre**~~: `type:moment` se renombró `type:ambience`
  (kind `ambience`, role `moment`); el nombre viejo queda como alias
  legacy en el Kind Registry.

---

## 4. El esquema objetivo propuesto

### 4.1 Entidades

```
Event {kind, source, when, where, data}
  kind   — declarado en el Kind Registry (pack): schema de campos,
           frame|moment|synthetic, encodable?, roles de subject
  source — world | ambient | mind | decision  (los items sintéticos
           need/recurrence se marcan 'mind', no fingen ser mundo)

Semantic pack (mind.semantics ampliada)
  key → {delta, weight, body_hit, salience_floor, severity_floor,
         wakes_sleeper, difficulty}
  Una fila = "qué significa objetivamente este contacto" a nivel juego.

Relation (subject → {affection,trust,fear,familiarity}, feeling, origin)
  El sedimento y el ÚNICO canal personal de atención:
  un lean del preset ES una seed relation.

Mood {valence, arousal, dominance, cause, feeling}
  Se mueve por pulls felt:* (trayectoria por fase), lo arrastra el body,
  lo presionan los threads, regresa al Temperament al cierre.

Temperament — el punto de reposo del mood.
Personality — {resistance, moodiness, choice_variability, weight_bias?}
  weight_bias (si se conserva) reemplaza theme_weights:
  sesgo de atención declarado, distinto del sentimiento (Relation).

Body — proyección declarada del Condition + golpes agudos.
  El mapa vive en pack data (como detectors); idealmente detectors y
  projection son dos caras de una misma tabla (umbral vs. continuo).

Need — bucle abierto: detector (Condition) | rule (racha) | thread (evento).
  Una sola vía de presión al mood (eliminar el triple conteo del §3.1).

Memory {desc, imprint, subjects, importance, strength, depth, tags, embedding}
  depth: fresh | consolidated | conviction. Elegible = noticed + salience>0.
  `valence` pasa a ser derivado del imprint, no columna canónica.

Conviction — DECISIÓN ABIERTA: o se completa el pliegue de ADR-0017
  (belief = memory en tier conviction; subject/stance viven en
  subjects/imprint; el enunciado en desc) o se acepta Belief como capa
  enunciada y se elimina la copia conviction paralela. Lo que no puede
  seguir es la escritura doble sincronizada a mano.

Musing — línea autoreada; se evoca por contacto de tags incluidos
  context:solitude, y (propuesta) por triggers ambientales declarados —
  el canal que hoy falta para el clima. Un coupling de personalidad
  (deliberacion despierta, o musing_bias) dobla cuánto habla.

Feeling lexicon — pack data (patrones sobre dims vivas → palabra).
```

### 4.2 Flujo

```
open:    events → checks → semantic_delta ─► Relations (mundo)
                                   └─► felt:* pull (sentido) ─► Mood + imprint
         salience (pack floors + Relation attention + bias) → perceived_day
         retrieve (evocación realimenta Relations y Mood)
         needs/detectors/rules (Condition + threads)
         brief: moments → Focus (rules | director) → lens_block
narrate: lens + beats + dispositions → prosa
close:   resolve needs → encode → patterns → decay/forget →
         relation decay → mood regress → Reflection (LLM → beliefs)
```

### 4.3 Reglas del esquema

1. **Un evento, un kind registrado, un schema.** El Kind Registry declara:
   campos, si es frame o moment, si puede ser Focus, si codifica, sus
   roles de subject. El `type` deja de ser convención.
2. **El mundo sedimenta; lo sentido mueve.** Los dos canales del ADR se
   mantienen: delta objetivo → Relation; delta deformado → Mood/imprint.
   Nada más escribe Relations salvo percepción y evocación.
3. **Un canal de atención personal.** `theme_weights`, `salience_min`,
   `boosts`, `attention_weights` y `severity` convergen a dos niveles:
   pack (semántico, igual para todos) y mente (Relation + weight_bias
   opcional).
4. **El cierre es una sola pasada nombrada.** Decae: memoria volátil,
   relations, mood→temperamento, beliefs no tocadas. Fortalece: memoria
   evocada/consolidada, needs que maduran, patrones confirmados,
   beliefs reforzadas por evidencia.
5. **Los pseudo-events se declaran como tales.** `need` y `recurrence`
   llevan `source: 'mind'` — el narrador ya sabe distinguirlos
   (los need items se narran "no como cosas que pasaron").

### 4.4 Qué sale / qué se pliega (candidatos, a decidir)

| Candidato | Acción propuesta |
|---|---|
| `theme_weights` + `/concerns` + editor del Studio + `PresetThemeWeight` | Morir — reemplazado por seed relations + `personality.weight_bias` si se quiere sesgo sin sentimiento |
| `belief.boosts` | Plegar a Relations (la creencia ya siembra la relation que levanta atención) |
| `need_affect_scale/cap` | Eliminar (declarado muerto) o absorber en `thread_pressure` — el body ya arrastra lo fisiológico |
| `salience_min.*`/`severity.*` en DEFAULT_WIRING | Mover a columnas de `mind.semantics`; wiring queda solo para overrides personales |
| `BODY_PROJECTION`, `FEELING_LEXICON`, `PHRASES`, `_DISPOSITION_RENDER`, `FORM_DIFFICULTY`, `SEVERITY_FIELDS`, `sleep_wake_forms` | Mover a pack data (una sola "caja de voz y sentido" del juego) |
| Recurrence items + composite rules + counters | Unificar: las rules producen needs; la presión de repetición emerge de `familiarity` saturada (lo que el ADR prometió) o se mantiene UN solo mecanismo declarado |
| Doble escritura Belief↔conviction Memory | Decidir el pliegue (mayor cambio del backlog) |
| Traits dormidos | Despertar (Decision) o cortar |
| Tolerancias de wire v1 (`day`, `world_notes`, `body` event, campos planos) | Eliminar cuando el backend confirme que nada las usa |

### 4.5 Implicancias para el Studio (solo lectura)

La vista de "dominios y relaciones" pedida originalmente queda así:

- **Dominios** = familias de subject del tag registry (`entity`,
  `entity_type`, `family`, `race`, `place`, `food`, `drink`, `kind`,
  `region`) — ya servidas por `GET /tags`.
- **Nivel** = especificidad de la Relation (entity > family > type >
  place/food > region) — ya declarada en `engine.SPECIFICITY`.
- **Relaciones del Character** = filas `mind.relations` — falta exponerlas
  en `GET /minds/{id}` (cambio chico en `app/studio/api.py`).
- **Weights** = con la convergencia del §4.3, el Studio muestra Relations
  (sentimiento + atención derivada) y deja de editar `theme_weights`.

---

## 5. Decisiones abiertas

1. **Plegar `beliefs` a conviction-tier memories** (completar ADR-0017) o
   formalizar la capa enunciada — la decisión más grande.
2. **`theme_weights`**: ¿morir del todo (Relations bastan) o renacer como
   `personality.weight_bias`?
3. **Repetición**: ¿convergen los tres sistemas a familiarity + rules, o se
   mantiene la presión de recurrencia como mecanismo declarado único?
4. **Traits dormidos**: ¿despiertan en un sistema de Decision o se cortan?
5. **Voz interior**: canales nuevos para musings (clima, cuerpo) + dial de
   reflexividad — issue aparte.
6. **Pack-ificación**: alcance (¿incluye `PHRASES`/`MOOD_BANDS`, la voz
   propia de la mente?).
7. **Wire v1**: confirmar que nada consume los alias y borrar.
