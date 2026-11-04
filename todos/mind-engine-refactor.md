# Mind Engine — sesión de simplificación (notas)

Notas vivas de la conversación de diseño. Nada de código todavía: primero
entender adónde vamos. Insumo: el recap del otro LLM (Decision Engine, Higher
Self, Learning, etc.), que se discute entero pero se construye por partes.

Leyenda: ✅ acordado · ❓ abierto · 🅿️ parqueado (se habla, se construye después)

## Acuerdos

### 1. Alcance ✅
- **Construimos C**: una mente que *vive y cuenta* (el mundo decide qué pasa; la
  mente decide cómo se vivió), diseñada para que *actuar* (Decision Engine,
  Higher Self, Learning, Expertise…) pueda sumarse después como capa encima, sin
  mezclarse adentro.
- En la sesión se habla de todo, incluido lo de "actuar", para salir con el mapa
  completo. Solo se marca qué se construye ahora y qué después.
- Criterio guía: ante la duda, simplificar.

### 2. Los tres cajones de una mente ✅
Toda la mente se ordena en tres preguntas. Lo que no entra en ninguna, sobra o
es otra cosa.

| Cajón | Pregunta | Qué entra (hoy) |
|---|---|---|
| Quién soy | ¿Cómo soy y qué tengo por cierto? Cambia poco. | Foundational phrase, Beliefs (incl. Attitudes, Impressions), Traits, Concerns |
| Cómo estoy | ¿Cómo llego a este momento? Cambia día a día. | Mood, Needs (incl. Threads) |
| Qué viví | ¿Qué me pasó y qué me quedó? | Memories, Forgotten, patrones |

- **El cuerpo no es un cajón de la mente**: los números (energía, días sin
  comer, sombra) son del host, llegan como Condition de solo lectura (ADR 0001).
  La mente guarda la *vivencia* ("tengo hambre" = Need), no el número.
- Capabilities (skills, expertise) no entra en ninguno: 🅿️ es parte de "actuar".

### 3. Nombres de los cajones ✅
**Identity** (quién soy) · **State** (cómo estoy) · **Past** (qué viví).
"Memory" queda para *un* recuerdo suelto, como ya define el glosario; por eso el
cajón no se llama Memory.

### Hoy: cómo pasa algo de Past a Identity (relevado del código)
- **Reflection** (LLM, cada N días o tras algo muy fuerte): crea / refuerza /
  contradice / invierte Beliefs; siempre cita recuerdos reales como evidencia.
- **Empujoncito de Attitude** (reglas, en cada cierre): un encuentro mueve un
  poco la postura hacia ese tipo de ser; puede gastarla pero no darla vuelta.
- **Heard → lived**: una creencia escuchada se vuelve vivida al conocer su tema.
- Además: Past → Past (repetición = **patrón**) e Identity que se apaga sola
  (creencia no reforzada se debilita).

### 4. Past se olvida; Identity solo cambia con evidencia ✅
- **Past** se apaga con el tiempo (un recuerdo de lluvia de ayer se olvida).
- **Identity no se apaga sola**: una creencia solo se debilita cuando algo
  vivido la contradice.
- Dos velocidades, las dos movidas por evidencia, nunca por el tiempo:
  - **empujoncito** (cada cierre, reglas, sin LLM): refuerza o gasta un poco
    una creencia existente; no crea ni da vuelta.
  - **Reflection** (ocasional, LLM, con recuerdos como prueba): única que crea,
    da vuelta o reescribe.

### 5. Adiós a las creencias "pasajeras" ✅
- Lo atado a "estos días" ("el vado está crecido") es un **recuerdo** (Past),
  no una creencia. Se elimina el concepto horizon transient/enduring.
- Una experiencia puede *empezar* una creencia, pero **débil** (ej. 2/5). Se
  endurece con experiencias que la confirman. **Cuanto más fuerte, más cuesta
  moverla**: a 5/5 ya es casi un modo de vida.

### Hoy: qué son los "thoughts" cargados (relevado del código)
- ~190 líneas autorales entre Celebrian y Aranath, guardadas como
  Beliefs con confianza fija 0.6, disparadas por tipo de situación: contacto
  amable, soledad, después de peligro, animales/naturaleza, huecos (orcos…).
- La mayoría no afirma algo verificable sobre el mundo: son la **voz interior**
  del personaje ("Night knows me better than any face I have ever loved").
