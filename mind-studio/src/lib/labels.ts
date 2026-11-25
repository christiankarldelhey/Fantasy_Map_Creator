// Every user-facing label the Studio shows for engine keys. The engine
// speaks in keys (piel, tag:weather:storm, HUNGER); the Studio owns how
// they read — in both languages (i18n.ts owns the chrome strings).

import { locale, type Locale } from './i18n'

type L = Record<Locale, string>

export const SKILLS: Record<string, { label: L; help: L }> = {
  tracking: {
    label: { es: 'Rastreo', en: 'Tracking' },
    help: { es: 'Seguir huellas y leer el terreno.', en: 'Follow tracks and read the land.' },
  },
  persuasion: {
    label: { es: 'Persuasión', en: 'Persuasion' },
    help: { es: 'Convencer a otros.', en: 'Talk others into things.' },
  },
  ranged: {
    label: { es: 'Combate a distancia', en: 'Ranged combat' },
    help: { es: 'Arco, honda, lanzar.', en: 'Bow, sling, throwing.' },
  },
  melee: {
    label: { es: 'Combate cuerpo a cuerpo', en: 'Melee combat' },
    help: { es: 'Espada, hacha, puños.', en: 'Sword, axe, fists.' },
  },
  lore: {
    label: { es: 'Saber', en: 'Lore' },
    help: { es: 'Conocimiento de historia, pueblos y lugares.', en: 'Knowledge of history, peoples and places.' },
  },
  stealth: {
    label: { es: 'Sigilo', en: 'Stealth' },
    help: { es: 'Moverse sin ser visto ni oído.', en: 'Move unseen and unheard.' },
  },
  endurance: {
    label: { es: 'Resistencia', en: 'Endurance' },
    help: { es: 'Aguantar cansancio, hambre y clima.', en: 'Bear tiredness, hunger and weather.' },
  },
  insight: {
    label: { es: 'Intuición', en: 'Insight' },
    help: { es: 'Leer las intenciones de otros.', en: 'Read others’ intentions.' },
  },
  deception: {
    label: { es: 'Engaño', en: 'Deception' },
    help: { es: 'Mentir y disimular.', en: 'Lie and dissemble.' },
  },
  intimidation: {
    label: { es: 'Intimidación', en: 'Intimidation' },
    help: { es: 'Imponerse con miedo.', en: 'Impose through fear.' },
  },
}

// voice.py MOOD_WHEEL + MOOD_BANDS — the engine's word for the mood
// point: the sector it sits in (soft near centre, strong outside),
// 'steady' at the core, extremes at the rim; bands as fallback.
export const MOOD_STATES: Record<string, L> = {
  // — the wheel's outer words (the sectors the disc draws) —
  happy: { es: 'feliz', en: 'happy' },
  excited: { es: 'excitado', en: 'excited' },
  alert: { es: 'alerta', en: 'alert' },
  afraid: { es: 'asustado', en: 'afraid' },
  // Legacy word — still on stored pulls from before the alias.
  tense: { es: 'tenso', en: 'tense' },
  angry: { es: 'enojado', en: 'angry' },
  distressed: { es: 'angustiado', en: 'distressed' },
  sad: { es: 'triste', en: 'sad' },
  depressed: { es: 'deprimido', en: 'depressed' },
  bored: { es: 'aburrido', en: 'bored' },
  calm: { es: 'calmo', en: 'calm' },
  relaxed: { es: 'relajado', en: 'relaxed' },
  content: { es: 'contento', en: 'content' },
  // — the softened inner ring —
  heartened: { es: 'animado', en: 'heartened' },
  eager: { es: 'entusiasmado', en: 'eager' },
  watchful: { es: 'atento', en: 'watchful' },
  uneasy: { es: 'inquieto', en: 'uneasy' },
  irritated: { es: 'molesto', en: 'irritated' },
  worried: { es: 'preocupado', en: 'worried' },
  melancholy: { es: 'melancólico', en: 'melancholy' },
  listless: { es: 'apático', en: 'listless' },
  settled: { es: 'sosegado', en: 'settled' },
  mellow: { es: 'apacible', en: 'mellow' },
  pleased: { es: 'satisfecho', en: 'pleased' },
  // — centre and extremes —
  steady: { es: 'tranquilo', en: 'steady' },
  despairing: { es: 'desesperado', en: 'despairing' },
  exultant: { es: 'eufórico', en: 'exultant' },
  // — older stored dominants may still carry these —
  downcast: { es: 'desanimado', en: 'downcast' },
  downhearted: { es: 'desanimado', en: 'downhearted' },
  grieving: { es: 'afligido', en: 'grieving' },
  overwhelmed: { es: 'abrumado', en: 'overwhelmed' },
  dread: { es: 'atemorizado', en: 'dread' },
  anxious: { es: 'ansioso', en: 'anxious' },
  troubled: { es: 'intranquilo', en: 'troubled' },
  weary: { es: 'agotado', en: 'weary' },
  elated: { es: 'radiante', en: 'elated' },
  joyful: { es: 'alegre', en: 'joyful' },
  serene: { es: 'sereno', en: 'serene' },
  restless: { es: 'inquieto', en: 'restless' },
}

