# Story Engine — Plan de desarrollo (Mind Engine + Tuners)

> Plan ejecutable desde el estado actual del repo. Cada bloque es un prompt
> técnico autocontenido, pensado para ser ejecutado por un dev o un agente en
> orden. **Fase A = MVP usable. Fase B = complejización incremental.**
>
> Referencias: `docs/psyche-engine-spec.md` (spec original, varias decisiones
> revisadas acá), `docs/mind-engine-prd.md` (PRD técnico resultante),
> `docs/story-engine-prd.md` (producto umbrella), `docs/story-engine-explained.md`.

## Estado actual (punto de partida)

- `story-engine/` es un servicio FastAPI **stateless**: un solo endpoint
  `POST /narrate-day`, port 1:1 del pipeline de narración de Node. Sin DB.
- `story-engine/app/natural_language/*` tiene las bandas/umbrales/frases
  **hardcodeadas como constantes** (`TEMPERATURE_BANDS`, `CLOUD_BANDS`,
  `WINDY_SPEED_MIN`, estados multi-día, etc.).
- Node llama al servicio desde `backend/domains/story/services/narrator/narrateDay.js`
  (`STORY_ENGINE_URL`, default `http://localhost:8001`).
- El proyecto ya tiene Postgres+PostGIS (el schema `mind` puede vivir en la
  misma instancia; schema separado = frontera de servicio futura).

## Convenciones del plan

- Todo lo nuevo de la mente vive en `story-engine/app/mind/` y en el schema
  `mind.*` de Postgres. El pipeline de narración existente NO se rompe:
  `/narrate-day` sigue funcionando igual todo el MVP.
- Regla de oro ya decidida: **el host traduce su mundo a `events[]`**; el
  núcleo jamás ve campos específicos de un juego.
- Config editable = filas relacionales (no JSON blobs) para que SQLAdmin la
  edite como CRUD de verdad.

---

# FASE A — MVP

## A1 — Persistencia: Postgres + SQLAlchemy + Alembic

```
Contexto: story-engine/ es FastAPI stateless, requirements.txt tiene solo
fastapi/uvicorn/pydantic/groq/python-dotenv. No hay DB.

Tareas:
1. Agregar deps: sqlalchemy>=2, alembic, psycopg[binary] (o asyncpg si se
   prefiere async — decidir y documentar; sync está OK para el MVP dado que
   los endpoints actuales son def síncronos).
2. app/db.py: engine + SessionLocal + Base declarativo, DATABASE_URL por env
   (python-dotenv ya está en uso). Default: la misma Postgres del proyecto,
   database configurable.
3. alembic init en story-engine/alembic/ con env.py apuntando a app.db.Base
   y version_table en schema mind. Crear schema `mind` en la primera
   migración (CREATE SCHEMA IF NOT EXISTS mind).
4. Dependency FastAPI get_session(); health check extendido: /health reporta
   db: ok|down sin tirar 500 si la DB no responde (degradación elegante).
5. .env.example con DATABASE_URL.

Aceptación: `alembic upgrade head` crea el schema vacío; /health responde
ok con y sin DB disponible; tests de conexión pasan.
```

## A2 — Contrato `events[]` + recurso Episode

```
Contexto: tras A1 hay DB. El contrato de entrada es events[] ESTRICTO
(host traduce; no hay adapters internos — revisión de §3.1 de la spec).

Tareas:
1. app/mind/models.py (Pydantic):
   - EventWhen {episode:int, date:str, hour:float|None, phase:str|None}
   - EventWhere {region:str|None, family:str|None, point:[x,y]|None}
   - EventIn {type:str, when:EventWhen, where:EventWhere|None,
     data:dict} — type es str libre validado contra una lista conocida del
     game (registry, ver A3), no enum hardcodeado.
   - OpenEpisodeRequest {game_id:str, character:{id,name,description,
     skills,conditions,resources,traits} , episode_ref:str|None,
     events:[EventIn], narrator_payload:dict|None}
     narrator_payload = blob opaco (el day/trip crudo actual) para que el
     Narrator siga pudiendo armar su prompt legacy durante la migración.
2. app/mind/tables.py (SQLAlchemy): mind.episodes(id pk, game_id,
   character_id, episode_ref, status open|narrated|closed, events jsonb,
   narrator_payload jsonb, config_snapshot jsonb, created_at, closed_at),
   UNIQUE(game_id, character_id, episode_ref) para idempotencia.
3. POST /episodes (open): valida events[], resuelve/crea brain (A5 stub:
   default), persiste episode + snapshot de config, devuelve
   {episode_id, psyche_packet} — packet por ahora con perceived_day =
   events anotados todos "noticed", lens_block="", mood neutral.
4. GET /episodes/{id} — estado del episodio (debug).
5. GET /mind/state/{character_id} — shell que devuelve el profile (A5).

Aceptación: POST /episodes persiste y responde 200 con packet stub;
re-POST mismo (game_id, character_id, episode_ref) hace upsert, no duplica;
events[] malformado → 422 con detalle.
```

