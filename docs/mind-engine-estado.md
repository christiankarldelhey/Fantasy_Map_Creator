# Mind Engine — estado al 2026-11-03

Resumen del servicio `mind-engine/` (FastAPI + SQLAlchemy/Alembic, schema `mind`
en Postgres), del **Mind Engine** que vive adentro, y de su admin, **Mind Studio**
(`mind-studio/`). Glosario: `CONTEXT.md`. Decisiones: `docs/adr/0001`–`0005`.

> *El mundo decide qué pasa; la mente decide cómo se vivió.*

---

## 1. Las tres partes

| Parte | Dónde | Qué es |
|---|---|---|
| **Narrador (stateless)** | `app/narrate_day.py`, `app/prompt/`, `app/natural_language/`, `app/ai.py`, `app/evals/` | Arranca como un port 1:1 del pipeline de Node. Recibe un día ya resuelto, arma el prompt (secciones + frases rule-based), llama a Groq y devuelve la prosa. No necesita DB. |
| **Mind Engine (stateful)** | `app/mind/` (~8k líneas) | La vida interior de un Character: percepción, memoria, creencias, necesidades, humor, Lens/Focus, reflexión. Persiste en el schema `mind`. |
| **Admin — Mind Studio** | `app/studio/api.py` (`/studio/api`) + `mind-studio/` (Vue 3 + Vite) | App Vue aparte servida como estática en `/studio`. Para ver una Mind en el tiempo y darle forma. Reemplazó a SQLAdmin (ADR 0002). |

Regla de oro: **la mente nunca bloquea el juego**. Si la DB o el Mind fallan, el
narrador stateless sigue andando (`/health` reporta `db` y `mind: mounted|degraded`).

---

## 2. Flujo de un día (host = backend Node)

Lo maneja `backend/domains/story/services/narrator/narrateDay.js` con el flag
`MIND_ENGINE`:

```
Node: generateDay ─► toOpenPayload (un solo whitelist de wire)
   │
   ├─ MIND_ENGINE off ─► POST /narrate-day ─────────────────────► prosa
   │
   └─ MIND_ENGINE on
        1. POST /episodes                (open, idempotente por episode_ref)
        2. [decision_point?] POST /episodes/{id}/decide  → proposed_commands (los aplica el host)
        3. POST /episodes/{id}/narrate   → prosa (+ traducción)
        4. Node persiste el día
        5. POST /episodes/{id}/close     (outcome) → consolidación
      (si falla 1–3 → fallback a /narrate-day)
```

### 2.1 Open (`routes.open_episode`)
1. **Provisioning**: la primera vez crea el *Brain* clonando su *mold* (Mind preset)
   y adopta la *Character card* (ADR 0001: a partir de ahí la copia del Mind manda).
2. **Relojes propios**: `episode_idx` monotónico por brain (C29) + `episode_date`
   en días del mundo (C30).
3. **Percepción** (`perceive.py`, `checks.py`): cada evento recibe `reading` NL, tags y
   `salience` según el wiring del brain. Los eventos con `data.check` se resuelven
   con gate + tirada determinística → `noticed / unnoticed / misread`.
4. **Retrieval** (`retrieval.py`): recencia + importancia + relevancia por tags +
   similitud semántica; con *contact gate* (C20): lo fresco solo no evoca. Evocar
   fortalece. Los encuentros con diálogo hacen recall propio (C23).
5. **Needs** (`needs.py`, `detectors.py`, `rules.py`): Detectors declarados leen la
   Condition (ADR 0005), reglas compuestas multi-día (ej. *snowbound*), Threads
   abiertos por eventos.
6. **Mood** (`lens.py`): el Lens habla el humor *de entrada*, siempre con su causa.
7. **Brief** (`focus.py`): candidatos que tocan el Episode, separados en *carried*
   (lo que trae) y *day* (anclado a su fase), un **Focus**, y `silenced` con el motivo.
8. **Director** (`director.py`): un LLM refina Focus + hasta 3 líneas; se valida
   contra las reglas y si falla queda el brief de reglas (`chosen_by`). NPCs
   (`degraded`) no lo llaman.
9. Se renderiza y guarda el `lens_block` (re-open devuelve lo mismo).

### 2.2 Narrate (`routes.narrate_episode`)
Envuelve el mismo `narrate_day()` inyectando el Lens y los *beats* por fase.
Narra siempre en **inglés** (Inner language) y traduce al final (ADR 0003).
Mide **Resonated/voiced** (C32): qué memorias evocadas aparecieron en la prosa →
`episode.lens_eval`. Regenera en cada llamada.

### 2.3 Decide (`decisions.py`)
Eventos con `data.decision` (ej. dónde dormir al anochecer, C31). El Mind recomienda
una opción; el host elige; el Mind devuelve los `commands` de esa opción como
`proposed_commands`. **El Mind nunca ejecuta mecánicas.**

### 2.4 Close (`routes.close_episode`)
1. El `outcome` del host resuelve Needs/Threads.
2. Contadores de racha.
3. **Memoria** (`memory.py`): codifica lo percibido (el Focus codifica más fuerte),
   decae lo volátil, olvida bajo umbral (queda traza en `forgotten_memories`),
   detecta patrones, compacta duplicados.
4. **Attitudes** derivan según cómo salió el encuentro en el mundo.
5. **Reflection** (`reflection.py`): LLM disparado cada N episodes o por un evento
   muy saliente; devuelve operaciones (create/reinforce/contradict/invert) que
   deben citar ids de memorias reales. Si falla, se saltea.

---

## 3. Features del Mind Engine

- **Characters propios** (ADR 0001): card (nombre, descripción, retrato,
  Foundational phrase, voz, skills) vive en `mind.characters`; Original vs copias.