export const NEEDS: Record<string, L> = {
  hunger: { es: 'Hambre', en: 'Hunger' },
  thirst: { es: 'Sed', en: 'Thirst' },
  exhaustion: { es: 'Agotamiento', en: 'Exhaustion' },
  unrest: { es: 'Inquietud', en: 'Unrest' },
  wound: { es: 'Herida', en: 'Wound' },
  exposure: { es: 'Frío / intemperie', en: 'Cold / exposure' },
}

export const CONDITION: Record<string, L> = {
  energy: { es: 'Energía', en: 'Energy' },
  shadow: { es: 'Sombra', en: 'Shadow' },
  wounded: { es: 'Heridas', en: 'Wounds' },
  recentNotes: { es: 'Notas recientes', en: 'Recent notes' },
}

export const BELIEF_KIND: Record<string, L> = {
  self: { es: 'Sobre sí mismo', en: 'About self' },
  world: { es: 'Sobre el mundo', en: 'About the world' },
  other: { es: 'Sobre otros', en: 'About others' },
  value: { es: 'Valor', en: 'Value' },
}

export const BELIEF_HORIZON: Record<string, L> = {
  transient: { es: 'Pasajera', en: 'Transient' },
  enduring: { es: 'Duradera', en: 'Enduring' },
}

export const BELIEF_ORIGIN: Record<string, L> = {
  seed: { es: 'Del preset', en: 'From the preset' },
  reflected: { es: 'Aprendida', en: 'Learned' },
}

export const MEMORY_KIND: Record<string, L> = {
  episodic: { es: 'Recuerdo', en: 'Memory' },
  pattern: { es: 'Patrón', en: 'Pattern' },
}

export const EPISODE_STATUS: Record<string, L> = {
  open: { es: 'Abierto', en: 'Open' },
  narrated: { es: 'Narrado', en: 'Narrated' },
  closed: { es: 'Cerrado', en: 'Closed' },
}

export const PHASES: Record<string, L> = {
  dawn: { es: 'amanecer', en: 'dawn' },
  morning: { es: 'mañana', en: 'morning' },
  midday: { es: 'mediodía', en: 'midday' },
  afternoon: { es: 'tarde', en: 'afternoon' },
  dusk: { es: 'atardecer', en: 'dusk' },
  evening: { es: 'anochecer', en: 'evening' },
  night: { es: 'noche', en: 'night' },
  day: { es: 'a lo largo del día', en: 'through the day' },
}

export const SILENCED_KIND: Record<string, L> = {
  belief: { es: 'Creencia', en: 'Belief' },
  memory: { es: 'Recuerdo', en: 'Memory' },
  musing: { es: 'Voz interior', en: 'Inner voice' },
  need: { es: 'Necesidad', en: 'Need' },
  event: { es: 'Suceso', en: 'Event' },
}

// focus.py / director.py silenced reasons.
export const SILENCED_REASON: Record<string, L> = {
  'nothing in the Episode puts it at stake': {
    es: 'Nada del día la ponía en juego',
    en: 'Nothing in the episode put it at stake',
  },
  'the day had company': {
    es: 'Estuvo acompañado ese día',
    en: 'The day had company',
  },
  'a closer attitude speaks for this encounter': {
    es: 'Otra actitud más específica ya hablaba de este encuentro',
    en: 'A closer attitude already spoke for this encounter',
  },
  'nothing in the Episode calls this voice up': {
    es: 'Nada del día la despertaba',
    en: 'Nothing in the episode called this voice up',
  },
  'stable and untouched by the Episode': {
    es: 'Estable, el día no la afectó',
    en: 'Stable — the episode did not touch it',
  },
  'past the line cap': {
    es: 'Ya había demasiadas líneas',
    en: 'Past the line cap',
  },
  'quiet Episode — no Focus to connect to': {
    es: 'Día tranquilo, sin un centro al que conectarse',
    en: 'Quiet episode — no focus to connect to',
  },
  'does not connect to the Focus': {
    es: 'No se conectaba con el centro del día',
    en: 'Did not connect to the day’s focus',
  },
  'the director left it out': {
    es: 'El director la dejó afuera',
    en: 'The director left it out',
  },
}

