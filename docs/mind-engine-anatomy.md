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

## Fase C — correcciones del primer paciente

La primera historia multi-día con dump mostró que la plomería funcionaba
pero el organismo memorizaba ruido. Estas piezas nacen de ese diagnóstico.

### C1 · Filtro de entrada: la ausencia no es contenido

**🔧 Técnica** — `derive_tags` (perceive.py) saltea marcadores de ausencia
(`none`, `null`, `nil`, `n/a`, `unknown`, `0`, `""` — case-insensitive)
en escalares y en `data.tags`; `description`/`prose_hint` entran en la
lista de campos que son palabras, no tags. En `detect_patterns` (memory.py)
solo los tags sustantivos son elegibles para tema: `entity:*`, `region:*`,
`tag:weather:*` y `tag:<tema>` de un segmento — `tag:<campo>:<valor>` es
bookkeeping. Los patrones viven por recurrencia: tag inelegible →
evicción inmediata (limpia los artefactos viejos); tema que deja de
repetirse → decae como memoria volátil salvo evocación genuina.
`CloseEpisodeResponse.patterns_faded` reporta el retiro.

**🧠 Cerebro** — "No me lastimé" no es un recuerdo. Antes, `wounded:none`
era el recuerdo más fuerte del cerebro ("none again — it is becoming the
shape of these days", strength 1.0, evocada 5 veces). La regla: la
mente nota *cosas*, no formularios vacíos.

**🚫 No hace** — La rutina que sigue evocándose ambientalmente queda
eximida del fade (igual que cualquier memoria recordada hoy). Sacar un
patrón muerto del lens mientras retrieval lo siga reviviendo es la parte
(b)/(c) de la habituación — decisión de diseño aparte.

### C2 · Contrato de eventos v2: la señal que no viajaba

**🔧 Técnica** — `toEvents.js` + `trips.js`:
- **Clima**: bug real — `sampleHour` buscaba `T` en timestamps con
  espacio y las 8 muestras colapsaban en `night`. Ahora usa `s.phase`:
  tres eventos climate por día (mañana/tarde/noche), el día caminado
  deja de ser invisible.
- **Encounters**: `data` lleva `form` (cómo pasó el contacto),
  `outcome`, `prose_hint`, `intensity`, `entity_type` — la mente sabe si
  vio una señal o le salieron al paso.
- **Meals**: `slot` (midday/evening → afternoon/night), `eaten: false`
  cuando la comida faltó — la ausencia viaja explícita.
- **Rest**: `description` — la prosa authored del lugar ("the will
  itself feels weighed and probed") es el reading de la noche
  (`resolve_event_reading` la prefiere).
- **Body**: `endState` del host lleva el streak real post-resolución
  (`newDaysWithoutFood`, `newDaysWithoutWater`, `wounded` de
  conditions) — no la foto de la mañana.

**🧠 Cerebro** — La mente dejaba de ser ciega justo donde estaba el
drama: la peor noche del viaje era `reading: null`, y el hambre real no
llegaba. Un cerebro solo puede sentir lo que el cuerpo reporta.

**🚫 No hace** — Los campos nuevos son insumo: que `form` calibre la
dificultad del check (un `sign_only` sutil ≠ un `confronts`) es la
recalibración de gates — ticket aparte.

### C3 · Canal afectivo: el valence se deriva, no se declara

**🔧 Técnica** — `affect.*` keys dentro de `brain.wiring` (seedeable por
molde, editable por admin, sin migración): `affect.<tag>` da valencia
firmada al evento que porta ese tag (`affect.tag:form:confronts: -0.35`,
wildcards `affect.tag:outcome:*`), y `affect.field:<name>` escala un
campo numérico por unidad (`shadow_effect × -0.15`). `data.valence` del
host gana siempre. La estructura ya existía — episode mood es media
ponderada por salience, el blend MOOD_BLEND 0.5 da momentum entre
episodios — faltaba la señal. La memoria guarda el valence *percibido*
(derivado), no el crudo.

**🧠 Cerebro** — Dos personajes viviendo el mismo día ya pueden sentirlo
distinto: el ranger wiring puede temer al shadow y el hobbit sufrir la
lluvia. El día malo deja mañana-siguiente (el blend no resetea) — la
noche de terror pesa al despertar.

**🚫 No hace** — No es homeostasis: needs abiertas no pesan sobre el
mood todavía (canal separado). Y los defaults son piso genérico — la
firma emocional de cada molde es contenido que el humano escribe.

### C4 · Sueño/vigilia + calibración de umbrales

**🔧 Técnica** — Dos piezas. **Sueño**: durante `when.phase` en
`sleep_phases` (default `['night']`), un evento con `data.check` se
duerme — `perception: unnoticed` y un trace `{asleep: true,
attempted: false}` en vez de roll — salvo que `data.form` esté en
`sleep_wake_forms` (`attacks`, `confronts`, `sudden_peril`: lo que
despierta físicamente) o `data.outcome` en `sleep_wake_outcomes`
(`wounded`: el daño ya entró). Todo wiring: un molde nocturno declara
`sleep_phases: []` y nunca duerme. **Calibración**: umbrales medidos
contra la escala real del host — energy termina ~0.45 tras 12h a pie,
shadow vivió 0.2–0.3 bajo Dol Guldur: `energy_worn_below` 0.5→0.6,
`energy_spent_below` 0.25→0.35, `shadow_shadowed_min`/`misread_shadow_min`
/`need_unrest_shadow_min` 0.45→0.25, `shadow_burdened_min` 0.7→0.5,
`need_exhaustion_below` 0.25→0.4.

**🧠 Cerebro** — La mente tiene noche. Un aullido a las 02:30 que
requeriría tracking para interpretar no llega; un ataque nocturno te
saca del sueño y te asusta (su valence sigue aplicando). Y el cuerpo
ahora puede declararse cansado o intranquilo: los umbrales estaban
calibrados para una escala que el host nunca produce.

**🚫 No hace** — No modela vigilia gradual ni calidad de sueño como
percepción: el `rest` event (la noche misma) siempre se percibe — no
lleva check. Y los eventos sin check (clima nocturno) siguen entrando —
la mente "sabe" que llovió de noche aunque dormía; si eso molesta, el
filtro es por tipo de evento, no por presencia del check.

### C5 · Presión de repetición + rupturas: la rutina pesa

**🔧 Técnica** — Al final de `perceive_events`, `_recurrence_items`
mira el lookback de `perceived_day` (últimos 20 episodios, los vacíos
no cuentan) y calcula rachas consecutivas por tag de contenido (todo
menos `type:*`, items `unnoticed` y el propio canal). Dos emisiones:

- **repetition** — tag con racha ≥ `repetition_min_streak` (3): item
  sintético con valence `-min(cap, growth × (streak - min + 1))`
  (defaults 0.3/0.08 → día 3: -0.08, día 5: -0.24). Pesa sobre el
  episode mood por la media ponderada normal; `synthetic: true` → no
  encoda (el contenido vivido son los días de lluvia, no el pesar).
- **break** — tag cuya racha ≥ min murió hoy: valence
  `+repetition_relief` (0.15), salience alta (0.45), encoda como
  memoria volátil que decae normal — es noticia de un día.

No toda repetición desgasta: `repetition_exempt_tags` (blacklist con
wildcards) separa rutina base de monotonía — `tag:drink:*` (agua todos
los días es vida, no queja) y `tag:form:*` están exentos por default.
La ausencia del exento sigue siendo alarma por otro canal: tomar agua
no pesa, pero `days_without_water` dispara la need `thirst`.

Y los `kind: 'pattern'` salen del retrieval: son bookkeeping de fondo,
su voz es este canal. Bonus: sin evocación ambiental, un patrón cuyo
tema muere decae de verdad (la exención por "evocado hoy" ya no lo
salva del olvido permanente).

**🧠 Cerebro** — La habituación con resentimiento: la lluvia del día 1
es clima, la del día 3 empieza a joder, la del día 5 pesa igual que
una mala noticia chica. El primer día seco se siente — una vez, y
después se diluye. Dos cerebros con `repetition_growth` distinto
tienen paciencia distinta. En el replay real: `road bread` día 3+,
`water from the skin` streak 8 al final, `no Dor Guldur today` el día
que salió de la sombra — y el brain mood quedó -0.18 de desgaste
acumulado, no por un evento sino por *la forma de los días*.

**🚫 No hace** — No entiende *por qué* se rompió la racha: quedarse
sin pan registra el mismo +0.15 de alivio que que pare la llovizna
(el need `hunger` es quien sabe que eso es malo). Tampoco distingue
repetición agradable de tediosa — toda rutina desgasta un poco;
un molde puede anularlo (`repetition_min_streak` alto) pero no hay
tags placenteros-inmunes todavía.

### C6 · Clima severo: el temporal es evento, la llovizna es ambiente

**🔧 Técnica** — `_semantic_tags` ahora es por tiers. Los suaves
(`wet`, `windy`, `freezing`) marcan ambiente; los severos son
**eventos**: `snow` (frío + precip), `deep_cold` (≤ `deep_cold_max`
−10°), `scorching` (≥ `scorching_min` 32°), `storm` (viento ≥
`storm_wind_min` 25 km/h **o** precip ≥ `storm_precip_min` 8.0 —
key nueva porque la precip llega sumada por fase). Y un canal
genérico: `severity.<tag>` en wiring fija un piso de severidad al
evento que porta ese tag — `severity.tag:weather:storm: 0.6` hace que
el temporal pese en `w_severity`, encode firme y mueva arousal, sin
caso especial de clima en el código.

**🧠 Cerebro** — Llovizna cuatro días: ambiente (y presión de
repetición recién al tercero). Vendaval un día: *eso* se recuerda.
La escala "anodino → memorable" deja de depender de que el host mande
severity — la mente la deriva de los umbrales del pack.

**🚫 No hace** — Los tiers son por-muestra agregada de fase, no
rachas de tormenta ("la semana del temporal" es patrón, y ya existe
por `tag:weather:storm`). Y los umbrales son defaults genéricos —
la diferencia entre "ventoso" y "temporal" en una estepa vs un bosque
es contenido de pack.

### C7 · Beliefs con hambre de evidencia

**🔧 Técnica** — Dos frenos en `maybe_reflect`. **Gate de materia
prima**: la reflexión solo ve memorias con `importance ≥
belief_evidence_importance_min` (0.4) **o** `|valence| ≥
belief_evidence_valence_min` (0.2) — si ninguna califica, el LLM ni
se llama (`reason: no_strong_evidence`, el contador avanza igual).
**Cap de nacimiento**: máximo `belief_new_per_reflection` (2) ops
`create` por reflexión — el LLM ordena por peso, el exceso se descarta.

**🧠 Cerebro** — Una creencia es algo *importante*: que te roben dos
veces los Dunledain (importance alta, valence fuerte) puede volverse
"los Dunledain son ladrones"; que llueva tres días ni siquiera llega
al escritorio del reflexivo. Y las convicciones se acumulan de a una —
no se nace con un worldview en una tarde.

**🚫 No hace** — No valida *alcance*: el LLM todavía puede inflar
"orc-track" en "asentamientos orcos" si la evidencia pasó el gate —
eso necesitaría verificar que la afirmación no excede la evidencia
(semántica, no umbral). Tampoco marca efímeras — "the weather today
is mild" ya no nace porque su evidencia no califica, pero una belief
sobre algo verdadero-un-día (ej. "hoy corre peligro este vado") puede
seguir persistiendo como si fuera permanente.

### C8 · Detectabilidad vs peligro: dos facts distintos

**🔧 Técnica** — Host-side en `encounterCheck`: `check.difficulty`
ahora deriva de `FORM_DIFFICULTY` (detectabilidad) — contacto
impuesto (`attacks`/`confronts`: 3) casi gratis; sutil (`sign_only`/
`presence_felt`: 9, `stalks`/`sound_only`: 8) exige tracking de
verdad; `danger` solo rellena cuando la forma es desconocida. Y
`affect.field:danger: -0.1` (wiring) convierte el peligro del bicho
en valencia continua — apilada sobre los tags.

**🧠 Cerebro** — Qué tan fácil es *notar* algo y qué tanto *daño*
puede hacerte son ejes independientes: un lobo mortal que solo deja
una huella puede pasar desapercibido (roll 2 vs diff 9 en el replay —
lo perdió de verdad), mientras el Corpse Candle que le sale al paso
no se puede ignorar pero se *siente* por su danger (−0.65 total).
Además `mods −1.0` apareció en todos los rolls del viaje — la
calibración C4 ya hace que el cansancio/sombra bajen la percepción.

**🚫 No hace** — `FORM_DIFFICULTY` vive en el host (es hecho del
mundo, no del molde) — una forma nueva de encounter cae al fallback
por `danger` hasta mapearla. Y la detectabilidad no conoce contexto:
de día, con niebla, bajo lluvia el mismo `sign_only` cuesta lo mismo
(la sombra y el cansancio sí modulan el roll vía `mods`).

### C9 · Homeostasis: el cuerpo también vota en el ánimo

**🔧 Técnica** — `episode_mood` ahora recibe los needs abiertos
(`needs_pass` corre antes del mood en el open): cada uno pesa
`−urgency × need_affect_scale` (0.3 default), el total del día capado
en `need_affect_cap` (0.4). La presión queda auditada como
`mood.need_pressure` — distingue "día malo" de "cuerpo quejándose".

**🧠 Cerebro** — Un día tranquilo con hambre no se siente tranquilo:
Aranath día 5 pasó de +0.13 a −0.02 solo por el need abierto, y la
huella se mezcla al mood corrido del cerebro. Comer levanta el peso
al próximo open (el detector se resuelve solo); los threads también
pesan — un asunto pendiente es una carga honesta, no un evento.

**🚫 No hace** — La presión es simétrica: no hay needs "buenas" que
levanten el ánimo cuando están satisfechas (comer bien tras ayuno
sigue valiendo lo que el evento meal vale). Y urgencia es lineal —
el hambre del día 1 pesa la mitad que la del día 3, sin umbrales de
desesperación.

### C10 · Una sola boca: todo data→lenguaje vive en el story-engine

**🔧 Técnica** — El host dejó de renderizar texto: `conditionBlock`/
`equipmentBlock`/`endStateBlock` se murieron en ambos contratos
(`open` y `narrate-day`). En su lugar viajan `characterState`,
`equipmentState` y `fate` crudos, y `prompt/sections/state_blocks.py`
los traduce con el NL pack (`condition.*`, `equipage.*`,
`endstate.*` — frases y umbrales admin-editables, fallback a
constantes idénticas cuando no hay pack). En el camino Mind, la
sección CONDITION no se renderiza: el lens ya habla por el cuerpo.
Los builders viejos y su adapter salieron de Game por completo.

**🧠 Cerebro** — La herida ganó su need (`wound`, urgencia por
severidad) — lo que antes era una instrucción suelta al narrador
ahora es una necesidad abierta que pesa en el mood y que la mente
podría algún día decidir atender. Y el pack se volvió de verdad el
único lugar donde el mundo se vuelve palabra.

**🚫 No hace** — `recentNotes` sigue naciendo host-side (son datos
persistidos del log, no render); y en el camino Mind la energía baja
ya no recibe frase propia — la expresa el need `exhaustion` solo si
cruza su umbral, así que un día cansado-pero-no-exhausto queda
implícito en el mood en vez de explícito en prosa.

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
