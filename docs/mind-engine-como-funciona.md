# Mind Engine — cómo funciona, pieza por pieza

> Documento para no-programadores. Explica el modelo completo tal como está
> hoy: los conceptos, el flujo de un día entero con todas sus ramas, los
> números con los que la mente decide, ejemplos reales, y una sección
> honesta sobre el código "viejo" que sigue vivo.
>
> Estado: posterior a los issues #158–#176 (la voz interior ya oye todo lo
> percibido, `reflectiveness` existe, `type:moment` se llama `ambience`).
> El glosario formal vive en `CONTEXT.md`; este documento es el relato
> didáctico que lo recorre.
>
> Fuente: `mind-engine/app/` (Python/FastAPI). El backend del juego y el
> Studio aparecen como actores, no como código.

---

## 1. La idea en una página

La regla de oro del sistema:

> **El mundo decide qué pasa; la mente decide cómo se vivió.**

El *Host* (el juego) le entrega a la mente de un personaje un informe de un
tramo de vida — un **Episode** (un día, una escena, una sesión) — como una
lista de **Events** ya puestos en palabras. La mente hace con eso cuatro
cosas, siempre en el mismo orden:

1. **Open** — percibe el día: decide qué nota y qué no, qué le importa, qué
   siente, qué recuerda, qué necesita, y qué se le ocurre pensar. Produce el
   **Lens**: el documento que le dice al narrador qué pesa para este
   personaje *hoy*.
2. **Narrate** — el narrador (un LLM) escribe la prosa del día usando el
   Lens y el material del mundo. Después, la mente mide qué líneas del Lens
   *resonaron* en el texto.
3. **Decide** *(opcional)* — si el día trae una decisión del personaje, la
   mente la resuelve con sus Relations, creencias y necesidades.
4. **Close** — el día se sedimenta: se codifican memorias, las rachas se
   vuelven patrones o desgaste, el cuerpo y el ánimo derivan, las
   convicciones decaen o se reescriben (la **Reflection**), y lo olvidado se
   archiva.

