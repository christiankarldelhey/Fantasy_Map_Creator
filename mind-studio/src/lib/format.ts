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
