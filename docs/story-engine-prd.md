# PRD — Story Engine

**Producto**: Story Engine (API + core narrativo) · Story Tuner (admin)
**Versión del documento**: 2.0
**Estado**: propuesta de arquitectura / pre-implementación

---

## 1. Resumen ejecutivo

**En una frase**: *El cerebro narrativo de tu juego — convierte estado de partida en prosa y decisiones, sin tocar tu base de datos.*

Story Engine es un **motor de narrativa interactiva de personaje, agnóstico al motor de juego y a la base de datos del cliente**: recibe datos duros de un episodio (hechos, estado del personaje, pool de recuerdos/objetivos candidatos), recupera el contexto narrativo relevante, resuelve puntos de decisión, traduce todo a lenguaje natural vía LLM, y devuelve **órdenes propuestas** de cómo debería cambiar el estado — pero nunca escribe esas órdenes él mismo.

Story Tuner es el admin visual que permite editar todo el **contenido narrativo** — system prompt, bancos de frases, catálogos de skills e items, plantillas de encuentros, reglas de supervivencia — **sin programar**, previsualizar el prompt generado antes de llamar a la IA, y (vía la API del proyecto cliente) inspeccionar/editar instancias vivas como inventario o stats.

No es un wrapper de LLM, y no es la fuente de verdad de los datos del juego. El valor está en: recuperación de contexto relevante + reglas de consecuencia + traducción a lenguaje natural editable, entregado como un servicio que cualquier proyecto (propio o de terceros) puede consumir sin cederle el control de su base de datos.

### 1.1 Posicionamiento de producto

La categoría ya existe y tiene jugadores serios: **Charisma.ai** (memories + gates que condicionan ramas de la historia, agnóstico de motor vía SDK/API) e **Inworld AI** (Narrative Graph, routing multi-modelo con fallback, 100% API-first). Ninguno de los dos enfatiza como propuesta de valor explícita el **no ser dueño de los datos del cliente** — ahí está el diferencial de Story Engine: es un intérprete narrativo que nunca posee el estado de la partida, solo el contenido narrativo (voz, frases, catálogos) y la lógica de traducción/decisión.

---

## 2. Problema

Hoy toda la narrativa vive acoplada al backend Node del proyecto de mapa (Middle Earth Map):

- El tono del narrador está hardcodeado en código (`backend/services/prompt/systemPrompt.js`).
- Las frases situacionales están hardcodeadas como arrays JS (`backend/services/naturalLanguage/elevationNotes.js`, y frases de condición en `backend/services/character/characterState.js`).
- Cambiar una frase, un umbral o el tono del narrador requiere editar código y desplegar.
- La lógica narrativa está entrelazada con la lógica geoespacial (rutas, regiones, DEM), que no tiene nada que ver con narrar.
- No hay forma de previsualizar el prompt final ni de testear variantes sin correr el juego completo.

Consecuencia: el contenido narrativo — que es lo que más se itera — es lo más caro de modificar.

---

## 3. Objetivos

### Objetivos del producto

1. Extraer el motor narrativo a un servicio Python independiente con contrato de datos explícito.
2. Convertir todo el contenido narrativo en **datos editables**, no en código.
3. Dar un admin visual funcional (poco CSS, mucho poder) para tunear el motor on the fly.
4. Permitir previsualizar el prompt generado y testear escenas con datos dummy.
5. Recuperar y priorizar el contexto narrativo relevante para cada episodio: objetivos, recuerdos, condición, relaciones, situaciones abiertas.
6. Resolver puntos de decisión y devolver sus consecuencias mecánicas como **órdenes propuestas**, sin aplicarlas.
7. Mantener a Python **sin ownership de datos de partida**: la única base de datos que Python escribe es la de contenido narrativo (World Pack).

### No-objetivos (explícitos)

