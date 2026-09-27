# PRD Técnico — Mind Engine (Psyche) dentro de Story Engine

**Versión**: 1.0 · **Estado**: aprobado por diseño conversado · **Audiencia**: desarrolladores
**Docs relacionados**: `psyche-engine-spec.md` (spec original — este documento la implementa y
revisa), `story-engine-prd.md` (producto umbrella), `story-engine-dev-plan.md` (plan por fases),
`story-engine-explained.md` (versión no-técnica).

---

## 1. Qué es

Mind Engine es el subsistema de **vida interior** de Story Engine: recibe los hechos del mundo
como `events[]`, los pasa por el lente de un personaje (percepción, memoria, creencias, ánimo) y
produce un `psyche_packet` que el Narrator Engine usa para generar la narrativa. El mundo decide
qué pasa; la mente decide cómo se vivió.

```
Story Engine (servicio FastAPI, story-engine/)
├── Mind Engine      ← NUEVO: app/mind/, schema mind.* en Postgres
├── Narrator Engine  ← EXISTE: app/natural_language/, app/prompt/, app/narrate_day.py, app/ai.py
└── Tuners (SQLAdmin en /admin)
    ├── Narration Tuner → tablas NL game-scoped (nl_bands, nl_thresholds, nl_phrase_lists, facets)
    └── Mind Tuner      → brain_molds, brains, beliefs, inspector de estado, NL tester
```

## 2. Revisiones respecto a docs previos (decisiones)

| # | Decisión previa | Revisión aprobada |
|---|---|---|
| 1 | spec §3.1: adapters `psyche/normalize/<game>.py` dentro del módulo | **Sin adapters internos.** El contrato es `events[]` estricto; el host traduce su mundo. El conocimiento del esquema vive donde pertenece (el backend del juego) y cambia con él. |
| 2 | PRD decisión #7: "Python nunca posee estado de juego" | **Refinada**: Python nunca posee estado *mecánico* (hp, inventario, posición). Sí posee el estado *interior* del personaje (memorias, beliefs, mood) — ese es su dominio: `mind.*`. |
| 3 | spec: percepción con gates/rolls/beliefs completas | **MVP corta en núcleo determinista + beliefs-lite** (ver §12). Gates, needs, patterns, reflexión LLM = roadmap. |
| 4 | spec §10 implícito: config en el profile | **Split**: traducción NL es **capa única por juego** (Narration Tuner); cerebro lleva `theme_weights` + `wiring` (Mind Tuner). |
| 5 | (nuevo) | Episodio como **recurso persistido**: `open → narrate → close` son tres endpoints separados; `decide` futuro se inserta sin mover nada. |
| 6 | (nuevo) | Cerebros = **moldes clonados** por personaje, no moldes+overrides. Divergencia solo por contenido. |
| 7 | (nuevo) | `config_snapshot` por episodio al abrir: narrate/close son autoconsistentes y auditable; ediciones del admin aplican hacia adelante. |

## 3. Principios

Heredados de la spec, con el matiz de ownership revisado:

- **Agnóstico del juego**: el núcleo solo conoce `events[]` y `psyche_packet`.
- **La mente es dueña de su propia data**: `mind.*` (memorias, beliefs, needs, mood, brains).
  El estado mecánico del juego llega como snapshot de solo lectura.
- **Determinista por defecto, LLM solo en narración** (y en reflexión, roadmap).
- **El olvido es un feature**.
- **Degradación elegante**: Mind caído → el host usa `/narrate-day` (que sigue intacto).
- **Idempotente**: todo claveado por `(game_id, character_id, episode_ref)`.

## 4. Flujo de datos — el episodio como recurso