## A3 — Capa NL como datos: `nl_bands` + facets + resolver

```
Contexto: la capa natural-language pasa de constantes a datos game-scoped
editables. Una sola capa por juego (no por brain) — revisión aprobada.

Tareas:
1. Tablas (schema mind):
   - mind.nl_bands(id, game_id, table_name, ordinal, below float|null,
     phrase text, meta jsonb) — una fila por banda; ordinal define el orden
     de evaluación ("first band whose threshold the value falls under").
     below NULL = catch-all (equivale a inf).
   - mind.nl_thresholds(id, game_id, key, value float) — umbrales sueltos
     (WINDY_SPEED_MIN, WET_PRECIPITATION_MIN, SNOW_TEMP_MAX, etc.).
   - mind.nl_phrase_lists(id, game_id, key, ordinal, phrase text) — bancos
     de variantes (SNOWBOUND_PHRASES, MOON_NIGHT_PHRASES, etc.).
   - mind.facets(id, game_id, event_type, field_path, unit, description) —
     registry de campos bandeables para autocompletar/validar en admin.
2. app/mind/nl_resolver.py: API única
   - band_phrase(game_id, table, value) -> str|None
   - threshold(game_id, key) -> float
   - phrases(game_id, key) -> [str]
   - resolve_event_reading(game_id, event) -> str (builder por event_type:
     climate usa bandas temp/cloud/wind/precip; fallback genérico por data).
   - Cache en memoria por (game_id, version-ish) invalidable al editar;
     TTL corto o flush explícito desde admin al guardar.
3. Seed: script `alembic`/script python que inserta el pack default
   game_id='middle_earth' con los valores EXACTOS actuales de
   app/natural_language/* (TEMPERATURE_BANDS, CLOUD_BANDS, todos los
   thresholds y phrase lists). Los constantes quedan como fallback en código.
4. Facets seed para middle_earth: climate.{temperature_2m,cloud_cover,
   wind_speed_10m,precipitation}, body.{energy,fatigue,days_without_food,
   days_without_water}, etc.

Aceptación: resolver con seed devuelve idéntico output que las constantes
para inputs de prueba; editar una fila cambia el resultado sin tocar código;
cache se invalida tras edición.
```

## A4 — Natural_language consume el resolver (sin cambio de comportamiento)

```
Contexto: A3 dio la capa de datos. Ahora los módulos app/natural_language/*
leen de ahí — la misma tabla alimenta percepción (Mind) y secciones del
prompt (Narrator). Una sola fuente de verdad.

Tareas:
1. Inyectar un provider en los módulos NL: refactor leve para que
   climate_notes (y luego elevation/meal/terrain/etc.) acepten un
   `nl=Resolver` opcional; default = constantes actuales (cero regresión).
2. Punto de integración único: quien llama a estos módulos pasa el resolver
   cargado con el game_id del request (narrate-day recibe game_id opcional
   nuevo; si falta, constantes).
3. Migración incremental — empezar por climate (bandas temp/cloud + flags
   windy/wet + multi-day states + moon phrases); el resto puede quedar con
   constantes en este prompt y migrarse en PRs chicos siguientes.
4. Tests: equivalence suite — para un set de climas sintéticos, output con
   resolver(seed default) == output con constantes.

Aceptación: narrate-day produce prompts idénticos al comportamiento actual
cuando se usa el pack default; cambiar una banda en DB cambia la frase del
prompt para ese game.
```

## A5 — Moldes de cerebro + perfiles vivos (provisión lazy)