- **No** migrar la lógica geoespacial (routing, PostGIS, DEM, regiones, biomas) a Python. Se queda en Node, donde ya funciona y donde el trabajo pesado lo hace PostGIS de todas formas.
- **No** construir un motor "universal vacío" antes de tener dos proyectos reales usándolo.
- **No** construir un marketplace de mundos ni multi-tenant completo en v1.
- **No** soportar party/multipersonaje en v1. Asume un protagonista.
- **No** dar a Python acceso de escritura a ninguna tabla de estado de juego, en ningún proyecto cliente. Nunca.
- **No** dar a Python (por defecto) acceso de lectura directa a la base del cliente: el cliente empaqueta el contexto necesario en el payload de cada request.

---

## 4. Naming

| Componente | Nombre |
|---|---|
| API / módulo core | **Story Engine** |
| Admin visual | **Story Tuner** |

Razón: agnóstico de setting, corto, e implica mecánica de historia (no solo generación de texto).

---

## 5. Arquitectura

### 5.1 División de responsabilidades

Principio rector: **Node (o el backend del proyecto cliente) es la única fuente de verdad y el único punto de escritura de datos de juego. Python nunca escribe estado de partida — solo lee lo que se le pasa en el payload, decide, traduce, y devuelve órdenes propuestas.**

| Dominio | Dueño de la escritura | Rol de Python |
|---|---|---|
| Routing, PostGIS, DEM, altitud, biomas, regiones | **Node** | Ninguno. No se le manda a Python. |
| Selección de qué encuentra el personaje al pasar por un lugar | **Node** | Ninguno. |
| Posición, ruta, avance temporal, triggers de escena | **Node** | Ninguno. |
| `character_state` (energy, shadow, fatigue, heridas...) | **Node** | Lo recibe en el payload; calcula y **propone** deltas. |
| Inventario (cantidades vivas) | **Node** | Lo recibe en el payload; **propone** `item_gain`/`item_loss`. |
| Objetivos activos (instancias) | **Node** | Recibe el pool candidato; decide relevancia; **propone** `goal_create`/`goal_resolve`. |
| Recuerdos / pistas (instancias) | **Node** | Recibe el pool candidato; decide relevancia; **propone** `memory_gain`. |
| Relaciones y reputación (instancias) | **Node** | Recibe snapshot; **propone** `relationship_change`. |
| Contenido narrativo: system prompt, phrase banks, catálogo de skills/items (definiciones), plantillas de encuentro, reglas de supervivencia | **Python (World Pack, DB propia)** | Dueño total. Se edita desde Story Tuner. |
| Construcción del prompt final | **Python** | Dueño total. |
| Llamada al LLM, fallback multi-proveedor, sampling | **Python** | Dueño total. |

**Regla dura**: Python tiene una sola base de datos propia — el World Pack (contenido narrativo). Cualquier otro dato de juego (estado, inventario, objetivos, recuerdos como instancias) vive exclusivamente en la base del proyecto cliente y solo se escribe ahí, aplicando las órdenes que Python propuso.

### 5.2 Estructura de código propuesta

```
app/
  core/                      # agnóstico: sin strings de ningún setting
    models.py                # Character, StatBlock, Memory, Goal, Scene, Decision
    bands.py                 # motor genérico umbral -> etiqueta -> plantilla
    rules_engine.py          # resolución de requirements / outputs
    retrieval.py             # recuperación de recuerdos y objetivos relevantes
    prompt_builder.py        # ensambla secciones desde el WorldPack
    llm/
      providers.py           # Gemini / Groq / otros, fallback, sampling
  worlds/
    <world_pack>/            # contenido: editable desde el admin (persistido en DB)
      system_prompt.md
      stat_bands.yaml
      skills.yaml
      items.yaml
      phrase_banks.yaml
      survival_rules.yaml
      lexicon.yaml
  api/
    routes/narration.py
    routes/decisions.py
  admin/                     # Story Tuner (SQLAdmin)
```