const TAG_LABELS: Record<string, L> = {
  'tag:entity_type:humans': { es: 'Humanos', en: 'Humans' },
  'tag:entity_type:hobbits': { es: 'Hobbits', en: 'Hobbits' },
  'tag:entity_type:elves': { es: 'Elfos', en: 'Elves' },
  'tag:entity_type:dwarves': { es: 'Enanos', en: 'Dwarves' },
  'tag:entity_type:orcs': { es: 'Orcos', en: 'Orcs' },
  'tag:entity_type:trolls': { es: 'Trolls', en: 'Trolls' },
  'tag:entity_type:undead': { es: 'No-muertos', en: 'Undead' },
  'tag:entity_type:giants': { es: 'Gigantes', en: 'Giants' },
  'tag:entity_type:demons': { es: 'Demonios', en: 'Demons' },
  'tag:entity_type:maiar': { es: 'Maiar', en: 'Maiar' },
  'tag:entity_type:woses': { es: 'Woses', en: 'Woses' },
  'tag:entity_type:living_trees': { es: 'Árboles vivos', en: 'Living trees' },
  'tag:entity_type:pukel_constructs': { es: 'Estatuas púkel', en: 'Púkel statues' },
  'tag:form:brief_exchange': { es: 'Charlas breves', en: 'Brief talks' },
  'tag:form:aid_or_trade': { es: 'Ayuda y comercio', en: 'Aid and trade' },
  'tag:form:harvest_shelter': { es: 'Refugio y comida', en: 'Shelter and food' },
  'tag:form:confronts': { es: 'Enfrentamientos', en: 'Confrontations' },
  'tag:form:attacks': { es: 'Ataques', en: 'Attacks' },
  'tag:form:sudden_peril': { es: 'Peligros repentinos', en: 'Sudden perils' },
  'tag:form:stalks': { es: 'Ser acechado', en: 'Being stalked' },
  'tag:form:watches': { es: 'Ser observado', en: 'Being watched' },
  'tag:form:hinders_passage': { es: 'Obstáculos en el camino', en: 'Blocked passage' },
  'tag:form:reacts_withdraws': { es: 'Criaturas que huyen', en: 'Fleeing creatures' },
  'tag:form:drifts_closer': { es: 'Criaturas que se acercan', en: 'Creatures drawing near' },
  'tag:form:mistaken_for_object': { es: 'Confusiones', en: 'Mistaken sightings' },
  'tag:weather:snow': { es: 'Nieve', en: 'Snow' },
  'tag:weather:storm': { es: 'Tormentas', en: 'Storms' },
  'tag:weather:freezing': { es: 'Heladas', en: 'Freezing cold' },
  'tag:weather:deep_cold': { es: 'Frío extremo', en: 'Deep cold' },
  'tag:weather:scorching': { es: 'Calor extremo', en: 'Scorching heat' },
  'type:encounter': { es: 'Encuentros', en: 'Encounters' },
  'type:climate': { es: 'Clima', en: 'Climate' },
  'type:travel': { es: 'El viaje', en: 'Travel' },
  'type:meal': { es: 'Comidas', en: 'Meals' },
  'type:rest': { es: 'Descanso', en: 'Rest' },
  'type:place': { es: 'Lugares', en: 'Places' },
  'type:body': { es: 'El cuerpo', en: 'The body' },
}

export function humanize(key: string): string {
  return key
    .replace(/^skill_/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_:-]+/g, ' ')
    .trim()
}

export const label = (map: Record<string, L>, key: string | null | undefined) => {
  if (!key) return '—'
  const entry = map[key] ?? map[key.toLowerCase()]
  return entry ? entry[locale.value] : humanize(key)
}

export function tagLabel(key: string): string {
  const entry = TAG_LABELS[key]
  if (entry) return entry[locale.value]
  return humanize(key.replace(/^(tag|type|entity):/, '').replace(/^[^:]+:/, ''))
}

export function skillLabel(key: string): string {
  const k = key.replace(/^skill_/, '')
  return SKILLS[k]?.label[locale.value] ?? humanize(k)
}

export function skillHelp(key: string): string | undefined {
  return SKILLS[key.replace(/^skill_/, '')]?.help[locale.value]
}

export function moodLabel(dominant: string | null | undefined): string {
  return label(MOOD_STATES, dominant)
}
