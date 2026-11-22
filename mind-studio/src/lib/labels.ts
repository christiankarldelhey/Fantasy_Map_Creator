// Every user-facing label the Studio shows for engine keys. The engine
// speaks in keys (piel, tag:weather:storm, HUNGER); the Studio owns how
// they read in Spanish.

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

// voice.py MOOD_WHEEL + MOOD_BANDS — the engine's word for the mood
// point: the sector it sits in (soft near centre, strong outside),
// 'steady' at the core, extremes at the rim; bands as fallback.
export const MOOD_STATES: Record<string, string> = {
  // — the wheel's outer words (the sectors the disc draws) —
  happy: 'feliz',
  excited: 'excitado',
  alert: 'alerta',
  afraid: 'asustado',
  // Legacy word — still on stored pulls from before the alias.
  tense: 'tenso',
  angry: 'enojado',
  distressed: 'angustiado',
  sad: 'triste',
  depressed: 'deprimido',
  bored: 'aburrido',
  calm: 'calmo',
  relaxed: 'relajado',
  content: 'contento',
  // — the softened inner ring —
  heartened: 'animado',
  eager: 'entusiasmado',
  watchful: 'atento',
  uneasy: 'inquieto',
  irritated: 'molesto',
  worried: 'preocupado',
  melancholy: 'melancólico',
  listless: 'apático',
  settled: 'sosegado',
  mellow: 'apacible',
  pleased: 'satisfecho',
  // — centre and extremes —
  steady: 'tranquilo',
  despairing: 'desesperado',
  exultant: 'eufórico',
  // — older stored dominants may still carry these —
  downcast: 'desanimado',
  downhearted: 'desanimado',
  grieving: 'afligido',
  overwhelmed: 'abrumado',
  dread: 'atemorizado',
  anxious: 'ansioso',
  troubled: 'intranquilo',
  weary: 'agotado',
  elated: 'radiante',
  joyful: 'alegre',
  serene: 'sereno',
  restless: 'inquieto',
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

const TAG_LABELS: Record<string, string> = {
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

export function humanize(key: string): string {
  return key
    .replace(/^skill_/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_:-]+/g, ' ')
    .trim()
}

export const label = (map: Record<string, string>, key: string | null | undefined) =>
  key ? (map[key] ?? map[key.toLowerCase()] ?? humanize(key)) : '—'

export function tagLabel(key: string): string {
  return TAG_LABELS[key] ?? humanize(key.replace(/^(tag|type|entity):/, '').replace(/^[^:]+:/, ''))
}

export function skillLabel(key: string): string {
  const k = key.replace(/^skill_/, '')
  return SKILLS[k]?.label ?? humanize(k)
}

export function moodLabel(dominant: string | null | undefined): string {
  return label(MOOD_STATES, dominant)
}