**Principio de separación**: `core/` nunca contiene strings de un setting específico. Todo texto narrativo vive en el world pack (persistido en DB, editable desde el admin).

### 5.3 Stack técnico

- **API**: FastAPI
- **Modelos/validación**: Pydantic
- **ORM**: SQLAlchemy
- **DB**: PostgreSQL (JSONB para world packs y payloads)
- **Templating de prompts**: Jinja2
- **Admin**: SQLAdmin (`pip install sqladmin`) — CRUD auto-generado sobre SQLAlchemy, UI Tabler, sin escribir CSS
- **LLM**: abstracción multi-proveedor con fallback (portada del patrón actual en `backend/services/narrator/ai.js`)

### 5.4 Patrón de comandos propuestos (command proposal, no write)

```
Cliente (Node)                                   Story Engine (Python)
---------------                                   ----------------------
1. Arma el payload del episodio:
   - hechos duros (lugar, clima, entidad, evento)
   - snapshot de estado del personaje
   - pool candidato de recuerdos/objetivos
        │
        ▼
2. POST /episode  ─────────────────────────►    3. Recupera contexto relevante
                                                  4. Resuelve opciones disponibles
                                                     (evalúa requirements, no escribe nada)
                                                  5. Arma el prompt (traducción a lenguaje natural)
                                                  6. Llama al LLM → narrativa
                                                  7. Devuelve: narrative, prompt, contexto
                                                     usado, decision_point, proposed_commands
        ◄─────────────────────────────────────
8. Valida proposed_commands contra sus
   propias reglas de negocio (clamps,
   permadeath, transacciones)
9. Escribe en su propia DB
```

Python es, respecto al juego, **stateless por diseño**: dado el mismo payload, produce la misma decisión narrativa (salvo la variabilidad del LLM). Esto lo hace fácil de testear, fácil de versionar, y fácil de llevar a un segundo proyecto sin arrastrar acoplamiento a un esquema de datos ajeno.

La única base de datos que Python posee y escribe es la del **World Pack** (contenido narrativo, no estado de juego).

#### 5.4.1 Ciclo de vida de un recuerdo (ejemplo del patrón)

1. Python, procesando una escena, decide que corresponde crear un recuerdo y lo propone: `{ type: "memory_gain", text: "...", tags: [...] }`.
2. Node **valida** el comando (límites, coherencia) y lo **persiste** en su propia tabla — Python nunca lo escribe.
3. Para que ese recuerdo pueda volver a influir en la narrativa, **Node debe reponerlo en el pool candidato** de las próximas escenas/días. Si Node no lo reincluye en el payload, el recuerdo existe en la base pero deja de ser "visible" para Python — la responsabilidad de resuministro es 100% de Node.

#### 5.4.2 Precedentes del patrón (no es una idea exótica)

Este "proponer sin ejecutar" es un patrón establecido, presente en herramientas que ya se consumen en producción:

- **LLM tool/function calling** (OpenAI, Anthropic, Gemini): el modelo nunca ejecuta nada, devuelve `{name, arguments}` y la aplicación host decide si lo ejecuta. Es el análogo más directo — Story Engine anida el mismo patrón dos veces (LLM → Python propone → Node ejecuta).
- **Terraform** (`plan` → `apply`) y **Kubernetes** (`--dry-run`): separan calcular el cambio de aplicarlo, con el plan inspeccionable antes de tocar el estado real.
- **CQRS** (Command Query Responsibility Segregation): un *Command* es una intención de cambio, validada y ejecutada por un *handler* separado del que la generó.
- **Migraciones de base de datos** (Prisma Migrate, Django migrations): generan un diff propuesto que se revisa antes de aplicar.

El caso de Story Engine combina las dos razones más comunes para este patrón: la fuente (LLM) es no-determinística, y el componente que decide (Python) no debe tener ownership del dato ajeno por diseño de seguridad/arquitectura.