- **Memory**: volátil/consolidada, decay, evocación, Forgotten como traza, patrones.
- **Beliefs con facetas** (alembic 0018): Subject, Stance, Source (lived/heard/legend),
  Pull, Habit, horizon; *Attitudes* (sobre tipos de seres, con familia declarada por
  el host) e *Impressions* (sobre lugares). Boosts de beliefs sobre theme_weights.
- **Thought packs**: ~190 pensamientos autorales para Celebrian y Aranath como
  starter beliefs; los `context:solitude` hablan en días sin encuentros.
- **Needs**: fisiológicas (Detectors), compuestas (reglas multi-día) y Threads.
- **Checks**: gates y tiradas determinísticas; modificadores y estado "altered"
  declarados como datos.
- **Lens / Focus / Director**: el Lens es un brief, no un inventario; lo silenciado
  queda registrado con su porqué.
- **Traits**: 6 diales humanos (Memoria, Atención, Piel, Rumia, Costumbre,
  Convicción) que mueven varios knobs de wiring a la vez + lista de *Concerns*.
- **World voice + Accent**: pack NL por juego (bands, thresholds, phrase lists,
  facets) en DB con fallback a `nl_defaults.py`; overrides por brain (Accent).
  Versionado de packs: clone → draft → promote (`/packs/...`).
- **Environmental variants**: el host resuelve estación/clima antes de mandar.
- **Inner language** inglés + traducción final.
- **Reset** completo de una Mind (C19) y **consolidación batch** para NPCs
  (`/maintenance/consolidate`).
- **Embeddings**: hashing determinístico en JSONB (no hay pgvector), coseno en Python.

---

## 4. Admin — Mind Studio

- Auth HTTP Basic (`ADMIN_USER` / `ADMIN_PASSWORD`; sin setear = cerrado).
- **Ver** (`GET /studio/api/minds`, `/minds/{id}`): card, memorias, Forgotten,
  beliefs, needs, mood y cada Episode con su Lens, Focus, silenciados y las dos
  narraciones (inglés + traducción).
- **Componentes**: `MindGraph` (grafo vivo de beliefs/memorias, evidencia, qué
  resonó), `EpisodeTape` (scrubber que rearma el grafo en el tiempo), `EpisodePanel`,
  `LensList`, `NodeDetail`, `CharacterCard`, `HowItWorks` (tour guiado).
- **Editar**:
  - `PATCH /minds/{id}/card` — card de una copia (no del Original).
  - `PATCH /minds/{id}/traits` y `/concerns` — *"Dar forma"* (`ShapePanel`), con
    vista avanzada del wiring crudo.
  - `/voice/*` — *"La voz del mundo"* (`VoicePanel`): bands, thresholds, phrases,
    facets del pack del juego; borrar = volver al default.
  - `/minds/{id}/accent/*` — *"Su acento"*.
- Build: `mind-studio/dist` (en Docker se buildea en el `Dockerfile` raíz).

---

## 5. Superficie HTTP

| Ruta | Uso |
|---|---|
| `GET /health`, `GET /system-prompt`, `POST /narrate-day` | Narrador stateless |
| `POST /episodes`, `GET /episodes/{id}`, `POST /episodes/{id}/{narrate,decide,close}` | Ciclo de Episode |
| `GET /mind/state/{cid}`, `POST /mind/brains/{cid}/{mold,reset}` | Estado y gestión de un brain |
| `POST /maintenance/consolidate` | Batch NPCs |
| `GET /packs/{game}/versions`, `POST /packs/{game}/{clone,promote}` | Versionado del World voice |
| `/studio/api/*`, `/studio` | Mind Studio |

**Datos** (schema `mind`, migraciones 0001–0018): `episodes`, `characters`,
`brains`, `brain_molds` (+ `mold_theme_weights`, `mold_wiring`,
`mold_starter_beliefs`), `beliefs`, `memories`, `forgotten_memories`, `needs`,
`detectors`, `composite_rules`, `facets`, `nl_bands`, `nl_thresholds`,
`nl_phrase_lists`, `brain_nl_overrides`, `pack_versions`.

---

## 6. Herramientas y calidad

- **Tests**: `cd mind-engine && pytest` — 45 archivos, ~285 tests (percepción,
  memoria, needs, detectors, reflection, director, Lens, Studio API, etc.).
- `scripts/replay_days.py`: reproduce días grabados (`trip_days.mind_open/close`)
  por el pipeline del Mind sin UI.
- `scripts/seed_nl_pack.py`: siembra el pack NL por defecto.
- LLM: Groq con cadena de fallback de modelos y hasta 3 keys; rotación de
  temperatura por día (anti-repetición). Evals narrativas post-generación.

---

## 7. Deuda conocida / próximos pasos

- **README de `mind-engine/` desactualizado**: todavía dice "port 1:1, sin admin,
  sin decision points"; hoy hay Mind Engine, Studio y decisiones.
- El header de `app/studio/api.py` dice "Read-only (block 1)", pero ya tiene escrituras
  (card, traits, concerns, voice, accent).
- **Pack genérico** (ADR 0005): el pack built-in (nl_defaults, reglas, detectors)
  sigue con forma de Middle-earth como default en código; mover a un pack mínimo
  genérico es una migración pendiente.
- **Embeddings léxicos**, no semánticos: limitan el contact gate y Resonated
  (`TODO(jev)` en `retrieval.py`).
- `MIND_ENGINE` es un flag en el backend; sin él se usa solo el narrador stateless.
- Lo que viene en el repo (**Movers / Living Map**, issues #25–#45) es trabajo del
  backend/frontend; al Mind le va a llegar como eventos/encuentros nuevos, sin
  cambios de contrato previstos por ahora.
