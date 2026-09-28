# Mind Engine — Anatomía, pieza por pieza

> Cada pieza del motor explicada dos veces: **qué hace técnicamente** (la
> mecánica, los archivos, el dato) y **a qué función cerebral equivale**
> (la metáfora que le da sentido) — más qué *no* hace a propósito.
>
> Para el relato general sin código: `story-engine-explained.md`.
> Para el spec formal: `psyche-engine-spec.md` y `mind-engine-prd.md`.
>
> El hilo conductor: un episodio pasa por **open → narrate → close**.
> Abrir percibe y consulta la memoria; narrar le da voz; cerrar aprende.

---

## Fase A — los cimientos

### A1 · Persistencia: Postgres + SQLAlchemy + Alembic

**🔧 Técnica** — La mente tiene su propio schema `mind` en Postgres,
versionado por migraciones Alembic (`0011`→`0012`…). Nada vive en memoria
de proceso: si el servicio reinicia, los personajes siguen siendo quienes
eran.

**🧠 Cerebro** — La diferencia entre una conversación y una vida: hay un
lugar donde lo vivido *queda*. Sin esto todo lo demás sería amnesia por
defecto.

**🚫 No hace** — No guarda el estado del juego (vida, inventario,
posición). Solo guarda la mente; el juego persiste su propia verdad.

### A2 · Contrato `events[]` + recurso Episode

**🔧 Técnica** — El host traduce su mundo a eventos genéricos
(`type`, `when`, `where`, `data` libre) y los postea a `POST /episodes`.
El episodio es un recurso idempotente (`UNIQUE(game_id, character_id,
episode_ref)`): reabrir devuelve el mismo, nunca duplica.

**🧠 Cerebro** — Los sentidos del sistema: la mente no entiende "orco" ni
"lembas"; entiende *evento con datos*. El mundo habla su idioma; la mente
solo escucha en el suyo.

**🚫 No hace** — No conoce el dominio del juego. Ninguna clave de `data`
tiene semántica hardcodeada más allá de convenciones declaradas
(`severity`, `check`, `thread`...).

### A3 · Capa NL como datos: `nl_bands` + facets + resolver

**🔧 Técnica** — Todo número que se convierte en palabra pasa por tablas
editables: bandas ordenadas (`< 6mm → "light rain"`), thresholds sueltos,
phrase lists y facets (qué campos de cada evento son "bandeables").
`nl_resolver` cachea el pack por `game_id` con fallback a defaults de
código si la DB cae.

**🧠 Cerebro** — El vocabulario: transformar magnitud en percepción
nombrable. 6mm no es "6mm" para una mente — es "llovizna".

**🚫 No hace** — No es por personaje (todavía): el pack es *del mundo*.
Dos cerebros llaman igual a la misma lluvia… hasta B7.

### A4 · `natural_language` consume el resolver

**🔧 Técnica** — Los módulos de lenguaje dejan de leer constantes y leen
el resolver. Tests de equivalencia prueban que el seed reproduce las
constantes originales — la migración a datos no cambió ni una palabra.

**🧠 Cerebro** — Cirugía de vocabulario sin cambiar de voz: mismo
resultado, pero ahora las palabras son editables.

**🚫 No hace** — No cambia ningún comportamiento observable. Es la prueba
de que "pasar a datos" es seguro.

### A5 · Moldes de cerebro + perfiles vivos

**🔧 Técnica** — `brain_molds` (arquetipo: theme_weights + wiring +
starter_beliefs en tablas hijas editables) → `brains` (copia materializada
por personaje, creada lazy en el primer open). Editar el molde no
reconfigura cerebros existentes: clone-and-own.

**🧠 Cerebro** — Naturaleza vs. crianza: el molde es con qué mente nacés;
el brain es la que te dejó la vida. Desde el primer episodio ya no sos el
molde — sos el molde *más lo que te pasó*.

**🚫 No hace** — No retropropaga: corregir el molde "hobbit miedoso" no
edita al hobbit que ya vivió tres semanas.

### A6 · Percepción MVP: readings + importance

**🔧 Técnica** — `perceive.py` anota cada evento: lectura NL (`reading`),
tags derivados (`type:*`, `entity:*`, `tag:k:v`, `region:*`) y `salience`
= mezcla ponderada de severidad, novedad, carga emocional, **peso temático
del cerebro** y bonus de percepción.

**🧠 Cerebro** — Atención: la mente no puntúa el mundo, puntúa *su*
interés en el mundo. La misma comida pesa distinto al glotón y al asceta.

**🚫 No hace** — No decide qué se recuerda (eso es A7). Salience es la
apuesta; el recuerdo es otra historia.

### A7 · Memoria: encode, decay, olvido