---

## 6. Modelo de dominio

### 6.1 Character (genérico)

```python
Character:
  id: str
  name: str
  description: str
  skills: dict[str, int]          # el WorldPack define qué claves existen
  conditions: dict[str, Any]      # wounded, sick, fatigue...
  resources: dict[str, float]     # energy, shadow, coins, rations...
  traits: list[str]
```

El core **no conoce** los nombres de skills ni de recursos. Los define el world pack (`energy` vs `vigor`, `shadow` vs `corruption`).

### 6.2 Estado narrativo procesado (no poseído)

Python **recibe** estas instancias en el payload de cada request, las usa para decidir y narrar, y **nunca las persiste como fuente de verdad**:

- **Goals**: objetivos activos con tipo (`long_term`, `encounter`, `survival`), estado, y tags para recuperación. Instancia = Node. Definición de tipos/reglas = Python (World Pack).
- **Memories / Clues**: texto + tags + entidades asociadas + fecha. Recuperables por relevancia. Instancia = Node.
- **Condition state**: recursos y condiciones con sus bandas resueltas (umbral → etiqueta → frase). Valores = Node; motor de bandas y frases = Python.
- **Open situations**: encuentros a medio resolver, advertencias sin atender, misterios activos. Instancia = Node.
- **Relationships**: reputación con facciones, NPCs recurrentes, culturas. Instancia = Node.

### 6.3 Item Catalog

Definición editable por item (contenido, en el World Pack de Python): nombre, descripción, rareza, tags narrativos, si aparece en prosa automáticamente, qué opciones desbloquea, consecuencias narrativas de ganarlo/perderlo.

Las **cantidades vivas** de inventario siempre vienen en el payload desde el proyecto cliente y se escriben ahí — el catálogo (definición) vive en Python, la instancia nunca.

---

## 7. Unidad narrativa: escena hasta punto de decisión

**Cambio clave respecto al modelo actual**: la unidad narrativa deja de ser "el día" y pasa a ser **la escena hasta que surge un punto de decisión**.

Una escena puede ser un día entero, un encuentro breve, o varios días de viaje comprimidos si no ocurre nada relevante. Evita forzar decisiones artificiales por calendario.

### 7.1 Ejemplo: el reparto Node/Python si se mantuviera el modelo por "día"

Aunque el modelo objetivo es la escena, el reparto de responsabilidades es idéntico si se aplicara sobre el modelo actual por día — sirve como caso de validación de la regla de ownership:

**Node** (mecánica, geometría, persistencia):
1. Calcula el tramo de ruta del día (distancia, camino, velocidad).
2. Obtiene clima/elevación/bioma del tramo (PostGIS).
3. Aplica el desgaste mecánico determinístico (energía perdida por esfuerzo/elevación) directamente a su DB — es un hecho de juego, no una decisión narrativa, así que no pasa por `proposed_commands`.
4. Detecta si hay un encuentro posible en el tramo (proximidad geométrica a una entidad/lugar) — decide *que* hay encuentro, no *cuál* interacción específica.
5. Persiste el día (narrativa final, estado resultante, avance de posición).
6. Valida y aplica los `proposed_commands` que devuelva Python al cierre del día.

**Python** (narrativa, traducción, decisión):
1. Recibe el paquete de hechos duros del día (tramo, clima, elevación, entidad de encuentro si hay, estado ya actualizado mecánicamente, pool candidato de recuerdos/objetivos).
2. Elige la interacción/diálogo específico dentro del encuentro detectado por Node (usa shadowBand, cultura, región como filtros sobre sus plantillas del World Pack).
3. Recupera recuerdos/objetivos relevantes para ese día.
4. Traduce el estado a prosa (bandas → frases de condición/esfuerzo).
5. Construye el prompt final y llama al LLM → narrativa del día.
6. Si es fin de día, evalúa las opciones de decisión disponibles (requirements contra skills/condiciones/inventario/objetivos que Node le pasó) y arma el menú.
7. Devuelve narrativa + `decision_point` + `proposed_commands` por opción — sin aplicar nada.