- Unas pocas sí son creencias de verdad con tema y postura (Attitudes).

### 6. Los thoughts son voz interior, no creencias ✅
- Concepto nuevo y aparte dentro de **Identity**: frases autorales de cómo
  suena el personaje por dentro en cada tipo de momento. Aportan *flavor* a la
  narración y no mucho más.
- No tienen fuerza, no se refuerzan ni se debilitan, Reflection no las toca.
- Las que sí afirman algo del mundo con tema y postura (Attitudes) siguen
  siendo Beliefs.
- ❓ Nombre pendiente (propuesta: **Musing**).

### 7. Value es un tipo de Belief ✅
- Una creencia sobre **qué importa o qué está bien** ("no se abandona a un
  compañero"), a diferencia de las que hablan de cómo es el mundo ("los ríos son
  traicioneros").
- Misma mecánica que cualquier Belief (fuerza 1–5, solo evidencia la mueve,
  cuanto más fuerte más cuesta). Lo que la mueve no es un hecho del mundo sino
  **actuar a favor o en contra de ella** (o verla puesta a prueba).
- Hoy (vive y cuenta): el Lens la usa cuando el día la pone en juego. Mañana
  (🅿️ actuar): es lo que entra en conflicto con la preferencia natural.

### 8. Forma de una Belief ✅
**Belief = frase + fuerza (1–5) + tipo (mundo / yo / otros / valor).**
Si trata de algo concreto, suma **Subject** (de qué), **Stance** (si lo quiere
o lo detesta) y **Source** (vivido / escuchado; "leyenda" = escuchado viejo).

Eliminados: **Pull**, **Habit** (se guardaban y nadie los leía) y **Latent
belief** (existía solo en el glosario: hoy es simplemente una creencia a 1/5).
Attitude e Impression quedan como **apodos** para hablar, sin reglas propias:
Attitude = creencia con tema un tipo de ser; Impression = tema un lugar.

Regla: ningún concepto nuevo entra a la mente sin mecanismo que lo haga actuar
(el error de Pull/Habit/Latent).

### 9. Catálogo de Traits ✅
Un Trait es un dial de *quién es* la mente; ninguno es mecánico de "capacidad".
Hay dos tandas:

**De vivir el día (hoy):** Piel (cuánto me afecta), Rumia (cuánto pesa el
pasado), Atención (cuánto noto), Convicción (cuánto me cuesta soltar lo que
creo), Curiosidad (cuánto me atrae lo nuevo).
- Se recortan Memoria (el olvido pasa a tuning interno) y Costumbre (la rutina
  ya la miden Piel y Rumia).

**De actuar (dormidos hasta 🅿️ Decision):** Impulso (absorbe Discipline,
impulse control, "moody": me caliento y actúo ya ↔ me aguanto), Deliberación
(absorbe flexibilidad/metacognición/persistencia: impulso primero ↔ bien
mayor primero), Integridad, Coraje y la susceptibilidad a la corrupción
(nombre ❓: *corruptibility / susceptibility*).

**Descartados:** Esperanza (pesimista↔optimista: complejiza sin aportar),
Sociabilidad (la calidez la dan Attitudes y Musings), Morality como dial
(es un Value = Belief, no Trait).

### Corrupción: State vs Trait ✅ (distinción)
- **Corruption = State** (cuán corrupto está AHORA, 0 = nada, sube y baja).
  Hoy existe en el juego como el contador `shadow` del cuerpo/Condition —
  el "altered state" que ya tuerce percepción. Falta decidir si lo vive
  también como contenido mental (una Need "relief from shadow" ya existe).
- **Susceptibilidad = Trait** (su propensión a corromperse, estable).

### Regla de los diales dormidos ✅
Un dial de actuar se muestra en el Studio desde el día uno pero queda dormido
hasta que exista su mecanismo. Si una era pasa y nada lo despierta, se revisa
y quizá se borra (anti-Pull/Habit).

### 10. State: sin objeto "Emotion" aparte ✅
- State = **Mood** (ánimo de entrada, siempre con causa) + **Needs** (lo que
  falta, incl. Threads) + **Corruption** (el `shadow` de la Condition, hoy).
- **La "emoción" ya existe como dato**: es la `valence` que cada cosa
  percibida ya lleva hoy (cada evento del día y cada línea del Lens ya sale
  con su valencia calculada: la del host o la que la mente le asigna, más el
  empuje de las Actitudes). No hay que crear objetos Emotion: la carga ya
  está puesta en lo percibido.
- Cuando llegue 🅿️ Decision, cada opción se evalúa contra esa valencia (de
  lo que percibe, de lo que recuerda, de sus Actitudes), no contra un objeto
  "miedo". Miedo, ira, alegría salen del *qué* y la *valencia*, nunca de una
  etiqueta.

### 11. Needs = Lack + Thread ✅
Solo dos tipos; el criterio es *cómo nace y cómo cierra*, no qué es:

- **Lack** (carencia): nace del estado del cuerpo/ánimo y se cierra cuando el
  estado se resuelve (hambre, frío, alivio del shadow, cansancio).
- **Thread** (lazo): nace de un evento y se cierra cuando el mundo lo resuelve
  o el outcome lo dice (promesa, encuentro inconcluso, meta de cualquier
  horizonte — también la meta elegida que despierta al llegar a un lugar).

Detectors y reglas compuestas (rachas multi-día) quedan como *formas de abrir
un Lack* — configuración, no tipos de cosa. Del recap: Desire ≈ Thread suave;
Goal/Intention quedan dentro de Thread / 🅿️ actuar. La need "de ritual"
(Habit, pipa) ya quedó fuera con Q8.

### 12b. Input: el mundo llega en prosa + tags ✅ (decisión de arquitectura)
- El módulo `natural_language` (bands, thresholds, phrases, facets) **sale
  del Mind Engine** → pasa al host/connector. Saber que -7° es "frío que
  pela" es conocimiento DEL MUNDO, no de la mente. El Mind Engine queda
  agnóstico: recibe lenguaje natural + tags, nunca números de mundo.
- **Mundo externo** (clima, lugares, seres): llega 100% como prosa + tags.
- **Cuerpo propio**: la Condition sigue trayendo números crudos (energy,
  shadow…) porque "cuánto me pesa" ES el trabajo de la mente — dos mentes
  sienten el mismo frío pero lo aguantan distinto (Piel, wiring de
  Detectors). Futuro: resistencias por personaje = aguanta mejor, pero el
  frío se siente igual.
- Consecuencias: se borra un módulo entero + su edición en Studio (bloque
  World voice); el narrador stateless también se simplifica (recibe prosa
  lista); los Detectors leen solo campos del cuerpo o tags.
- **Accents**: pendiente qué pasa con las excepciones de voz del personaje
  (¿se funden con Musings/voz interior?).
- 📝 Candidato a ADR cuando se implemente (cambia el contrato de entrada).

### 13. Past: modelo de olvido ✅ (se queda como está)
- Decae en cada cierre; muere bajo umbral → pasa a Forgotten (traza).
- `consolidated` se mantiene: nace fijo si importance altísima (trauma,
  momento fundacional) o se fija por re-evocación. Justificación: un trauma
  que nunca se evoca debe seguir pesando; sin flag se olvidaría.
- importance = cuánto importó entonces; strength = qué tan viva está ahora.
  Los dos números se quedan.
- Lo único a revisar en implementación: números (umbrales, evocations_to_fix),
  no conceptos.

### 14. Universal Tagger ✅ — tag = sustantivo universal
- **Vocabulario cerrado, declarado por el host** (como skills y Condition):
  cero tags en el motor; cada mundo declara el suyo. Agregar un tag es
  authoring del mundo. La mente **nunca acuña** tags.
- **Jerárquicos**: `familia:tipo:específico` (`being:horse:mordor`,
  `food:*`, `weather:storm`). El match más específico habla — ya es la
  regla del Subject en el glosario.
- **Unificación**: el `subject` de una Belief pasa a ser "el tag del que
  trata" → Attitudes/Impressions ya no se limitan a ser/lugar ("las
  tormentas siempre me encuentran" = creencia sobre tag `storm`).
- **Tags = sustantivos; la mente adjetiva**: valencia, Stance, creencias,
  needs y opciones se pesan POR tag. Toda la maquinaria agarra por el
  mismo handle: evocación por asociación, patterns, needs vigiladas,
  musings por contexto, opciones de decisión.

**Los tres cajones quedan cerrados** (Identity, State, Past + Tagger).

### 12. Corruption: la mente la *vive* ✅ (opción B)
El número es del host (State). La mente además **cree cosas sobre ella**:
Reflection puede crear/reforzar Beliefs sobre uno mismo a partir de la
evidencia ("estoy cambiando", "esto me está ganando") — mismo mecanismo que
para cualquier otra vivencia, cero sistemas nuevos. No hay efecto propio
extra: lo que la sombra le hace pensar se expresa por las vías normales
(Beliefs, Musings, Lens, Needs).

## 🅿️ Decision (discusión, sin implementar)

Modelo del recap, revisado y acordado en lo esencial:

- **Generar no es elegir.** Dos etapas: pool de opciones → ranking.
  La personalidad **nunca elimina** opciones del pool: un pacífico puede
  atacar si la situación lo lleva; solo necesita razones más fuertes y vive
  más conflicto interno. La personalidad pesa, no veta. (El mundo sí puede
  declarar imposible una acción — una pierna rota no es personalidad.)
- **Los 4 bloques** que alimentan la decisión mapean directo a nuestro
  modelo: State = State, Identity = Identity, Context = lo percibido del
  episodio (con su valencia, Q12), Capabilities = del host. Past actúa
  transversal: memorias evocadas sugieren respuestas ya vividas/vistas.
- **Atractivo de cada opción** = lo que ya tenemos: valencia (emociones),
  Lacks/Threads (necesidades), Beliefs/Values, traits dormidos (Impulso,
  Deliberación, Integridad, Coraje, Corruptibility), Shadow Influence
  (= Corruption del State), consecuencias previstas.
- **Elección**: automática = la primera del ranking. Interactivo queda
  para después, pero el ranking se construye igual.

- **Pool: dueño = el host** ✅. El host declara el vocabulario de acciones
  (como ya declara el vocabulario del cuerpo/Condition): cada opción es
  `{ verbo, objetivo, skill?, dificultad?, tags, consecuencias previstas }`.
  La mente pondera y puede *proponer* una opción fuera del menú que el host
  acepta o rechaza. `skill` es opcional: "doblar a la izquierda" no ejerce
  skill, es preferencia pura pesada por los tags de cada camino.
- **Skills ya existen**: 7 en el host (tracking, persuasion, ranged, melee,
  lore, stealth, endurance — las 2 últimas NO llegan a la mente:
  `toOpenPayload` solo manda 5). La tirada ya existe (`skillCheck.js` /
  `checks.py`: gate → d10 + skill + mods de energía/sombra vs dificultad;
  sombra solo empaña skills mentales). Hoy sirve para percibir; la decisión
  la reusaría para actuar. Nivel de skill pesa la opción, no la elimina.
- **Tags son clave acá**: las opciones y lo que se ve en cada camino llegan
  taggeados → primer consumidor concreto del 🅿️ Tagger universal.
- **Huecos posibles en el vocabulario de Middle-earth**: orientación
  (wayfinding), sanación, leer gente (insight). Pendiente decidir si las 7
  alcanzan.

- **Higher Self = el asiento del humano** ✅ (redefinido por el usuario).
  NO es un componente de la mente: es el override del jugador sobre el
  ranking natural del personaje. La mente rankea el pool; en modo auto
  se elige el top; en modo interactivo el humano elige — incluso contra
  la preferencia natural del personaje. No entra en el MVP; entra con la
  interactividad.
- **Pool = solo opciones factibles** ✅ (host ya filtró por equipo/skill/
  estado: sin espada no hay "atacar con espada"). La mente solo ordena;
  la factibilidad es del mundo, la preferencia es de la mente.
- **Mental fatigue = State nuevo** ✅ (de la mente, como el Mood). Sube
  cuando lo elegido está lejos de la preferencia natural; baja con
  descanso/calma. Hace dos cosas (anti-Pull): alimenta el Mood del
  episodio siguiente, y con fatiga alta achica el azar y pesa más la
  preferencia natural — una mente gastada se vuelve más ella misma.
- **Ranking no determinista**: pesan State (miedo, hambre…), tags,
  Actitudes/Values, traits, memorias + **un poco de azar** en el score
  para que casi-empates no resuelvan siempre igual — evita que el auto
  repita siempre la misma acción.
- **El gap además es evidencia**: narración muestra la reluctancia;
  Reflection aprende de acciones forzadas (forzar al pacífico a pelear
  20 veces debilita "soy pacífico" con recuerdos reales).
- **Outcome/Expertise/Learning/Action Affinity = emergentes** ✅ (sin
  concepto nuevo): el host resuelve y devuelve el resultado como evento
  (ya es el ciclo); Expertise = el host filtra el pool por skill; Learning
  = el número lo sube el host, la mente aprende la *creencia* ("soy
  alguien que sabe leer la tierra") vía Reflection; Action Affinity =
  memorias taggeadas que empujan opciones similares en rankings futuros.
  Loop: acción → host resuelve → evento → memoria taggeada → evidencia
  → el personaje cambia actuando.
- **Traits dormidos = modificadores de peso del ranking** ✅:
  Integridad pesa tags de deber/bien común y *menos* la valencia
  emocional cruda; Impulso pesa la valencia inmediata; Coraje achica el
  peso de tags de peligro; Corruptibility = cuánto tuerce el shadow;
  Deliberación = cuántos factores alternativos se llegan a pesar.
  Las opciones llevan tags (`common_good`, `self_preservation`, `danger`…).

### NL fuera del admin — HECHO ✅
Se quitó del Studio toda la edición de natural language:
- API (`app/studio/api.py`): fuera `/voice*` (bands/thresholds/phrases/facets)
  y `/minds/*/accent*`. Header "read-only" corregido.
- Frontend: fuera `VoicePanel.vue`, botón "la voz" (TopBar), sección
  "Su acento" (ShapePanel), funciones de `api.ts`, tipos `VoicePack`/
  `Accent`, helpers de `format.ts`.
- **Se conserva**: el mecanismo interno (`nl_resolver`, tablas `nl_*`,
  `brain_nl_overrides`) porque el narrador aún lo usa — solo se fue la
  edición. `voice_instructions` de la card queda (es la voz del personaje).
- Verificado: 2331 tests de mind-engine pasan; `npm run build` del
  Studio OK. Cambios sin commitear todavía.

### Flecos cerrados ✅
- Trait de susceptibilidad a la corrupción: **corruptibility**.
- Voz interior: **Musing** (los ~190 thoughts + los Accents, que se funden
  acá: "frases propias del personaje para condiciones del mundo").
  Glosario actualizado.
- Skills: se retoma después con foco en **interacción con seres**.

## Abierto

- ~~❓ Skills~~ ✅ **CERRADO — quedan 10**: las 7 actuales (tracking,
  persuasion, ranged, melee, lore, stealth, endurance) + **insight**
  (leer gente), **deception** (mentir/disimular), **intimidation**
  (atemorizar). Decisiones: survival/foraging/wayfinding se funden en
  **tracking** ("leer la tierra y vivir de ella"); **healing** y
  **beasts** parqueados; `resolve`/willpower NO se agrega — endurance ya
  es skill mental (el shadow la empaña, junto a persuasion y lore) y
  cubre aguante físico Y fortaleza interior. Descartadas: leadership,
  performance, pickpocket, idiomas, unarmed, swim/climb (en endurance).

## Contador de complejidad
Para no sobrecomplicar: cada decisión suma o resta conceptos.

| Decisión | Efecto |
|---|---|
| Cajones Identity / State / Past | +3 nombres, ordenan ~15 piezas sueltas |
| Sin horizon transient/enduring | −1 concepto |
| Creencias no se apagan con el tiempo | −1 mecanismo (fade de creencias) |
| Thoughts → Musing | ±0 (se mueven, dejan de fingir ser creencias) |
| Value = tipo de Belief | +1 etiqueta, 0 mecánica nueva |
| Pull, Habit, Latent fuera | −3 conceptos (hoy no hacían nada) |
| Attitude/Impression = apodos | −2 conceptos → 1 mecanismo (creencia con tema) |
| Legend fuera de Source | −1 valor |
| Traits: −2 (Memoria, Costumbre), +1 (Curiosidad), −1 propuesta (Esperanza) | −2 netos de vivir |
| +5 diales de actuar dormidos | +5 filas, 0 mecanismo nuevo |

## Parqueado (se construye después)

- 🅿️ Decision Engine, Higher Self, Cognitive Resistance, Deliberation,
  Outcome/Learning, Skills/Expertise/Action Affinity, Decision Inspector.
- 🅿️ **Tagger universal**: un sistema de tags común que sirva para cualquier
  mundo (familias: emocional, social, cognitiva…; separar tags de propiedades
  y relaciones). Hablarlo después de cerrar qué es una Memory.