```
Host (backend del juego)                     Story Engine
─────────────                                ┌──────────────────────────┐
genera episodio, traduce a events[]          │ Mind Engine              │
        │                                    │                          │
        ├── POST /episodes ────────────────► │ open: resolve brain →    │
        │   {game_id, character,             │   perceive → retrieve →  │
        │    episode_ref, events[],          │   mood → persist episode │
        │    narrator_payload?}              │   + config_snapshot      │
        │                                    │                          │
        │◄──── {episode_id, psyche_packet} ──┤                          │
        │                                    ├──────────────────────────┤
        ├── POST /episodes/:id/narrate ────► │ Narrator Engine          │
        │                                    │ prompt = pipeline actual │
        │◄──── {narrative, prompt,           │ + lens_block + readings  │
        │        perceived_day, mood,        │                          │
        │        proposed_commands: []} ─────┤                          │
        │                                    │                          │
persiste episodio+narrativa (SU DB)          │                          │
        │                                    ├──────────────────────────┤
        ├── POST /episodes/:id/close ──────► │ Mind Engine              │
        │   {outcome?}                       │ encode → salience →      │
        │◄──── {encoded, forgotten, ...} ────┤ memories → decay         │
        ▼                                    └──────────────────────────┘
responde al cliente
```

**Regla temporal**: `open` antes de narrar (lee mucho, escribe poco); `close` después de
persistir (escribe todo el aprendizaje). Episodio abierto y nunca cerrado = simplemente no se
recuerda; no hay inconsistencia ni cleanup urgente.

**Futuro sin cambios estructurales**: `decision_point` aparece en la respuesta de `narrate`;
`POST /episodes/:id/decide {option_id}` resuelve y devuelve narrativa de resolución +
`proposed_commands` reales.

## 5. Contrato de entrada — `events[]`

Idéntico a spec §3, con la traducción en el host:

```jsonc
{
  "type": "climate" | "encounter" | "terrain" | "place" | "water"
        | "meal" | "rest" | "travel" | "body" | "region" | ...,  // str libre, registry por facets
  "when":  { "episode": 2, "date": "1950-01-19", "hour": 10.0, "phase": "morning" },
  "where": { "region": "...", "family": "...", "point": [x, y] },
  "data":  { ... }   // libre; los facets declaran qué campos son bandeables
}
```

- Validación Pydantic estricta en el borde → `422` si llega mal.
- `type` no es enum en código: los tipos conocidos de un juego se declaran vía `mind.facets`.
- `body` es un type más: el cuerpo reportando (energía, heridas, días sin comer).
- `narrator_payload` (opcional): blob opaco que Narrator Engine usa para armar el prompt
  legacy (en Middle Earth: `day`, `trip`, `character`, bloques). Mind nunca lo interpreta.

## 6. Contrato de salida

`POST /episodes` → `psyche_packet`:

```jsonc
{
  "episode_id": "ep_...",
  "perceived_day": [ { "type": "encounter", "perception": "noticed",
                       "reading": "...", "salience": 0.8, "evoked": ["mem_1"] } ],
  "lens_block": "=== THE MIND OF X ===\n...",
  "mood": {"valence": -0.3, "arousal": 0.2, "dominant": "weariness"},
  "needs_active": [],
  "check_results": []
}
```

`POST /episodes/:id/narrate` → respuesta de narración (mismo shape que `/narrate-day`:
`{prompt, generation}`) **más** `{perceived_day, mood, lens_block, proposed_commands: []}`.
`proposed_commands` viaja vacío desde el día uno: contrato estable, se activa con `decide`.

`POST /episodes/:id/close` → `{episode_id, outcome?: object}` entra;
`{encoded, forgotten, consolidated}` sale (informativo). `outcome` es jsonb libre que el host
usa para reportar lo que persistió (deltas aplicados, opción elegida a futuro, ref. narrativa).

## 7. Modelo de cerebros: moldes → clones

**Decisión clave**: no hay molde compartido + overrides; hay **clone-and-own**.

- `mind.brain_molds`: catálogo de arquetipos por juego (`default` obligatorio; pueden ser
  temáticos "elfo veterano" o por personaje "Aranath"). Un molde define:
  - `theme_weights`: mapa `key → peso`. Keys: `type:<event_type>`, `tag:<tag>`,
    `entity:<id>`, comodines `tag:weather:*`. Efecto: suma al `importance` (salience) y a la
    relevance del retrieval → la mente nota, recuerda y evoca más de esos temas.
  - `wiring`: parámetros del motor (ver §10).
  - `starter_beliefs`: beliefs que se instancian al clonar.
- `mind.brains`: la copia viva por `(game_id, character_id)`. Al provisionarse, clona la
  config del molde y registra `mold_slug` como linaje. Desde ahí diverge **solo por
  contenido** (memorias, beliefs, mood, counters) y por edición directa en el admin.
  Editar el molde después **no** reconfigura cerebros existentes.