**Regla en una frase**: Node decide qué pasa mecánicamente y si hay opciones que evaluar; Python decide cómo se cuenta y cuáles de esas opciones aplican según el contexto narrativo, y nunca escribe el resultado — solo lo propone.

### Flujo de procesamiento de escena

1. Recibir el input del mundo (evento, lugar, entidades, estado).
2. Recuperar recuerdos y objetivos relevantes (por tags, entidades, región, objetivo abierto).
3. Evaluar gates de supervivencia (umbrales configurables del world pack).
4. Evaluar encuentros y objetivos activos aplicables.
5. Si hay opciones disponibles → devolver narrativa parcial + menú de decisiones + `proposed_commands` preliminares.
6. Si no hay opciones → devolver narrativa completa y avanzar el estado.

---

## 8. Sistema de interactividad

### 8.1 Las tres capas de decisión

| Capa | Origen | Ejemplo |
|---|---|---|
| **Largo plazo** | Objetivos y motivaciones del personaje | Perseguir una meta de trama abierta hace semanas |
| **Corto plazo** | Encuentros con NPCs, lugares, eventos inmediatos | Un pastor pide ayuda para buscar a su ganado |
| **Supervivencia** | Umbrales de estado del personaje | Hambre, sed, herida sin tratar, fatiga extrema |

Las de corto plazo ya existen en diseño (`database/seeds/data/csv/npc_interactions.csv`, `places_interactions.csv`). Las de supervivencia son **pendientes de construir** y deben implementarse como un `survival_rule_set` global del world pack — reglas por umbral, no una fila por interacción.

### 8.2 Requirements (gates de opciones)

- `skills`: lógica **OR** — cualquier skill que alcance su umbral habilita la opción.
- `conditions`: lógica **AND** — todas deben cumplirse.
- `band_max`: cota superior en la banda de un recurso (energía, sombra...).
- `inventory_has`: items requeridos.
- `goal_active` / `memory_has`: requiere un objetivo abierto o un recuerdo previo.

### 8.3 Outputs → Proposed Commands (consecuencias propuestas, no aplicadas)

Cada opción produce uno o más comandos propuestos. Python los calcula y los devuelve; **el proyecto cliente decide si los aplica**, validándolos contra sus propias reglas de negocio (clamps, permadeath, transacciones).

| Tipo de comando | Efecto propuesto |
|---|---|
| `state_change` | Cambia un recurso numérico |
| `condition_set` | Fija una condición categórica |
| `memory_gain` / `clue` | Sugiere añadir un recuerdo o pista al pool recuperable |
| `goal_create` | Sugiere crear un objetivo (encuentro / supervivencia / largo plazo) |
| `goal_resolve` | Sugiere cerrar un objetivo abierto |
| `item_gain` / `item_loss` | Sugiere modificar inventario |
| `relationship_change` | Sugiere ajustar reputación con facción/NPC |
| `narrative_only` | Consecuencia de color, sin mecánica, no requiere escritura |

Este motor de reglas es **estructuralmente agnóstico** — funciona igual para espadas que para cualquier otro setting — y al no escribir nada directamente, es agnóstico también respecto al **esquema de base de datos** del cliente.

---

## 9. Story Tuner (admin)

### 9.1 Secciones