**🔧 Técnica** — En close, `encode_episode` convierte lo percibido con
salience>0 en `memories` (kind='episodic', importance, strength,
episode_ids). `decay_pass` multiplica la fuerza de los volátiles por
`decay`; bajo `forget_threshold` se borran. Dos atajos a permanencia:
`importance ≥ fixed_threshold` nace consolidada; `evocations ≥ fix_k` se
consolida por uso.

**🧠 Cerebro** — El hipocampo honesto: recordar es la excepción, olvidar
la regla. Un cerebro que guarda todo es un log, no una mente.

**🚫 No hace** — No borra consolidadas ni deduplica entre episodios
distintos (cada evento es su recuerdo).

### A8 · Beliefs-lite + retrieval + lens + mood

**🔧 Técnica** — Cuatro piezas: seeds de `beliefs` (confianza, origen
`seed`, estáticas aún); `retrieve` ordena memorias por
`α·recencia + β·importancia + γ·relevancia de tags` y marca las evocadas;
`episode_mood` computa valencia/arousal/dominante del día y lo funde en
`brain.mood`; `render_lens` comprime todo en el texto que el narrador lee.

**🧠 Cerebro** — El "en qué andás hoy": qué recuerdos te vinieron a la
mente, qué creés, cómo te levantaste. El lente es la mente resumida en
una mirada.

**🚫 No hace** — Las beliefs aún no *nace* de la experiencia (eso es B4);
solo informan el contexto.

### A9 · `POST /episodes/{id}/narrate`

**🔧 Técnica** — Envuelve el pipeline de narración existente (no lo
reescribe): inyecta `lens_block` + readings salientes como sección nueva
del prompt. La prosa se regenera por llamada — no es estado mental.

**🧠 Cerebro** — La boca: la mente no habla; le susurra al narrador qué
sintió, y él escribe.

**🚫 No hace** — No persiste la narrativa ni toca `/narrate-day`, que
sigue vivo como fallback.

### A10 · Mind Tuner + Narration Tuner + NL tester

**🔧 Técnica** — SQLAdmin sobre todas las tablas editables (packs NL,
molds e hijas, brains, beliefs, overrides, rules…) + vistas readonly
(episodes, memories, needs) + un **tester**: escribís un valor y ves la
banda/frase resuelta sin tocar el juego.

**🧠 Cerebro** — Cirugía consciente: ajustar un cerebro viendo el efecto,
no a ciegas.

**🚫 No hace** — No simula episodios completos (Live Preview es roadmap
de Story Tuner).

### A11 · Integración Node

**🔧 Técnica** — `toEvents.js` traduce el dominio (clima, viaje,
encuentros, cuerpo) a `events[]`; el cliente orquesta `open → narrate →
close` detrás del flag `MIND_ENGINE`. Si Mind está caído → fallback a
`/narrate-day` sin drama.

**🧠 Cerebro** — El intérprete: el juego piensa en "encuentro con danger
3"; la mente escucha "evento con datos".

**🚫 No hace** — No delega mecánica al mind: Node sigue siendo dueño de
todo outcome.

### A12 · Smoke & evals del MVP

**🔧 Técnica** — Suite de extremo a extremo: un día completo atraviesa
open/percepción/narrate/close y las propiedades del sistema (idempotencia,
determinismo, fallback) quedan bajo test.

**🧠 Cerebro** — El examen de conciencia: la mente existe solo si sus
promesas se repiten.

**🚫 No hace** — No mide calidad narrativa; mide contratos.

---

## Fase B — la mente completa

### B1 · Gates & rolls

**🔧 Técnica** — `checks.py`: el host declara `data.check = {skill,
gate?, difficulty?, mods?}` por evento. Skill bajo el umbral del gate →
`unnoticed` sin tirar dados; si pasa, `d10 + skill + mods de estado`
(energy/shadow/wounded, mismos cortes que el host) vs. `difficulty`.
Éxito → `noticed` + bonus de salience. Fallo → `unnoticed` (salience
atenuada) o `misread` si el estado está alterado. RNG seedeado por
identidad del evento: mismo `events[]` → mismas tiradas.

**🧠 Cerebro** — Competencia y estado de ánimo como filtros de la
percepción: no notás lo que no sabés notar, y asustado ves monstruos en
las sombras. Un misread es literalmente eso: el mundo pasó, tu versión
llegó torcida.

**🚫 No hace** — No cambia el outcome mecánico del juego: el check es de
*percepción*, no de resolución. Fallar el check no hace fallar el encuentro
— hace no haberlo visto venir.

### B2 · Needs engine

