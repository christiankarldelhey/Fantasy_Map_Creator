import type { Mood } from '../types'

/** Mood as a colour: cold blue when it hurts, warm tangerine when it lifts. */
export function moodColor(mood: Mood | undefined): string {
  const v = Math.max(-1, Math.min(1, mood?.valence ?? 0))
  if (v < 0) return `color-mix(in oklab, var(--ruin) ${Math.round(-v * 100)}%, var(--chalk))`
  return `color-mix(in oklab, var(--tangerine) ${Math.round(v * 100)}%, var(--chalk))`
}

export function humanize(key: string): string {
  return key
    .replace(/^skill_/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_:-]+/g, ' ')
    .trim()
}

export function percent(n: number): string {
  return `${Math.round(n * 100)}%`
}

/** 'le pesa' keys → plain Spanish. The raw key stays visible as the
 *  advanced breadcrumb; anything unmapped reads humanized. */
const CONCERN_LABELS: Record<string, string> = {
  'tag:entity_type:humans': 'la gente',
  'tag:entity_type:hobbits': 'los hobbits',
  'tag:entity_type:elves': 'los elfos',
  'tag:entity_type:dwarves': 'los enanos',
  'tag:entity_type:orcs': 'los orcos',
  'tag:entity_type:trolls': 'los trolls',
  'tag:entity_type:undead': 'los no-muertos',
  'tag:entity_type:giants': 'los gigantes',
  'tag:entity_type:demons': 'los demonios',
  'tag:entity_type:maiar': 'los maiar',
  'tag:entity_type:woses': 'los woses',
  'tag:entity_type:living_trees': 'los árboles vivos',
  'tag:entity_type:pukel_constructs': 'las estatuas púkel',
  'tag:form:brief_exchange': 'una charla breve',
  'tag:form:aid_or_trade': 'la ayuda y el trueque',
  'tag:form:harvest_shelter': 'un techo y una mesa',
  'tag:form:confronts': 'los enfrentamientos',
  'tag:form:attacks': 'los ataques',
  'tag:form:sudden_peril': 'el peligro súbito',
  'tag:form:stalks': 'el acecho',
  'tag:form:watches': 'las miradas',
  'tag:form:hinders_passage': 'los obstáculos',
  'tag:form:reacts_withdraws': 'lo que se retira',
  'tag:form:drifts_closer': 'lo que se acerca',
  'tag:form:mistaken_for_object': 'las confusiones',
  'tag:weather:snow': 'la nieve',
  'tag:weather:storm': 'la tormenta',
  'tag:weather:freezing': 'la helada',
  'tag:weather:deep_cold': 'el frío profundo',
  'tag:weather:scorching': 'el calor abrasador',
  'type:encounter': 'los encuentros',
  'type:climate': 'el clima',
  'type:travel': 'el camino',
  'type:meal': 'las comidas',
  'type:rest': 'el descanso',
  'type:place': 'los lugares',
  'type:body': 'el cuerpo',
}

export const KNOWN_CONCERNS = Object.keys(CONCERN_LABELS)

export function concernLabel(key: string): string {
  if (CONCERN_LABELS[key]) return CONCERN_LABELS[key]
  return humanize(key.replace(/^(tag|type|entity):/, '').replace(/^[^:]+:/, ''))
}

/** Voice keys group by domain: 'night.calm' → 'la noche'. */
const DOMAIN_LABELS: Record<string, string> = {
  climate: 'el clima',
  night: 'la noche',
  condition: 'el cuerpo',
  equipage: 'el equipo',
  meal: 'las comidas',
  terrain: 'el terreno',
  road: 'el camino',
  place: 'los lugares',
  water: 'el agua',
  mind: 'la mente',
  journey: 'el viaje',
  endstate: 'el final',
  note: 'las notas',
  opening: 'la apertura',
  elevation: 'la altura',
  rest: 'el descanso',
}

export function domainLabel(key: string): string {
  const domain = key.split('.')[0] ?? key
  return DOMAIN_LABELS[domain] ?? humanize(domain)
}

export function groupByDomain<T>(
  obj: Record<string, T>,
): [string, [string, T][]][] {
  const groups = new Map<string, [string, T][]>()
  for (const [key, value] of Object.entries(obj)) {
    const domain = key.split('.')[0] ?? key
    const list = groups.get(domain) ?? []
    list.push([key, value])
    groups.set(domain, list)
  }
  return [...groups.entries()]
}

/** 'night.calm' → 'calma', 'mind.need.hunger.deep' → 'hambre profunda'. */
export function voiceKeyLabel(key: string): string {
  return humanize(key.split('.').slice(1).join('.'))
}