- **Voice Studio**: editor del system prompt y tono base, con variables (`{{character_name}}`, `{{destination}}`, `{{mood}}`).
- **World Facts / Lexicon**: hechos, lugares, culturas, vocabulario que alimentan el contexto.
- **Phrase Banks**: frases condicionadas por situación (altitud, clima, peligro, hora, banda de estado). Editar umbrales, frases y variantes.
- **Skills Catalog**: skills disponibles, umbrales, descripciones para el prompt.
- **Conditions & Resources**: qué estados tiene un personaje, sus bandas y sus frases.
- **Item Catalog**: items con descripción, rareza, tags y efectos narrativos.
- **Memory & Goal Ledger**: pool de recuerdos, pistas y objetivos; vinculables a personajes.
- **Encounter Tuner**: plantillas de encuentro con requirements y outputs, editables visualmente.
- **Survival Rules**: umbrales y decisiones por defecto de hambre, sed, herida, fatiga.
- **Prompt Viewer**: visualizador del prompt final generado antes de llamar a la IA.
- **Live Preview**: generar una escena de prueba con personaje y evento dummy, sin deploy.
- **LLM Settings**: proveedores, orden de fallback, parámetros de sampling.
- **Instance Inspector** *(opcional, vía API del cliente)*: pantalla para ver/editar inventario, stats, objetivos y recuerdos de una partida real. Story Tuner no escribe estas instancias en su propia DB — llama a los endpoints de escritura del proyecto cliente (p. ej. `PATCH /characters/:id/state` en Node), que aplica sus propias reglas de negocio antes de persistir.

### 9.2 Versionado de World Pack

Requisito funcional: editar contenido en el admin **no debe romper producción**.

- Cada world pack tiene versiones.
- Cada proyecto consumidor referencia `world_pack_id` + `version`.
- Se puede clonar un pack para experimentar y promover la versión cuando esté validada.

---

## 10. Contrato de la API

### 10.1 Principio de versión 1

El contrato de entrada es **de forma fija**, optimizado para el proyecto inicial. Lo editable es el **contenido**, no la estructura.

Ejemplo con las frases de elevación (`backend/services/naturalLanguage/elevationNotes.js`):

- **Fijo en v1**: el motor espera un umbral numérico + un array de frases.
- **Editable en v1**: el valor del umbral, las frases, agregar o quitar niveles.
- **No editable en v1**: cambiar el trigger de altitud a otra variable (eso es v2).

### 10.2 Request de escena

```json
{
  "world_pack": { "id": "wp_1", "version": 3 },
  "character": {
    "id": "1",
    "name": "...",
    "skills": { "...": 0 },
    "conditions": { "...": null },
    "resources": { "...": 0 }
  },
  "scene": {
    "id": "scene-12",
    "sequence_number": 12,
    "is_final": false,
    "facts": [
      { "type": "location", "name": "..." },
      { "type": "weather", "name": "..." },
      { "type": "elevation", "value": 1750 }
    ],
    "events": [ { "type": "npc_interaction", "payload": {} } ]
  },
  "continuity": {
    "previous_summary": "...",
    "banned_phrases": ["..."],
    "previous_openings": ["..."]
  },
  "language": "english"
}
```

### 10.3 Response de escena

Nada en esta respuesta se persiste del lado de Python. `proposed_commands` es una lista de órdenes que **el cliente valida y aplica con sus propias reglas de negocio**; Python no las ejecuta.

```json
{
  "narrative": "...",
  "prompt": { "system": "...", "user": "..." },
  "context_used": {
    "memories": ["..."],
    "goals": ["..."]
  },
  "decision_point": {
    "present": true,
    "default_option": { "label": "...", "description": "..." },
    "options": [
      { "option_id": "...", "label": "...", "available": true, "blocked_reason": null }
    ]
  },
  "proposed_commands": [
    { "type": "state_change", "target": "energy", "value": -5, "reason": "..." },
    { "type": "memory_gain", "text": "...", "tags": ["..."] }
  ],
  "generation_meta": { "provider": "...", "temperature": 0.0 }
}
```

### 10.4 Request de decisión

```json
{
  "world_pack": { "id": "wp_1", "version": 3 },
  "character_id": "1",
  "scene_id": "scene-12",
  "option_id": "help_herdsman"
}
```

