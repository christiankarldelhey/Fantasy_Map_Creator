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
  'tab.summary': { es: 'Resumen', en: 'Summary' },
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
  'per.temp': { es: 'Temperament', en: 'Temperament' },
  'per.temp.sub': { es: 'el punto de reposo del ánimo', en: 'the mood’s resting point' },
  'per.temp.desc': {
    es: 'A dónde vuelve el ánimo cuando nada lo empuja. El mood de arriba es el tiempo de hoy; esto es el clima del personaje.',
    en: 'Where the mood returns when nothing pushes it. The mood above is today’s weather; this is the character’s climate.',
  },
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
  'per.temp.valence': { es: 'Ánimo de base', en: 'Base valence' },
  'per.temp.valence.help': { es: 'Pesimista ↔ optimista por naturaleza.', en: 'Pessimistic ↔ optimistic by nature.' },
  'per.temp.valence.low': { es: 'Pesimista', en: 'Pessimist' },
  'per.temp.valence.high': { es: 'Optimista', en: 'Optimist' },
  'per.temp.arousal': { es: 'Agitación de base', en: 'Base arousal' },
  'per.temp.arousal.help': { es: 'Calmo ↔ revuelto por naturaleza.', en: 'Calm ↔ stirred by nature.' },
  'per.temp.arousal.low': { es: 'Apacible', en: 'Placid' },
  'per.temp.arousal.high': { es: 'Inquieto', en: 'Restless' },
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
  'mem.forgotten': { es: 'Olvidados', en: 'Forgotten' },
  'mem.beliefs': { es: 'Creencias', en: 'Beliefs' },
  'mem.musings': { es: 'Voz interior', en: 'Inner voice' },
  'mem.relations': { es: 'Vínculos', en: 'Relations' },
  'mem.alive.help': {
    es: 'Lo que recuerda de sus viajes (Memory). Los recuerdos se debilitan con el tiempo salvo que algo los vuelva a traer (Evocation).',
    en: 'What they remember from their journeys (Memory). Memories weaken with time unless something brings them back (Evocation).',
  },
  'mem.forgotten.help': {
    es: 'Recuerdos que se debilitaron hasta perderse (Forgotten). Queda su rastro, pero ya no influyen.',
    en: 'Memories that weakened until lost (Forgotten). Their trace remains, but they no longer weigh in.',
  },
  'mem.beliefs.help': {
    es: 'Lo que tiene por cierto (Belief / Conviction). Algunas vienen del preset y otras las aprendió reflexionando sobre lo vivido.',
    en: 'What it holds true (Belief / Conviction). Some come from the preset, others it learned reflecting on what it lived.',
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
  'mem.col.forgottenIn': { es: 'Olvidado en', en: 'Forgotten in' },
  'mem.feel.neg': { es: 'Negativo', en: 'Negative' },
  'mem.feel.pos': { es: 'Positivo', en: 'Positive' },
  'mem.feel.neutral': { es: 'Neutro', en: 'Neutral' },
  'mem.empty.alive': { es: 'No hay recuerdos.', en: 'No memories.' },
  'mem.empty.forgotten': { es: 'No olvidó nada todavía.', en: 'Nothing forgotten yet.' },
  'mem.empty.beliefs': { es: 'No tiene creencias todavía.', en: 'No beliefs yet.' },
  'mem.empty.musings': { es: 'Este personaje no tiene frases de voz interior.', en: 'This character has no inner-voice lines.' },
  'mem.empty.relations': { es: 'Todavía no siente nada por nada — los vínculos se sedimentan con lo vivido.', en: 'No feelings about anything yet — relations sediment from what is lived.' },
  'mem.preset': { es: 'Preset', en: 'Preset' },
  'mem.ep': { es: 'Ep. {n}', en: 'Ep. {n}' },
  'mem.consolidated': { es: 'Consolidado', en: 'Consolidated' },
  'mem.appearsWith': { es: 'Aparece con:', en: 'Appears with:' },
  'belief.col.belief': { es: 'Creencia', en: 'Belief' },
  'belief.col.subject': { es: 'A qué se refiere', en: 'Subject' },
  'belief.col.about': { es: 'Sobre qué', en: 'About' },
  'belief.col.horizon': { es: 'Duración', en: 'Horizon' },
  'belief.col.horizon.help': {
    es: 'Pasajera: se desvanece con los días. Duradera: no caduca sola.',
    en: 'Transient: fades with the days. Enduring: does not expire on its own.',
  },
  'belief.col.origin': { es: 'Origen', en: 'Origin' },
  'belief.col.strength': { es: 'Firmeza', en: 'Strength' },
  'belief.col.strength.help': { es: 'Qué tan firme la sostiene, de 0 a 5', en: 'How firmly held, 0 to 5' },
  'belief.col.since': { es: 'Desde', en: 'Since' },
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
  'map.stage.perception': { es: 'Percepción', en: 'Perception' },
  'map.stage.needs/mood': { es: 'Impacto', en: 'Impact' },
  'map.trace': {
    es: 'Trazado real — los pasos del día dorado, nodo a nodo',
    en: 'Real trace — the golden day, step by step',
  },

  // -- map: perception explainer ------------------------------------------------
  'map.perc.title': { es: 'Cómo funciona la Perception', en: 'How Perception works' },
  'map.perc.hint': { es: 'events[] → perceived_day', en: 'events[] → perceived_day' },
  'map.perc.intro': {
    es: 'El mundo entrega el día como una lista de hechos ya verbalizados (<code>events[]</code>). Perception lo transforma en el día vivido (<code>perceived_day</code>): qué notó la mente, cómo lo leyó y cuánto le pesó. Los mismos hechos producen días distintos según quién los vive. Cada evento recorre estos procesos, en orden — abajo, el mismo proceso con un ejemplo concreto:',
    en: 'The world hands over the day as a list of already-verbalized facts (<code>events[]</code>). Perception turns it into the lived day (<code>perceived_day</code>): what the mind noticed, how it read it, and how much it weighed. The same facts make different days for different minds. Every event walks these processes, in order — below, the same process with a concrete example:',
  },
  'map.perc.s1': {
    es: '<b>Tag</b> — convierte el hecho en señales: quién participa, dónde pasó, de qué tipo. Las ausencias («wounded: none») no señalizan: son contexto, no contenido.',
    en: '<b>Tag</b> — turns the fact into signals: who took part, where it happened, what kind. Absences (“wounded: none”) never signal: they are context, not content.',
  },
  'map.perc.s2': {
    es: '<b>Check</b> — decide si el evento entró en la conciencia. Si el personaje duerme, se lo pierde salvo que sea intrusivo; si el evento trae un check, un dado sembrado decide: <code>noticed</code>, <code>unnoticed</code> o <code>misread</code>.',
    en: '<b>Check</b> — decides whether the event entered consciousness. Asleep, it is missed unless intrusive; if the event carries a check, a seeded die decides: <code>noticed</code>, <code>unnoticed</code> or <code>misread</code>.',
  },
  'map.perc.s3': {
    es: '<b>Reading</b> — pone las palabras con que el evento se vivirá. Un misread las reescribe: la mente se equivoca sobre lo que pasó, nunca sobre los hechos del mundo.',
    en: '<b>Reading</b> — writes the words the event will be lived in. A misread rewrites them: the mind can be wrong about what happened, never about the world’s facts.',
  },
  'map.perc.s4': {
    es: '<b>Significado y peso</b> — el paquete semántico declara qué significa el contacto (miedo, afecto, severidad); la salience decide cuánto pesa — lo que esta mente ya ama o teme estaba vigilado, lo nuevo pesa distinto a lo repetido. Lo unnoticed no significa nada: un favor dormido nunca ocurrió.',
    en: '<b>Meaning and weight</b> — the semantic pack declares what the contact meant (fear, affection, severity); salience decides how much it weighs — what this mind already loves or fears stays watched, and the new weighs differently from the repeated. The unnoticed means nothing: a favour slept through never happened.',
  },
  'map.perc.s5': {
    es: '<b>Imprint</b> — ese significado sedimenta en la Relation del sujeto (el más específico lo recibe entero, los demás por salpicadura) y el cuerpo recibe su golpe.',
    en: '<b>Imprint</b> — that meaning sediments into the subject’s Relation (the narrowest takes it whole, the rest by splash) and the body takes its hit.',
  },
  'map.perc.s6': {
    es: '<b>Tirón del ánimo</b> — la palabra sentida del evento apunta a un lugar de la rueda y tira del ánimo hacia ahí, refractada por lo que el sujeto ya significa. El valence del ítem es hacia dónde tiró; el world_valence guarda lo que el evento significó sin doblar.',
    en: '<b>Mood pull</b> — the event’s felt word points at a spot on the wheel and pulls the mood toward it, refracted through what the subject already means. The item’s valence is where it pulled; world_valence keeps what the event meant, unbent.',
  },
  'map.perc.s7': {
    es: '<b>Recurrence</b> — con los eventos ya vistos, la mente mira las rachas: lo percibido tres episodios seguidos desgasta; una racha que muere hoy es noticia de un día — salvo que rompa sobre una necesidad abierta, donde advierte en vez de aliviar.',
    en: '<b>Recurrence</b> — with the events seen, the mind reads streaks: what repeated three episodes running wears; a streak that died today is one-day news — unless it broke over an open need, where it warns instead of relieving.',
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
  'map.flow.p1.t': { es: 'Tag', en: 'Tag' },
  'map.flow.p1.d': { es: 'el hecho se vuelve señales: quién, dónde, qué tipo', en: 'the fact becomes signals: who, where, what kind' },
  'map.flow.p1.e': { es: 'ej: orcos en el vado → entity:orcs · place:ford', en: 'e.g.: orcs at the ford → entity:orcs · place:ford' },
  'map.flow.p2.t': { es: 'Check', en: 'Check' },
  'map.flow.p2.d': { es: '¿entró o no? dormido se pierde; con check, el dado decide', en: 'did it register? asleep it is missed; a check rolls the die' },
  'map.flow.p2.e': { es: 'ej: dado ganado → noticed', en: 'e.g.: die won → noticed' },
  'map.flow.p3.t': { es: 'Reading', en: 'Reading' },
  'map.flow.p3.d': { es: 'las palabras con que el evento se vivirá', en: 'the words the event will be lived in' },
  'map.flow.p3.e': { es: 'ej: «Sombras grises entre los juncos del vado»', en: 'e.g.: “Grey shapes in the reeds at the ford”' },
  'map.flow.p4.t': { es: 'Significado y peso', en: 'Meaning and weight' },
  'map.flow.p4.d': { es: 'qué significó objetivamente y cuánto pesa para esta mente', en: 'what it objectively meant and how much it weighs to this mind' },
  'map.flow.p4.e': { es: 'ej: orcos = miedo → salience 0.72', en: 'e.g.: orcs = fear → salience 0.72' },
  'map.flow.p5.t': { es: 'Imprint', en: 'Imprint' },
  'map.flow.p5.d': { es: 'sedimenta en la Relation del sujeto; el cuerpo recibe su golpe', en: 'sediments into the subject’s Relation; the body takes its hit' },
  'map.flow.p5.e': { es: 'ej: Relation «orcs»: miedo +0.3', en: 'e.g.: Relation “orcs”: fear +0.3' },
  'map.flow.p6.t': { es: 'Tirón del ánimo', en: 'Mood pull' },
  'map.flow.p6.d': { es: 'la palabra sentida tira del ánimo a su punto de la rueda', en: 'the felt word pulls the mood toward its wheel point' },
  'map.flow.p6.e': { es: 'ej: watchful — el ánimo se tensa', en: 'e.g.: watchful — the mood tenses' },
  'map.flow.p7.t': { es: 'Recurrence', en: 'Recurrence' },
  'map.flow.p7.d': { es: 'al final, las rachas: lo que se repite desgasta, lo que se corta es noticia', en: 'at the end, streaks: what repeats wears, what breaks is news' },
  'map.flow.p7.e': { es: 'ej: 3er día de lluvia → ítem de repetición', en: 'e.g.: 3rd day of rain → repetition item' },

  // -- map: impact (needs/mood) explainer + scheme --------------------------------
  'map.imp.title': { es: 'Cómo me deja el día', en: 'How the day leaves me' },
  'map.imp.hint': { es: 'perceived_day → needs + mood', en: 'perceived_day → needs + mood' },
  'map.imp.intro': {
    es: 'Con el día vivido, la mente mira hacia adentro: qué le falta al cuerpo, qué quedó pendiente, y con qué ánimo queda. Es la etapa que convierte «lo que viví» en «cómo estoy» — las necesidades hablan primero, porque el cuerpo pesa sobre el ánimo:',
    en: 'With the day lived, the mind looks inward: what the body lacks, what stayed pending, and what mood it is left in. This stage turns “what I lived” into “how I am” — needs speak first, because the body weighs on the mood:',
  },
  'map.imp.s1': {
    es: '<b>El cuerpo informa</b> — la condición se lee como carencias: días sin comer → hambre, energía baja → fatiga, sombra creciente → temor, heridas → dolor. La urgencia crece con el estado, y las rachas multi-día (exposure, snowbound…) disparan necesidades compuestas.',
    en: '<b>The body reports</b> — the condition reads as lacks: days without food → hunger, low energy → fatigue, rising shadow → dread, wounds → pain. Urgency grows with the state, and multi-day streaks (exposure, snowbound…) fire compound needs.',
  },
  'map.imp.s2': {
    es: '<b>Lo pendiente se anota</b> — las intenciones que el mundo dejó en los eventos (threads) se abren; lo abierto se refresca. Una carencia fisiológica se cierra sola cuando el estado se limpia — comió, descansó; un thread solo cierra cuando el mundo lo resuelve.',
    en: '<b>What is pending gets noted</b> — the intentions the world left on events (threads) open; what was open refreshes. A physiological lack closes itself when the state clears — ate, rested; a thread only closes when the world resolves it.',
  },
  'map.imp.s3': {
    es: '<b>Lo que falta duele</b> — cada necesidad fisiológica abierta se vuelve algo sentido: un ítem del día con su propio peso, que tira el ánimo a worried — o a distressed si la urgencia es profunda. El hambre de estos días también queda como memoria.',
    en: '<b>What is lacking aches</b> — every open physiological need becomes something felt: a day item with its own weight, pulling the mood to worried — or to distressed when the urgency runs deep. The hunger of these days becomes memory too.',
  },
  'map.imp.s4': {
    es: '<b>El día se pesa</b> — todo lo vivido, achaques incluidos, produce el ánimo del episodio: la media de cómo se sintió cada cosa, ponderada por cuánto pesó.',
    en: '<b>The day is weighed</b> — everything lived, aches included, yields the episode mood: the average of how each thing felt, weighted by how much it mattered.',
  },
  'map.imp.s5': {
    es: '<b>El ánimo se asienta</b> — el ánimo del día se mezcla en el corriente; el cuerpo arrastra (hambre, frío y dolor bajan la valencia) y la inercia lo devuelve hacia el temperamento. El narrador recibe el ánimo de entrada — capturado antes de la mezcla, para que el día no se coloree con lo que aún no pasó.',
    en: '<b>The mood settles</b> — the day’s mood blends into the running one; the body drags (hunger, cold and pain lower valence) and inertia pulls it back toward the temperament. The narrator gets the entering mood — captured before the blend, so the day is not coloured by what has not happened yet.',
  },
  'map.imp.out': {
    es: 'Al salir de esta etapa la mente sabe su estado: qué necesidades están abiertas (<code>needs_active</code>) y con qué ánimo quedó (<code>mind.mood</code>) — la materia que el lens le entregará al narrador.',
    en: 'Leaving this stage the mind knows its state: which needs are open (<code>needs_active</code>) and what mood it landed in (<code>mind.mood</code>) — the material the lens will hand the narrator.',
  },
  'map.impf.in': { es: 'perceived_day', en: 'perceived_day' },
  'map.impf.in.sub': { es: 'el día que la mente vivió', en: 'the day the mind lived' },
  'map.impf.out': { es: 'needs + mood', en: 'needs + mood' },
  'map.impf.out.sub': { es: 'qué le falta, cómo queda', en: 'what it lacks, how it lands' },
  'map.impf.p1.t': { es: 'El cuerpo informa', en: 'The body reports' },
  'map.impf.p1.d': { es: 'la condición se lee como carencias: hambre, fatiga, dolor, sombra', en: 'the condition reads as lacks: hunger, fatigue, pain, shadow' },
  'map.impf.p1.e': { es: 'ej: 2do día sin comer → hunger, urgencia 0.4', en: 'e.g.: 2nd day without food → hunger, urgency 0.4' },
  'map.impf.p2.t': { es: 'Lo pendiente', en: 'What is pending' },
  'map.impf.p2.d': { es: 'threads del mundo + lo que se cerró: se abre, refresca o resuelve', en: 'world threads + what closed: opens, refreshes, or resolves' },
  'map.impf.p2.e': { es: 'ej: hunger se abre; el thread del vado sigue', en: 'e.g.: hunger opens; the ford thread stays' },
  'map.impf.p3.t': { es: 'El achaque', en: 'The ache' },
  'map.impf.p3.d': { es: 'cada necesidad abierta duele el día con su propio peso', en: 'each open need aches the day with its own weight' },
  'map.impf.p3.e': { es: 'ej: «the hunger» tira worried (−0.4)', en: 'e.g.: “the hunger” pulls worried (−0.4)' },
  'map.impf.p4.t': { es: 'El día se pesa', en: 'The day is weighed' },
  'map.impf.p4.d': { es: 'todo lo vivido + los achaques → el ánimo del episodio', en: 'all that was lived + the aches → the episode mood' },
  'map.impf.p4.e': { es: 'ej: un día gris → episode.mood −0.5', en: 'e.g.: a grey day → episode.mood −0.5' },
  'map.impf.p5.t': { es: 'El ánimo se asienta', en: 'The mood settles' },
  'map.impf.p5.d': { es: 'se mezcla en el corriente, el cuerpo arrastra, la inercia regresa al temperamento', en: 'blends into the running mood, the body drags, inertia returns to temperament' },
  'map.impf.p5.e': { es: 'ej: worried baja el mood → deriva al pesimista de siempre', en: 'e.g.: worried lowers the mood → drifts back to the old pessimist' },
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
