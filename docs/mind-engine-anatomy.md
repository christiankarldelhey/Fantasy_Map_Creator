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

### C11 · El cuerpo que se recuerda: needs con voz y memoria

**🔧 Técnica** — Las frases de needs ahora viven en tiers:
`mind.need.<key>` (joven) y `mind.need.<key>.deep` (urgencia ≥
`need_deep_urgency`, default 0.6), con varias variantes por tier que
rotan por episodio (`options[idx % len]` — variedad determinística:
un replay dice siempre lo mismo). Y cada need fisiológica abierta se
vuelve un item `type:'need'` en `perceived_day` — reading=la frase,
salience=urgencia, valence=−urgencia — que encoda como memoria
episódica. La voz del need ES el desc del recuerdo.

**🧠 Cerebro** — Hambre día 1: *"the belly has begun to wonder when
the next meal comes"*; día 3+: *"the stomach aches as if it were
gnawing on itself"*. La sombra tiene su propio arco tolkieniano —
`unrest` mild es desasosiego (*"the land seems to dislike being
crossed"*) y `unrest.deep` ya habla en primera persona (*"the
company would move faster alone"*, *"the dark at least is honest;
it is the light that lies"*) — así se mete Sauron, despacio y en
voz propia. Y el sufrimiento queda: "lo mal que la pasó" es un
recuerdo con valence, no solo una necesidad del momento.

**🚫 No hace** — Los items need no entran al mean del mood (la
presión aditiva C9 ya pesa — sería doble conteo) ni alimentan el
canal de rachas (`'hunger again'` sería redundante) ni aparecen en
"stirs" del prompt (el lens ya los lista en Needs). Los threads
siguen siendo intención pura, sin item — su peso es narrativo, no
corporal.

---

### C12 · Rupturas que saben por qué murieron: alivio vs privación

**🔧 Técnica** — Una racha que muere no es intrínsecamente buena
noticia: importa *por qué* murió. `resolve_break_items` corre tras
`needs_pass` (los needs ya están abiertos) y relee cada item
`kind:'break'`: si el tag roto cae bajo `break_need_watch` (prefix →
need key; default `{'tag:food:*': 'hunger'}`) y ese need está abierto,
el item conserva su salience (sigue siendo noticia) pero cambia de
registro — valence a `break_loss_valence` (−0.1) y frase a
`mind.pattern_break_need`. Sin need abierta, el alivio C5 sigue
intacto. El mapa es wiring puro: `tag:drink:*` no figura porque las
bebidas están exentas de racha (rutina base — su ausencia ya la cubre
el need `thirst`, no el canal de ruptura).

**🧠 Cerebro** — *"No a ration of road bread today — the first break
in the stretch"* (+0.15) era la lectura ciega del día que se acabó la
comida. Ahora ese mismo día dice *"no road bread today — the stretch
ended the wrong way"* (−0.1): la ruptura sabe que el mundo le quitó
algo a alguien que ya lo necesitaba. La lluvia que para sigue siendo
alivio; el pan que se acaba, aviso. Y el aviso encoda como recuerdo
volátil con su valence — quedará como dato de "ese día faltó", no
como consuelo.

**🚫 No hace** — No infiere causalidad real: el watch es
declaración humana (prefix → need), no inferencia. Un need cerrado
deja el alivio intacto aunque el tag roto sea `food:*` — si el
cuerpo está saciado, que falte el pan no es amenaza. Y la frase es
del narrador, no del need — el need habla por su propio item.

---

### C13 · Ninguna palabra fuera de casa: la regla C10 hecha completa

**🔧 Técnica** — La auditoría encontró cinco rastros de data→lenguaje
viviendo todavía en el host; todos mudados:

- `buildDayNote` persistía *"a fight with Wolf"* en
  `character_state_log.note`. Ahora persiste `kind:subject`
  (`combat:Wolf`, `tension:X`, `company:X`, `rest_good:Y`, `rest:Y`)
  y `render_note` lo traduce vía `note.<kind>`; notas viejas en
  inglés pasan verbatim.
- `previousDaySummary` viajaba como frase compuesta en Node. El wire
  ahora lleva `previous_day` raw (`{day_number, regions, locations,
  encounters}` — nombres) y `journey.previous_day` + fallbacks la
  componen en el pack.
- Las comidas llevaban prosa codeada (`'a hot meal bought at the
  inn'`, `'water from the skin'`). Ahora viajan slugs canónicos
  (`tavern_meal`, `tavern_ale`, `waterskin`) → `meal.name.<slug>`
  con pass-through para contenido authored (`prose_singular`).
- El fallback de overnight llevaba su propia descripción hardcodeada.
  Ahora envía `scope:'hardcoded_fallback'` + `description:null` y el
  pack la da (`rest.open_sky`).
- `SYSTEM_PROMPT` estaba duplicado en Node y ya había derivado.
  Fuente única en `system_prompt.py`; `/meta/system-prompt` proxea
  `GET /system-prompt`.

**🏗️ Arquitectura** — El censo dejó los tres dominios consistentes:
SQL sobre `trip_days`/`character_state` vive en game
(`tripHistoryReads.js`, `narratorCharacter.js`) y story las consume
por `adapters/gameClient.js`; `toEvents.js` usa el nuevo
`story/adapters/mapClient.js`. Data muerta fuera: la feature
`thoughts` completa (servicio + plomería + `thoughts: null` eterno —
la mente es ahora la interioridad), `phrase_vices.py` sin uso en SE,
y un re-export roto de `loadPreviousDaySummary` que habría tumbado
el boot. `character_thoughts` queda como tabla huérfana documentada
(contenido authored rescatable para seeds).

**🚫 No hace** — El contenido authored en DB (descriptions de
entities/regiones/places, `prose_hint`, `terrain_phrases`,
`prose_singular`, prompts por personaje) sigue siendo humano escrito
— válido — pero no editable por el admin NL: es la frontera conocida
entre "config editable" y "contenido del mundo".

---

### C14 · Horizonte de las creencias: lo que es verdad hoy no lo es siempre

**🔧 Técnica** — `beliefs.horizon`: `enduring` (la naturaleza del mundo,
del otro, de uno mismo — *"los dúnedain son ladrones"*) vs `transient`
(las circunstancias — *"este vado está vigilado estos días"*). El LLM
declara el horizonte al crear; ausente o inválido cae a `enduring`.
Las transientes decaen por episodio cerrado
(`belief_transient_episode_decay: 0.9` — ~5 días y la creencia baja del
piso), y más fuerte aún cuando una reflexión las ignora
(`belief_transient_decay: 0.8` vs 0.95 de las duraderas). Un reinforce
refresca `updated_episode` y detiene el fade mientras la circunstancia
se confirme. Migración 0013: todo lo existente backfillea `enduring`.

**🏗️ Arquitectura** — El tiempo entra al modelo: una belief ya no es
binaria (existe / se debilita) sino que lleva su propia caducidad. El
calendario disuelve circunstancias; solo la reflexión disuelve
convicciones. `beliefs_faded` reporta el close; el admin muestra y
filtra por horizon.

**🚫 No hace** — No expira por fecha real (la vida corre por episodios,
no por calendario). No revive sola una creencia debilitada — vuelve
solo si la evidencia la re-forma o la re-refuerza. Y `invert` hereda el
horizonte del padre: una circunstancia invertida sigue siendo
circunstancia.

---

### C15 · Higiene: la mente no se escucha a sí misma pensar

**🔧 Técnica** — Cuatro fugas encontradas en el primer dump real de un
personaje (Celebrían):

- **Reflexión diaria**: un need a urgencia 1.0 entra a `perceived_day`
  con `salience` 1.0 → superaba `reflection_importance_min` y disparaba
  la única llamada LLM del close *cada día* (~2x costo por día).
  Ahora el trigger de alta salience solo mira items del mundo —
  `need`/`recurrence` son contabilidad de la mente, no noticias.
- **Memoria duplicada por día**: cada need encodaba una fila nueva con
  la misma frase. `encode_episode` ahora fusiona por `need:<key>`: una
  memoria por arco de necesidad, `episode_ids` crecen, urgency/desc se
  refrescan (re-embed si la lectura cruza a tier deep).
- **`no none today`**: tags centinela históricos (`tag:wounded:none`)
  podían encadenar y romper. `_content_tags` descarta `*:none` — la
  ausencia no es tema recurrente.
- **Needs como evidencia**: memorias `need:*` a importance 1.0
  coronaban el top-20 y la reflexión re-escribía la necesidad como
  creencia ("I need shelter"). El pool de evidencia excluye tags
  `need:*` — el cuerpo habla por mood/lens, las creencias hablan del
  mundo.

**🚫 No hace** — No impide que el sufrimiento forme creencias: los
*eventos* que lo causan (el temporal, el robo) siguen siendo evidencia
— lo que sale es el re-decir del need ya modelado. Tampoco silencia la
necesidad: urge igual en el lens y pesa igual en el mood.

---

### C16 · La gente pesa, la contabilidad caduca

**🔧 Técnica** — El segundo dump real mostró la retención *invertida*:
clima y needs nacían consolidadas (inmortales) mientras los encuentros
con personas morían volátiles en ~5 días. Correcciones:

- **Sustancia en el wire**: `toEvents` manda `data.substance`
  (attitude/content/tension/stance desde `dialogue_content`) y
  `data.topic` (tag). El reading del encuentro lo compone el pack
  (`mind.encounter`: `{subject} — {detail}`) — la memoria guarda qué
  pasó, no un sustantivo. Slugs sin `entity_name` se humanizan
  (`large_patrol` → `large patrol`), nunca crudos.
- **`salience_min.<tag>`**: piso genérico de salience para eventos
  *perceived* — `tag:form:*` dice qué tan cerca llegó el contacto,
  `tag:entity_type:*` quién era. Una conversación con un humano ya no
  pesa 0.08 < la llovizna. Configurable por molde (un brain que
  desconfía de la gente puede bajar el canal entero).
- **Despertar por contacto**: `sleep_wake_forms` suma las formas
  interactivas — si el mundo ya resolvió un `brief_exchange`, el
  intercambio ocurrió; la mente no puede "no registrarlo". El check
  igual corre: despertar no es notar automáticamente.
- **El afecto marca retención**: `decay_sticky` (0.95 vs 0.85) para
  memorias con |valence| o importance altas — el espíritu del túmulo
  dura semanas, la liebre días. `consolidate_min_importance` (0.3):
  el pan de cada día se refuerza pero nunca se fija.
- **Nada es inmortal**: `consolidated_decay` (0.98) — lo consolidado
  dura meses, no eternidad. Need resuelta → su memoria vuelve al pool
  volátil y se cierra el capítulo.
- **Limpieza en cada close**: `_compact_duplicates` fusiona filas
  copia (arcs de need pre-C15, descs idénticos) — los cerebros ya
  contaminados se limpian solos. `resolve_from_outcome` corre *antes*
  del pase de memoria para que el release caiga en el mismo close.
- **`retrieval_importance_min`** (0.15): lo que apenas se registró
  nunca es lo que el día evoca. Lens deduplica impresiones idénticas.

**🚫 No hace** — No convierte cada encuentro en eterno: un vistazo
lejano de un elfo sigue pudiendo morir en días si nada lo refuerza.
No toca mecánicas: `substance` es contenido ya resuelto por el host,
el pack solo decide cómo se lee.

---

### C17 · La mente dentro del lens, sin peso muerto

**🔧 Técnica** — El prompt tenía contexto que no narraba: `THE MIND OF`
como bloque aislado que el narrador no sabía integrar, una lista de
frases prohibidas y las primeras oraciones de capítulos previos
ensuciando el contexto. Correcciones:

- **Un solo bloque**: `render_lens` deja de emitir el banner
  `=== THE MIND OF X ===`; el estado interior (mood, beliefs, stirring,
  needs) se funde dentro de `=== NARRATOR'S LENS FOR X ===`, después
  del `system_prompt` — personalidad y estado del día en una sola voz.
- **Stirring fusionado**: las impresiones evocadas y los readings del
  día (salience ≥ 0.3, no-needs) forman UNA lista `Stirring today:` —
  la mente no declara taxonomías, solo lo que la ocupa (tope 7).
- **Labels sin pronombre**: `What they hold true:` / `The body asks
  for:` — sirven para cualquier personaje sin conocer su género.
- **Muere el anti-repetición**: `banned_phrases`/`previous_openings`
  fuera del wire (OpenEpisodeRequest, NarrateDayRequest, toOpenPayload),
  del builder y de Node — `loadBannedPhrases`, `loadPreviousOpenings`,
  `extractRepeatedPhrases` (phraseVices.js) y los loaders de narrativas
  en tripHistoryReads quedan borrados. La variedad de formas de
  encuentro sigue: es mecánica del host (`interactionResolver`), no
  contexto del prompt.
- **Snapshot intacto**: el lens_block sigue guardándose al open —
  re-narrar un episodio viejo reproduce su mente de entonces; los
  episodios pre-C17 conservan su formato viejo, como debe ser.

**🚫 No hace** — No toca las instrucciones de forma (opening strategy,
closing variants, encounter rules) — son reglas de narración, no
contexto histórico. La medición de si la narración usa lo evocado llegó
después — voiced vs evoked se resuelve en C32.

---

### C18 · La personalidad como beliefs seed

**🔧 Técnica** — La personalidad de Celebrian eran 1124 chars de
`system_prompt` que pesaban en cada prompt. Ahora los rasgos viven como
`mold_starter_beliefs` en molds por personaje — la belief se invoca
cuando el día la toca, no como dogma permanente:

- **Molds por personaje**: `celebrian` (5 beliefs) y `aranath` (4) en
  `brain_molds` — clonan el wiring de `default`; lo que las distingue es
  el contenido seed. Las belief tags usan el vocabulario real de
  `perceived_day` (`tag:entity_type:*`, `tag:form:*`).
- **`rank_beliefs`**: para el lens, beliefs se ordenan por
  `confidence × (1 + tag-overlap con el día)` — una belief sobre la
  gente habla en people-days y calla en el páramo vacío; las
  convictions sin tags compiten por confianza pura. `render_lens` ya no
  re-ordena: lee el top del ranking recibido.
- **`brain_profile` por herencia**: `narratorCharacter` resuelve
  `COALESCE(template.slug, c.slug)` — el clon `celebrian-user-7` piensa
  a través del mold `celebrian`. Los INSERT de clonación copian ahora
  `system_prompt` + `introduction_instructions` (antes el clon nacía
  sin lens de personalidad).
- **Prompt comprimido**: `system_prompt` de Celebrian 1124 → 374 chars
  (filtrar la escena por la muerte, sin auto-piedad, sin esperanza,
  habla poco). La migración SQL sincroniza clones desde su template.
- **Backfill**: `scripts/mind_personality_backfill.js` reasigna brains
  existentes a su mold declarado e inserta las seed beliefs que falten
  (idempotente, por statement). Los brains de los clones dev quedaron
  en su mold con 5/4 beliefs; los templates se provisionan solos en su
  primer episodio.

**🚫 No hace** — No acorta la `description` (231 chars, ya era
concisa). No propaga nuevas starter beliefs a brains viejos
automáticamente — el backfill es el camino (rerunable). No escribe
beliefs desde `character_thoughts`: los thoughts alimentaron las
statements como material, la tabla sigue siendo del dominio game.

---

### C19 · Regenerar: una persona nueva, no un cuerpo arreglado

**🔧 Técnica** — El botón de regenerar (antes solo al morir) está
disponible siempre. Al usarse, el personaje renace completo: el juego
restaura cuerpo/kit (`POST /api/character/:id/reset`) y la mente olvida
todo lo vivido:

- **`POST /mind/brains/{character_id}/reset`**: borra memories
  (volátiles, consolidadas, patrones), beliefs (todas, incluidas las
  seed viejas), needs y episodes del `(game_id, character_id)`; mood →
  `NEUTRAL_MOOD`, counters → `{}`. Después re-siembra las starter
  beliefs del mold vía `seed_starter_beliefs` (el mismo helper que
  provisiona el brain nuevo). Sobrevive la *naturaleza*: fila `brains`,
  `mold_slug`, `theme_weights`, `wiring` — una persona sin pasado, no
  otra persona.
- **Idempotente y seguro**: todas las beliefs mueren antes de
  re-sembrar → repetir el reset no duplica seeds. Sin brain → respuesta
  de ceros, nunca 404.
- **Degradación**: Node llama el reset dentro de un `try/catch` — si
  Story Engine está caído, el personaje se regenera igual
  (`mind_reset: false` en la respuesta) y solo queda un warning. La
  mente nunca bloquea el juego.
- **UX**: personaje muerto → revive directo. Personaje vivo → confirm
  de dos pasos ("erase all memories?") porque el wipe es destructivo.

**🚫 No hace** — No preserva recuerdos "importantes": regenerar es
nacer de nuevo, no amnesia selectiva. No toca las starter beliefs del
mold en sí (son config humana). No hace el wipe transaccional con el
reset mecánico — son dos dominios: si la mente falla, el juego sigue y
el brain viejo sobrevive hasta el próximo reset.

---

### C20 · Evocar es tocar el día; el pasado se lee como pasado

**🔧 Técnica** — El lens listaba recuerdos de ayer sin decir que eran
ayer: "Stirring today" mostraba cuatro encuentros del capítulo anterior
en un día con `(no encounters)` — invitación a que el narrador los
re-narre como presentes. Dos cambios:

- **Contact gate** (`retrieve`): un recuerdo evoca solo si *toca* el
  día — comparte un tag de **contenido** con los items PERCIBIDOS de
  hoy, o su coseno semántico supera `retrieval_semantic_min` (0.3 —
  embedder hash: pares sin relación ~0.2, similitud real ~0.35+). La
  recencia ya no basta: ayer dejó de entrar gratis solo por estar
  fresco. Los tags de beliefs siguen ablandando el *score* pero no
  hacen contacto — una creencia sobre la gente no evoca gente en un
  día sin gente. Si nada toca, no se evoca nada.
- **Tags ambientales no hacen contacto**: `type:*`, `tag:weather:*`,
  `tag:food:*`, `tag:drink:*` y `region:*` son ambiente, no historia —
  sin la exclusión, la misma lluvia "evoca" cada lluvia pasada y el pan
  supera a los wargs (la repetición de clima ya la posee el canal de
  recurrence). Y una memoria cuyos tags son *todos* ambientales
  directamente no evoca nunca — ni siquiera por la puerta semántica
  (una desc idéntica al día es *sameness*, no resonancia). Las
  memorias sin tags conservan la puerta semántica (B8).
- **`_describe` → `None` mata las memorias degeneradas**: items
  `body`/`travel` resuelven `reading=None` por diseño (los vitales
  hablan por needs/mood), pero `encode_episode` les escribía memoria
  igual — caían al fallback `a {type}` → "a body", "a travel",
  "distance_km: 10.0" (consolidada!). Sin palabras no hay impresión:
  el item se saltea. La migración `fix_carnivore_wolf_leak_c20.sql`
  borró 722 filas degeneradas.
- **Edad dinámica** (`render_lens`): cada recuerdo evocado lleva su
  marca temporal — `Yesterday — …`, `5 days ago — …`, `A long while
  ago — …` (≥14), anclado en `created_episode` (cuándo se vivió, no la
  última vez que se pensó). El dedupe clavea por desc crudo: el pan
  recordado y el pan comido hoy son una sola línea, con su edad.
- **Data fix host**: 3 filas de `npc_interactions` scopeadas a
  `carnivores` (entity_id NULL) decían "Wolf-prints"/"a wolf" → los
  zorros recibían contenido de lobos. Neutralizadas ("predator
  prints") + copias entity-scoped a `wolves` conservan la voz de
  lobo donde corresponde.

**🚫 No hace** — No saca las líneas de `recurrence` ("no humans
today", "family again"): son readings sintetizados del día propio, no
recuerdos. No reordena la lista (evocadas primero, readings después) —
el prefijo ya hace la distinción. No cambia el scoring: el gate corre
antes, el score decide cuáles de las que tocaron pasan el umbral.

---

### C25 · La lámpara a las 20:30: el encuentro que se puede aceptar

**🔧 Técnica** — El bug de Aranath: un `harvest_shelter` a las 10:00
prometía "fuego real, cama seca" con stance "Accepts the hospitality" —
la mente lo guardó como noche vivida mientras el cuerpo seguía
`days_without_food: 4`. La prosa escribía un check-in que la mecánica
nunca firmó. Dos correcciones:

- **Stance honesto en marcha**: las 4 filas `harvest_shelter` dejan de
  afirmar la estadía — la oferta queda real (la lámpara, el granero
  seco, la fuente limpia) y el stance dice lo que pasa en una marcha:
  evaluar, parar un rato, marcar el lugar, seguir. Migración
  `fix_harvest_shelter_stance_c25.sql`.
- **La oferta se vuelve decisión al anochecer**: `before_sleep` (~20:30)
  ahora admite `sites`/`resources` — el viajero busca dónde dormir
  justo ahí (`entityEligibleForNightTiming`). Cuando una fila
  `npc_interactions` trae `options` (nueva columna JSONB) y el encuentro
  es before_sleep, el wire emite `data.decision` (B5, dormido desde el
  principio): la mente puntúa las opciones con sus needs/beliefs/temas
  (`_recommend` ya era determinista: `need:exhaustion` urgente empuja
  "stay"; un cerebro parco empuja "walk on"), expone `recommended` en
  `decision_point`, y el host decide.
- **El host aplica, la mente no ejecuta**: `POST /decide` devuelve
  `proposed_commands`; el comando `overnight_shelter` reescribe
  `day.overnight_*` (`applyShelterChoice`) y `resolveDayState` vuelve a
  correr con `shelter_choice` → `resolveShelterLodging` decide si hubo
  moneda paga (recovery de posada + comida de mesa) o techo de cortesía
  (rest_quality authored). El orden del route se movió: la
  persistencia (applyDayState/inventory/provision/halted) ahora corre
  DESPUÉS de narrate, sobre la resolución final.
- **La memoria se reescribe con la elección**: al `/decide`, la mente
  parcha `perceived_day` — el item del encuentro recibe el `stance` de
  la opción elegida ("Takes the bed. Eats what the pot offers.") y el
  item `rest` recibe el lugar real — y re-resuelve ambos readings; el
  `narrator_payload` se parcha igual para que la prosa narre la noche
  que pasó, no la que estaba planeada.
- **Fallback**: sin recomendación (o si decide falla) el host toma la
  opción sin commands — caminar. NPCs: el host autopica `recommended`.
  Lector futuro: mismo riel, el `POST /decide` lo dispara su dedo.

**🚫 No hace** — No toca `aid_or_trade` (~60 filas con la misma
enfermedad: "Eats. Goes out at dawn") — el mecanismo ya las cubre cuando
les autoricemos `options`. No hace que la mente desconfíe del juego:
la mentira se arregló en el wire, no con escepticismo. No inventa
opciones: las que la fila no autora no existen — `options` vacía =
vistazo honesto. La memoria vieja (el wayhouse fantasma del día 7 de
Aranath) quedó limpia — `reset` (C19) ejecutado post-C30: 13 memorias,
6 beliefs, 3 needs y 9 episodios borrados; las 4 starter beliefs del
mold `aranath` re-seedeadas y el mood vuelto a neutro.

---

### C26 · La prosa tiene dueño: `entity_ids` y el carril genérico

**🔧 Técnica** — El bug del capítulo 1: las filas "genéricas" de
`npc_interactions` (`entity_id IS NULL`) matcheaban por `entity_type`
pelado — una fila escrita para las Águilas caía sobre los patos
(Waterfowl), y la del cobertizo de piedra caía sobre Fisheries, Apiaries
y Sheep Pastures por igual. Tres memorias idénticas de "the beam left
notched" por tres entidades distintas. La corrección es de datos:

- **`entity_ids uuid[]`** (migración `npc_interactions_entity_ids_c26.sql`):
  whitelist explícita — la fila describe solo a esas entidades. El lookup
  por entidad acepta `entity_id = X OR entity_ids @> X` e ignora
  `entity_type` (la fila del jabalí vive bajo `herbivores` y sirve a
  `Boars` en `other_animals`). Los lookups por `entity_type` y `topic`
  exigen `entity_id IS NULL AND entity_ids IS NULL` — la prosa concreta
  ya no puede filtrarse a un tipo.
- **Auditoría + cobertura**: 26 filas específicas disfrazadas recibieron
  whitelist (águilas, halcones, ciervos, ruinas, asentamientos); 10 filas
  genéricas nuevas (banda `low`, cubren todo por relajación) describen la
  FORMA del contacto sin inventar el sujeto — la entidad pone el nombre.
- **Regla authored**: una fila genérica nunca nombra un animal, lugar u
  objeto concreto; si lo nombra, lleva whitelist. Script de verificación:
  `backend/scripts/c26_verify.mjs`.

---

### C27 · El mundo da lo que el texto dice: `commands`

**🔧 Técnica** — La hermana gratuita del riel de decisiones: las filas
`aid_or_trade` decían "Eats. Goes out at dawn", "Takes the provisions",
"Takes the healing" — y la mecánica nunca lo ejecutó. Celebrian
acumuló memorias de "hot water and new bread" mientras moría de hambre.
C25 introdujo `options` (elección → decisión); C27 introduce `commands`
(columna JSONB): efectos **incondicionales** que el encuentro aplica sin
preguntar — un don no necesita decisión.

- **Vocabulario**: `meal` (comida provista en slot, con nombre authored
  — "the farm wife's soup" entra a memoria tal cual), `water_refill`,
  `item` (slug+qty al inventario: flechas, raciones), `coins` (delta
  firmado — un regalo puede pagar la cama de la noche), `heal` (baja
  `wounded` un tier).
- **Flujo**: `resolveEncounter` trae `dialogue_content.commands`
  gratis (SELECT *); `generateDay` los colecciona en `day.commands`
  saltando encuentros con `decision` (la opción elegida gobierna ahí);
  `resolveDayState` los consume ANTES de computar comidas/agua/lodging —
  un `coins` regalado puede pagar el lodging de esa misma noche;
  `applyInventoryChanges` persiste los `grants` como filas reales.
- **Stances honestos**: las filas que reclamaban dormir en encuentro
  diurno ("Sleeps in the outbuilding. Leaves early.") fueron
  reescritas al alcance del día — el techo de la noche solo existe en
  `before_sleep`. Migración `npc_interactions_commands_c27.sql` (18 filas
  con commands, 10 stances corregidos).

**🚫 No hace** — No convierte las ofertas con costo en automáticas:
"pays the asked price", "trades the salt" siguen siendo clase 2 — para
ellas hay que autorar `options` con la opción pagada y la opción gratis.
No crea mecánica de siesta diurna ni de monturas: el stance del caballo
elfico fue reescrito a "lo que lleven para el camino". Y no le quita la
voz a la mente: el cerebro sigue registrando el encuentro con su
actitud — aceptar la sopa no es decisión, es el mundo siendo generoso.

---

### C28 · Lo que tocó la mecánica pesa más: `tag:given` / `tag:decision` / `tag:changed`

**🔧 Técnica** — Si el mundo te tocó de verdad, lo recordás más: una sopa
que cerró el hambre no puede pesar lo mismo que una bandada que pasó. El
host declara el hecho en `data.tags` (weight-space); la mente lo convierte
en salience por los pisos `salience_min.tag:*` — todo tunable por brain
(un degradado puede tener el canal en 0 y que el don le resbale).

- **El host marca** (`toEvents`): encuentro con `dialogue_content.commands`
  → `given`; encuentro con `decision` → `decision`; outcome
  `wounded`/`badly wounded` → `changed`; comida `provided` → `given`.
- **La mente pesa**: `salience_min.tag:given: 0.6`,
  `salience_min.tag:decision: 0.5`, `salience_min.tag:changed: 0.65` —
  escalonados para que la oferta rechazada registre menos que la cama
  tomada. `affect.tag:given: +0.25` — un don no pedido se siente como
  bondad. Los tres tags van en `repetition_exempt_tags`: son meta-signal,
  no contenido — un día sin regalo es ordinario, no un "no given today".
- **El decide marca lo que aplicó** (`_mark_changed`): cuando la opción
  elegida trae `commands`, los items que tocó (el encuentro, el `rest`
  reescrito por shelter) ganan `tag:changed` y suben a su piso — la
  memoria que se consolida es de la noche que ocurrió, no de la oferta.
  Elegir `move_on` (commands vacíos) no marca nada: la oferta sigue
  siendo recuerdo, pero nunca miente que el cuerpo cambió.

**🚫 No hace** — No convierte en importante toda interacción: una fila sin
commands ni decisión sigue pesando por su `form`/`entity_type` como
siempre. Y no confunde el marcador con el efecto: `tag:changed` lo pone
la aplicación real (host o /decide), no la presencia de comandos en el
texto — una fila authored con commands que nunca llegó al día no levanta
el recuerdo.

---

### C29 · La mente lleva su propio reloj: `episodes.episode_idx`

**🔧 Técnica** — Bug #3 del capítulo 1: la edad de las memorias se anclaba
en `when.episode` — el `day_number` del viaje, que **reinicia cada viaje**.
El día 2 de un viaje nuevo colisionaba con las memorias del día 2 del
viaje anterior: `delta = 0` → recency 1.0 → una memoria de hace semanas
evocaba como si fuera de hoy, sin el prefijo "Yesterday —", y la ventana
refractory (`last_evoked_episode`) calculaba distancias falsas.

- **`episode_idx integer`** en `mind.episodes`: contador monotónico por
  cerebro, asignado en open como `max(prev) + 1`. Migración
  `episodes_brain_clock_c29.sql` con backfill por `created_at` — el orden
  en que se vivieron, no el número de día del viaje.
- `episode_index()`/`episode_index_of()` leen `episode_idx` primero;
  `when.episode` queda solo como fallback para filas legacy. Todos los
  anclajes heredan el reloj nuevo sin tocar nada más: `created_episode`,
  `last_evoked_episode`, `opened_episode`/`due_episode` de needs,
  `formed_episode`/`updated_episode` de beliefs, la ventana de patrones
  en `detect_patterns`, el decay `_exempt_this_episode`, y el age-phrase
  del lens ("Yesterday —", "N days ago —").
- `GET /episodes/{id}` expone `episode_idx` para auditoría.
- Semántica honesta: si el personaje no vivió episodios entre viajes, el
  primer día del viaje nuevo ES "ayer" respecto del último del viejo —
  la mente solo mide lo que vivió.

---

### C30 · El reloj del mundo: `users.world_date` + la mente envejece por fecha

**🔧 Técnica** — El reloj de episodios (C29) arregla la mecánica pero no
la narrativa: un personaje que descansó un mes en Bree entre viajes veía
sus memorias del último día jugado como "Yesterday —" — el descanso era
invisible porque la mente solo medía episodios vividos. La fuente de
verdad del tiempo es la **fecha del mundo**, una por jugador.

- **`users.world_date date`** (default `1950-06-21`, ancla del dataset
  climático): la fecha en la que "está" el jugador. Migración
  `world_clock_c30.sql` con backfill desde el `MAX(trip_days.date)` de
  los viajes del user (vía `character_state.owner_user_id`).
- **`trips.js`**: `POST /trips` usa `world_date` como `start_date`
  default (un `start_date` explícito sigue ganando); al persistir cada
  `trip_day`, `world_date = GREATEST(world_date, day.date)` — el reloj
  nunca retrocede ante un replay o un día fuera de orden.
- **Clima**: el dataset cubre solo 1950; `stamp1950()` mapea month+day
  de cualquier año in-world al 1950 equivalente, con Feb 29 → Feb 28.
- **La mente**: `episodes.episode_date` + `memories.created_date` +
  `memories.last_evoked_date` (backfill desde `when.date` de los
  eventos). `memory_age_days()` devuelve distancia de calendario; el
  recency de retrieval, los age-phrases del lens y el recap "Yesterday —
  as they remember it" se calculan en días in-world. `episode_idx` queda
  para la mecánica: refractory, dedup, patrones, needs, beliefs.
- Fallback honesto: episodio o memoria sin fecha → reloj de episodios;
  el recap resuelve memorias legacy (sin `created_date`) a través del
  `episode_date` del episodio que las codificó.
- Semántica emergente: el tiempo que pasa **sin jugar** también envejece
  la mente — un mes de descanso entre viajes lee "A long while ago".

---

### C31 · La oferta se vuelve decisión: `aid_or_trade` en el riel B5

**🔧 Técnica** — La misma enfermedad de `harvest_shelter` (C25), a escala:
~40 filas `aid_or_trade` ofrecían un lugar para dormir (byre-loft, flet,
fuego compartido, litera de redes) y el stance ya había decidido que el
viajero lo tomaba — sin mecánica que lo firmara. C27 curó la parte de día
(stance honesto + regalos incondicionales); C31 cierra la parte de noche:

- **39 filas con `options`**: toda oferta que incluye dónde dormir es una
  decisión en `before_sleep`. `stay` lleva el `overnight_shelter` (único
  comando que el riel decide aplica); `move_on` va sin commands y es el
  fallback cuando la mente no opina. Stances base reescritos a alcance de
  día (hablar, trocar, marcar el lugar, seguir) — el `move_on` hereda la
  base salvo cuando ésta afirma algo que al anochecer no ocurrió (entonces
  lleva stance propio).
- **Las trampas invierten la forma** (`0ca10009`, `0ca10010`): la carnada
  lleva los commands — descanso real (`rest_quality: 4`) con
  `shadow_effect` positivo — y el rechazo es la opción vacía: la
  precaución de la mente es el default seguro. `0a1e0022` hace lo
  contrario: quedarse de guardia es lo audaz (`risk:bold` en `stay`,
  `risk:cautious` en `move_on`).
- **37 filas con `commands`** (sin decisión): las afirmaciones de comida,
  agua, equipo y moneda que quedaban sin firma — meals, water_refills,
  raciones, flechas, lembas, heals, coins negativos para compras
  ("Pays a little over" cobra de verdad).
- **`meal.name.shared_pot` existía solo en C25**: el slug se usó antes de
  sembrarse en el pack — las lecturas de memoria decían literalmente
  "shared_pot". Añadido al pack, a `nl_defaults` y a `_MEAL_NAME_FALLBACK`
  (la regla C13: nunca un slug en prosa).
- Migración `aid_or_trade_options_c31.sql` + patch `c31_csv_patch.mjs`
  (una sola fuente: el script emite el SQL con `--sql`). Verificación
  `c31_verify.mjs`: 73 entidades resolvieron decisión al anochecer, 0
  decisiones fuera de `before_sleep`, los shelters elegidos resuelven
  pago/techo/comida en `resolveDayState`.

**🚫 No hace** — No toca el scoring `_recommend` (sigue siendo tema +
belief + need urgencia). No decide rutas: `0ca10003` (turn back or no
help) queda sin options porque su elección no tiene commands que el mundo
pueda firmar — el stance ya admite la elección. No mete precios en la
moneda exacta: `lodging_cost` es authored por fila (2 coppers ≠ posada de
5). Los items sin slug (soga gris, torches, piel de foca) quedan como
prosa — sin mecánica que los reciba.

---

### C32 · Voiced vs evoked: la tasa de sangrado del lens, medida

**🔧 Técnica** — La deuda declarada de C17: la mente evoca memorias en el
lens, el narrador puede usarlas o ignorarlas, y nada observaba la
diferencia. Cada narrate ahora mide qué memorias evocadas resonaron en la
prosa generada — la misma regla de eco por token que el eval
`lens_reference` (`memory_echoes_in_text`, extraída como helper
compartido) — y lo persiste:

- **`episodes.lens_eval`**: `{evoked: [...], voiced: [...]}` — los ids
  evocados son el snapshot fijo del open; los voiced son la observación
  de la última generación (se re-mide en cada narrate, coherente con
  "la narración no es estado de la mente").
- **`memories.voiced` + `last_voiced_episode`**: contador de episodios
  cuya prosa hizo eco de la memoria — a lo sumo un incremento por
  episodio, así re-narrar no infla la métrica. `evocations` vs `voiced`
  es el feedback real del knob de retrieval: una memoria que la prosa
  nunca vuelve voz es ruido de evocación, no señal.
- **Superficie**: `lens_eval` viaja en `GET /episodes/{id}` y en la
  respuesta de `/narrate`; el Mind Tuner muestra `voiced` junto a
  `evoc` por memoria y `n/m voiced` por episodio.

**🚫 No hace** — No cambia qué se evoca ni qué se narra: mide, no decide.
Un narrate sin texto (provider caído) deja `voiced: []` sin tocar
contadores. Migración: `memory_voiced_c32.sql`.

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