```
Contexto: modelo decidido — moldes clonables → cada personaje recibe una
COPIA viva (no referencia + override). Divergencia solo por contenido.

Tareas:
1. Tablas:
   - mind.brain_molds(id, game_id, slug unique(game_id,slug), name,
     description, created_at) — incluye seed 'default'.
   - mind.mold_theme_weights(mold_id, key, weight float) — key =
     'type:meal' | 'tag:weather:rain' | 'entity:*' etc.
   - mind.mold_wiring(mold_id, key, value float) — DECAY, FORGET_THRESHOLD,
     FIXED_THRESHOLD, w_severity, w_novelty, w_emotional, w_trait,
     w_perception, alpha, beta, gamma, lambda_recency, evocations_to_fix.
   - mind.mold_starter_beliefs(mold_id, kind, statement, confidence).
   - mind.brains(id, game_id, character_id, mold_id, mold_slug,
     theme_weights jsonb, wiring jsonb, counters jsonb, mood jsonb,
     created_at) — config MATERIALIZADA como copia del molde (jsonb acá sí:
     es snapshot, no dato editado campo a campo — el admin edita vía vistas
     o filas hijas si se prefiere; decidir en implementación).
     UNIQUE(game_id, character_id).
   - mind.brain_beliefs = la tabla beliefs de A8 (seed al clonar).
2. app/mind/provisioning.py: get_or_create_brain(game_id, character_id,
   hint_slug=None) — lazy en el primer open; hint solo aplica en creación;
   slug inexistente → default; nunca pisa asignación existente.
   Reasignación = admin (o POST /mind/brains/{character_id}/mold
   {slug, reclone:false|true} — reclone:true resetea config al molde,
   conserva memorias).
3. Wiring defaults del molde 'default' = valores guía de la spec
   (DECAY≈0.85, FORGET_THRESHOLD≈0.2, etc.).

Aceptación: open con character nuevo crea brain clonado; segundo open no
duplica; hint_slug inexistente cae a default; reasignar molde no toca
memorias.
```

## A6 — Percepción MVP: readings via NL + importance

```
Contexto: MVP sin gates/rolls — todo evento es 'noticed' pero con reading
generado por la capa NL y salience ponderado por theme_weights.

Tareas:
1. app/mind/perceive.py: por cada EventIn →
   - reading: resolve_event_reading(game_id, event) de A3 (texto tipo
     "cool, partly cloudy" / "leyó las huellas: ..." segun builders por
     event_type; builder genérico resume data si no hay builder propio).
   - tags derivados: f'{type}', f'{type}:{subkey}' desde data (convención
     documentada), entity_id/region si vienen.
   - importance = clamp01(w1·severity(data) + w2·novelty(tags/entity en
     memories) + w3·emotional_charge + w4·theme_weight(tags) +
     w5·perception_bonus). severity = max de campos declarados como
     severity-ish en facets (o data['severity'] directo si el host lo manda).
     theme_weight = max weight de los tags del evento (default 0 → no suma).
2. Salida persistida: mind.perceptions(episode_id, character_id,
   annotated_events jsonb) — perceived_day.
3. psyche_packet real: perceived_day anotado (perception='noticed',
   reading, salience, evoked=[] por ahora), mood del brain.

Aceptación: evento climate con lluvia devuelve reading textual correcto;
evento con tag de weight alto sube importance; idempotente por episodio.
```

## A7 — Memoria: encode, salience→recuerdo, decay/olvido

```
Contexto: close-episode escribe el aprendizaje. MVP: nace fijo por
importance alta + consolidación por evocaciones≥K (pattern memories van a
Fase B).

Tareas:
1. mind.memories(id, game_id, character_id, episode_ids jsonb, kind
   'episodic'|'pattern', tags jsonb, entity_id, region, desc text,
   valence float, importance float, strength float, evocations int,
   last_evoked_episode int, consolidated bool, embedding null,
   origin 'experience'|'seed', created_episode). Índices
   (character_id), GIN(tags).
2. app/mind/memory.py: encode_episode(brain, perceived_day, outcome) —
   por evento percibido: importance≥FIXED → consolidated+desc; si no,
   volátil strength=f(importance). desc generado desde reading+data.
   dedup: si ya existe memoria del mismo (character, episode_ref, tag-set
   idéntico) → update, no insert (idempotencia de re-close).
3. decay_pass(brain, current_episode): strength*=DECAY a volátiles no
   evocadas; strength<FORGET → delete. evocations≥K → consolidated.
4. POST /episodes/{id}/close {outcome?:dict} → corre encode + decay;
   marca episode closed; devuelve resumen {encoded, forgotten,
   consolidated}. Idempotente.
   outcome queda guardado en el episodio para contexto futuro.

Aceptación: cerrar episodio crea memorias; re-cerrar no duplica; decay
baja strength y borra bajo umbral; importance alta nace consolidated.
```