### Provisión

- **Lazy**: primer `open` con `character_id` desconocido crea el brain clonando `default`
  (o el molde indicado por el hint).
- **Hint**: el snapshot del personaje puede traer `brain_profile: "<slug>"`; se consulta solo
  en la creación, cae a `default` si no existe, y nunca pisa una asignación posterior.
- **Reasignación**: admin (o `POST /mind/brains/:character_id/mold`) con opción `reclone`
  (reset config al molde, conservar memorias).

### Regla de autoría

- Config (`theme_weights`, `wiring`, NL): **solo humanos** (admin/molde). La experiencia no
  muta knobs.
- Contenido (memorias, beliefs, mood): **solo la experiencia** (o seeds cargados).
- Puerta de complejización: `beliefs.boosts` (columna reservada) — una belief fuerte podrá
  amplificar los theme_weights de sus tags mientras viva. Recableado como *dato inspectable*,
  no drift numérico.

## 8. Capa NL — traducción data→lenguaje (game-scoped)

Reemplaza las constantes de `app/natural_language/*` por datos editables. **Una sola capa por
juego** — "qué es 6mm" es hecho del mundo; la diferenciación por personaje ocurre vía
theme_weights/valencia/misread, no renombrando bandas. (`band_overrides` por brain = roadmap.)

### Modelo

- `mind.nl_bands(game_id, table, ordinal, below, phrase, meta)` — bandas ordenadas; primera
  cuyo `below` supera el valor gana; `below NULL` = catch-all. Ej.: table `climate.temp`,
  filas `(2,'bitter cold'), (8,'cold'), (15,'cool'), (22,'mild'), (29,'warm'), (∞,'hot')`.
- `mind.nl_thresholds(game_id, key, value)` — umbrales sueltos (`windy_speed_min`,
  `wet_precipitation_min`, `snow_temp_max`, `consecutive_days`...).
- `mind.nl_phrase_lists(game_id, key, ordinal, phrase)` — bancos de variantes
  (`snowbound_phrases`, `moon_night_phrases`, ...).
- `mind.facets(game_id, event_type, field_path, unit, description)` — registry de campos
  bandeables: autocompletado/validación en admin; los paths libres siguen funcionando aunque
  no estén declarados (híbrido).

### Resolver (`app/mind/nl_resolver.py`)

- `band_phrase(game_id, table, value)`, `threshold(game_id, key)`, `phrases(game_id, key)`,
  `resolve_event_reading(game_id, event)` (builders por event_type + genérico).
- Cache en memoria, invalidada al guardar desde admin (hook `on_model_change`).
- **Defaults en código = pack semilla**: `middle_earth` se seedea con los valores exactos
  actuales; si no hay filas para un game_id, se usan los defaults built-in (cero regresión).

### Doble consumo

El resolver alimenta **Mind** (`reading`/`desc` de eventos percibidos) y **Narrator**
(secciones del prompt). Migración incremental: `natural_language/*` recibe un provider
opcional; los módulos migran uno a uno empezando por `climate_notes`.

## 9. Internos del MVP

### Percepción (`open`)

Todo evento → `perception: "noticed"` (sin gates en MVP) + `reading` desde el resolver NL +
tags derivados por convención (`type`, `type:subkey` desde data, `entity:<id>`, `region:<r>`)
+ `importance`:

```
importance = clamp01(
    w1·severity(data) + w2·novelty(tags/entity no vistos)
  + w3·emotional_charge + w4·theme_weight(tags) + w5·perception_bonus )
```

### Memoria (`close`)

- `importance ≥ FIXED_THRESHOLD` → `consolidated` al nacer.
- Resto → volátil, `strength = f(importance)`.
- `evocations ≥ K` → consolidada.
- Por close: `strength *= DECAY` a volátiles no evocadas; `< FORGET_THRESHOLD` → delete.
- Pattern memories (camino 2 de la spec) → roadmap B3.

### Retrieval (`open`)

`score = α·recency + β·importance + γ·relevance`; `recency = exp(-λ·Δepisodios)`;
`relevance` = overlap de tags/entities/región con el episodio + tags de beliefs activas.
Top-K → `evocations++`, `strength += boost` (única escritura del camino de lectura).