Devuelve narrativa de resolución + `proposed_commands` resultantes de la opción elegida. El cliente sigue siendo quien los valida y persiste.

---

## 11. Qué se porta del código actual

| Componente actual | Destino | Nota |
|---|---|---|
| `backend/services/narrator/ai.js` (fallback multi-proveedor, sampling) | Portar casi tal cual | Ya es agnóstico, es infraestructura pura |
| Motor de `requirements` / `outputs` (diseño de `npc_interactions`) | Portar tal cual | Ya es agnóstico en su forma |
| `energyBand` / `shadowBand` de `characterState.js` | Portar como motor genérico de bandas | Estructura genérica; los nombres y umbrales van al world pack |
| `SYSTEM_PROMPT` de `prompt/systemPrompt.js` | Migrar a contenido editable | Hoy hardcodeado a un tono específico |
| `ENERGY_SENTENCE` / `SHADOW_SENTENCE` / `WOUNDED_SENTENCE` | Migrar a plantillas Jinja2 en el world pack | Hoy prosa fija en código |
| `naturalLanguage/elevationNotes.js` y bancos similares | Migrar a Phrase Banks editables | Ya tienen la forma correcta (umbral + variantes) |
| `prompt/index.js` + `prompt/sections/*` | Reescribir como `prompt_builder` + secciones desde el world pack | Lógica de ensamblado se conserva, el texto sale a datos |
| `narrator/tripHistory.js`, `phraseVices.js` (anti-repetición) | Portar como módulo de continuidad | Lógica reusable |
| `evals/evalRunner.js` | Reemplazable por framework de evals Python | Opcional en v1 |
| Routing, DEM, altitud, regiones, biomas | **No se porta** | Se queda en Node |

---

## 12. Roadmap

### Fase 1 — Story Engine v1 (setting inicial)

- API FastAPI con endpoints de escena y decisión.
- Core con modelos Pydantic, motor de bandas, rule engine, prompt builder.
- World pack persistido en DB, con el contenido migrado desde el código Node actual.
- Abstracción LLM con fallback multi-proveedor.
- Contrato de entrada fijo, optimizado para el proyecto actual.
- **Criterio de éxito**: el proyecto actual genera narrativa idéntica o mejor consumiendo la API, sin regresiones.

### Fase 2 — Story Tuner

- Admin SQLAdmin sobre los modelos del world pack.
- Prompt Viewer y Live Preview.
- Versionado de world packs.
- Migración de todos los bancos de frases y catálogos a contenido editable.
- **Criterio de éxito**: se puede cambiar tono, frases, umbrales, skills e items sin tocar código ni desplegar.

### Fase 3 — Estado narrativo completo

- Goals de largo plazo, encuentro y supervivencia.
- Sistema de recuerdos con recuperación por relevancia.
- Relaciones y reputación.
- Situaciones abiertas.
- `survival_rule_set` implementado (hoy inexistente).
- **Criterio de éxito**: la narrativa referencia recuerdos y objetivos previos de forma coherente y las decisiones alteran el estado del personaje.

### Fase 4 — Agnosticismo real

- Contrato de entrada generalizado a `scene.facts[]` con phrase banks tag-based.
- Creación de world packs desde cero en el admin.
- Validación con un segundo setting real (no un ejemplo de juguete).
- **Criterio de éxito**: un usuario externo crea su propio world pack y genera narrativa coherente sin escribir código.

---

## 13. Alcance de extrapolación

### Funciona sin fricción

Cualquier setting que comparta el modelo de **aventura de personaje**: fantasía medieval, low fantasy, dark fantasy, histórico, sword & sorcery, horror gótico, mitología. Requisitos: un protagonista, estado físico/emocional, habilidades, elecciones, consecuencias, recuerdos y metas.

### Requiere trabajo extra