**🔧 Técnica** — `needs.py` + tabla `mind.needs`: detectores fisiológicos
(hambre/sed/agotamiento/inquietud) leen el snapshot del personaje; threads
narrativos llegan por `data.thread` en eventos; urgencias crecen con el
estado; los needs detectoriales se auto-resuelven cuando el estado se
limpia, los threads solo por `data.resolves` u `outcome.resolved_needs`
en close. Salen en `needs_active` del packet y en la sección Needs del
lens.

**🧠 Cerebro** — Los open loops del psique: lo que te falta y lo que
quedó a medias. Una mente no es solo memoria — es *hambre de algo*, y el
narrador puede hacerla actuar desde ahí.

**🚫 No hace** — No ejecuta la resolución: reporta "tiene hambre"; el
juego decide si comió. El need se entera después, por el outcome.

### B3 · Pattern memories

**🔧 Técnica** — `detect_patterns` en close: un tag (no `type:`) percibido
en ≥ `pattern_min_episodes` de las últimas `pattern_window` consolida una
memoria `kind='pattern'` ("lleva lloviznando toda la semana"). Cuenta
`perceived_day` de los episodios, no solo memorias — lo trivial repetido
rara vez encoda. Los tags climáticos semánticos (`tag:weather:freezing`…)
nacen de thresholds NL para que el clima pueda formar patrones.

**🧠 Cerebro** — Abstracción por repetición: siete recuerdos de llovizna
mueren como fragmentos y queda *una idea*: "esta semana llueve". Así
piensa la gente — en temas, no en logs.

**🚫 No hace** — No exige consecutividad (tres de cuatro días alcanza);
esa es la diferencia con las reglas de B9.

### B4 · Reflexión LLM → beliefs

**🔧 Técnica** — `reflection.py`: cada `reflection_every` episodios (o un
pico de salience ≥ `reflection_importance_min`), el único LLM del pipeline
mental recibe las memorias más importantes + beliefs activas y devuelve
*operaciones* (`create/reinforce/contradict/invert`) — no prosa.
Anti-alucinación dura: toda op debe citar `evidence` con ids de memorias
reales; lo inválido se descarta. Reconciliación determinista: deltas,
debilitamiento bajo umbral, inversión, trauma (creencia negativa muy
confiada), decay de no-reforzadas, cap de activas. Falla del LLM → el
close sigue igual.

**🧠 Cerebro** — El sueño, literalmente: el momento en que lo vivido se
convierte en conclusión. "Los montaraces ayudan" no es un hecho del mundo
— es algo que *esta* mente decidió a partir de sus recuerdos. Y puede
equivocarse: la evidencia invalida la alucinación, la contradicción
repetida invierte la creencia (crecimiento) o la fija como trauma.

**🚫 No hace** — No inventa creencias sin recuerdos que las sustenten, no
corre todos los días, y nunca bloquea el close.

### B5 · `decide` + proposed commands

**🔧 Técnica** — El host declara `data.decision = {options: [{id, label,
tags?, commands?}]}` en un evento. El packet expone `decision_point` (sin
comandos); `POST /episodes/{id}/decide` registra la opción y devuelve sus
`commands` **verbatim** — el host los valida y aplica. `recommended`
opcional: score determinista por theme_weights + beliefs activas + needs
(`need:<key>` matchea tags de opción). Idempotente: misma elección →
misma respuesta; otra → 409.

**🧠 Cerebro** — La mano extendida: la mente no mueve el mundo, pero puede
decir "yo haría esto". La recomendación es literalmente el peso de lo que
le importa, lo que cree y lo que le falta.

**🚫 No hace** — No ejecuta ni interpreta los comandos: son un blob
opaco que viaja del evento al host. La mente propone; el juego dispone.

### B6 · Boosts de beliefs

**🔧 Técnica** — `beliefs.boosts = {tag: magnitud}`: una creencia activa
con `confidence ≥ belief_boost_min_confidence` suma su boost al
`theme_weights` efectivo en percepción y recomendación de decisiones. Se
computa al vuelo — la config base nunca se muta. Las semillas lo declaran
en `MoldStarterBelief.boosts`; las creencias reflejadas reciben boosts
sanitizados.

**🧠 Cerebro** — Recableado por experiencia: si creés de verdad que "el
sur es peligroso", todo lo sureño pesa más en tu atención. La creencia no
informa solo el texto — *inclina lo que notás*.

**🚫 No hace** — No es permanente ni oculto: muere con la creencia, y es
una fila editable — "le pesa más el clima *porque cree* X", nunca un
número mágico.

### B7 · Band overrides por brain

**🔧 Técnica** — `brain_nl_overrides`: un brain puede reemplazar una banda,
un threshold o una phrase list *entera* (no hay merge parcial dentro de la
clave). Resolución: override de brain → pack del juego → default de
código. Todos los call-sites del resolver aceptan `brain`.