### Beliefs-lite

Tabla completa desde el día uno, pero sin pipeline: seeds (`origin='seed'`, exentas de la
regla de evidencia — su backstory es la evidencia off-screen) entran al lente y a la
relevance; `status` mutable; `boosts` reservado. Reflexión/consolidación LLM → B4.

### Mood

`valence` = media ponderada por importance de las valencias del día (mapeo por tabla NL
editable); `arousal` por severidad; `dominant` por banda. Baseline persiste en `brains.mood`.

### Lens

Template determinista: header, mood, beliefs activas top-N, memorias evocadas como
*impresiones* (no hechos), needs vacío en MVP.

## 10. Modelo de datos (schema `mind`)

```sql
mind.episodes        (id, game_id, character_id, episode_ref, status,
                      events jsonb, narrator_payload jsonb,
                      config_snapshot jsonb, perceived_day jsonb,
                      outcome jsonb, created_at, narrated_at, closed_at,
                      UNIQUE(game_id, character_id, episode_ref))
mind.brains          (id, game_id, character_id, mold_id, mold_slug,
                      theme_weights jsonb, wiring jsonb, mood jsonb,
                      counters jsonb, created_at,
                      UNIQUE(game_id, character_id))
mind.brain_molds     (id, game_id, slug, name, description, created_at,
                      UNIQUE(game_id, slug))
mind.mold_theme_weights (mold_id, key, weight)
mind.mold_wiring        (mold_id, key, value)
mind.mold_starter_beliefs (mold_id, kind, statement, confidence)
mind.memories        (id, game_id, character_id, episode_ids jsonb, kind,
                      tags jsonb, entity_id, region, desc, valence,
                      importance, strength, evocations,
                      last_evoked_episode, consolidated, embedding,
                      origin, created_episode)
mind.beliefs         (id, game_id, character_id, kind, statement,
                      confidence, evidence jsonb, origin, status,
                      boosts jsonb NULL, formed_episode, updated_episode)
mind.needs           (id, game_id, character_id, type, description,
                      urgency, status, source jsonb, linked_entity,
                      opened_episode, due_episode, resolution jsonb)
                      -- tabla creada en MVP, motor en B2
mind.nl_bands        (id, game_id, table, ordinal, below, phrase, meta jsonb)
mind.nl_thresholds   (id, game_id, key, value)
mind.nl_phrase_lists (id, game_id, key, ordinal, phrase)
mind.facets          (id, game_id, event_type, field_path, unit, description)
```

`wiring` keys (defaults del molde `default`): `decay=0.85`, `forget_threshold=0.2`,
`fixed_threshold` (guía ~0.8), `w_severity/w_novelty/w_emotional/w_theme/w_perception`,
`alpha/beta/gamma`, `lambda_recency`, `retrieval_top_k`, `evocations_to_fix`.

## 11. API

| Endpoint | Input | Output | Escribe |
|---|---|---|---|
| `POST /episodes` | `{game_id, character{...snapshot, brain_profile?}, episode_ref, events[], narrator_payload?}` | `psyche_packet` | episode, brain (lazy), perceptions, evocations |
| `POST /episodes/:id/narrate` | `{language?}` | narrativa + packet + `proposed_commands:[]` | status=narrated |
| `POST /episodes/:id/close` | `{outcome?}` | resumen | memories, decay, beliefsΔ, mood |
| `GET /episodes/:id` | — | estado del episodio | — |
| `GET /mind/state/:character_id` | `?game_id` | brain+memories+beliefs+mood | — (inspector) |
| `POST /mind/brains/:character_id/mold` | `{slug, reclone?}` | brain actualizado | brains |
| `POST /episodes/:id/decide` *(futuro)* | `{option_id}` | resolución + `proposed_commands` | — |
| `POST /narrate-day` | *(legacy, intacto)* | `{prompt, generation}` | — |

## 12. Admin (Tuners) — MVP

SQLAdmin montado en `/admin` de la misma app; auth básica por env. Scope `game_id` en todas
las tablas de contenido.

- **Narration Tuner**: CRUD de `nl_bands`, `nl_thresholds`, `nl_phrase_lists`, `facets`.
  Invalidación de cache del resolver al guardar.