Nada de esto es "emociones en general": cada pieza del estado tiene una
**causa** ("aún intranquila desde las huellas de orcos", "segundo día sin
comida de verdad"), porque la mente no tiene permiso para mentir — solo
puede contar lo que vivió.

**Una sola mente, ajustable.** El motor es uno solo para todos los
personajes. Lo que diferencia a Celebrían de un hobbit es *datos*: su preset
(sus convicciones iniciales, sus musings, sus sensibilidades), su
personalidad (los diales de su motor) y su historial acumulado (memorias,
Relations, rachas).

---

## 2. El mapa: quién es quién

```
  ┌──────────┐   events + condition    ┌──────────────────────────────┐
  │   HOST   │ ──────────────────────▶ │         MIND ENGINE          │
  │ (el juego│                         │  · percibe / siente / recuerda│
  │  decide  │ ◀── Lens + narration ── │  · persiste todo en Postgres  │
  │ qué pasa)│                         └──────────────┬───────────────┘
  └──────────┘                                       │
                                                     │ lee/edita
                                          ┌──────────▼──────────┐
                                          │    MIND STUDIO      │
                                          │ inspección y tuning │
                                          └─────────────────────┘
```

- **Host**: posee el mundo y el **Condition** (posición, cuerpo, recursos,
  vivo o muerto). Es el único canal donde hay números "crudos"; la mente
  traduce esos números a significado mediante los **Detectors**.
- **Mind Engine**: posee el **Character** (la ficha: nombre, frase
  fundacional, voz, skills) y su **Mind** (todo lo que vivió y siente).
  Responde en el *inner language* (inglés); cualquier otra lengua es
  traducción de la narración terminada, nunca una segunda narración.
- **Narrador**: no es la mente. Recibe el Lens y el material del mundo y
  escribe prosa. La mente mide luego qué de su vida interior llegó al texto.
- **Studio**: la ventana de inspección. Muestra episodios, el brief con sus
  razones, memorias (con strength/importance/arc), convicciones, musings,
  Relations, needs, y el timeline por día. También permite resembrar
  musings/creencias desde el preset y resetear una mente a su preset.

Dos caminos de narración coexisten (ver §5.6):

- **Stateful** (el camino completo): `POST /episodes` → `/narrate` →
  `/close`. La mente persiste y acumula.
- **Stateless** (`POST /narrate-day`): el endpoint original. Sin mente, sin
  memoria, solo mundo → prosa. Sigue vivo como fallback y para hosts que no
  quieren mente persistente.

---

## 3. El día de una mente, en tres pasadas

Un Episode tiene estados: `open` → `narrated` → `closed`. Todo lo que la
mente calcula queda persistido en la fila del Episode, así que re-abrir o
re-narrar el mismo día es **idempotente**: devuelve lo ya calculado, no
recalcula.

```
 OPEN                        NARRATE                     CLOSE
 ─────────────────────────   ────────────────────────   ─────────────────────────
 events del wire             reconstruye el payload     outcome ("went_well"|...)
   │ para el narrador          │
   ▼                           ▼                           ▼
 perceive_events()           encounters (forma          resolve_from_outcome
   tags → sleep → check      legacy para el prompt)      streak counters
   → reading → salience      narrate_day() LLM           encode → memories
   → semantic delta →        (inner language)             ├ dedup / absorb
   Relations + felt          traducción (si aplica)       ├ focus boost
 recurrence items            _record_voiced()             ├ need arcs
   (streaks / breaks /          lens_eval {voiced}        ├ skip silenced/ambient
    need-watches)                                         detect_patterns()
 retrieve() → evocation                                   decay_pass()
   gates → scoring →                                      (sticky/consolidated/
   re-feel (imprint ×0.3)                                conviction)
 needs_pass()                                            belief_fade_pass()
   detectors / rules /                                  release needs
   threads / composite                                  compact duplicates
 need_items() (voices)                                   relations decay ×0.98
 episode_mood()                                          mood → temperament
 build_brief()                                           maybe_reflect()  ◀── LLM
   moments / beliefs /                                  (create / reinforce /
   musings / memories /                                  contradict / invert)
   needs / focus / cap
 director LLM (opcional)
 render_lens() → lens_block
```

Las fases narrativas son canónicas: **morning / afternoon / night**. Cada
evento del wire declara su `when.hour` y su `when.phase`; las líneas del
Lens que no son "carried" se cuentan cuando les toca.

---

## 4. Los ingredientes

### 4.1 Event — la única puerta del mundo

Un Event llega así:

```json
{
  "type": "encounter",
  "when": {"hour": 10.1, "phase": "morning"},
  "where": {"region": "lindon", "family": "mountains", "point": [x,y]},
  "data": {"entity": "saralainn", "entity_type": "humans",
           "family": "dunlendings", "form": "harvest_shelter",
           "outcome": "unscathed", "interaction": "aid_or_trade",
           "reading": "...prosa ya escrita por el host..."}
}
```

- `type` es un **string libre** — el wire no tiene enum. El significado lo
  declara el **Kind Registry** (ver 4.2).
- `data` es libre también; el semantic pack decide qué campos numéricos
  cuentan (`field:danger`, `field:severity`…).
- El host puede declarar `reading` (prosa lista) o dejar que el engine la
  componga con frases de la *world voice*.
- `when.phase` es opcional: se deriva de `hour` (mañana/tarde/noche).

El backend del juego emite hoy: `climate`, `land` (con subtipos
`terrain`/`place`/`region`/`water` — la umbrela del territorio),
`encounter`, `meal`, `rest`, `ambience`. Los kinds `travel`, `body`,
`note`, `contact` están declarados en el registry para hosts que los
usen; este host no los emite (los tests lo fijan así).

### 4.2 Kind Registry — el contrato de cada tipo de evento

Cada `type` se resuelve contra un registro declarado (pack por juego
`mind.kinds` mergeado sobre `DEFAULT_KINDS`). Una entrada declara:

| campo | qué significa |
|---|---|
| `role` | `frame` (marco del día, nunca Focus), `moment` (algo que pasó, puede tomar el Focus), `voice` (la mente hablando — needs, streaks) |
| `source` | `world` / `ambient` / `mind` / `decision` — de qué canal vino |
| `reading` | cómo se pone en palabras: `declared` (usa `data.reading`), `encounter`, `meal`, `rest`, `terrain`, `note`, `silent` (sin palabras: `travel`, `body`) |
| `encodes` | si puede volverse memoria — flag declarable por pack; ningún kind built-in la apaga: lo que no codifica es lo *sin palabras* (un `silent` sin sujeto no deja impresión) o lo sintético |
| `fields`/`subjects` | qué campos de `data` espera y cuáles alimentan Relations |

El registry built-in declara: frames `climate`, `terrain`, `travel`,
`body`; moments `land`, `water`, `encounter`, `contact`, `meal`, `rest`,
`note`, `place`, `ambience`; y los items de la mente `need` (rol voice),
`recurrence` (rol moment, source mind).

Reglas que salen de esto:

- **Un kind desconocido sigue siendo un evento**: el fallback le da rol
  `moment`, source `world`, lectura `declared`. Un host puede inventar
  `type:eclipse` y la mente lo percibe, lo evalúa y lo recuerda.
- **Los frames no compiten por el Focus** pero — desde #158 — *sí* alimentan
  la voz interior: una musing taggeada `tag:weather:wet` puede hablar de un
  `type:climate` gris aunque el clima nunca sea "el evento del día".
- **`source` es probidad**: los items `mind` (needs, streaks) sienten y
  hablan pero jamás son evidencia del mundo — no disparan Reflection ni
  cuentan rachas.
- **Alias vivo**: `type:moment` (el nombre viejo de la voz ambiental del
  mundo) resuelve a `ambience`. `moment` hoy es solo el nombre del *Rol*.

### 4.3 Tags — cómo se conectan las cosas

Un tag es `familia:valor` (`entity_type:orcs`, `weather:storm`,
`rest:poor`). El `derive_tags` del wire puede inferirlos: una interacción
`attacks` produce `tag:form:attacks`; `outcome:badly wounded` produce
`tag:outcome:badly wounded`.

Cada tag tiene una **clase** (`tags.py`), y la clase decide en qué canales
puede circular:

| clase | familias | para qué sirve |
|---|---|---|
| `ambient` | `type`, `weather`, `region`, `subtype` | El fondo del día. Excluidos del contact matching ordinario (memorias/convicciones): "hace frío" no debe evocar "odio a los orcos" — pero la voz interior *sí* los oye. |
| `subject` | `entity`, `entity_type`, `npc`, `family`, `race`, `food`, `drink`, `kind`, `place`, `region` | De quien se puede sentir algo: alimenta Relations, evoca memorias y convicciones. |
| `pattern` | `weather`, `rest`, `food`, `drink`, `entity`, `entity_type`, `npc`, `family`, `place`, `region`, `topic` | Elegible para rachas y patrones — "otra vez pan", "días sin techo". |
| `cause` | `entity`, `entity_type`, `npc`, `form` | Puede ser citada como *causa* ("aún intranquila desde las huellas de orcos"). |

Un tag puede ser varias clases a la vez (`region` es ambient+subject+pattern;
`entity` es subject+pattern+cause). Y el wire poda lo que nunca es
vocabulario: `check`, `urgency`, `reading`, `prose_hint`, `entity_name`…
son señal o prosa, no tags.

El **matching es un ladder de especificidad**, no un si/no:

`entity:<slug>` (este ser exacto) → `family:<slug>` / `race:<slug>` →
`entity_type:<tipo>` (el tipo amplio).

`ladder_norm` traduce: entity=1.0, family=0.6, entity_type=0.3. La
convicción más *específica* que toca el día es la que habla ("los caballos
de Mordor no son 'caballos' para Celebrían"). Y el ladder también conecta
*entre niveles*: una convicción sobre `entity_type:dunlendings` toca un día
taggeado `family:dunlendings` (#86).

### 4.4 Condition y Detectors — el cuerpo como datos

El host reporta el estado físico como snapshot numérico (`energy: 32`,
`wounded: true`, `conditions: {hunger: 0.8, wet: 0.5}`…). La mente no
conoce ningún campo que no le hayan enseñado: los **Detectors** son filas
por juego (`kind`) que traducen números a significado:

- `kind='need'` — `hunger`, `thirst`, `exhaustion`, `unrest`, `wound`:
  abren una necesidad con sus causas y su urgencia base.
- `kind='check_mod'` — `energy_spent`, `energy_worn`, `shadow_burdened`,
  `shadow_shadowed`, `wounded`: modificadores a la tirada de percepción
  mientras el estado dura (agotado nota peor).
- `kind='altered'` — `shadow_altered`: estados alterados; un fallo de
  percepción bajo un estado alterado produce **misread** (malentendido), no
  solo "no visto".
- `kind='body'` — la **proyección corporal** sobre `hunger`, `thirst`,
  `fatigue`, `unrest`, `cold`, `pain`, `illness` (ej.: el hambre y el frío
  bajan la valencia y suben el arousal; el dolor pesa más). Es lo que hace
  que el cuerpo *pese* en el ánimo.

### 4.5 El semantic pack — el significado de las cosas

`semantic_delta(tags, data)` es la pregunta "¿qué significa esto,
objetivamente?". Las filas `tag:*`/`type:*`/`entity:*`/`field:*` declaran
por fila:

- `delta` — el movimiento en las dimensiones del Relation
  (`affection/trust/fear/familiarity`), escalado por el `weight` de la fila.
- `weight` — el *contact weight* del evento (cuánto tocó, 0–1); el del
  evento es el máximo entre las filas que matchearon (default 0.5).
- `body` — golpe directo al cuerpo (`weather:freezing → cold +0.25`).
- `severity` — piso de severidad del evento (una tormenta es un hecho; una
  llovizna, fondo).
- `salience_min` — piso de prominencia: un encuentro con `entity_type:orcs`
  arranca en 0.45 por puro "fueron orcos".
- `wakes` — tags que *despiertan* al personaje: si el evento llega en fase
  de sueño y lleva uno de estos, la mente tira el check en vez de ignorarlo.

Ejemplos reales: `tag:given` (recibió algo: +0.25 affection/trust, peso
0.6), `tag:hostile` (+0.2 fear), `tag:sighted_far` vs `tag:entered` (la
distancia ES el significado: ver de lejos mueve solo familiarity, y un cap
global de 0.15 impide que un avistamiento cuente como contacto pleno),
`field:danger` (el `danger:0–5` del wire escala el delta por el valor
numérico).

### 4.6 Relations — el sedimento emocional

Un **Relation** es la suma viva de lo que un sujeto le significa a la
mente: `{affection, trust, fear, familiarity}` para `entity:saralainn`,
`tag:entity_type:orcs`, `place:bree`, `tag:food:bread`…

- **Nace solo de lo vivido** — nunca se declara; los attitudes/impressions
  del preset son su *semilla*.
- **Alimentación jerárquica** (`feed_event`): el sujeto más específico
  recibe el delta entero; los demás sujetos del evento reciben un
  **splash** de 0.3. Un encuentro con Saralainn toca `entity:saralainn`
  entero y salpica `family:dunlendings` y `entity_type:humans`.
- **Standing = el canal de atención** (post-#165): cuanto más fuerte es el
  valor absoluto de una dimensión de un Relation, más pesa el sujeto en la
  atención del día (`max|dim| × 0.3`). No hay "intereses" configurables:
  la mente mira lo que la marcó.
- **Amplifica lo sentido**: el delta sentido de un evento se multiplica por
  `1 + 0.5 × |standing|` — le temes más al segundo orco que al primero.
- **Decae** ×0.98 por episodio sin evidencia nueva: sin alimento, todo se
  vuelve indiferencia lenta.
- **Resistance** (dial de personalidad): amortigua los deltas que
  *contradicen* el standing actual — la evidencia que va contra lo que ya
  sentís pesa la mitad (default). La monotonía no usa este amortiguador:
  erosiona igual, porque no es evidencia, es desgaste.

### 4.7 Memory — lo que quedó

Tres tiers en la misma tabla:

| kind | qué es |
|---|---|
| `episodic` | una impresión del día ("hostiles bloquearon el vado") |
| `conviction` | una creencia — la fila ES la verdad (ver 4.8) |
| `pattern` | un patrón detectado por recurrencia ("días de lluvia sin descanso") |

Cada memoria lleva: `desc` (prosa), `subjects`, `tags` (contact tags, los
ambient se podan), `origin`, `entity` (si fue sobre alguien), `imprint`
(las 4 dims del delta sentido: el eco emocional), `strength` (cuán afianzada),
`importance` (cuánto importa — nace de la salience del evento), `valence`,
`last_evoked`, `evocations`, `voiced` (cuántas veces llegó a la narración),
`facet` (`thread`/`encounter`/`thread_open`/`trauma`), `source` (`lived`/`heard`).

Mecánicas clave:

- **Codificación selectiva**: un item codifica si su `importance` (=
  salience) es >0 y tiene palabras. Un `unnoticed` codifica como hueco — la
  frase `mind.unnoticed` ("algo quedó sin notar"), nunca con prosa, porque
  no hubo lectura. Lo *sin palabras* no se guarda: `travel` y `body` son
  `silent` y sin sujeto, así que el kilometraje y el malestar se sienten en
  el momento pero no se archivan. Un marco con lectura sí puede codificar
  — *un día de tormenta sí queda como recuerdo*; una llovizna de baja
  salience, no. Los items `synthetic` de recurrencia (el desgaste por
  monotonía) son bookkeeping y no codifican — pero el **break** sí: "el
  primer día seco" es noticia. Y un pack puede apagar codificación para un
  kind entero con `encodes:false`.
- **Dedup y absorción**: misma `sig` (mismo evento re-cerrado) no duplica;
  mismo `(kind, desc, entity)` o misma need-key refuerza la fila existente
  en vez de crear otra.
- **Evocation**: recuerda = re-siente. Una memoria evocada devuelve el 30%
  de su imprint a sus Relations y al ánimo del momento — recordar mantiene
  los sentimientos vivos, nunca tanto como vivirlo.
- **Consolidación**: 3 evocaciones + importance ≥0.3 → consolidada
  (importance ≥0.8). Las consolidadas decaen a paso lento (×0.98); las
  volátiles a ×0.85 — o ×0.95 "sticky" si fueron muy valentes o importantes.
- **Forgotten**: debajo de 0.2 se archiva como rastro con el día en que se
  perdió — la historia del olvido también es visible.
- **Anchors**: una memoria evocada con un subject fuerte puede hablar a la
  hora exacta del día en que pasó (una memoria `afternoon` habla en la
  tarde), no en el bloque genérico.

### 4.8 Conviction — una creencia es una memoria profunda

Desde #168 no hay tabla "beliefs": una **Belief** es un `Memory
kind='conviction'` con una faceta JSONB `conviction` que porta lo que el
continuo no expresa:

```json
{"kind": "world|self|other|value", "horizon": "transient|enduring",
 "status": "active|weakened|inverted|resolved",
 "strength": 0..5, "evidence": ["mem_..."], "source": "lived|heard"}
```

El resto son los campos normales de la memoria: `desc` = el statement,
`imprint['affection']` = el stance, `subjects` = el subject.

- **Una fila, una verdad**: la convicción y "la impresión de haberla creído
  siempre" son lo mismo. Evoca y se re-siente como cualquier memoria.
- **El olvido no se la come**: el decay pasa de largo las convicciones. Una
  que pierde fuerza no se olvida — se debilita a un susurro (status
  `weakened`) o la Reflection la reescribe.
- **Se mueve con evidencia vivida**: cada evento toca a las convicciones
  cuyos tags/subjects solapan; lo que confirma endurece, lo que contradice
  desgasta — y cuanto más firme, más cuesta moverla.
- **Horizontes**: `transient` (sobre circunstancias) además decae ×0.8 si
  no se refrescó en el episodio; `enduring` no se marchita por tiempo.
- **Source**: `heard` (una leyenda) pesa menos que `lived`; la primera vez
  que el personaje *encuentra* el subject, una impresión oída se vuelve
  vivida — y la brecha entre lo esperado y lo encontrado se siente.
- **Tipos especiales**: **Attitude** (subject = tipo de ser, stance =
  prehistoria de cada encuentro; los encuentros la desgastan pero nunca la
  invierten — invertir un prejuicio es trabajo de Reflection) e
  **Impression** (subject = lugar; puede ser de oídas).
- **Value**: creencia sobre qué importa; no la mueven hechos sino actos.

### 4.9 Musing — la voz interior

Un **Musing** es una línea autoral de voz interior (`statement` + `tags`):
"la noche me conoce mejor que cualquier rostro que haya amado". Vive en el
preset (seed) y el Studio lo muestra y permite resembrarlo.

Reglas:

- **Sabor, no evidencia**: sin strength, sin refuerzo; la Reflection jamás
  la toca. Nada vivido puede contradecirla ni alimentarla.
- **Evocación por tags sobre TODO lo percibido** (post-#158): el pool de la
  voz (`voice_moments`) incluye frames y voces — clima, kilometraje,
  reportes del cuerpo — con su tagset completo, *incluidos los tags
  ambient* que el matching de memorias filtra. El clima no puede tomar el
  Focus pero sí puede hacer hablar a la voz. Un item sin lectura (un
  `type:body` silencioso) también evoca: su `type:` tag se sintetiza.
- **`context:solitude`**: tag de engine para el día en que nada tocó a la
  mente — cuando las musings que uno guarda para sí por fin hablan.
- **Refractario** (#86): una musing que habló no vuelve a hablar por
  `musing_refractory_episodes` episodios (default 2) — la voz no repite.
- **`reflectiveness`** (#158): dial de `personality` que multiplica el
  score de toda musing (incluidas las de soledad). Default 1.0; un
  personaje 0.4 casi no rumia, uno 2.0 habla el doble.
- **Variedad determinística**: varias musings de la misma categoría
  comparten tags; el cap de líneas las corta y la rotación por
  `episode_idx` elige cuál habla cada día, determinísticamente.

### 4.10 Need — lo que falta

Una **Need** es algo que la mente pide al episodio, siempre contada *con su
causa*:

- **Fisiológicas**: hunger/thirst/exhaustion/unrest/wound, abiertas por
  detectors del Condition. Se auto-resuelven cuando el detector ya no se
  cumple.
- **Reglas compuestas** (`composite_rules`, versionadas en packs): rachas
  de mundo que abren necesidad — `exposure` (3 días sin techo),
  `gloom` (3 días grises). Los contadores viven en `mind.counters` con key
  `rule:*` y solo cuentan episodios persistidos.
- **Threads**: loops abiertos — promesas, encuentros inconclusos, metas de
  cualquier horizonte. Se abren cuando un evento lo declara
  (`data.thread`) y se cierran cuando el mundo lo cierra o el outcome lo
  dice. El preset puede traer threads personales que despiertan al llegar
  al lugar del que tratan.

Cada need tiene `urgency` (crece por día abierta según la regla/detector).
Habla en el Lens cuando es nueva, empeora, es tocada por el día, o supera
el umbral de urgencia (≥0.6 habla siempre). Los items de need son **voces**
(`role=voice`, `source=mind`): sienten y hablan pero nunca son evidencia
del mundo — no disparan Reflection ni alimentan rachas.

### 4.11 Mood, Temperament, Personality, Feeling

- **Mood** = el vector `{valence, arousal, dominant, feeling, cause}` con
  el que la mente entra y sale del episodio. Siempre con causa, nunca una
  etiqueta desnuda.
- **Temperament** = el punto de reposo: a dónde vuelve el mood por inercia
  cuando nada pasa (la calma fría de Celebrían vs la calidez hobbit).
- **Personality** = los couplings que afinan el motor:
  - `sensitivity` (por dimensión: fear/trust/…) — cuánto se siente cada
    tipo de delta.
  - `resistance` (default 0.5) — cuánto amortigua la evidencia que
    contradice un standing — al alimentar la Relation *y* al re-sentirla
    en una evocación: lo contradictorio "paga" resistencia siempre.
  - `moodiness` (default 0.3) — la elasticidad: el α con que el mood
    regresa al temperamento cada episodio cerrado.
  - `reflectiveness` — cuánto habla la voz interior.
- **Episode mood** = `Σ (imprint × salience)/Σ salience` + presión de
  threads — qué día fue. El **arc** compara el mood de entrada con el de
  salida; un giro ≥0.3 marca `turn` (el día que cambió algo).
- **Feeling** = la palabra literaria que el lexicón deriva del estado vivo:
  miedo sin dominancia → *dread*, valencia baja sostenida → *melancholy*,
  affection+trust plenos → *deep friendship*. Los números siguen siendo
  números; el Lens lleva la palabra y su causa.
- El retorno al temperamento pasa al close: `mood ← mood×(1−α) +
  temperament×α`, α = `moodiness` (default 0.3).

### 4.12 Lens, Brief y Focus — qué le cuenta al narrador

El **Lens** es el texto que el narrador lee; el **brief** es el JSON
estructurado que lo produce (persistido en el episodio, inspeccionable en
Studio).

Una línea del brief: `{kind, text, score, why, causes, subjects, tags,
phase}` — con `why` explicando *por qué* está (ej. "focus",
"memory: 3 days ago", "thread: promesa", "musing").

El **Focus** es el centro del día — un solo ítem: el evento más pesado
(score ≥0.45), o una need urgente, o una memoria muy conectada (≥0.8).
Todo lo demás se *conecta* al Focus vía subjects/tags/causas compartidas.
Un día donde nada pesa lo bastante no tiene Focus: se narra como el tramo
tranquilo que fue.

El cap de líneas (default 3 por bloque + carried) es duro: lo que no
entra queda en `brief.silenced` con `stage` y `reason` — el Studio muestra
*qué se quedó fuera y por qué*.

El **director** (LLM opcional, flag de entorno, apagado en mentes
degradadas) puede reordenar el pick de líneas; si su elección no valida
contra el brief, el fallback son las reglas puras.

---

## 5. El flujo completo, rama por rama

### 5.1 `POST /episodes` — open

**Preparación**

1. `episode_ref` ya existe → replay idempotente: devuelve el episodio
   abierto tal cual.
2. `get_or_create_mind`: si no hay Mind para `(game, character)`, la crea
   desde el preset (el hint `character.preset` del wire puede elegirlo).
   Provisioning clona: `wiring` (los diales), `temperament`,
   `personality` (los couplings), `body`, y siembra Relations iniciales
   (leas), convicciones iniciales (starter beliefs), musings y threads
   del preset.
3. `get_or_create_character` + adopción de ficha: nombre/descripción/
   frase fundacional/skills del wire actualizan la ficha viva.
4. `effective_character`: identidad desde la ficha; condition = wire +
   `payload.condition` (override).
5. `episode_idx` = previo + 1 (reloj interno); `episode_date` del
   payload/arc/eventos.

**`perceive_events` — cada evento pasa este embudo:**

```
derive_tags(data)  ─▶  novedad (visto en últimas 20 eps?)
   │
   ▼
¿fase de sueño + hay check + ¿ningún tag 'wakes'?
   ├─ sí → asleep_check_result → item 'unnoticed', mood_cause sleep
   └─ no → resolve_check()
             gate → skill requerida, con piso mínimo:
                    gate_min.<skill> por skill, gate_default_min (0)
                    en general — bajo el piso ni se tira el dado
             roll d10 + skill + mods de estado (check_mod detectors)
                   + mods del evento
             vs difficulty (default 8)
               ├─ éxito → 'noticed' + bonus de percepción
               ├─ fallo normal → 'unnoticed'
               └─ fallo con estado alterado → 'misread'
   │
   ▼
reading = resolve_event_reading (estrategia del Kind: declared, terrain,
          sleep, phrases, needs, outcome, decision, silent)
          · misread → misread_reading (versión equivocada)
          · unnoticed → sin lectura
   │
   ▼
severity = max(field_severity(data), tag severities)
salience = w_sev·severity + w_nov·novelty + w_emo·charge
         + w_att·attention(sujetos) + w_per·bonus        (cap 1.0)
         · unnoticed → ×0.5
         · si noticed → se aplica el piso salience_min del pack
   │
   ▼
world_delta, contact, body_hit = semantic_delta(tags, data)
   (unnoticed → delta = {})
   │
   ▼
¿sujetos?
   ├─ sí → feed_event(): delta entero al subject más específico,
   │       splash 0.3 al resto; standing amplifica lo sentido;
   │       resistance amortigua lo contradictorio; attention por dim
   └─ no → felt_through(): el delta se siente sin sedimentar en nadie
   │
   ▼
item percibido: {type, source, reading, tags, subjects, salience,
   felt(imprint), body_hit, mood_cause?, check…}
```

El resultado es `episode.perceived_day`: el día **como la mente lo vivió**,
que puede diferir del día que el host envió (no notado, malentendido, sin
importancia).

**Items de recurrencia** (se agregan al perceived_day, source `mind`):

- **Streak**: tag sujeto-patrón repetido 3+ episodios consecutivos → item
  "wear" de monotonía: el delta del sujeto se erosiona (`like` frena hasta
  la mitad; `fear` amplifica hasta el doble). La racha sedimenta
  **familiarity** además de afecto — la repetición es lo conocido.
- **Break**: una racha se rompe → la mente lo nota ("por fin, techo") y lo
  ancla a su fase típica (los breaks de clima suenan de mañana).
- **Need-watch**: necesidad recurrente que el día volvió a tocar.
- Los items de recurrencia **ceden** (`yield`) ante un evento dominante del
  mundo — el desgaste no compite con el orco en la puerta.

**`retrieve` — evocación de memorias:**

```
todas las memories  ─▶  ¿kind=='pattern'? afuera (los patrones no evocan)
                   ─▶  ¿importance < 0.15? afuera (piso de evocación)
                   ─▶  ¿refractaria? (evocada en el episodio anterior,
                       refractory_episodes=1) afuera
                   ─▶  ¿tags 100% ambient? afuera (no hay ancla de contacto)
                   ─▶  contact gate: ¿relevance>0 por contact tags
                       (con peso 0.4 a facets) o similitud ≥0.45?
   │
   ▼
score = .4·recency(e^-.3·días) + .4·importance
      + .2·relevance + .25·similarity   → top 5, mín 0.5
   │
   ▼
cada evocada: evocations++, last_evoked=ep, strength+=.1
   imprint×0.3 → Relations de sus subjects + mood del momento
```

**`dialogue_recall`**: por cada encuentro con sustancia, la mente recuerda
diálogos previos con ese sujeto (memorias con facet `encounter`).

**`needs_pass`**: detectors abren/cierran fisiológicas → composite rules
cuentan rachas `rule:*` → threads se abren/resuelven/escalan → se refresca
urgencia → snapshot. Luego `resolve_break_items` decide qué rachas se
rompieron hoy y `need_items` convierte las needs que hablan en items
`voice` del perceived_day.

**`episode_mood`** = media pesada por salience de los imprints + presión de
threads; **turn** si el giro supera `TURN_MIN_SWING` (0.3).
**`update_mind_mood`** escribe el mood de salida en la mente: acopla el
felt del día (Relations → mood por `W_RM`), pesa el cuerpo, aplica la
presión de threads, deriva el `feeling` y elige la causa dominante.

**`build_brief`** — la selección del Lens:

| pool | qué contiene | para qué |
|---|---|---|
| `moments` | items notados, con lectura, rol ≠ frame/voice | eventos candidatos a Focus/líneas |
| `voice_moments` | **todo lo notado** con tags o type (tagset completo, ambient incluido) | matching de musings |

1. Eventos con score ≥0.3 → líneas `event`.
2. Convicciones que tocan el día (ladder + overlap) → líneas `belief`,
   ordenadas narrowest-first, score = strength/5 × hit × bonus de overlap.
3. Musings sobre `voice_moments` → líneas `musing`, score ×
   `reflectiveness`; filtro refractario (`musing_refractory_episodes`,
   default 2); si nadie tocó la mente, se agregan las de
   `context:solitude` (score 0.12×gain).
4. Memorias evocadas → líneas `memory` (con anchor de fase si aplica).
5. Needs que hablan → líneas `need` con su causa.
6. Mood → línea `mood` con causa.
7. Focus pick: mejor evento ≥0.45 > need urgente > memoria ≥0.8.
8. `connected()` filtra al contexto del Focus; cap de 3 líneas por bloque;
   rotación determinística por `episode_idx`; el resto a `silenced` con
   razón.

**Director** (opcional) valida su reorden contra el brief; **render_lens**
compone el `lens_block` en inglés: las líneas "carried" (lo que el
personaje ya traía) primero, el Focus marcado, las líneas del día en su
fase.

### 5.2 `POST /episodes/{id}/narrate`

1. Reconstruye el `NarrateDayRequest` desde `narrator_payload` (viaje,
   personaje, lengua, estado, fate, arc, condition, narration_notes).
2. Reconstruye los `encounters` a la forma legacy que el prompt espera
   (entidad, forma, outcome, prosa) y el `previous_rest` (el `rest` del
   episodio anterior — el ancla del amanecer).
3. `mind_block` = el `lens_block` persistido; `memory_beats` = los beats
   del brief (o el fallback `_evoked_beats` para episodios viejos sin
   brief) + `disposition_beats` (las actitudes que hablaron).
4. `narrate_day()` — el pipeline del narrador (compartido con el path
   stateless): compone el prompt con day/trip/condition/world_notes/
   encounters/needs/fate/mind_block/memory_beats → LLM → texto en inner
   language → traducción si `language` lo pide.
5. Persiste `narrative` (+`narrative_translation`), marca `narrated`.
6. `_record_voiced` / `lens_eval`: compara líneas del Lens contra la
   narración → `{evoked, voiced}` por episodio; `mem.voiced++` a las
   memorias que sonaron (una vez por episodio). **Resonated** = la métrica
   de cuánta vida interior llegó al cuento.

### 5.3 `POST /episodes/{id}/decide` (rama opcional)

Si el evento del día declara `data.decision {options:[{id, label, tags,
commands, stance}]}`:

- Al open, `pending_decision_point` guarda el dilema y `_recommend` puntúa
  cada opción: atención de Relations sobre sus tags + fuerza de
  convicciones que solapan + urgencia de needs tocadas.
- `POST /decide` con la opción elegida (o la recomendada): persiste en
  `episode.decisions`, aplica el `stance` (postura) y `shelter` rewrite si
  la opción los declara, devuelve `proposed_commands` para el host y el
  texto de resolución.

### 5.4 `POST /episodes/{id}/close`

Idempotente (re-close devuelve lo hecho). Orden exacto:

1. `resolve_from_outcome`: el outcome del host ("went_well", "went_badly",
   thread resuelto…) cierra needs/threads abiertas.
2. **Streak counters**: incrementa `rule:*` solo por episodios
   persistidos.
3. **`close_episode_memory` → encode**: por cada item percibido:
   - `data.synthetic` → skip (bookkeeping de recurrencia, no vivido).
   - Kind con `encodes:false` en el registry → skip (ningún built-in lo
     declara; es un apagado declarable por pack).
   - `salience ≤ 0` → skip.
   - `unnoticed` → fila con la frase `mind.unnoticed` (hueco, sin prosa).
   - Sin palabras (sin lectura *y* sin sujeto: `travel`, `body`) → skip —
     se sintió, no hay impresión que archivar.
   - `sig` ya vista (re-close) o mismo `(kind, desc, entity)` o misma
     `need:<key>` → refresca/absorbe la fila existente, nunca duplica.
   - Item del **Focus** → +0.15 importance (`focus_memory_boost`: el día
     se recuerda por su centro).
   - Arco de needs → una sola fila por need ("segundo día con hambre").
   - Nace `consolidated` si importance ≥ `fixed_threshold` (0.8); si no,
     volátil con `strength` = importance.
4. **`detect_patterns`**: un tag pattern-eligible presente en 3 de los
   últimos 4 episodios → `Memory kind='pattern'` (refresca strength si ya
   existía; un patrón que deja de repetirse se marchita y eventualmente se
   borra). Los bare tags ya no patternean (#147); la comida sí — el
   ejemplo canónico "otra vez pan" ahora sí genera patrón.
5. **`decay_pass`**: volátiles ×0.85 (×0.95 sticky); consolidadas ×0.98;
   <0.2 → `ForgottenMemory`. Patrones y convicciones exentos del pase
   volátil; las convicciones **nunca** pudren.
6. **`belief_fade_pass`**: convicciones `transient` activas no refrescadas
   en este episodio → ×0.9; <1.5 → `weakened`.
7. **`_release_resolved_needs`** + **`_compact_duplicates`**.
8. **Relations** ×0.98; **mood** regresa al temperamento (α=moodiness).
9. **`maybe_reflect`** — el cierre LLM que reescribe convicciones:
   - Dispara cada `reflection_cadence` (5) episodios **o** si un item de
     `source=world` superó salience 0.85 (los items `mind` no pueden
     dispararla).
   - **Evidence gate**: solo memorias/momentos del día con importance ≥0.4
     o |valence| ≥0.2 — sin evidencia, no hay reflexión.
   - `reflection_beliefs`: convicciones tocadas o que sonaron (cap 25),
     separando aprendidas (editables) de seeds (más protegidas).
   - Ops validadas (los ids de evidencia y de belief deben existir):
     - `create` — nueva convicción desde evidencia (máx. 2 por reflexión).
     - `reinforce` +0.5 — si strength ≥4.5 y la evidencia media fue
       negativa, gana facet `trauma`.
     - `contradict` −0.75 — <1.5 → `weakened`; la memoria asociada se
       amortigua (importance ≤0.05).
     - `invert` — la vieja queda `inverted`; nace una fila nueva con
       imprint invertido, `source=lived`, heredando subjects/tags.
   - Las convicciones activas no tocadas decaen ×0.95 (transient ×0.8);
     cap de 12 activas aprendidas — la más débil queda `weakened`.

### 5.5 Mentes degradadas y mantenimiento

`mind.wiring['degraded']=true` (NPCs/backgrounds): perciben y codifican
igual — recuerdan al protagonista — pero **nunca reflejan** (el LLM es un
costo de protagonista) y difieren el decay y la consolidación de patrones.
El endpoint `POST /maintenance/consolidate` corre esa consolidación
diferida en lote sobre todas las mentes degradadas abiertas (o sobre
`mind_ids` pinnadas a mano — un pin explícito es intención de operador,
degradada o no). Así cientos de NPCs acumulan pasado sin gastar LLM.

### 5.6 El path stateless `/narrate-day`

El endpoint original, aún vivo: recibe `NarrateDayRequest` (day, trip,
character, encounters, previousDay, characterState, fate, language,
mindBlock, memoryBeats…) y devuelve prosa **sin tocar ninguna mente**. Lo
usa el juego como fallback cuando el mind-engine no está disponible, y la
ruta stateful lo reutiliza internamente — el narrador es el mismo; lo que
cambia es quién le arma el material.

---

## 6. Un día completo, con números

Celebrían (`reflectiveness` ≈ 1.0, preset élfico) — un día de lluvia con
señales de orcos.

**Wire** (lo que manda el juego): `climate` (wet), `land` (cordillera,
subtype terrain), `encounter` (signs of orcs, `form:sign_only`,
`entity_type:orcs`, danger 2), `meal` (bread), `rest` (open sky, poor).

**Open — percepción:**
- `climate` → tags `weather:wet`; frame, reading por frases. Delta
  semántico: affection −0.05, body cold +0.1. Sin sujetos → `felt_through`
  (se siente, no sedimenta en nadie).
- `encounter` → tags `entity_type:orcs`, `form:sign_only`, `field:danger`.
  Check de percepción: d10+skills vs 8 → éxito (notado). Severity del
  danger + piso `entity_type:orcs` 0.45. `field:danger` → fear +0.1×2×w.
  **Feed**: `tag:entity_type:orcs` recibe el delta entero; su Relation de
  orcos (ya temida) amplifica lo sentido ×(1+0.5·|fear|).
- `meal` → `tag:food:bread`, contact liviano; la Relation `food:bread`
  (querida por streak) suma una pizca, y su familiaridad amortigua la
  novedad.
- `rest` → `rest:open_sky` + `rest:poor`: affection −, fatigue +0.15,
  piso de salience 0.3.

**Recurrencia**: es el 3.er día seguido de lluvia → `rule:gloom` sube a
2/3. Y el pan de cada día ya generó un *streak item* ("otra vez pan") que
erosiona un poco el afecto por `food:bread` — pero el `like` alto lo frena:
la comida amada se desgasta lento, nunca se anula.

**Evocación**: la memoria "hostiles bloquearon el vado" (entity_type orcs,
importance .6, hace 4 días) pasa todos los gates → score .62 → evocada:
strength+, su imprint×0.3 re-siente fear sobre orcos y tiñe el mood.

**Needs**: `hunger` bajo detector → need abierta urgencia 0.4 (habla por
ser nueva); el thread "llegar a Bree" sigue abierto.

**Mood**: `Σ imprint×salience` → valence −0.18, arousal 0.35 → feeling
*uneasy*, causa "signs of orcs".

**Brief**:
- `moments`: encounter (score .71), meal (.33), rest (.41). El clima y el
  viaje quedan fuera del Focus — son frames.
- `voice_moments`: *incluye* el clima. La musing
  `ORCS+SIGNS` "When the signs of orcs appear, an old part of me stops
  counting years and starts counting arrows." matchea el encounter ×
  reflectiveness → línea. Otra musing `weather:wet` ("Storms tear the sky
  apart the way I tear my memories" si estuviera taggeada así) podría
  hablar *del propio clima* — antes de #158 esto era imposible.
- Convicción `entity_type:orcs` ("no cambian, solo cambian los nombres de
  los lugares que profanan") → línea `belief`, narrowest-wins.
- Focus: el encounter. Las demás líneas se conectan a él por tags orcs;
  el cap deja fuera el meal → `silenced{stage:'cap'}`.

**Narrate**: el narrador recibe el Lens + world_notes + encounters y
escribe. `lens_eval` marca que la musing y la convicción resonaron; la
memoria evocada no llegó al texto → `voiced` no sube.

**Close**: el encuentro codifica (`importance` = su salience, +.15 por
haber sido el Focus → nace fuerte);
el clima gris queda como memoria liviana (codificó porque llevaba
lectura; un kind `silent` como `travel` o `body` no codificaría — sin
palabras no hay impresión);
`rule:gloom` → 3 → abre la need `gloom` mañana; patrón `rest:poor` a un
día de formarse; convicción de orcos reforzada por evidencia; volátiles
decaen; el mood deriva un 30% hacia su calma fría; Relations de pan y
lluvia bajan 2%. Reflection: no toca (faltan 2 episodios para la
cadencia y nada superó .85… salvo que el danger hubiera sido mayor —
entonces sí: un pico de salience de mundo adelanta la reflexión).

---

## 7. Cómo se afina una mente

Tres niveles de datos, todos editables sin tocar código:

| nivel | dónde | qué contiene |
|---|---|---|
| **Pack por juego** | `semantics`, `detectors`, `composite_rules`, `pack_entries`, `mind.kinds` | el significado de tags/fields, la lectura del cuerpo, reglas de rachas, frases de voz (mood bands, lexicón de feelings, disposition render, `silenced`), el registry de kinds |
| **Preset** | `mind_presets` + `preset_wiring`, `preset_starter_beliefs`, `preset_leans`, `preset_musings` | la forma de pensar completa: diales del motor, convicciones semilla, Relations semilla, voz interior, temperament/personality |
| **Mind** (copia viva) | `mind.wiring`, `mind.personality`, `mind.temperament`, `mind.counters`, más todas sus filas | lo que el preset clonó + todo lo que la vida le fue dejando |

Los **diales de wiring** (merged sobre `DEFAULT_WIRING`, por preset)
agrupan — nombres reales y defaults:

- **percepción**: `check_die_sides` (10), `check_default_difficulty` (8),
  `check_difficulty_scale` (10), `gate_default_min` (0), `gate_min.<skill>`,
  `unnoticed_salience` (×0.5), `sleep_phases` (`['night']`), y los pesos de
  la fórmula: `w_severity` .35, `w_novelty` .25, `w_emotional` .15,
  `w_attention` .15, `w_perception` .10;
- **evocación/memoria**: `alpha`/`beta`/`gamma` (.4/.4/.2 = pesos de
  recency/importance/relevance), `lambda_recency` (.3), `delta_embedding`
  (.25), `retrieval_top_k` (5), `retrieval_min_score` (.5),
  `retrieval_importance_min` (.15), `retrieval_semantic_min` (.45),
  `retrieval_facet_weight` (.4), `refractory_episodes` (1),
  `dialogue_recall_min` (.4);
- **persistencia**: `decay` (.85), `decay_sticky` (.95),
  `decay_sticky_valence` (.4), `decay_sticky_importance` (.5),
  `consolidated_decay` (.98), `forget_threshold` (.2), `fixed_threshold`
  (.8), `consolidate_min_importance` (.3), `evocations_to_fix` (3);
- **Lens/Focus**: `focus_candidate_min_salience` (.3), `focus_min_salience`
  (.45), `focus_memory_min` (.8), `focus_mood_strong` (.4),
  `focus_memory_boost` (.15), `belief_specificity_bonus` (.25);
- **needs/recurrencia**: `need_weather_streak` (3), `need_deep_urgency`
  (.6), `thread_pressure_scale` (.3) / `thread_pressure_cap` (.4),
  `pattern_window` (4) / `pattern_min_episodes` (3), `repetition_min_streak`
  (3), `repetition_growth` (.08), `repetition_valence_cap` (.3),
  `repetition_salience` (.3), `repetition_relief` (.15),
  `recurrence_yield_salience` (.45), `break_need_watch`
  (`{'tag:food:*':'hunger'}`), `break_loss_valence` (−.1),
  `repetition_relief_salience` (.45), `break_standing_scale` (.3),
  `repetition_exempt_tags` (`['tag:drink:*']`);
- **musings**: `musing_refractory_episodes` (2);
- **relations**: `relation_attention_gain` (.3), `relation_decay` (.98);
- **reflection**: `reflection_every` (5), `reflection_importance_min`
  (.85), `reflection_memory_top` (20), `reflection_seed_cap` (25),
  `belief_reinforce_delta` (.5), `belief_contradict_delta` (.75),
  `belief_weaken_below` (1.5), `belief_strength_decay` (.95),
  `belief_trauma_min` (4.5), `belief_cap` (12),
  `belief_evidence_importance_min` (.4), `belief_evidence_valence_min`
  (.2), `belief_new_per_reflection` (2), `belief_transient_decay` (.8),
  `belief_transient_episode_decay` (.9);
- **varios**: `degraded` (false).

Los **couplings de personality** son por personaje: `sensitivity` (por
dim), `resistance`, `moodiness`, `reflectiveness`.

**Versionado de packs**: `clone_pack` copia el pack vivo a un namespace
`@draft-N` editable; `promote_pack` archiva el vivo (snapshot congelado) y
pone el draft. El `config_snapshot` del episodio registra qué versión corrió
— un replay sabe con qué pack se percibió el día.

---

## 8. Lo viejo que sigue vivo (legacy consciente)

No todo lo pre-actual es muerto. Esto sigue funcionando *a propósito*:

| pieza | dónde | por qué sigue |
|---|---|---|
| **`KIND_ALIASES: moment→ambience`** | `kinds.py` | episodios viejos y hosts viejos con `type:moment` resuelven al kind nuevo, mismo contrato |
| **bucket `moments` en el prompt** | `builder.py` | payloads de world_notes anteriores al rename siguen alimentando el timeline (se aceptan `ambience` y `moments`) |
| **`when.episode` / `when.date`** | `perceive.py`, `routes.py` | el índice/fecha del episodio lee estas llaves legacy si las columnas nuevas están vacías; el seed del check de percepción las usa |
| **`type:need`/`recurrence` legacy** | `is_mind_item`, `mood_cause` | items percibidos pre-`source` se reconocen por su type |
| **`_evoked_beats`** | `routes.py` | episodios cerrados antes de que existiera `brief` narran con el path viejo de beats |
| **`previousDay` / `previous_rest`** | `routes.py`, `builder.py` | el `rest` del episodio anterior sigue anclando el amanecer narrado |
| **campos planos del Condition** | `mind/models.py` | `energy`/`shadow`/`wounded`/`conditions` del OpenCharacter conviven con el mapa `state` libre (ADR 0005) — los hosts del pack built-in los siguen usando |
| **`'confidence'` en reflection ops** | `reflection.py` | `_strength` acepta la palabra vieja y la reescala 0–1 |
| **fallbacks de convicción** | `attitudes.py` | los accessors (`conviction_subject`, `conviction_stance`…) aceptan objetos tipo `statement/subject/stance` directos — los fixtures y rows pre-fold se leen igual |
| **`thought_packs.py`** | shim | las migraciones Alembic 0017/0018 lo importan para poder replicarse desde cero; nadie más debe importarlo |
| **`seed_packs.py`** | seed puro | 547 líneas de contenido autoral (musings + attitudes); en runtime nadie lo lee — las tablas `preset_*` son la verdad — pero sigue importable para las migraciones y el auditor de tests |
| **`PresetStarterBelief.boosts`** | `tables.py` | columna de authoring muerta desde #165 (el canal de atención por beliefs murió); se conserva porque los replays y los `**row` la siguen escribiendo |
| **`/narrate-day` stateless** | `main.py` | el endpoint original completo: el fallback del juego y el núcleo narrador compartido |
| **`_encounter_prompt_shape`** | `routes.py` | re-arma los encounters con la forma que el prompt del narrador siempre esperó |
| **`memory_age_days` por `created_episode`** | `engine.py` | memorias anteriores al calendario interno se datan por índice de episodio |

Y un legado *conceptual* a tener claro: **`moment` ya no es un tipo de
evento** — es el *Rol* (algo que pasó y puede tomar el Focus). El tipo de
evento ambiental del mundo se llama **`ambience`**. La voz interior nunca
fue ni será un `type:` — es la **Musing**.

---

## 9. Lo que deliberadamente NO hace

- **No decide el mundo**: jamás inventa eventos ni altera el Condition; el
  host manda los hechos y la mente solo elige cómo los vivió.
- **No narra sin vivir**: el Lens no puede citar lo que el episodio no
  tocó; una creencia ausente es una señal, no un hueco.
- **No usa la voz como evidencia**: needs, streaks y musings sienten y
  hablan pero no alimentan rachas ni disparan Reflection — la mente no se
  convence a sí misma.
- **No olvida convicciones ni inventa recuerdos**: lo que no fue percibido
  no existe en el pasado; lo olvidado se archiva, no se borra.
- **No tiene "personalidad" en el motor**: un solo engine; cada personaje
  es datos.

---

## 10. Mapa rápido del código (para el curioso)

```
mind-engine/app/
├── main.py                    endpoints + /narrate-day stateless
├── models.py                  wire del narrador (NarrateDay…)
├── mind/
│   ├── models.py              wire del open (OpenEpisode/EventIn/…)
│   ├── tables.py              el schema (Episode, Mind, Memory, presets…)
│   ├── routes.py              open/narrate/close/decide/state/reset
│   ├── perceive.py            tags → check → reading → salience → feed
│   ├── checks.py              la tirada de percepción (gates, d10, mods)
│   ├── semantics.py           el significado declarado (delta/floors/wakes/field:)
│   ├── kinds.py               Kind Registry (roles, sources, alias)
│   ├── tags.py                familias/clases/ladder/contact_tags
│   ├── relations.py           feed/splash/attention/decay/presets
│   ├── engine.py              mood/needs_pass/patterns + constantes
│   ├── retrieval.py           evocación: gates, scoring, re-feel
│   ├── memory.py              encode/dedup/decay/forget/compact
│   ├── needs.py               urgency, threads, composite rules, voces
│   ├── detectors.py           condition → needs/check_mods/altered/body
│   ├── voice.py               frases pack: mood bands, feelings, streaks
│   ├── focus.py               build_brief: pools, musings, focus, cap
│   ├── lens.py                render_lens + lens_eval + misread
│   ├── director.py            el re-ordenador LLM opcional del brief
│   ├── reflection.py          el LLM que reescribe convicciones
│   ├── attitudes.py           accessors de convicciones + ladder
│   ├── decisions.py           decision_point + recommend + apply
│   ├── embeddings.py          el embedder bucket para similitud
│   ├── provisioning.py        presets → mentes (clone + seeds)
│   ├── seed_packs.py          contenido autoral (musings/attitudes)
│   ├── packs.py               clone/promote de packs versionados
│   ├── rules.py               composite rules built-in
│   └── thought_packs.py       shim de migraciones (legacy)
├── prompt/builder.py          el prompt del narrador (builder)
└── studio/api.py              la API de inspección del Studio
```