- **Sci-fi duro o moderno**: necesita nuevos tipos de outputs y vocabulario de frases muy distinto.
- **Narrativa social/política pura**: sin viaje ni peligro físico, los "scene facts" deben ser más abstractos.
- **Party / multipersonaje**: el motor asume un protagonista; escalar requiere diseño adicional.

### 13.1 Las tres capas de agnosticismo

| Capa | ¿Agnóstica? | Detalle |
|---|---|---|
| **Mecánica** (bandas, rule engine, retrieval, prompt builder, orquestación LLM) | **Sí, sin techo** | Opera sobre diccionarios y umbrales; no conoce nombres de skills ni de recursos. |
| **Forma del dato** (el "sobre" que envía el cliente) | **Sí, con un adaptador por cliente** | Se logra estandarizando el sobre, no el contenido: `skills: dict`, `facts: [{type, name, value}]`, `memories: [{text, tags, weight}]`. Cada cliente mapea su modelo una vez; después funciona igual. Techo real: juegos sin noción de "personaje protagonista" exigen más adaptación. |
| **Contenido narrativo** (voz, frases, catálogos) | **No, por diseño** | Es la superficie de personalización del producto — cuanto más fácil de editar (Story Tuner), más valioso. |

Conclusión: el techo de agnosticismo no está en la mecánica ni en el contrato, sino en cuánto trabajo de adaptador le exigís a cada cliente nuevo — eso es lo que se reduce con cada iteración del contrato de entrada (ver Fase 4 del roadmap).

---

## 14. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Sobre-abstraer antes de tener un segundo usuario real | Contrato fijo en v1; agnosticismo solo a nivel de contenido editable |
| Regresiones al portar lógica narrativa madura (anti-repetición, bandas, continuidad) | Tests equivalentes a los actuales en `backend/services/__tests__` antes de cortar el Node |
| Doble dueño de tablas entre Node y Python | **Resuelto por diseño**: Python nunca escribe datos de juego, solo el World Pack. Node es el único punto de escritura de estado de partida (sección 5.1, 5.4) |
| Latencia añadida por el salto de red por escena | Endpoints idempotentes, timeouts explícitos, el fallback multi-proveedor ya cubre fallos de LLM |
| Editar el admin rompe producción | Versionado de world packs; producción fija una versión |
| Admin poco usable si crece el número de entidades | SQLAdmin cubre CRUD; pantallas custom solo para Prompt Viewer y Live Preview |

---

## 15. Decisiones tomadas

1. **No** migrar todo el backend a Python: el beneficio geoespacial esperado no se materializa porque PostGIS ya hace el trabajo pesado. El valor de Python está concentrado en la parte narrativa/IA.
2. La frontera de migración es la costura que ya existe en `narrateDay` / `buildDayPrompt`.
3. La unidad narrativa pasa de "día" a "escena hasta punto de decisión".
4. El módulo se llama **Story Engine**; el admin, **Story Tuner**.
5. En v1 el contrato de entrada es fijo y el contenido editable; la agnosticidad de forma llega en fase 4.
6. Admin con SQLAdmin sobre FastAPI para minimizar trabajo de CSS/frontend.
7. **(Revisado)** Python **no** posee ninguna tabla de estado de juego (objetivos, recuerdos, condición, relaciones, inventario). Node/el proyecto cliente es el único dueño de escritura de esos datos. Python solo posee el World Pack (contenido narrativo) y opera de forma stateless respecto al juego, devolviendo `proposed_commands` que el cliente valida y aplica.
8. Story Engine se reposiciona como **producto potencialmente multi-cliente**: motor narrativo headless agnóstico al motor de juego y a la base de datos, con precedentes de mercado validados (Charisma.ai, Inworld AI). El diferencial es no poseer nunca los datos del cliente.
9. El agnosticismo tiene tres capas (mecánica, forma del dato, contenido) — solo la primera es 100% agnóstica sin trabajo adicional; la segunda requiere un adaptador por cliente; la tercera nunca debe ser agnóstica.
