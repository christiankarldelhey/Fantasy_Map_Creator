// Every user-facing label the Studio shows for engine keys. The engine
// speaks in keys (piel, tag:weather:storm, HUNGER); the Studio owns how
// they read in Spanish.

export interface TraitCopy {
  label: string
  help: string
  low: string
  high: string
}

export const LIVING_TRAITS = ['piel', 'rumia', 'atencion', 'conviccion', 'curiosidad'] as const
export const DORMANT_TRAITS = ['impulso', 'deliberacion', 'integridad', 'coraje', 'corruptibilidad'] as const

export const TRAITS: Record<string, TraitCopy> = {
  piel: {
    label: 'Sensibilidad',
    help: 'Cuánto le cambia el ánimo lo que vive.',
    low: 'Imperturbable',
    high: 'Todo le afecta',
  },
  rumia: {
    label: 'Peso del pasado',
    help: 'Cuánto vuelven los recuerdos viejos frente a lo reciente.',
    low: 'Vive el presente',
    high: 'Vuelve al pasado',
  },
  atencion: {
    label: 'Atención',
    help: 'Cuántos detalles del día registra y recuerda.',
    low: 'Distraído',
    high: 'Lo nota todo',
  },
  conviccion: {
    label: 'Convicción',
    help: 'Cuánta evidencia necesita para creer algo, y cuánto le cuesta dejar de creerlo.',
    low: 'Duda de todo',
    high: 'Se aferra a lo que cree',
  },
  curiosidad: {
    label: 'Curiosidad',
    help: 'Cuánto le llama la atención lo nuevo y lo que conecta con sus temas.',
    low: 'Nada le interesa',
    high: 'Todo le interesa',
  },
  impulso: {
    label: 'Impulsividad',
    help: 'Si actúa en el momento o se contiene.',
    low: 'Se contiene',
    high: 'Actúa enseguida',
  },
  deliberacion: {
    label: 'Reflexión',
    help: 'Cuánto piensa en las consecuencias antes de actuar.',
    low: 'Actúa sin pensar',
    high: 'Piensa antes de actuar',
  },
  integridad: {
    label: 'Integridad',
    help: 'Cuánto le cuesta ir en contra de lo que cree.',
    low: 'El fin justifica los medios',
    high: 'Hay límites que no cruza',
  },
  coraje: {
    label: 'Coraje',
    help: 'Si el miedo le impide actuar.',
    low: 'Prudente',
    high: 'El miedo no lo frena',
  },
  corruptibilidad: {
    label: 'Corruptibilidad',
    help: 'Cuánto lo tienta la Sombra.',
    low: 'Incorruptible',
    high: 'Fácil de tentar',
  },
}

export const SKILLS: Record<string, { label: string; help: string }> = {
  tracking: { label: 'Rastreo', help: 'Seguir huellas y leer el terreno.' },
  persuasion: { label: 'Persuasión', help: 'Convencer a otros.' },
  ranged: { label: 'Combate a distancia', help: 'Arco, honda, lanzar.' },
  melee: { label: 'Combate cuerpo a cuerpo', help: 'Espada, hacha, puños.' },
  lore: { label: 'Saber', help: 'Conocimiento de historia, pueblos y lugares.' },
  stealth: { label: 'Sigilo', help: 'Moverse sin ser visto ni oído.' },
  endurance: { label: 'Resistencia', help: 'Aguantar cansancio, hambre y clima.' },
  insight: { label: 'Intuición', help: 'Leer las intenciones de otros.' },
  deception: { label: 'Engaño', help: 'Mentir y disimular.' },
  intimidation: { label: 'Intimidación', help: 'Imponerse con miedo.' },
}

// voice.py MOOD_BANDS — the engine's word for the valence band.
export const MOOD_STATES: Record<string, string> = {
  despairing: 'desesperado',
  troubled: 'preocupado',
  steady: 'tranquilo',
  heartened: 'animado',
  exultant: 'eufórico',
}

export const NEEDS: Record<string, string> = {
  hunger: 'Hambre',
  thirst: 'Sed',
  exhaustion: 'Agotamiento',
  unrest: 'Inquietud',
  wound: 'Herida',
  exposure: 'Frío / intemperie',
}

export const CONDITION: Record<string, string> = {
  energy: 'Energía',
  shadow: 'Sombra',
  wounded: 'Heridas',
  recentNotes: 'Notas recientes',
}

export const BELIEF_KIND: Record<string, string> = {
  self: 'Sobre sí mismo',
  world: 'Sobre el mundo',
  other: 'Sobre otros',
  value: 'Valor',
}