## A8 — Beliefs-lite + retrieval + lens + mood

```
Contexto: beliefs existen como dato (seed + futuras consolidadas) pero sin
pipeline de reflexión. Retrieval es scoring determinista (sin embeddings).

Tareas:
1. mind.beliefs(id, game_id, character_id, kind world|self|other,
   statement, confidence, evidence jsonb, origin 'seed'|'reflected',
   status active|weakened|inverted, formed_episode, updated_episode,
   boosts jsonb NULL — columna reservada, sin efecto en MVP).
   Al clonar brain (A5), instanciar mold_starter_beliefs como origin='seed'.
2. app/mind/retrieval.py: score = α·recency(exp(-λ·Δepisodios))
   + β·importance + γ·relevance(overlap tags/entities/region con el
   episodio actual + tags de beliefs activas). Top-K (K wiring) →
   evocations++, strength+=boost (única escritura del camino de lectura).
3. lens.py: render lens_block — plantilla de texto:
   === THE MIND OF {name} === / mood / beliefs activas (top por confidence)
   / memorias evocadas como impresiones / needs vacío en MVP.
   El texto usa las frases/desc ya generadas — no inventa.
4. mood: valence media de eventos percibidos ponderada por importance +
   arousal por severidad; dominant = etiqueta por banda de valence
   (tabla NL propia, editable: nl_bands table='mood').
5. open-episode ahora devuelve packet completo: perceived_day, lens_block,
   mood, needs_active=[], check_results=[], proposed_commands=[].

Aceptación: segundo episodio de un personaje evoca memorias relevantes del
primero (mismo tag/entidad); lens_block contiene mood + beliefs seed +
impresiones; las evocadas suben strength (sobreviven más al decay).
```

## A9 — `POST /episodes/{id}/narrate` (Mind + Narrator integrados)

```
Contexto: narrar usa el packet persistido + el Narrator Engine existente.
NO se reescribe narrate_day: se lo envuelve.

Tareas:
1. Endpoint POST /episodes/{id}/narrate {language?} →
   - carga episode (events, narrator_payload, config_snapshot, brain).
   - si narrator_payload presente (modo Middle Earth): llama al pipeline
     existente de prompt-builder con esos datos + INYECTA lens_block como
     sección nueva del prompt (sección "THE MIND OF X" previa a las
     secciones situacionales) + líneas de readings relevantes.
   - respuesta NarrateDayResponse + {perceived_day, mood, lens_block,
     proposed_commands:[], generation_meta}.
   - marca episode status='narrated'.
2. Sección del prompt para el lente: app/prompt/sections/mind.py —
   inserta lens_block tal cual (ya viene renderizado).
3. NarrateDayRequest/endpoint /narrate-day queda INTACTO (fallback y
   compatibilidad) — el path nuevo es /episodes/*/narrate.
4. Idempotencia: narrate re-llamado sobre mismo episodio regenera (o
   devuelve cacheado si narrative_cached — decidir; recomendado regenerar,
   la narrativa no es dato persistido de la mente).

Aceptación: el prompt contiene la sección del lente; el día se narra con
la voz actual + contexto mental; /narrate-day sigue funcionando igual.
```

## A10 — Mind Tuner + Narration Tuner (SQLAdmin)

```
Contexto: admin mínimo = SQLAdmin montado en la misma app FastAPI, config
en filas relacionales, scope por game_id.

Tareas:
1. pip sqladmin; app/admin.py: Admin(app, engine) montado en /admin,
   auth básica por env (ADMIN_USER/ADMIN_PASSWORD; middleware o
   authentication_backend de sqladmin).
2. Registrar vistas CRUD:
   - Narration Tuner: nl_bands, nl_thresholds, nl_phrase_lists, facets
     (filtro por game_id; edición directa de filas).
   - Mind Tuner: brain_molds + hijas (theme_weights, wiring,
     starter_beliefs), brains (config editable), beliefs (crear seeds por
     personaje), y vistas readonly: episodes, perceptions, memories,
     state inspector por character.
3. Al guardar en nl_* → invalidar cache del resolver (hook on_model_change).
4. Tester custom view (/admin/nl-tester): form con game_id + field/table +
   valor (o EventIn JSON) → muestra banda resuelta, frase, y con brain_id
   opcional la importance resultante. Una sola vista; llama a las mismas
   funciones del resolver — sin LLM, sin escribir nada.

Aceptación: editar el corte de "heavy rain" en /admin cambia el próximo
reading; el tester muestra la frase correcta para valores dados;
state inspector muestra memorias/mood/beliefs de un character_id.
```

