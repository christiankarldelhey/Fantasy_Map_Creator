// ============================================================================
// i18n — the Studio's two languages (es default, en)
// ----------------------------------------------------------------------------
// One reactive locale + one flat string table. `t('tab.summary')` inside a
// template or computed re-renders on switch because it reads `locale`.
// Domain concepts keep their CONTEXT.md names in both languages (Mood,
// Temperament, Pull…) — the translation owns the chrome around them.
// ============================================================================
import { shallowRef } from 'vue'

export type Locale = 'es' | 'en'

const stored = (typeof localStorage !== 'undefined'
  ? localStorage.getItem('studio.locale')
  : null) as Locale | null

export const locale = shallowRef<Locale>(stored === 'en' ? 'en' : 'es')

export function setLocale(l: Locale) {
  locale.value = l
  try { localStorage.setItem('studio.locale', l) } catch { /* private mode */ }
}

const S: Record<string, { es: string; en: string }> = {
  // -- shell -----------------------------------------------------------------
  'app.title': { es: 'Mind Studio', en: 'Mind Studio' },
  'nav.character': { es: 'Personaje', en: 'Character' },
  'nav.episodes': { es: 'episodios', en: 'episodes' },
  'tab.personality': { es: 'Personalidad', en: 'Personality' },
  'tab.memory': { es: 'Memoria', en: 'Memory' },
  'tab.episodes': { es: 'Episodios', en: 'Episodes' },
  'tab.tags': { es: 'Tags', en: 'Tags' },
  'tab.map': { es: 'Etapas de la mente', en: 'Mind stages' },
  'err.load': {
    es: 'No se pudo cargar la mente ({err}). Revisá que el mind-engine esté corriendo.',
    en: 'Could not load the mind ({err}). Check the mind-engine is running.',
  },
  'empty.minds': {
    es: 'Todavía no hay mentes. Se crean cuando un personaje vive su primer episodio de viaje.',
    en: 'No minds yet. They are created when a character lives their first travel episode.',
  },

  // -- summary ---------------------------------------------------------------
  'sum.who': { es: 'Quién es', en: 'Who they are' },
  'sum.edit': { es: 'Editar ficha', en: 'Edit card' },
  'sum.original': { es: 'Personaje original', en: 'Original character' },
  'sum.copyOf': { es: 'Copia de {name}', en: 'Copy of {name}' },
  'sum.copy': { es: 'Copia', en: 'Copy' },
  'sum.preset': { es: 'Preset: {name}', en: 'Preset: {name}' },
  'sum.noedit.original': {
    es: 'Los personajes originales no se editan desde acá.',
    en: 'Original characters cannot be edited here.',
  },
  'sum.noedit.pending': {
    es: 'Esta ficha todavía no se puede editar: se habilita después del primer episodio.',
    en: 'This card cannot be edited yet: it unlocks after the first episode.',
  },
  'sum.lens': { es: 'Lente del narrador', en: 'Narrator lens' },
  'sum.lens.desc': {
    es: 'El filtro con que el narrador lee cada escena — cómo este personaje mira el mundo.',
    en: 'The filter the narrator reads every scene through — how this character sees the world.',
  },
  'sum.needs.none': { es: 'Ninguna necesidad abierta', en: 'No open needs' },

  // -- card edit -------------------------------------------------------------
  'card.name': { es: 'Nombre', en: 'Name' },
  'card.type': { es: 'Tipo', en: 'Type' },
  'card.gender': { es: 'Género', en: 'Gender' },
  'card.entity': { es: 'Entidad', en: 'Entity' },
  'card.portrait': { es: 'URL del retrato', en: 'Portrait URL' },
  'card.descEn': { es: 'Descripción (inglés)', en: 'Description (English)' },
  'card.descEs': { es: 'Descripción (español)', en: 'Description (Spanish)' },
  'card.lens': { es: 'Lente del narrador', en: 'Narrator lens' },
  'card.voice': { es: 'Cómo habla', en: 'How they speak' },
  'card.save': { es: 'Guardar', en: 'Save' },
  'card.cancel': { es: 'Cancelar', en: 'Cancel' },
  'card.saving': { es: 'Guardando…', en: 'Saving…' },
  'card.err': { es: 'No se guardó: {err}', en: 'Could not save: {err}' },

  // -- personality -----------------------------------------------------------
  'per.intro': {
    es: 'Todo lo editable de esta pestaña se guarda al soltar el control y vale para los próximos episodios.',
    en: 'Everything editable on this tab saves when you release the control and applies to upcoming episodes.',
  },
  'per.saved': { es: 'Cambios guardados', en: 'Changes saved' },
  'per.saveErr': { es: 'No se guardó: {err}', en: 'Could not save: {err}' },
  'per.edit': { es: 'Editar', en: 'Edit' },
  'per.done': { es: 'Listo', en: 'Done' },
  'per.chart': { es: 'Mood y Temperament', en: 'Mood and Temperament' },
  'per.chart.desc': {
    es: 'El Mood es el tiempo de hoy — un punto que lo vivido empuja. El Temperament es el clima: el punto fijo al que el ánimo regresa cuando nada lo mueve.',
    en: 'The Mood is today’s weather — a point the lived day pushes. The Temperament is the climate: the fixed point the mood regresses to when nothing moves it.',
  },
  'per.chart.mood': { es: 'Mood (variable)', en: 'Mood (variable)' },
  'per.chart.temp': { es: 'Temperament (fijo)', en: 'Temperament (fixed)' },
  'per.chart.legend': {
    es: 'Valencia: malestar ↔ bienestar. Agitación: calma ↔ activación. Cada zona del círculo nombra un mood — cerca del centro la palabra es suave, en el borde es plena.',
    en: 'Valence: distress ↔ wellbeing. Arousal: calm ↔ activation. Each region of the disc names a mood — near the centre the word is soft, at the rim full-strength.',
  },
  'per.nature': { es: 'Naturaleza', en: 'Nature' },
  'per.nature.desc': {
    es: 'Lo que el personaje ES: el Temperament al que el ánimo regresa y los acoples que deciden cuánto lo mueve lo vivido.',
    en: 'What the character IS: the Temperament the mood regresses to and the couplings deciding how much the lived day moves it.',
  },
  'per.preset': { es: 'Personalidad preconfigurada', en: 'Authored personality' },
  'per.preset.pick': { es: 'Elegir un arquetipo…', en: 'Pick an archetype…' },
  'per.preset.apply': { es: 'Aplicar', en: 'Apply' },
  'per.preset.applying': { es: 'Aplicando…', en: 'Applying…' },
  'per.preset.note': {
    es: 'Copia solo el Temperament y los acoples del arquetipo — la identidad, los rasgos y lo vivido no se tocan.',
    en: 'Copies only the archetype’s Temperament and couplings — identity, traits and the lived record stay untouched.',
  },
  'per.preset.imprints': { es: 'Imprime', en: 'Imprints' },
  'per.temp': { es: 'Personalidad', en: 'Personality' },
  'per.couplings': { es: 'Acoples', en: 'Couplings' },
  'per.couplings.sub': {
    es: 'cómo conecta el temperamento con lo vivido',
    en: 'how the temperament connects to what is lived',
  },
  'per.mood': { es: 'Ánimo actual', en: 'Current mood' },
  'per.mood.desc': {
    es: 'Cómo se siente la mente en este momento. Lo que viva en el próximo episodio lo va a ir modificando.',
    en: 'How the mind feels right now. Whatever it lives in the next episode keeps moving it.',
  },
  'per.mood.feels': { es: 'Hoy se siente:', en: 'Feels today:' },
  'per.mood.valence': { es: 'Estado de ánimo', en: 'Valence' },
  'per.mood.valence.help': { es: 'De negativo a positivo.', en: 'Negative to positive.' },
  'per.mood.valence.low': { es: 'Muy mal', en: 'Very low' },
  'per.mood.valence.high': { es: 'Muy bien', en: 'Very well' },
  'per.mood.arousal': { es: 'Agitación', en: 'Arousal' },
  'per.mood.arousal.help': { es: 'Qué tan revuelto o calmo está.', en: 'How stirred or settled.' },
  'per.mood.arousal.low': { es: 'En calma', en: 'Calm' },
  'per.mood.arousal.high': { es: 'Muy agitado', en: 'Very stirred' },
  'per.c.moodiness': { es: 'Volubilidad (moodiness)', en: 'Moodiness' },
  'per.c.moodiness.help': {
    es: 'Qué tan rápido el ánimo se mueve y regresa al temperamento.',
    en: 'How fast the mood moves and returns to temperament.',
  },
  'per.c.moodiness.low': { es: 'Estable — el ánimo aguanta', en: 'Stable — the mood holds' },
  'per.c.moodiness.high': { es: 'Cambia con cada cosa', en: 'Shifts with everything' },
  'per.c.resistance': { es: 'Terquedad (resistance)', en: 'Resistance' },
  'per.c.resistance.help': {
    es: 'Cuánto se resiste a cambiar de parecer: lo que contradice lo que ya siente entra amortiguado.',
    en: 'How stubbornly it resists changing its mind: whatever contradicts a standing feeling lands dampened.',
  },
  'per.c.resistance.low': { es: 'Escucha las contradicciones', en: 'Hears contradictions' },
  'per.c.resistance.high': { es: 'Nada le mueve un juicio', en: 'Nothing moves a judgement' },
  'per.c.variability': { es: 'Variabilidad de elección', en: 'Choice variability' },
  'per.c.variability.help': {
    es: 'Entre opciones parejas, cuánto varía la elección que toma.',
    en: 'Between like options, how much the pick varies.',
  },
  'per.c.variability.low': { es: 'Siempre la más preferida', en: 'Always the favourite' },
  'per.c.variability.high': { es: 'Impredecible', en: 'Unpredictable' },
  'per.skills': { es: 'Habilidades', en: 'Skills' },
  'per.skills.desc': {
    es: 'Lo que sabe hacer, de 0 a 10. El juego las usa para resolver pruebas y la mente para saber de qué es capaz.',
    en: 'What they can do, 0 to 10. The game uses them to resolve checks and the mind to know what it is capable of.',
  },
  'per.skills.readonly': {
    es: 'Solo lectura: las habilidades se pueden editar cuando la ficha del personaje es editable (copias, después del primer episodio).',
    en: 'Read-only: skills can be edited when the character card is editable (copies, after the first episode).',
  },
  'per.wiring': { es: 'Configuración técnica ({n} parámetros)', en: 'Technical wiring ({n} parameters)' },
  'per.wiring.desc': {
    es: 'Solo lectura. Son los valores internos que mueven los rasgos de arriba; cada rasgo ajusta varios a la vez.',
    en: 'Read-only. The internal values driving the traits above; each trait dials several at once.',
  },

  // -- memory ----------------------------------------------------------------
  'mem.search': { es: 'Buscar…', en: 'Search…' },
  'mem.alive': { es: 'Recuerdos', en: 'Memories' },
  'mem.musings': { es: 'Voz interior', en: 'Inner voice' },
  'mem.relations': { es: 'Vínculos', en: 'Relations' },
  'mem.alive.help': {
    es: 'Lo que recuerda de sus viajes (Memory), en sus tres profundidades: volátiles que se debilitan con el tiempo, consolidadas que ya no dependen de ser recientes, y creencias — lo que tiene por cierto, venido del preset o aprendido reflexionando.',
    en: 'What they remember from their journeys (Memory), in its three depths: volatile ones that weaken with time, consolidated ones no longer held up by recency, and convictions — what it holds true, from the preset or learned reflecting.',
  },
  'mem.musings.help': {
    es: 'Frases escritas de antemano que le dan color a su forma de pensar (Musing). No son creencias: el narrador las usa como inspiración.',
    en: 'Pre-written lines that colour its inner voice (Musing). Not beliefs: the narrator uses them as inspiration.',
  },
  'mem.relations.help': {
    es: 'Lo que siente por cada cosa (Relation): el standing que los eventos percibidos fueron sedimentando — afecto, confianza, miedo y familiaridad por sujeto.',
    en: 'What it feels about each thing (Relation): the standing that perceived events sedimented — affection, trust, fear and familiarity per subject.',
  },
  'mem.col.memory': { es: 'Recuerdo', en: 'Memory' },
  'mem.col.kind': { es: 'Tipo', en: 'Kind' },
  'mem.col.feeling': { es: 'Sensación', en: 'Felt' },
  'mem.col.tags': { es: 'Tags', en: 'Tags' },
  'mem.col.strength': { es: 'Fuerza', en: 'Strength' },
  'mem.col.strength.help': { es: 'Qué tan vivo está el recuerdo', en: 'How alive the memory is' },
  'mem.col.importance': { es: 'Importancia', en: 'Importance' },
  'mem.col.importance.help': { es: 'Cuánto le marcó cuando lo vivió', en: 'How much it marked them when lived' },
  'mem.col.evoked': { es: 'Evocado', en: 'Evoked' },
  'mem.col.evoked.help': { es: 'Veces que volvió a su mente', en: 'Times it came back to mind' },
  'mem.col.voiced': { es: 'Narrado', en: 'Voiced' },
  'mem.col.voiced.help': { es: 'Veces que llegó a la narración', en: 'Times it reached the narration' },
  'mem.col.since': { es: 'Desde', en: 'Since' },
  'mem.feel.neg': { es: 'Negativo', en: 'Negative' },
  'mem.feel.pos': { es: 'Positivo', en: 'Positive' },
  'mem.feel.neutral': { es: 'Neutro', en: 'Neutral' },
  'mem.depth.fresh': { es: 'Volátil', en: 'Fresh' },
  'mem.depth.consolidated': { es: 'Consolidada', en: 'Consolidated' },
  'mem.depth.conviction': { es: 'Creencia', en: 'Conviction' },
  'mem.kind.pattern': { es: 'Patrón', en: 'Pattern' },
  'mem.empty.alive': { es: 'No hay recuerdos.', en: 'No memories.' },
  'mem.empty.musings': { es: 'Este personaje no tiene frases de voz interior.', en: 'This character has no inner-voice lines.' },
  'mem.empty.relations': { es: 'Todavía no siente nada por nada — los vínculos se sedimentan con lo vivido.', en: 'No feelings about anything yet — relations sediment from what is lived.' },
  'mem.preset': { es: 'Preset', en: 'Preset' },
  'mem.ep': { es: 'Ep. {n}', en: 'Ep. {n}' },
  'mem.appearsWith': { es: 'Aparece con:', en: 'Appears with:' },
  'rel.col.subject': { es: 'Sujeto', en: 'Subject' },
  'rel.col.feeling': { es: 'Cómo lo siente', en: 'How it feels' },
  'rel.col.affection': { es: 'Afecto', en: 'Affection' },
  'rel.col.trust': { es: 'Confianza', en: 'Trust' },
  'rel.col.fear': { es: 'Miedo', en: 'Fear' },
  'rel.col.familiarity': { es: 'Familiaridad', en: 'Familiarity' },
  'rel.col.fed': { es: 'Alimentado en', en: 'Last fed' },
  'rel.col.surfaced': { es: 'Afloró en', en: 'Last surfaced' },
  'rel.col.origin': { es: 'Origen', en: 'Origin' },
  'rel.bipolar.help': { es: 'Bipolar: −1 es su opuesto, no indiferencia', en: 'Bipolar: −1 is its opposite, not indifference' },

  // -- episodes ---------------------------------------------------------------
  'ep.empty': {
    es: 'Este personaje todavía no vivió ningún episodio.',
    en: 'This character has not lived any episode yet.',
  },
  'ep.err': { es: 'No se guardó el ánimo: {err}', en: 'Could not save the mood: {err}' },
  'ep.episode': { es: 'Episodio {n}', en: 'Episode {n}' },
  'ep.nodate': { es: 'sin fecha', en: 'no date' },
  'ep.mood': { es: 'Ánimo: {mood}', en: 'Mood: {mood}' },
  'ep.focus': { es: 'El centro del día', en: 'The day’s focus' },
  'ep.focus.desc': {
    es: 'Lo más importante que vivió ese día. El narrador construye el capítulo alrededor de esto.',
    en: 'The most important thing lived that day. The narrator builds the chapter around it.',
  },
  'ep.focus.empty': {
    es: 'Un día tranquilo: nada pesó lo suficiente para ser el centro.',
    en: 'A quiet day: nothing weighed enough to be the focus.',
  },
  'ep.focus.rules': {
    es: 'Elegido por reglas automáticas (el director no intervino).',
    en: 'Picked by automatic rules (the director did not step in).',
  },
  'ep.why': { es: 'Por qué: {why}', en: 'Why: {why}' },
  'ep.day': { es: 'Cómo fue el día', en: 'How the day went' },
  'ep.day.desc': {
    es: 'Cómo se sintió el día contra la hora — cada punto es un evento; el cartel dice qué fue y con qué ánimo lo dejó.',
    en: 'How the day felt against the hour — each point is an event; the popup says what it was and the mood it left.',
  },
  'ep.lived': { es: 'Eventos del episodio', en: 'Events of the episode' },
  'ep.lived.desc': {
    es: 'El día en orden, tal como la percepción lo registró — el ánimo que cada evento dejó aparece cuando cambió.',
    en: 'The day in order, as perception recorded it — the mood each event left shows when it changed.',
  },
  'ep.lens': { es: 'Lo que la mente le pasó al narrador', en: 'What the mind handed the narrator' },
  'ep.lens.desc': {
    es: 'Material que la mente aportó para escribir el capítulo (Lens). {res} de {total} elementos aparecieron en la narración.',
    en: 'Material the mind contributed to writing the chapter (Lens). {res} of {total} items appeared in the narration.',
  },
  'ep.carried': { es: 'Lo que traía al empezar el día', en: 'What it carried into the day' },
  'ep.dayEvents': { es: 'Lo que le pasó en el día', en: 'What happened in the day' },
  'ep.resonated': { es: 'Apareció en la narración', en: 'Appeared in the narration' },
  'ep.notResonated': { es: 'No apareció', en: 'Did not appear' },
  'ep.notResonated.long': { es: 'No apareció en la narración', en: 'Did not appear in the narration' },
  'ep.narrative': { es: 'Narración', en: 'Narration' },
  'ep.narrative.desc': { es: 'El capítulo que se escribió para este día.', en: 'The chapter written for this day.' },
  'ep.narrative.empty': { es: 'Este episodio no tiene narración guardada.', en: 'This episode has no saved narration.' },
  'ep.narrative.inner': { es: 'english (original)', en: 'english (original)' },
  'ep.silenced': { es: 'Lo que se descartó ({n})', en: 'What was left out ({n})' },
  'ep.silenced.desc': {
    es: 'Recuerdos, creencias y frases que la mente consideró pero no usó, y por qué.',
    en: 'Memories, beliefs and lines the mind considered but did not use — and why.',
  },
  'ep.state': { es: 'Cómo está ahora', en: 'How it is now' },
  'ep.state.desc': {
    es: 'El estado físico que informa el juego (Condition) y las Needs abiertas.',
    en: 'The physical state the game reads (Condition) and the open Needs.',
  },
  'ep.state.none': { es: 'Nada anormal', en: 'Nothing abnormal' },

  // -- day chart / mood arc ------------------------------------------------------
  'dc.g.body': { es: 'Cuerpo', en: 'Body' },
  'dc.g.mood': { es: 'Ánimo', en: 'Mood' },
  'dc.g.otras': { es: 'Otras mediciones', en: 'Other metrics' },
  'dc.s.energy': { es: 'Energía', en: 'Energy' },
  'dc.s.shadow': { es: 'Shadow', en: 'Shadow' },
  'dc.s.valence': { es: 'Valencia (cómo lo sintió)', en: 'Valence (how it felt)' },
  'dc.s.world_valence': { es: 'Valencia del mundo', en: 'World valence' },
  'dc.s.mood_arc': { es: 'Ánimo del día (arco)', en: 'Day mood (arc)' },
  'dc.s.salience': { es: 'Salience', en: 'Salience' },
  'dc.s.severity': { es: 'Severidad', en: 'Severity' },
  'dc.s.affection': { es: 'Afecto', en: 'Affection' },
  'dc.s.trust': { es: 'Confianza', en: 'Trust' },
  'dc.s.fear': { es: 'Miedo', en: 'Fear' },
  'dc.s.familiarity': { es: 'Familiaridad', en: 'Familiarity' },
  'dc.hint': {
    es: 'Los puntos sobre el eje son los eventos del día — pasá el mouse o hacé click para verlos.',
    en: 'The dots on the axis are the day’s events — hover or click to see them.',
  },
  'dc.valence': { es: 'valencia', en: 'valence' },
  'dc.severity': { es: 'severidad', en: 'severity' },
  'dc.energy': { es: 'energía', en: 'energy' },
  'dc.before': { es: 'antes', en: 'before' },
  'dc.now': { es: 'ahora', en: 'now' },
  'arc.turn': { es: 'giro', en: 'turn' },
  'arc.empty': {
    es: 'Este episodio no registró arco de ánimo (es anterior a ADR 0017 o no tuvo eventos con huella).',
    en: 'This episode recorded no mood arc (predates ADR 0017 or had no imprinting events).',
  },
  'arc.trace': { es: 'Huella por evento ({n})', en: 'Trace per event ({n})' },
  'arc.trace.desc': {
    es: 'Lo que cada momento dejó en el sustrato sentido — afecto, confianza, miedo, familiaridad — en el orden en que se sintió.',
    en: 'What each moment left on the felt substrate — affection, trust, fear, familiarity — in the order it was felt.',
  },
  'arc.total': { es: 'Acumulado del día:', en: 'Day total:' },
  'arc.needPressure': { es: 'presión de necesidades {v}', en: 'need pressure {v}' },
  'epl.episode': { es: 'Episodio {n}', en: 'Episode {n}' },
  'epl.nofocus': { es: 'Sin centro definido', en: 'No focus' },
  'epl.mood': { es: 'Ánimo: {mood}', en: 'Mood: {mood}' },
  'epl.aria': { es: 'Episodios', en: 'Episodes' },

  // -- lived view --------------------------------------------------------------
  'lv.world': { es: 'Lo que el mundo dijo', en: 'What the world said' },
  'lv.lived': { es: 'Lo que la mente vivió', en: 'What the mind lived' },
  'lv.synth': { es: 'La mente lo sintetizó — el mundo no mandó este evento.', en: 'The mind synthesised it — the world did not send this event.' },
  'lv.mind': { es: 'mente', en: 'mind' },
  'lv.empty': { es: 'Este episodio no tiene día percibido.', en: 'This episode has no perceived day.' },

  // -- tags tab ----------------------------------------------------------------
  'tags.err': {
    es: 'No se pudo cargar el registro de tags ({err}). ¿Está seedeada la tabla narration_tags?',
    en: 'Could not load the tag registry ({err}). Is the narration_tags table seeded?',
  },
  'tags.loading': { es: 'Cargando registro…', en: 'Loading registry…' },
  'tags.intro': {
    es: 'Un Tag es una bandera semántica de un segmento — el vocabulario con que la mente engancha lo vivido: recuerdos, vínculos, rachas, necesidades. Las familias se agrupan por lo que pueden hacer: sujeto (puede tener Vínculo), tema (puede hacer racha), causa (puede causar un Mood), fondo (nunca evoca). El registro es declarativo: el engine no lee la tabla, cada consumidor decide.',
    en: 'A Tag is a single-segment semantic flag — the vocabulary the mind hooks the lived day with: memories, relations, streaks, needs. Families group by what they can do: subject (can bear a Relation), pattern (can streak), cause (can stand as a Mood’s cause), ambient (never evokes). The registry is declarative: the engine does not read the table, each consumer decides.',
  },
  'tags.cat.subjects': { es: 'Sujetos', en: 'Subjects' },
  'tags.cat.subjects.desc': {
    es: 'Lo que puede tener un Vínculo — una persona, una especie, un lugar.',
    en: 'What can bear a Relation — a person, a kind, a place.',
  },
  'tags.cat.forms': { es: 'Forma y causa', en: 'Form and cause' },
  'tags.cat.forms.desc': {
    es: 'Cómo pasó el contacto — puede pararse como la causa de un Mood.',
    en: 'How contact happened — can stand as a Mood’s cause.',
  },
  'tags.cat.patterns': { es: 'Temas', en: 'Patterns' },
  'tags.cat.patterns.desc': {
    es: 'Lo que puede hacer racha — la Recurrence cuenta los días que repite.',
    en: 'What can streak — Recurrence counts the days it repeats.',
  },
  'tags.cat.ambient': { es: 'Fondo', en: 'Ambient' },
  'tags.cat.ambient.desc': {
    es: 'Escenario, nunca contenido: no evoca, no hace racha, no es sujeto.',
    en: 'Scenery, never content: never evokes, never streaks, never a subject.',
  },
  'tags.cat.marks': { es: 'Marcas del host', en: 'Host marks' },
  'tags.cat.marks.desc': {
    es: 'Banderas libres que el mundo declara — contenido evocable, pero sin clase: nunca sujeto, tema ni causa.',
    en: 'Free-form flags the world declares — evocable content, but classless: never subject, pattern nor cause.',
  },
  'tags.open': { es: 'valor abierto', en: 'open value' },
  'tags.open.help': { es: 'Familia de valor abierto (pattern)', en: 'Open-value family (pattern)' },
  'tags.class.subject': { es: 'sujeto', en: 'subject' },
  'tags.class.pattern': { es: 'tema', en: 'pattern' },
  'tags.class.cause': { es: 'causa', en: 'cause' },
  'tags.class.ambient': { es: 'fondo', en: 'ambient' },
  'tags.class.subject.help': { es: 'Puede tener un Vínculo', en: 'Can bear a Relation' },
  'tags.class.pattern.help': { es: 'Puede hacer racha', en: 'Can streak' },
  'tags.class.cause.help': { es: 'Puede causar un Mood', en: 'Can stand as a Mood cause' },
  'tags.class.ambient.help': { es: 'Nunca evoca ni hace racha', en: 'Never evokes nor streaks' },

  // -- mood space --------------------------------------------------------------
  'ms.arousal.pos': { es: 'Agitación (+)', en: 'Arousal (+)' },
  'ms.arousal.neg': { es: 'Agitación (−)', en: 'Arousal (−)' },
  'ms.valence.pos': { es: 'Valencia (+)', en: 'Valence (+)' },
  'ms.valence.neg': { es: 'Valencia (−)', en: 'Valence (−)' },
  'ms.steady': { es: 'Tranquilo', en: 'Steady' },
  // Wheel words — what each name means (hover a region to read it).
  // Outer ring: the sector at full strength.
  'ms.w.happy': { es: 'Bienestar alto con energía — la alegría plena.', en: 'High wellbeing with energy — full joy.' },
  'ms.w.excited': { es: 'Energía alta y buen ánimo — entusiasmo.', en: 'High energy, good spirits — enthusiasm.' },
  'ms.w.alert': { es: 'Atención afilada, ni buena ni mala — energía sin juicio.', en: 'Sharpened attention, neither good nor bad — energy without judgement.' },
  'ms.w.afraid': { es: 'Alerta con malestar — el miedo.', en: 'Alert with distress — fear.' },
  'ms.w.angry': { es: 'Activado y mal — la bronca.', en: 'Activated and unwell — anger.' },
  'ms.w.distressed': { es: 'Sufrimiento con energía — angustia.', en: 'Suffering with energy — distress.' },
  'ms.w.sad': { es: 'Malestar con poca energía — tristeza.', en: 'Discomfort with low energy — sadness.' },
  'ms.w.depressed': { es: 'Lo peor en reposo — el abatimiento profundo.', en: 'The worst at rest — the deep low.' },
  'ms.w.bored': { es: 'Bienestar bajo sin energía — nada tira de él.', en: 'Low wellbeing without energy — nothing draws.' },
  'ms.w.calm': { es: 'Reposo sin malestar — tranquilidad.', en: 'Rest without distress — calm.' },
  'ms.w.relaxed': { es: 'Bienestar tranquilo — descanso.', en: 'Quiet wellbeing — rest.' },
  'ms.w.content': { es: 'Bienestar con algo de energía — satisfacción.', en: 'Wellbeing with some energy — contentment.' },
  // Inner ring: the same sector spoken softly (closer to the centre).
  'ms.w.heartened': { es: 'Un buen ánimo leve — algo lo levantó.', en: 'A faint lift — something raised the spirits.' },
  'ms.w.eager': { es: 'Ganas con energía — expectativa.', en: 'Energy with appetite — anticipation.' },
  'ms.w.watchful': { es: 'Atento sin alarma — la energía de mirar.', en: 'Attentive without alarm — the energy of watching.' },
  'ms.w.uneasy': { es: 'Inquietud leve — algo no cierra.', en: 'A faint disquiet — something does not sit right.' },
  'ms.w.irritated': { es: 'Molestia leve — la fricción del día.', en: 'A mild annoyance — the day’s friction.' },
  'ms.w.worried': { es: 'Preocupación — el malestar que piensa.', en: 'Worry — distress that thinks.' },
  'ms.w.melancholy': { es: 'Tristeza suave — la nostalgia del día.', en: 'Soft sadness — the day’s wistfulness.' },
  'ms.w.listless': { es: 'Apagado — sin energía para nada.', en: 'Dimmed — no energy for anything.' },
  'ms.w.settled': { es: 'Sosegado — el bienestar quieto.', en: 'Settled — quiet wellbeing.' },
  'ms.w.mellow': { es: 'Blando y tranquilo — el cansancio agradable.', en: 'Soft and tranquil — the pleasant tiredness.' },
  'ms.w.pleased': { es: 'Satisfecho — el buen ánimo discreto.', en: 'Pleased — discreet good spirits.' },
  // Centre and the rim extremes.
  'ms.w.steady': { es: 'El centro — ni tira ni pesa.', en: 'The centre — nothing pulls, nothing weighs.' },
  'ms.w.despairing': { es: 'El borde del dolor — valencia mínima.', en: 'The edge of pain — lowest valence.' },
  'ms.w.exultant': { es: 'El borde de la alegría — valencia máxima.', en: 'The edge of joy — highest valence.' },
  'ms.nature': { es: 'naturaleza', en: 'nature' },
  'ms.mood': { es: 'ánimo', en: 'mood' },
  'ms.valence': { es: 'valencia', en: 'valence' },
  'ms.arousal': { es: 'agitación', en: 'arousal' },
  'ms.dominance': { es: 'dominancia', en: 'dominance' },
  'ms.pullTo': { es: 'tira a «{word}»', en: 'pulls toward “{word}”' },
  'ms.noPull': { es: 'sin tirón sobre el ánimo', en: 'no pull on the mood' },
  'ms.hint': {
    es: 'Punto ámbar: el ánimo ahora. Anillo azul: la naturaleza, fija. El punto verde es adónde tira el evento elegido; la flecha, cuánto llega a mover.',
    en: 'Amber dot: the mood now. Blue ring: the nature, fixed. The green dot is where the chosen event pulls; the arrow, how far it moves.',
  },
  'ms.hint.drag': {
    es: 'Punto ámbar: el ánimo ahora (arrastrá para moverlo). Anillo azul: la naturaleza, fija. El punto verde es adónde tira el evento elegido; la flecha, cuánto llega a mover.',
    en: 'Amber dot: the mood now (drag to move it). Blue ring: the nature, fixed. The green dot is where the chosen event pulls; the arrow, how far it moves.',
  },

  // -- map: stage chips + shared ------------------------------------------------
  'map.stages.aria': { es: 'Etapas de la mente', en: 'Stages of the mind' },
  'map.stage.perception': { es: 'Percepción', en: 'Perception' },
  'map.stage.evocation': { es: 'Evocación', en: 'Evocation' },
  'map.stage.needs/mood': { es: 'Asimilación', en: 'Assimilation' },
  'map.stage.lens': { es: 'Foco', en: 'Focus' },
  'map.stage.narration': { es: 'Narración', en: 'Narration' },
  'map.stage.memory': { es: 'Consolidación', en: 'Consolidation' },
  'map.stage.close': { es: 'Reflexión', en: 'Reflection' },
  'map.trace': {
    es: 'Trazado real — los pasos del día dorado, nodo a nodo',
    en: 'Real trace — the golden day, step by step',
  },

  // -- map: perception explainer ------------------------------------------------
  'map.perc.title': { es: 'Cómo funciona la Perception', en: 'How Perception works' },
  'map.perc.hint': { es: 'events[] → perceived_day', en: 'events[] → perceived_day' },
  'map.perc.intro': {
    es: 'El mundo entrega el día como una lista de hechos ya verbalizados (<code>events[]</code>). <code>perceive_events</code> lo transforma en el día vivido (<code>perceived_day</code>): qué notó la mente, cómo lo leyó y cuánto le pesó. Los mismos hechos producen días distintos según quién los vive. Cada evento recorre estos procesos, en orden — abajo, el mismo proceso con un ejemplo concreto:',
    en: 'The world hands over the day as a list of already-verbalized facts (<code>events[]</code>). <code>perceive_events</code> turns it into the lived day (<code>perceived_day</code>): what the mind noticed, how it read it, and how much it weighed. The same facts make different days for different minds. Every event walks these processes, in order — below, the same process with a concrete example:',
  },
  'map.perc.s1': {
    es: '<b>derive_tags</b> — el hecho se vuelve señales: quién participa, dónde pasó, de qué tipo (las ausencias, «wounded: none», son contexto, no contenido). Y la mente mide la novedad: qué parte de esos tags no vio en los últimos 20 episodios.',
    en: '<b>derive_tags</b> — the fact becomes signals: who took part, where it happened, what kind (absences, “wounded: none”, are context, not content). And the mind measures novelty: how much of that tag surface it has not seen in the last 20 episodes.',
  },
  'map.perc.s2': {
    es: '<b>perception_check</b> — decide si el evento entró a la conciencia. Dormido se pierde salvo que sea intrusivo (<code>is_asleep</code>); si el evento trae un check declarado, un dado sembrado decide: <code>noticed</code> | <code>unnoticed</code> | <code>misread</code>.',
    en: '<b>perception_check</b> — decides whether the event entered consciousness. Asleep it is missed unless intrusive (<code>is_asleep</code>); if the event carries a declared check, a seeded die decides: <code>noticed</code> | <code>unnoticed</code> | <code>misread</code>.',
  },
  'map.perc.s3': {
    es: '<b>resolve_event_reading</b> — pone las palabras con que el evento se vivirá; un misread las reescribe (<code>misread_reading</code>): la mente puede equivocarse sobre lo que pasó, nunca sobre los hechos del mundo.',
    en: '<b>resolve_event_reading</b> — writes the words the event will be lived in; a misread rewrites them (<code>misread_reading</code>): the mind can be wrong about what happened, never about the world’s facts.',
  },
  'map.perc.s4': {
    es: '<b>meaning_of + salience</b> — el paquete <code>mind.semantics</code> declara el delta objetivo del contacto (miedo, afecto, severidad); la salience lo pesa por wiring: <code>w_severity</code> + <code>w_novelty</code> + <code>w_emotional</code> + <code>w_attention</code> (lo que esta mente ya ama o teme estaba vigilado) + bonus del check. Lo unnoticed no significa nada.',
    en: '<b>meaning_of + salience</b> — the <code>mind.semantics</code> pack declares the contact’s objective delta (fear, affection, severity); salience weighs it by wiring: <code>w_severity</code> + <code>w_novelty</code> + <code>w_emotional</code> + <code>w_attention</code> (what this mind already loves or fears stays watched) + the check bonus. The unnoticed means nothing.',
  },
  'map.perc.s5': {
    es: '<b>feed</b> (imprint) — el delta sedimenta en <code>mind.relations</code>: el sujeto más específico lo recibe entero, los demás por salpicadura. Y el cuerpo recibe su golpe sobre la base proyectada (<code>project_body</code>).',
    en: '<b>feed</b> (imprint) — the delta sediments into <code>mind.relations</code>: the narrowest subject takes it whole, the rest by splash. And the body takes its hit on the projected base (<code>project_body</code>).',
  },
  'map.perc.s6': {
    es: '<b>mood_pull</b> — la palabra felt del evento apunta a un punto de la rueda y tira del ánimo hacia ahí, refractada por el standing del sujeto. El <code>valence</code> del ítem es adónde tiró; <code>world_valence</code> guarda lo que significó sin doblar.',
    en: '<b>mood_pull</b> — the event’s felt word points at a spot on the wheel and pulls the mood toward it, refracted by the subject’s standing. The item’s <code>valence</code> is where it pulled; <code>world_valence</code> keeps what it meant, unbent.',
  },
  'map.perc.out': {
    es: 'Cada evento queda anotado con su percepción, su lectura, su peso, lo que dejó en las Relations y adónde tiró el ánimo — eso es el <code>perceived_day</code>, la materia de la que se alimentan la narración, la memoria y el ánimo.',
    en: 'Every event lands annotated with its perception, its reading, its weight, what it left on the Relations and where it pulled the mood — that is the <code>perceived_day</code>, the material narration, memory and mood all feed on.',
  },
  // -- map: perception process scheme --------------------------------------------
  'map.flow.in': { es: 'events[]', en: 'events[]' },
  'map.flow.in.sub': { es: 'el día que el mundo reportó', en: 'the day the world reported' },
  'map.flow.out': { es: 'perceived_day', en: 'perceived_day' },
  'map.flow.out.sub': { es: 'el día que la mente vivió', en: 'the day the mind lived' },
  'map.flow.p1.t': { es: 'derive_tags', en: 'derive_tags' },
  'map.flow.p1.d': { es: 'el hecho se vuelve señales: quién, dónde, qué tipo + novedad', en: 'the fact becomes signals: who, where, what kind + novelty' },
  'map.flow.p1.e': { es: 'ej: orcos en el vado → entity:orcs · place:ford', en: 'e.g.: orcs at the ford → entity:orcs · place:ford' },
  'map.flow.p2.t': { es: 'perception_check', en: 'perception_check' },
  'map.flow.p2.d': { es: '¿entró? dormido se pierde; con check, el dado sembrado decide', en: 'did it register? asleep it is missed; a check rolls the seeded die' },
  'map.flow.p2.e': { es: 'ej: dado ganado → noticed', en: 'e.g.: die won → noticed' },
  'map.flow.p3.t': { es: 'resolve_event_reading', en: 'resolve_event_reading' },
  'map.flow.p3.d': { es: 'las palabras con que el evento se vivirá; misread las reescribe', en: 'the words the event will be lived in; misread rewrites them' },
  'map.flow.p3.e': { es: 'ej: «Sombras grises entre los juncos del vado»', en: 'e.g.: “Grey shapes in the reeds at the ford”' },
  'map.flow.p4.t': { es: 'meaning_of + salience', en: 'meaning_of + salience' },
  'map.flow.p4.d': { es: 'qué significó objetivamente y cuánto pesa para esta mente', en: 'what it objectively meant and how much it weighs to this mind' },
  'map.flow.p4.e': { es: 'ej: orcos = miedo → salience 0.72', en: 'e.g.: orcs = fear → salience 0.72' },
  'map.flow.p5.t': { es: 'feed (imprint)', en: 'feed (imprint)' },
  'map.flow.p5.d': { es: 'sedimenta en mind.relations; el cuerpo recibe su golpe', en: 'sediments into mind.relations; the body takes its hit' },
  'map.flow.p5.e': { es: 'ej: Relation «orcs»: miedo +0.3', en: 'e.g.: Relation “orcs”: fear +0.3' },
  'map.flow.p6.t': { es: 'mood_pull', en: 'mood_pull' },
  'map.flow.p6.d': { es: 'la palabra sentida tira el ánimo a su punto de la rueda', en: 'the felt word pulls the mood toward its wheel point' },
  'map.flow.p6.e': { es: 'ej: watchful — el ánimo se tensa', en: 'e.g.: watchful — the mood tenses' },

  // -- map: evocation explainer + scheme ------------------------------------------
  'map.evo.title': { es: 'Cómo aflora el pasado', en: 'How the past surfaces' },
  'map.evo.hint': { es: 'mind.memories + mind.musings → evoked', en: 'mind.memories + mind.musings → evoked' },
  'map.evo.intro': {
    es: 'Al abrir el episodio, el día nuevo llama: <code>retrieve</code> mide cada memoria de <code>mind.memories</code> contra lo que hoy se vivió, y el contexto del día enciende los musings. Aflorar no es hablar — lo que aflora solo anota su llamado; lo que deja marca es lo que la voz dice:',
    en: 'When the episode opens, the new day calls: <code>retrieve</code> measures every memory in <code>mind.memories</code> against what was lived today, and the day’s context lights the musings. Surfacing is not speaking — what surfaces only notes its call; what leaves a mark is what the voice says:',
  },
  'map.evo.s1': {
    es: '<b>El filtro</b> — sobre <code>mind.memories</code>: los <code>kind=pattern</code> quedan fuera (contabilidad, no impresión), la trivia no se auto-evoca (<code>retrieval_importance_min</code>) y el refractory (<code>refractory_episodes</code>) deja quieto lo rumiado ayer.',
    en: '<b>The filter</b> — over <code>mind.memories</code>: <code>kind=pattern</code> stays out (bookkeeping, not impressions), trivia never self-evokes (<code>retrieval_importance_min</code>) and the refractory (<code>refractory_episodes</code>) leaves yesterday’s rumination quiet.',
  },
  'map.evo.s2': {
    es: '<b>Las puertas por depth</b> — una fresh (volátil, dentro de <code>fresh_episodes</code> días vividos) se presenta sola: la tormenta de ayer tiñe un hoy despejado. Volátil vieja o consolidada necesita contacto (un tag de contenido compartido), semántica (embedding ≥ <code>retrieval_semantic_min</code>) o — solo consolidada — la felt gate (<code>felt_gate_min</code>): un día que se siente igual despierta lo que nada menciona.',
    en: '<b>The doors by depth</b> — a fresh memory (volatile, within <code>fresh_episodes</code> lived days) presents itself: yesterday’s storm colours a clear today. An old volatile or a consolidated one needs contact (a shared content tag), semantics (embedding ≥ <code>retrieval_semantic_min</code>) or — consolidated only — the felt gate (<code>felt_gate_min</code>): a day that feels the same wakes what nothing mentions.',
  },
  'map.evo.s3': {
    es: '<b>El score → evoked</b> — α·recencia (solo volátiles, envejece por <code>episode_idx</code>) + β·importance + γ·relevance (contact-tags del día y de las creencias en juego) + δ·cosine + cercanía felt. Lo ambiental no abre ni suma. El <code>top_k</code> sobre <code>retrieval_min_score</code> se anota en el evento que la llamó (<code>evocations++</code>, <code>last_evoked_episode</code>) — inerte, al alcance del Lens.',
    en: '<b>The score → evoked</b> — α·recency (volatiles only, aging by <code>episode_idx</code>) + β·importance + γ·relevance (the day’s content tags and those of the beliefs in play) + δ·cosine + felt proximity. The ambient neither opens nor scores. The <code>top_k</code> above <code>retrieval_min_score</code> is noted on the event that called it (<code>evocations++</code>, <code>last_evoked_episode</code>) — inert, within the Lens’s reach.',
  },
  'map.evo.s4': {
    es: '<b>Los musings</b> — el pensamiento interior también aflora: dentro del brief pass, los contextos del día entero (<code>context:solitude</code>, <code>company</code>, <code>danger</code>, <code>safe</code>, <code>deprivation</code>) encienden las líneas voice de <code>mind.musings</code> — solo si TODOS sus contextos valen. La escucha es diaria; la palabra no.',
    en: '<b>The musings</b> — the inner thought surfaces too: inside the brief pass, the whole day’s contexts (<code>context:solitude</code>, <code>company</code>, <code>danger</code>, <code>safe</code>, <code>deprivation</code>) light the voice lines of <code>mind.musings</code> — only if ALL their contexts hold. The listening is daily; the speaking is not.',
  },
  'map.evo.s5': {
    es: '<b>voice_memories</b> — solo lo que el Lens lleva al brief sangra de vuelta: se afianza (strength), su imprint re-alimenta <code>mind.relations</code> a <code>EVOKE_SHARE</code> y el ánimo tira a su punto felt. Y en un encuentro con sustancia, <code>dialogue_recall</code> evoca la memoria que mejor responde lo dicho — anclada a su fase: nunca habla antes del momento que la trajo.',
    en: '<b>voice_memories</b> — only what the Lens carries into the brief bleeds back: it strengthens (strength), its imprint re-feeds <code>mind.relations</code> at <code>EVOKE_SHARE</code> and the mood pulls toward its felt point. And in an encounter with substance, <code>dialogue_recall</code> evokes the memory that best answers what was said — anchored to its phase: it never speaks before the moment that brought it.',
  },
  'map.evo.out': {
    es: 'Lo que aflora es material narrable, no destino: el Lens decide qué del pasado habla hoy. Al cerrar el episodio, la otra mitad del ciclo — la consolidación — decide qué del día merece quedarse.',
    en: 'What surfaces is narratable material, not destiny: the Lens decides what of the past speaks today. When the episode closes, the other half of the loop — consolidation — decides what of the day deserves keeping.',
  },
  'map.evof.in': { es: 'perceived_day + mind.memories', en: 'perceived_day + mind.memories' },
  'map.evof.in.sub': { es: 'el día nuevo llama a lo vivido', en: 'the new day calls what was lived' },
  'map.evof.out': { es: 'evoked + voice', en: 'evoked + voice' },
  'map.evof.out.sub': { es: 'lo que aflora, material del Lens', en: 'what surfaces, Lens material' },
  'map.evof.p1.t': { es: 'El filtro', en: 'The filter' },
  'map.evof.p1.d': { es: 'patrones, trivia y lo rumiado ayer quedan fuera', en: 'patterns, trivia and yesterday’s dwelling stay out' },
  'map.evof.p1.e': { es: 'ej: el pan del camino nunca aflora', en: 'e.g.: the road-bread never surfaces' },
  'map.evof.p2.t': { es: 'Las puertas', en: 'The doors' },
  'map.evof.p2.d': { es: 'fresca entra por recencia; consolidada por contacto, semántica o felt gate', en: 'fresh enters on recency; consolidated on contact, semantics or felt gate' },
  'map.evof.p2.e': { es: 'ej: día gris despierta «la noche del vado»', en: 'e.g.: a grey day wakes “the night at the ford”' },
  'map.evof.p3.t': { es: 'score → evoked', en: 'score → evoked' },
  'map.evof.p3.d': { es: 'α recencia + β importance + γ relevance + δ cosine + felt → top_k', en: 'α recency + β importance + γ relevance + δ cosine + felt → top_k' },
  'map.evof.p3.e': { es: 'ej: orcos hoy → «la cueva» puntúa 0.61', en: 'e.g.: orcs today → “the cave” scores 0.61' },
  'map.evof.p4.t': { es: 'musings por context:*', en: 'musings by context:*' },
  'map.evof.p4.d': { es: 'el contexto del día entero enciende las líneas interiores', en: 'the whole day’s context lights the inner lines' },
  'map.evof.p4.e': { es: 'ej: solo + sin peligro → «a man alone…»', en: 'e.g.: alone + safe → “a man alone…”' },
  'map.evof.p5.t': { es: 'voice_memories', en: 'voice_memories' },
  'map.evof.p5.d': { es: 'lo voceado sangra de vuelta: strength, Relations, ánimo; dialogue_recall evoca', en: 'the voiced bleeds back: strength, Relations, mood; dialogue_recall evokes' },
  'map.evof.p5.e': { es: 'ej: recordar el vado tensa el ánimo', en: 'e.g.: recalling the ford tenses the mood' },

  // -- map: impact (needs/mood) explainer + scheme --------------------------------
  'map.imp.title': { es: 'Cómo me deja el día', en: 'How the day leaves me' },
  'map.imp.hint': { es: 'perceived_day → needs_active + mind.mood', en: 'perceived_day → needs_active + mind.mood' },
  'map.imp.intro': {
    es: 'Con el día vivido, la mente mira hacia adentro: <code>needs_pass</code> lee la condición como carencias, las rachas que rompen advierten, cada need abierta duele el día, y el ánimo se pesa y se asienta — «lo que viví» → «cómo estoy»:',
    en: 'With the day lived, the mind looks inward: <code>needs_pass</code> reads the condition as lacks, broken streaks warn, each open need aches the day, and the mood is weighed and settled — “what I lived” → “how I am”:',
  },
  'map.imp.s1': {
    es: '<b>needs_pass</b> — <code>_detectors</code> lee la condition como carencias (días sin comer → hunger, sombra → dread, heridas → pain), <code>rule_needs</code> dispara las reglas multi-día (exposure, snowbound…) y <code>_threads</code> recolecta lo pendiente del día. <code>_apply_fired</code> lo aplica a <code>mind.needs</code>: lo nuevo se abre, lo abierto se refresca, una carencia se auto-resuelve al limpiar el estado, un thread solo por resolución explícita → <code>needs_active</code>.',
    en: '<b>needs_pass</b> — <code>_detectors</code> reads the condition as lacks (days without food → hunger, shadow → dread, wounds → pain), <code>rule_needs</code> fires the multi-day rules (exposure, snowbound…) and <code>_threads</code> collects the day’s pending. <code>_apply_fired</code> applies it to <code>mind.needs</code>: the new opens, the open refreshes, a lack auto-resolves when the state clears, a thread only on explicit resolution → <code>needs_active</code>.',
  },
  'map.imp.s2': {
    es: '<b>resolve_break_items + need_items</b> — una racha que muere sobre una need abierta advierte en vez de aliviar («no bread» con hambre no es noticia buena). Y cada need abierta se vuelve un ítem del <code>perceived_day</code> — el achaque, con su propio peso.',
    en: '<b>resolve_break_items + need_items</b> — a streak dying over an open need warns instead of relieving (“no bread” while hungry is no relief). And every open need becomes an item of the <code>perceived_day</code> — the ache, with its own weight.',
  },
  'map.imp.s3': {
    es: '<b>episode_mood</b> — el día se pesa: la trayectoria de los mood_pull (no la media — el orden y el aterrizaje) más la presión de los threads abiertos produce <code>episode.mood</code>.',
    en: '<b>episode_mood</b> — the day is weighed: the trajectory of the mood_pulls (not the average — the order and the landing) plus the pressure of open threads yields <code>episode.mood</code>.',
  },
  'map.imp.s4': {
    es: '<b>update_mind_mood</b> — el ánimo del día se mezcla en <code>mind.mood</code>: el cuerpo arrastra y la inercia tira al temperamento. <code>entering_mood</code> se capturó antes de la mezcla — el lens habla el ánimo con que entró, para que el día no se coloree con lo que aún no pasó.',
    en: '<b>update_mind_mood</b> — the day’s mood blends into <code>mind.mood</code>: the body drags and inertia pulls toward the temperament. <code>entering_mood</code> was captured before the blend — the lens speaks the mood it entered with, so the day is not coloured by what has not happened yet.',
  },
  'map.imp.out': {
    es: 'Al salir de esta etapa la mente sabe su estado: qué necesidades están abiertas (<code>needs_active</code>) y con qué ánimo quedó (<code>mind.mood</code>) — la materia que el lens le entregará al narrador.',
    en: 'Leaving this stage the mind knows its state: which needs are open (<code>needs_active</code>) and what mood it landed in (<code>mind.mood</code>) — the material the lens will hand the narrator.',
  },
  'map.impf.in': { es: 'perceived_day', en: 'perceived_day' },
  'map.impf.in.sub': { es: 'el día que la mente vivió', en: 'the day the mind lived' },
  'map.impf.out': { es: 'needs_active + mind.mood', en: 'needs_active + mind.mood' },
  'map.impf.out.sub': { es: 'qué le falta, cómo queda', en: 'what it lacks, how it lands' },
  'map.impf.p1.t': { es: 'needs_pass', en: 'needs_pass' },
  'map.impf.p1.d': { es: 'detectors + rules + threads → needs abiertas, refrescadas o resueltas', en: 'detectors + rules + threads → needs opened, refreshed or resolved' },
  'map.impf.p1.e': { es: 'ej: 2do día sin comer → hunger, urgencia 0.4', en: 'e.g.: 2nd day without food → hunger, urgency 0.4' },
  'map.impf.p2.t': { es: 'breaks + need_items', en: 'breaks + need_items' },
  'map.impf.p2.d': { es: 'la racha rota advierte; cada need abierta duele el día', en: 'the broken streak warns; each open need aches the day' },
  'map.impf.p2.e': { es: 'ej: «the hunger» tira worried (−0.4)', en: 'e.g.: “the hunger” pulls worried (−0.4)' },
  'map.impf.p3.t': { es: 'episode_mood', en: 'episode_mood' },
  'map.impf.p3.d': { es: 'trayectoria de pulls + presión de threads → episode.mood', en: 'pull trajectory + thread pressure → episode.mood' },
  'map.impf.p3.e': { es: 'ej: un día gris → episode.mood −0.5', en: 'e.g.: a grey day → episode.mood −0.5' },
  'map.impf.p4.t': { es: 'update_mind_mood', en: 'update_mind_mood' },
  'map.impf.p4.d': { es: 'se mezcla en mind.mood; el cuerpo arrastra, la inercia regresa al temperamento', en: 'blends into mind.mood; the body drags, inertia returns to temperament' },
  'map.impf.p4.e': { es: 'ej: worried baja el mood → deriva al pesimista de siempre', en: 'e.g.: worried lowers the mood → drifts back to the old pessimist' },

  // -- map: lens explainer + scheme -----------------------------------------------
  'map.lens.title': { es: 'Qué importa hoy', en: 'What matters today' },
  'map.lens.hint': { es: 'mente → lens_block', en: 'mind → lens_block' },
  'map.lens.intro': {
    es: 'Con el día vivido y el pasado ya aflorado, <code>build_brief</code> estrecha la mente a este episodio: de todo lo que es y trae, qué importa hoy. El resultado es el brief — un centro (el Focus), unas líneas que conectan con él, y lo silenciado registrado — que <code>render_lens</code> fija una sola vez en el <code>lens_block</code> que el narrador recibe. El lens nunca nombra lo que el personaje aún no vivió:',
    en: 'With the day lived and the past already surfaced, <code>build_brief</code> narrows the mind to this episode: of everything it is and carries, what matters today. The result is the brief — a centre (the Focus), a few lines that connect to it, and the silenced on record — which <code>render_lens</code> fixes once into the <code>lens_block</code> the narrator receives. The lens never names what the character has not lived yet:',
  },
  'map.lens.s1': {
    es: '<b>Los momentos</b> — <code>build_brief</code> convierte cada ítem notado y leído del <code>perceived_day</code> en un momento con su fase y su peso; los salientes son candidatos a foco. Lo frame (clima, tierra, kilometraje) y lo voice (el cuerpo hablando) nunca toman el foco — pero sí alimentan musings y narración.',
    en: '<b>The moments</b> — <code>build_brief</code> turns every noticed, read item of the <code>perceived_day</code> into a moment with its phase and its weight; the salient ones are focus candidates. The frame (weather, land, mileage) and the voice (the body speaking) never take the focus — but they feed musings and narration.',
  },
  'map.lens.s2': {
    es: '<b>Las carried lines</b> — lo que la mente acarrea al episodio: creencias de <code>active_convictions</code> en juego, <code>evoked</code> ancladas cada una a su fase, <code>needs_active</code> (hablan si nuevas, empeoran o el día las toca — siempre si la urgencia es profunda), <code>entering_mood</code> y los musings encendidos por <code>context:*</code>.',
    en: '<b>The carried lines</b> — what the mind carries into the episode: beliefs from <code>active_convictions</code> in play, <code>evoked</code> memories each anchored to its phase, <code>needs_active</code> (they speak when new, worsening or touched by the day — always past deep urgency), <code>entering_mood</code> and the musings lit by <code>context:*</code>.',
  },
  'map.lens.s3': {
    es: '<b>El focus por reglas</b> — el centro sale mecánicamente: el momento más pesado, una need urgente o una memoria que lo domina todo. Si nada pesa lo bastante no hay foco — y eso también es honesto: un episodio quieto se narra como el tramo quieto que fue.',
    en: '<b>The focus by rules</b> — the centre comes out mechanically: the heaviest moment, an urgent need or a memory that dominates it all. If nothing weighs enough there is no focus — and that is honest too: a quiet episode is narrated as the quiet stretch it was.',
  },
  'map.lens.s4': {
    es: '<b>direct</b> — el Director (LLM, solo protagonistas) ve los candidatos y puede re-elegir el foco y hasta tres líneas por una conexión narrativa que los tags no ven («las huellas de orcos de ayer SON la inquietud de hoy»). Su elección se valida contra las mismas reglas; cualquier fallo deja <code>chosen_by: rules</code>, y las mentes degradadas nunca lo llaman.',
    en: '<b>direct</b> — the Director (LLM, protagonists only) sees the candidates and may re-pick the focus and up to three lines for a narrative connection the tags cannot see (“yesterday’s orc tracks ARE today’s unease”). Its choice is validated against the same rules; any failure leaves <code>chosen_by: rules</code>, and degraded minds never call it.',
  },
  'map.lens.s5': {
    es: '<b>render_lens</b> — el brief se fija en texto plano una sola vez: lo que el personaje trae y lo que el episodio le hace, revelado solo en el momento en que pasa. Reabrir repite el mismo snapshot; el narrador recibe el bloque <code>=== NAME TODAY ===</code>; lo silenciado queda registrado — una creencia ausente es señal, no vacío.',
    en: '<b>render_lens</b> — the brief is fixed into plain text once: what the character carries and what the episode does to it, revealed only at the moment it happens. Re-opening replays the same snapshot; the narrator gets the <code>=== NAME TODAY ===</code> block; the silenced stays on record — an absent belief is signal, not a gap.',
  },
  'map.lens.out': {
    es: 'Esto es lo que la mente le dice al narrador: qué le importa de este episodio, qué lo conecta con quién es, y qué calló. De acá solo falta decirlo — la narración.',
    en: 'This is what the mind tells the narrator: what matters to it about this episode, what connects it to who they are, and what it left unsaid. From here all that is left is telling it — the narration.',
  },
  'map.lensf.in': { es: 'perceived_day + mente', en: 'perceived_day + mind' },
  'map.lensf.in.sub': { es: 'el día vivido y lo que la mente trae', en: 'the lived day and what the mind carries' },
  'map.lensf.out': { es: 'lens_block', en: 'lens_block' },
  'map.lensf.out.sub': { es: 'el guion que el narrador recibe', en: 'the script the narrator receives' },
  'map.lensf.p1.t': { es: 'Los momentos', en: 'The moments' },
  'map.lensf.p1.d': { es: 'perceived_day notado → momentos con fase y peso', en: 'noticed perceived_day → moments with phase and weight' },
  'map.lensf.p1.e': { es: 'ej: «orcos en el vado», tarde, 0.72', en: 'e.g.: “orcs at the ford”, evening, 0.72' },
  'map.lensf.p2.t': { es: 'Las carried lines', en: 'The carried lines' },
  'map.lensf.p2.d': { es: 'beliefs, evoked, needs_active, entering_mood, musings', en: 'beliefs, evoked, needs_active, entering_mood, musings' },
  'map.lensf.p2.e': { es: 'ej: «la cueva» + hambre + musing solitude', en: 'e.g.: “the cave” + hunger + solitude musing' },
  'map.lensf.p3.t': { es: 'El focus', en: 'The focus' },
  'map.lensf.p3.d': { es: 'las reglas: momento más pesado, need urgente o memoria dominante', en: 'the rules: heaviest moment, urgent need or dominant memory' },
  'map.lensf.p3.e': { es: 'ej: foco = «orcos en el vado»', en: 'e.g.: focus = “orcs at the ford”' },
  'map.lensf.p4.t': { es: 'direct', en: 'direct' },
  'map.lensf.p4.d': { es: 'el Director re-elige foco y líneas por conexión narrativa', en: 'the Director re-picks focus and lines by narrative connection' },
  'map.lensf.p4.e': { es: 'ej: las huellas de ayer son la inquietud de hoy', en: 'e.g.: yesterday’s tracks are today’s unease' },
  'map.lensf.p5.t': { es: 'render_lens', en: 'render_lens' },
  'map.lensf.p5.d': { es: 'una vez, a texto plano: brief → lens_block', en: 'once, into plain text: brief → lens_block' },
  'map.lensf.p5.e': { es: 'ej: === ARANATH TODAY ===', en: 'e.g.: === ARANATH TODAY ===' },

  // -- map: narration explainer + scheme -------------------------------------------
  'map.nar.title': { es: 'Cómo se cuenta el día', en: 'How the day is told' },
  'map.nar.hint': { es: 'lens_block + events → narrative', en: 'lens_block + events → narrative' },
  'map.nar.intro': {
    es: 'El episodio ya tiene su guion (el <code>lens_block</code>) y sus hechos sentidos. La narración lo convierte en prosa — siempre en inglés, la inner language: cualquier otra lengua es traducción del texto terminado, nunca una segunda forma de narrar:',
    en: 'The episode already has its script (the <code>lens_block</code>) and its felt facts. Narration turns it into prose — always in English, the inner language: any other tongue is a translation of the finished text, never a second way of narrating:',
  },
  'map.nar.s1': {
    es: '<b>El material</b> — <code>narrator_payload</code> reconstruye el marco del día; los encuentros se rearman desde los events (<code>_encounter_prompt_shape</code>); <code>_previous_rest</code> fija dónde amanece — el primer punto fijo de la espina — y <code>_merged_beats</code> sube las day lines del brief y las dispositions, cada una en su fase.',
    en: '<b>The material</b> — <code>narrator_payload</code> rebuilds the day’s frame; encounters are rebuilt from the events (<code>_encounter_prompt_shape</code>); <code>_previous_rest</code> fixes where dawn opens — the spine’s first fixed point — and <code>_merged_beats</code> raises the brief’s day lines and the dispositions, each in its phase.',
  },
  'map.nar.s2': {
    es: '<b>build_day_prompt</b> — secciones declaradas: quién es (<code>=== CHARACTER ===</code>), cómo narra (<code>NARRATOR\'S LENS</code>), cómo está hoy (<code>=== NAME TODAY ===</code>), el clima, los encuentros, la línea temporal, el viaje, las instrucciones, lo que no repetir — y si es el último día.',
    en: '<b>build_day_prompt</b> — declared sections: who they are (<code>=== CHARACTER ===</code>), how they narrate (<code>NARRATOR\'S LENS</code>), how they are today (<code>=== NAME TODAY ===</code>), the weather, the encounters, the timeline, the journey, the instructions, what not to repeat — and whether this is the last day.',
  },
  'map.nar.s3': {
    es: '<b>generate_narrative</b> — el LLM escribe el día entero en la inner language. Este texto es el que la mente mide: el inglés es el original, todo lo demás es traducción.',
    en: '<b>generate_narrative</b> — the LLM writes the whole day in the inner language. This text is the one the mind measures: English is the original, everything else is translation.',
  },
  'map.nar.s4': {
    es: '<b>run_narrative_evals</b> — el texto se mide: opening, prompt_quote, encounters_presented, scenery_inventory. Medidos, no bloqueantes — una narración que falla un check igual se entrega.',
    en: '<b>run_narrative_evals</b> — the text is measured: opening, prompt_quote, encounters_presented, scenery_inventory. Measured, not blocking — a narration that fails a check is still delivered.',
  },
  'map.nar.s5': {
    es: '<b>translate_text</b> — si el lector pide otra lengua, el texto terminado se traduce: <code>narrative</code> guarda siempre la inner, <code>narrative_translation</code> la del lector. Una traducción fallida entrega la inner — nunca el vacío.',
    en: '<b>translate_text</b> — if the reader asks another tongue, the finished text is translated: <code>narrative</code> always keeps the inner, <code>narrative_translation</code> the reader’s. A failed translation delivers the inner — never the void.',
  },
  'map.nar.out': {
    es: 'El episodio queda <code>narrated</code>: su prosa en inner language, la traducción al lado. Este es el texto que la mente después compara contra lo que sostenía — el guion contra lo contado.',
    en: 'The episode lands <code>narrated</code>: its prose in the inner language, the translation beside it. This is the text the mind later compares against what it held — the script against what was told.',
  },
  'map.narf.in': { es: 'lens_block + events', en: 'lens_block + events' },
  'map.narf.in.sub': { es: 'el guion y los hechos del día', en: 'the script and the day’s facts' },
  'map.narf.out': { es: 'narrative (+translation)', en: 'narrative (+translation)' },
  'map.narf.out.sub': { es: 'el día contado, en inner language', en: 'the day told, in the inner language' },
  'map.narf.p1.t': { es: 'El material', en: 'The material' },
  'map.narf.p1.d': { es: 'marco, encuentros desde events, resto anterior, beats por fase', en: 'frame, encounters from events, previous rest, beats per phase' },
  'map.narf.p1.e': { es: 'ej: amanece donde durmió anoche', en: 'e.g.: dawn opens where last night was spent' },
  'map.narf.p2.t': { es: 'El prompt', en: 'The prompt' },
  'map.narf.p2.d': { es: 'secciones declaradas: quién, cómo narra, cómo está, qué pasó', en: 'declared sections: who, how they narrate, how they are, what happened' },
  'map.narf.p2.e': { es: 'ej: === ARANATH TODAY ===', en: 'e.g.: === ARANATH TODAY ===' },
  'map.narf.p3.t': { es: 'La llamada', en: 'The call' },
  'map.narf.p3.d': { es: 'el LLM escribe el día entero en inglés — la inner language', en: 'the LLM writes the whole day in English — the inner language' },
  'map.narf.p3.e': { es: 'ej: narrative (en)', en: 'e.g.: narrative (en)' },
  'map.narf.p4.t': { es: 'Los evals', en: 'The evals' },
  'map.narf.p4.d': { es: 'el texto se mide: opening, quotes, encounters, scenery', en: 'the text is measured: opening, quotes, encounters, scenery' },
  'map.narf.p4.e': { es: 'ej: encounters_presented FAIL → queda logueado', en: 'e.g.: encounters_presented FAIL → logged' },
  'map.narf.p5.t': { es: 'La traducción', en: 'The translation' },
  'map.narf.p5.d': { es: 'el texto terminado se traduce al lector; la inner se queda', en: 'the finished text translates for the reader; the inner stays' },
  'map.narf.p5.e': { es: 'ej: narrative_translation es', en: 'e.g.: narrative_translation es' },

  // -- map: memory explainer + scheme --------------------------------------------
  'map.mem.title': { es: 'Qué me llevo de hoy', en: 'What the day leaves me' },
  'map.mem.hint': { es: 'perceived_day → memories', en: 'perceived_day → memories' },
  'map.mem.intro': {
    es: 'Al cerrar el episodio, lo vivido se asienta: <code>encode_episode</code> decide qué del día gana fila en <code>mind.memories</code>, qué se absorbe en lo que ya había, qué se afianza (<code>decay_pass</code>) y qué se deja perder (<code>forget</code>). Una memoria se gana su fila — la octava noche igual es contabilidad, no una impresión:',
    en: 'When the episode closes, what was lived settles: <code>encode_episode</code> decides what of the day earns a row in <code>mind.memories</code>, what absorbs into what was already there, what fixes (<code>decay_pass</code>) and what is let go (<code>forget</code>). A memory earns its row — the eighth identical night is bookkeeping, not an impression:',
  },
  'map.mem.s1': {
    es: '<b>_describe</b> — sin palabras no hay impresión: una lectura que resuelve a un nombre pelado («town», «Minas Girithlin») es el fallback del resolvedor, no algo vivido. Las comidas y los encuentros son la excepción — ahí el nombre ES el contenido («lembas», «zorros rojos»). Lo unnoticed deja solo su difuso; lo sintético pesa el ánimo pero no se archiva.',
    en: '<b>_describe</b> — no words, no impression: a reading that resolves to a bare name (“town”, “Minas Girithlin”) is the resolver’s fallback, not something lived. Meals and encounters are the exception — there the name IS the content (“lembas”, “red foxes”). The unnoticed leaves only its difuso; the synthetic weighs on the mood but is not filed.',
  },
  'map.mem.s2': {
    es: '<b>La absorción</b> — la misma cosa vivida es la misma memoria: <code>by_desc</code> (kind + descripción + entidad) absorbe el episodio en la fila existente en vez de copiarla. Una need habla una sola voz en todo su arco (<code>need:&lt;key&gt;</code>): «the hunger» madura como una memoria, no como una copia por amanecer.',
    en: '<b>The absorption</b> — the same lived thing is the same memory: <code>by_desc</code> (kind + description + entity) absorbs the episode into the existing row instead of copying it. A need speaks in one voice through its whole arc (<code>need:&lt;key&gt;</code>): “the hunger” matures as one memory, not a copy per dawn.',
  },
  'map.mem.s3': {
    es: '<b>_distinct_signature</b> — una clase de cosa que la mente ya guarda gana fila nueva solo si enseña algo: firma distinta (type + anchor + contact-tags), un récord de su firma — que se absorbe en la fila conservada —, una ruptura, o ser el Focus del día (<code>focus_memory_boost</code> codifica más fuerte de lo que pesó).',
    en: '<b>_distinct_signature</b> — a kind of thing the mind already keeps earns a new row only by teaching something: a distinct signature (type + anchor + contact-tags), a record for its signature — absorbed into the kept row —, a rupture, or being the day’s Focus (<code>focus_memory_boost</code> encodes stronger than it weighed).',
  },
  'map.mem.s4': {
    es: '<b>detect_patterns + decay_pass↑</b> — una racha de temas recurrentes puede volverse memoria <code>pattern</code> — un segundo camino a la permanencia. Y lo voceado se fija al alcanzar su cuenta (<code>evocations_to_fix</code>) con piso de importancia: la trivia voceada a diario se fortalece pero nunca fija; lo de mayor peso (salience ≥ <code>fixed_threshold</code>) nace ya consolidado.',
    en: '<b>detect_patterns + decay_pass↑</b> — a streak of recurring themes can become a <code>pattern</code> memory — a second path to permanence. And the voiced fixes once it reaches its count (<code>evocations_to_fix</code>) above an importance floor: trivia voiced daily strengthens yet never fixes; the heaviest (salience ≥ <code>fixed_threshold</code>) is born consolidated.',
  },
  'map.mem.s5': {
    es: '<b>decay_pass↓ + forget + erosión</b> — lo que nunca afloró decae por tiers (volátil al base, lo sentido o importante al sticky, consolidada al crawl); lo nacido o agitado este episodio está exento; bajo <code>forget_threshold</code> muere a <code>mind.forgotten_memories</code>. Y lo sostenido también se erosiona: <code>belief_fade_pass</code> desgasta convicciones sobre lo pasajero, <code>decay_all</code> enfría <code>mind.relations</code>, <code>close_episode_memory</code> libera las needs resueltas.',
    en: '<b>decay_pass↓ + forget + erosion</b> — what never surfaced decays by tiers (volatiles at base, the strongly felt or important at sticky, consolidated at the crawl); anything born or stirred this episode is exempt; below <code>forget_threshold</code> it dies into <code>mind.forgotten_memories</code>. And what was held erodes too: <code>belief_fade_pass</code> wears convictions about the passing, <code>decay_all</code> cools <code>mind.relations</code>, <code>close_episode_memory</code> frees resolved needs.',
  },
  'map.mem.out': {
    es: 'La consolidación no solo decide qué recuerdos quedan: también asienta quién sos. La mente que despierta mañana es este sedimento — memorias que quedaron, posturas que enfriaron, convicciones que se afirmaron o se dejaron ir: la identidad hecha de lo vivido.',
    en: 'Consolidation does not only decide which memories stay: it also settles who you are. The mind that wakes tomorrow is this sediment — memories kept, standings cooled, convictions affirmed or let go: identity made of what was lived.',
  },
  'map.memf.in': { es: 'perceived_day', en: 'perceived_day' },
  'map.memf.in.sub': { es: 'el día que la mente vivió', en: 'the day the mind lived' },
  'map.memf.out': { es: 'memories + forgotten', en: 'memories + forgotten' },
  'map.memf.out.sub': { es: 'lo que queda y lo que deja rastro', en: 'what stays and what leaves a trace' },
  'map.memf.p1.t': { es: '_describe', en: '_describe' },
  'map.memf.p1.d': { es: 'lectura a nombre pelado → nada; meal y encounter exentos', en: 'a bare-name reading → nothing; meal and encounter exempt' },
  'map.memf.p1.e': { es: 'ej: «town» → nada; «lembas» sí', en: 'e.g.: “town” → nothing; “lembas” does' },
  'map.memf.p2.t': { es: 'La absorción', en: 'The absorption' },
  'map.memf.p2.d': { es: 'by_desc + need-arc: misma cosa vivida, misma fila', en: 'by_desc + need-arc: same lived thing, same row' },
  'map.memf.p2.e': { es: 'ej: el hambre, una sola voz todo su arco', en: 'e.g.: the hunger, one voice its whole arc' },
  'map.memf.p3.t': { es: '_distinct_signature', en: '_distinct_signature' },
  'map.memf.p3.d': { es: 'firma nueva, récord absorbido, ruptura o el foco del día', en: 'new signature, absorbed record, rupture or the day’s focus' },
  'map.memf.p3.e': { es: 'ej: 8ª noche igual → nada; récord → refresca su fila', en: 'e.g.: 8th identical night → nothing; a record → refreshes its row' },
  'map.memf.p4.t': { es: 'detect_patterns + decay↑', en: 'detect_patterns + decay↑' },
  'map.memf.p4.d': { es: 'rachas → patrón; voceado ≥ evocations_to_fix fija; ≥0.8 nace fija', en: 'streaks → pattern; voiced ≥ evocations_to_fix fixes; ≥0.8 born fixed' },
  'map.memf.p4.e': { es: 'ej: contada 3 veces → consolidada', en: 'e.g.: told 3 times → consolidated' },
  'map.memf.p5.t': { es: 'decay↓ + forget + erosión', en: 'decay↓ + forget + erosion' },
  'map.memf.p5.d': { es: 'decae por tiers; belief_fade, decay_all, close_episode_memory', en: 'decays by tiers; belief_fade, decay_all, close_episode_memory' },
  'map.memf.p5.e': { es: 'ej: fuerza <0.2 → forgotten', en: 'e.g.: strength <0.2 → forgotten' },

  // -- map: close explainer + scheme ----------------------------------------------
  'map.clo.title': { es: 'Pensar el día', en: 'Thinking the day over' },
  'map.clo.hint': { es: 'memories + mood → beliefs?', en: 'memories + mood → beliefs?' },
  'map.clo.intro': {
    es: 'Último acto del close: la mente no solo archiva — puede pensar. <code>maybe_reflect</code> es el único paso que puede convertir lo vivido en convicción, y por eso está gatillado con cuidado: no todos los días merecen sentarse a pensar:',
    en: 'Last act of the close: the mind does not only file — it can think. <code>maybe_reflect</code> is the only step that can turn what was lived into conviction, and that is why it is carefully triggered: not every day deserves sitting down to think:',
  },
  'map.clo.s1': {
    es: '<b>El gatillo</b> — salta cada <code>reflection_every</code> episodios (la cadencia es del wiring, una agenda — nadie la templa por carácter) o cuando el mundo pega fuerte: un evento del mundo con salience ≥ <code>reflection_importance_min</code>. Lo propio nunca gatilla — «seguir hambriento» no es noticia, el ataque de wargs sí — y las mentes degradadas nunca reflejan.',
    en: '<b>The trigger</b> — it fires every <code>reflection_every</code> episodes (the cadence is the wiring’s, a schedule — no character trait bends it) or when the world hits hard: a world event with salience ≥ <code>reflection_importance_min</code>. The mind’s own bookkeeping never triggers — “still hungry” is not news, the warg attack is — and degraded minds never reflect.',
  },
  'map.clo.s2': {
    es: '<b>La evidencia</b> — solo llegan al prompt las memorias con importance ≥ <code>belief_evidence_importance_min</code> o |valence| ≥ <code>belief_evidence_valence_min</code>: tres días de llovizna son clima, no cosmovisión. Las need-memories quedan fuera — «necesito refugio» como convicción solo re-diría la necesidad.',
    en: '<b>The evidence</b> — only memories with importance ≥ <code>belief_evidence_importance_min</code> or |valence| ≥ <code>belief_evidence_valence_min</code> reach the prompt: three days of drizzle are weather, not worldview. Need-memories stay out — “I need shelter” as a conviction would just re-say the need.',
  },
  'map.clo.s3': {
    es: '<b>Lo que puede nacer</b> — el LLM lee las memorias pesadas y el ánimo, y puede escribir una Belief en <code>mind.memories</code> (kind conviction): «the fords are watched now». Desde mañana ablanda evocaciones, entra al lens y tiñe la percepción.',
    en: '<b>What may be born</b> — the LLM reads the weighted memories and the mood, and may write a Belief in <code>mind.memories</code> (kind conviction): “the fords are watched now”. From tomorrow it softens evocations, enters the lens and tints perception.',
  },
  'map.clo.out': {
    es: 'La reflexión no siempre dice algo: un día quieto puede no gatillar, y un gatillo puede no parir creencia. Pero cuando lo hace, la mente del día siguiente ya no es la misma.',
    en: 'Reflection does not always speak: a quiet day may not trigger, and a trigger may birth no belief. But when it does, tomorrow’s mind is no longer the same.',
  },
  'map.clof.in': { es: 'memories + mood', en: 'memories + mood' },
  'map.clof.in.sub': { es: 'lo que pesó y cómo quedó', en: 'what weighed and how it landed' },
  'map.clof.out': { es: 'beliefs? (+ mood)', en: 'beliefs? (+ mood)' },
  'map.clof.out.sub': { es: 'convicciones nuevas, si las hubo', en: 'new convictions, if any' },
  'map.clof.p1.t': { es: 'El gatillo', en: 'The trigger' },
  'map.clof.p1.d': { es: 'cada reflection_every episodios, o un golpe del mundo ≥0.85', en: 'every reflection_every episodes, or a world hit ≥0.85' },
  'map.clof.p1.e': { es: 'ej: wargs en el vado → reflect', en: 'e.g.: wargs at the ford → reflect' },
  'map.clof.p2.t': { es: 'La evidencia', en: 'The evidence' },
  'map.clof.p2.d': { es: 'solo memorias con peso o sentimiento llegan al prompt', en: 'only memories with weight or feeling reach the prompt' },
  'map.clof.p2.e': { es: 'ej: 3 días de llovizna → no llegan', en: 'e.g.: 3 days of drizzle → left out' },
  'map.clof.p3.t': { es: 'Lo que nace', en: 'What is born' },
  'map.clof.p3.d': { es: 'el LLM puede escribir una Belief sobre lo vivido', en: 'the LLM may write a Belief about what was lived' },
  'map.clof.p3.e': { es: 'ej: «the fords are watched now»', en: 'e.g.: “the fords are watched now”' },
}

export function t(key: string, params?: Record<string, string | number>): string {
  let s = S[key]?.[locale.value] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replaceAll(`{${k}}`, String(v))
    }
  }
  return s
}

/** Bilingual field picker for content data (descriptions, tag prose…). */
export function pick(field: { es?: string | null; en?: string | null } | null | undefined): string {
  if (!field) return ''
  return field[locale.value] || field.es || field.en || ''
}