**🧠 Cerebro** — Idiolecto: el hobbit que dice "tormenta" donde el ranger
dice "llovizna". Mismo mundo, distinta palabra — y como los thresholds
también son overridables, hasta *el corte* de qué cuenta como viento es
personal.

**🚫 No hace** — No tiene cache (pocas filas, lecturas en vivo) ni
media-opción: si hay override para la clave, gobierna completo.

### B8 · Embeddings

**🔧 Técnica** — `embeddings.py`: embedder local determinista (hashing
blake2b → vector 256-dim normalizado, coseno en Python; JSONB, no
pgvector — la extensión no existe en este Postgres). Se suma al score de
retrieval: `+ δ·coseno(episodio, memoria)`. `ensure_embedding` backfillea
lazy; las reencodes re-embeden si cambia el desc.

**🧠 Cerebro** — Asociación por significado, no por etiqueta: "la tormenta
de anoche" puede evocar el recuerdo de "aquella inundación" aunque no
compartan un solo tag. La memoria humana trabaja así — por parecido, no
por índice.

**🚫 No hace** — No es un modelo de lenguaje: el hashing no "entiende",
solo mide parecido estadístico barato y determinista. Reemplazable por
pgvector si aparece la extensión.

### B9 · Reglas compuestas configurables

**🔧 Técnica** — `composite_rules`: estados multi-día como datos —
`conditions` es un OR-de-grupos-AND (`[[{field, op, value}…], …]`) sobre
eventos (filtrados por `event_type`), sostenidos `streak_days`
consecutivos (contados en `brain.counters` solo al close → solo episodios
que el host persistió). La fila produce un Need con urgencia
`base + per_day·streak`. El viejo detector `exposure` es hoy la entrada
`DEFAULT_RULES` — mismo comportamiento, editable.

**🧠 Cerebro** — Sensaciones acumuladas: "llevo tres días empapado" no es
un evento — es una *condición de vida* que la repetición instaló. La
diferencia con un patrón (B3) es la dureza del criterio: un día seco
resetea la racha, igual que una noche en posada resetea el agotamiento.

**🚫 No hace** — No comparte motor con pattern memories (decisión
consciente): los patrones son ventana blanda que forma recuerdos; las
reglas son racha dura que abre needs.

### B10 · NPC degraded + versionado de packs

**🔧 Técnica** — Dos piezas:
- *Degraded*: `wiring.degraded` por mold o brain. El NPC percibe y encoda
  normal (recuerda al protagonista), pero nunca llama al LLM de reflexión
  y difiere decay/patterns a `POST /maintenance/consolidate` — trabajo
  batch, costo LLM cero para masas.
- *Versionado (PRD §9.2)*: `pack_versions` + `POST /packs/{g}/clone`
  (live → namespace `g@draft-N`, editable con el admin de siempre) +
  `POST /packs/{g}/promote` (archiva lo vivo como snapshot de rollback y
  swaps atómicos). `config_snapshot.pack_version` audita qué versión corrió
  cada episodio.

**🧠 Cerebro** — Masa y editorial: los extras de la historia también
recuerdan, pero no sueñan (la reflexión es costo de protagonista). Y los
packs versionados son el control editorial de la psique: experimentar en
un mundo-espejo y publicar cuando esté validado.

**🚫 No hace** — El merge con Story Tuner queda diferido: el proyecto no
existe aún. Cuando exista, la superficie editable ya está toda en datos.

---

## El mapa completo, en una pasada

```
eventos del mundo (genéricos)
        │
        ▼  open
  PERCEPCIÓN ── gates/rolls (B1) filtran: noticed / unnoticed / misread
        │      NL pack (A3) nombra · salience pondera (A6) · boosts (B6)
        ▼
  MEMORIA ──── evocación por score αβγδ (A8+B8) · encode/decay al close (A7)
        │      patrones por repetición (B3) · rachas declarativas (B9)
        ▼
  INTERIOR ── beliefs (A8) ← reflexión LLM (B4) · needs (B2) · mood (A8)
        │      overrides por brain (B7) · degraded difiere (B10)
        ▼  narrate
  LENTE ───── el texto que el narrador lee (A9)
        ▼  close
  APRENDIZAJE ── encode + decay + patterns + reflexión · needs resueltos
              · streaks · decisiones registradas (B5)

  Todo mutable en el Mind Tuner (A10) · packs versionados (B10)
  Si Mind cae: /narrate-day sigue narrando (A11)
```

La regla que sostiene todo: **la config la escribe el humano, el contenido
lo escribe la vida, el mundo lo decide el juego.**