## A11 — Integración Node: traductor events[] + orquestación

```
Contexto: Node es el host. Traduce su mundo a events[] y orquesta
open→narrate→close. /narrate-day queda como fallback.

Tareas:
1. backend/domains/story/services/mind/toEvents.js: day+trip+character →
   events[] (climate por fase o agregado con data cruda, travel, terrain,
   place, water, meal, rest, encounter, body desde characterState, region).
   Documentar qué data lleva cada type (alineado con facets de A3).
2. backend/domains/story/services/mind/mindClient.js:
   open(game_id, character, episode_ref, events, narrator_payload) /
   narrate(episode_id, language) / close(episode_id, outcome).
3. narrateDay.js: si flag MIND_ENGINE=on → flujo nuevo: open (con events +
   narrator_payload={day,trip,character,blocks...}) → narrate → devuelve
   mismo shape de respuesta que hoy ({prompt, generation}); si off →
   /narrate-day actual. Luego de persistir el día, close() fire-and-forget
   con outcome {applied_deltas...}.
4. Timeouts explícitos + fallo de mind → fallback a /narrate-day (la mente
   nunca bloquea el juego — invariante).
5. Env: STORY_ENGINE_URL ya existe; agregar MIND_ENGINE, GAME_ID='middle_earth'.

Aceptación: con flag on, un día narrado pasa por open/narrate/close;
psyche_db acumula memorias; con flag off o con servicio caído, el juego
narra igual que hoy.
```

## A12 — Smoke & evals del MVP

```
Contexto: hay app/evals/ (eval_runner, narrative_checks) — extenderlo.

Tareas:
1. Script de humo: personaje A (default) y B (molde con theme_weight alto
   en meal): mismo episodio con comida → B evoca/recuerda la comida, A no.
2. Determinismo: mismo events[] → mismo perceived_day (seed rng).
3. Idempotencia: open×2, close×2 → sin duplicados.
4. Eval narrativa: la narrativa referencia el lente (memory mention check).
5. Degradación: mind down → narrate-day path funciona.

Aceptación: suite corre en CI local; los 4 comportamientos verificados.
```

---

# FASE B — Complejización (roadmap, en orden sugerido)

Cada item = un prompt propio cuando toque. Se listan con alcance para saber
*a dónde* se complejiza — los prompts detallados se escriben al arrancarlos.

- **B1 — Gates & rolls**: `skill ≥ umbral` habilita el intento; roll
  d10+skill+mods → noticed/unnoticed/misread (misread si estado alterado).
  Config de gates en molde/wiring. Llena `check_results` del packet.
- **B2 — Needs engine**: detectores de estado (días sin comer, fatiga,
  rachas climáticas) + threads narrativos; `needs_active` del packet se
  llena; needs pueden cerrarse por `outcome` de close.
- **B3 — Pattern memories**: detector de tags repetidos en ventana →
  memoria kind='pattern' fija ("lleva lloviznando toda la semana").
- **B4 — Reflexión → beliefs (LLM)**: trigger cada K episodios o evento de
  importance alta; cluster de memorias → beliefs candidatas con evidence
  obligatoria; reconciliación (refuerzo/contradicción/inversión); cap 10–15;
  regenera lens baseline. Primera llamada LLM del pipeline mental.
- **B5 — `POST /episodes/{id}/decide`**: decision_point en la respuesta de
  narrate + resolución de la opción → activa `proposed_commands` reales
  (state_change, goal_resolve, item_gain...) que el host valida/aplica.
- **B6 — Boosts de beliefs**: activar `beliefs.boosts` — una belief fuerte
  amplifica theme_weights de sus tags mientras viva (recableado como dato).
- **B7 — Band overrides por brain**: capa opcional sobre la tabla NL global
  (el hobbit que llama "tormenta" a la llovizna del ranger).
- **B8 — Embeddings**: pgvector para relevance semántica en retrieval cuando
  los tags no alcancen; columna memories.embedding ya existe desde A7.
- **B9 — Composite/pattern rules configurables**: estados multi-día
  (snowbound) pasan de código a reglas declarativas editables.
- **B10 — NPC degraded mode + Story Tuner merge**: cerebros NPC sin
  reflexión/consolidación batch; el editor lindo de Mind/Narration migra a
  Story Tuner; versioning formal de packs.