- **Mind Tuner**: CRUD de `brain_molds` (+ hijas: theme_weights, wiring, starter_beliefs),
  `brains` (config editable), `beliefs` (alta de seeds por personaje). Vistas readonly:
  episodes, perceptions, memories → **inspector de estado** por character.
- **NL Tester** (vista custom única): input `game_id` + `table/field` + valor (o `EventIn`
  JSON) + brain opcional → muestra banda/frase resuelta e `importance` resultante. Llama a
  las mismas funciones del resolver; sin LLM, sin escrituras.
- **Roadmap admin**: simulación de episodio completo (Live Preview) vive en Story Tuner, no
  se duplica acá.

## 13. Consistencia de config

- Al `open`: el episodio persiste `config_snapshot` (pack NL resuelto + wiring/weights del
  brain). `narrate` y `close` usan ese snapshot → episodio autoconsistente y replay
  auditable.
- Ediciones del admin aplican al **próximo** open. Sin versionado formal en MVP; cuando el
  world pack del PRD tenga versiones, el snapshot registra la versión resuelta.

## 14. Propiedades operativas

- **Idempotencia**: `UNIQUE(game_id, character_id, episode_ref)`; re-open/re-close → upsert.
- **Latencia**: `open` en ms (índices por character + GIN tags); `close` tolera async.
- **Costo LLM en Mind**: 0 (reflexión es roadmap).
- **Aislamiento**: Mind caído → Node hace fallback a `/narrate-day`; pérdida de `mind.*` → se
  pierde solo la memoria de los personajes.
- **Determinismo**: rng inyectable en todo el pipeline mental.

## 15. Contrato con el host

El host (hoy: backend Node de Middle Earth) debe:

1. Traducir su episodio a `events[]` (`backend/.../mind/toEvents.js`) — es dueño de su
   esquema.
2. Mandar snapshot del personaje en `open` (skills, resources, conditions, name,
   description, `brain_profile` opcional).
3. Orquestar `open → narrate → close` (close fire-and-forget tras persistir su verdad).
4. Tolerar ausencia del módulo → fallback a `/narrate-day`.
5. Reportar `outcome` en close cuando quiera que la mente aprenda resultados (necesario para
   needs/decide futuros).

No debe: esperar escritura de estado de juego, depender del módulo para que el episodio
funcione, ni mandar ids internos de Mind (usa `character_id` propio y slugs).

## 16. MVP vs roadmap (corte aprobado)

**MVP (Fase A)**: contrato events[] · episodio recurso · percepción con readings NL ·
importance con theme_weights · memoria (encode/decay/consolidación por uso) · retrieval
determinista · beliefs-lite (seeds informan) · mood · lens_block · narrate integrado al
pipeline existente · admins CRUD + tester · integración Node con flag + fallback.

**Roadmap (Fase B)**: gates/rolls/misread → needs engine → pattern memories → reflexión
LLM→beliefs → `decide`+proposed_commands → boosts de beliefs → band_overrides por brain →
embeddings pgvector → reglas compuestas configurables → NPC degraded mode + merge con Story
Tuner + versionado formal.

## 17. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Regresión al mover NL a datos | Seed = constantes exactas + equivalence tests por módulo (A4) |
| Doble pipeline narrativo (narrate-day vs episodes) | `/narrate-day` queda como fallback explícito detrás de flag; retiro cuando el path nuevo esté validado |
| Config JSONB de brains no editable cómodo en SQLAdmin | MVP acepta edición vía molde + reclone; vistas custom si duele |
| paths libres de bandas con typos | facets registry para validar en admin; fallo silencioso aceptado en MVP (tester lo expone) |
| Explosión de tablas NL por juego | filas game-scoped; defaults built-in cubren juegos sin pack |

## 18. Glosario rápido

- **Event**: unidad de experiencia que llega. **Reading**: su traducción NL percibida.
- **Brain**: copia viva de un molde para un `character_id`. **Mold**: arquetipo clonable.
- **Lens**: texto que resume la mente hoy, para el prompt. **Theme weight**: cuánto le importa
  un tema. **Wiring**: parámetros del motor (decay, umbrales, pesos de scoring).
- **Belief seed**: creencia de backstory, `origin='seed'`, mutable. **Boost**: efecto futuro de
  belief sobre pesos temáticos.