export const BELIEF_HORIZON: Record<string, string> = {
  transient: 'Pasajera',
  enduring: 'Duradera',
}

export const BELIEF_ORIGIN: Record<string, string> = {
  seed: 'Del preset',
  reflected: 'Aprendida',
}

export const MEMORY_KIND: Record<string, string> = {
  episodic: 'Recuerdo',
  pattern: 'Patrón',
}

export const EPISODE_STATUS: Record<string, string> = {
  open: 'Abierto',
  narrated: 'Narrado',
  closed: 'Cerrado',
}

export const PHASES: Record<string, string> = {
  dawn: 'amanecer',
  morning: 'mañana',
  midday: 'mediodía',
  afternoon: 'tarde',
  dusk: 'atardecer',
  evening: 'anochecer',
  night: 'noche',
}

export const SILENCED_KIND: Record<string, string> = {
  belief: 'Creencia',
  memory: 'Recuerdo',
  musing: 'Voz interior',
  need: 'Necesidad',
  event: 'Suceso',
}

// focus.py / director.py silenced reasons.
export const SILENCED_REASON: Record<string, string> = {
  'nothing in the Episode puts it at stake': 'Nada del día la ponía en juego',
  'the day had company': 'Estuvo acompañado ese día',
  'a closer attitude speaks for this encounter': 'Otra actitud más específica ya hablaba de este encuentro',
  'nothing in the Episode calls this voice up': 'Nada del día la despertaba',
  'stable and untouched by the Episode': 'Estable, el día no la afectó',
  'past the line cap': 'Ya había demasiadas líneas',
  'quiet Episode — no Focus to connect to': 'Día tranquilo, sin un centro al que conectarse',
  'does not connect to the Focus': 'No se conectaba con el centro del día',
  'the director left it out': 'El director la dejó afuera',
}

const CONCERNS: Record<string, string> = {
  'tag:entity_type:humans': 'Humanos',
  'tag:entity_type:hobbits': 'Hobbits',
  'tag:entity_type:elves': 'Elfos',
  'tag:entity_type:dwarves': 'Enanos',
  'tag:entity_type:orcs': 'Orcos',
  'tag:entity_type:trolls': 'Trolls',
  'tag:entity_type:undead': 'No-muertos',
  'tag:entity_type:giants': 'Gigantes',
  'tag:entity_type:demons': 'Demonios',
  'tag:entity_type:maiar': 'Maiar',
  'tag:entity_type:woses': 'Woses',
  'tag:entity_type:living_trees': 'Árboles vivos',
  'tag:entity_type:pukel_constructs': 'Estatuas púkel',
  'tag:form:brief_exchange': 'Charlas breves',
  'tag:form:aid_or_trade': 'Ayuda y comercio',
  'tag:form:harvest_shelter': 'Refugio y comida',
  'tag:form:confronts': 'Enfrentamientos',
  'tag:form:attacks': 'Ataques',
  'tag:form:sudden_peril': 'Peligros repentinos',
  'tag:form:stalks': 'Ser acechado',
  'tag:form:watches': 'Ser observado',
  'tag:form:hinders_passage': 'Obstáculos en el camino',
  'tag:form:reacts_withdraws': 'Criaturas que huyen',
  'tag:form:drifts_closer': 'Criaturas que se acercan',
  'tag:form:mistaken_for_object': 'Confusiones',
  'tag:weather:snow': 'Nieve',
  'tag:weather:storm': 'Tormentas',
  'tag:weather:freezing': 'Heladas',
  'tag:weather:deep_cold': 'Frío extremo',
  'tag:weather:scorching': 'Calor extremo',
  'type:encounter': 'Encuentros',
  'type:climate': 'Clima',
  'type:travel': 'El viaje',
  'type:meal': 'Comidas',
  'type:rest': 'Descanso',
  'type:place': 'Lugares',
  'type:body': 'El cuerpo',
}

export const KNOWN_CONCERNS = Object.keys(CONCERNS)

export function humanize(key: string): string {
  return key
    .replace(/^skill_/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_:-]+/g, ' ')
    .trim()
}

export const label = (map: Record<string, string>, key: string | null | undefined) =>
  key ? (map[key] ?? map[key.toLowerCase()] ?? humanize(key)) : '—'

export function concernLabel(key: string): string {
  return CONCERNS[key] ?? humanize(key.replace(/^(tag|type|entity):/, '').replace(/^[^:]+:/, ''))
}

export function skillLabel(key: string): string {
  const k = key.replace(/^skill_/, '')
  return SKILLS[k]?.label ?? humanize(k)
}

export function moodLabel(dominant: string | null | undefined): string {
  return label(MOOD_STATES, dominant)
}
