// ============================================================================
// moodSpace — the valence × arousal circumplex (ADR 0017 · MOOD_DIMS)
// ----------------------------------------------------------------------------
// The mood is a point in a 2-dim space, never a list of emotions:
// x = valence (wellbeing −1..+1), y = arousal (energy −1..+1).
// Events move it by PULL (#184): a felt word names a point on the wheel
// and drags the mood a `gain` fraction of the way there — the engine
// stamps mood_pull on each perceived item, the disc just draws it.
// ============================================================================
import type { PerceivedEvent } from '../types'

export interface MoodPoint {
  valence: number
  arousal: number
}

// Mirror of voice.py MOOD_WHEEL — the twelve sector centres of the
// disc with their strong and softened words. The engine resolves the
// mood word from the point's sector and radius; the disc draws the
// same sectors, so what the region says IS what the mood is called.
// Update together.
export const MOOD_SECTORS: { deg: number; word: string; soft: string }[] = [
  { deg: 16,  word: 'happy',      soft: 'heartened' },
  { deg: 45,  word: 'excited',    soft: 'eager' },
  { deg: 74,  word: 'alert',      soft: 'watchful' },
  { deg: 106, word: 'afraid',     soft: 'uneasy' },
  { deg: 135, word: 'angry',      soft: 'irritated' },
  { deg: 164, word: 'distressed', soft: 'worried' },
  { deg: 196, word: 'sad',        soft: 'melancholy' },
  { deg: 225, word: 'depressed',  soft: 'melancholy' },
  { deg: 254, word: 'bored',      soft: 'listless' },
  { deg: 286, word: 'calm',       soft: 'settled' },
  { deg: 315, word: 'relaxed',    soft: 'mellow' },
  { deg: 344, word: 'content',    soft: 'pleased' },
]

// Mirror of voice.py — inside the Neutral core the word is 'steady',
// past the inner ring the sector speaks at full strength, past 0.8R
// the extremes (despairing/exultant) take over.
const MOOD_NEUTRAL_R = 0.22
const MOOD_FULL_R = 0.5
const MOOD_EXTREME_R = 0.8

const angDiff = (a: number, b: number) =>
  Math.abs((((a - b) + 540) % 360) - 180)

/** Mirror of voice.mood_name: the word for a point in mood space.
 *  Sector + radius decide — the stored `dominant` is only a fallback
 *  for payloads that carry no point at all (and for arc points from
 *  before arousal was stamped, arousal reads as 0). */
export function resolveMoodName(valence: number, arousal: number): string {
  const r = Math.hypot(valence, arousal)
  if (r < MOOD_NEUTRAL_R) return 'steady'
  if (r >= MOOD_EXTREME_R) {
    if (valence <= -0.45) return 'despairing'
    if (valence >= 0.6) return 'exultant'
  }
  const deg = ((Math.atan2(arousal, valence) * 180) / Math.PI + 360) % 360
  const s = MOOD_SECTORS.reduce((best, cur) =>
    angDiff(deg, cur.deg) < angDiff(deg, best.deg) ? cur : best)
  return r >= MOOD_FULL_R ? s.word : s.soft
}

/** The mood word for anything carrying a point — re-derived from its
 *  position so stored words from the old valence bands can't linger. */
export function moodWord(m: { valence?: number; arousal?: number; dominant?: string | null; mood?: string | null }): string | null {
  if (typeof m.valence === 'number') return resolveMoodName(m.valence, m.arousal ?? 0)
  return m.dominant ?? m.mood ?? null
}

const clamp = (v: number) => Math.max(-1, Math.min(1, v))

/** An event's pull vector from `from`: its stamped mood_pull — target
 *  (already refracted by the character's standing) and gain — applied
 *  as (target − mood) × gain. Old episodes fall back to the stamped
 *  mood_delta treated as a raw displacement. */
export function pullVec(e: PerceivedEvent, from: MoodPoint): { dv: number; da: number; word?: string } | null {
  const pulls = e.mood_pull?.filter((p) => p.gain > 0) ?? []
  if (pulls.length) {
    let dv = 0, da = 0
    for (const p of pulls) {
      dv += (p.target.valence - from.valence) * p.gain
      da += (p.target.arousal - from.arousal) * p.gain
    }
    return { dv, da, word: pulls[0].word }
  }
  if (e.mood_delta) {
    return { dv: e.mood_delta.valence ?? 0, da: e.mood_delta.arousal ?? 0 }
  }
  return null
}

/** Space → pixel: valence right, arousal up, both −1..+1 over `radius`. */
export function toPx(p: MoodPoint, center: number, radius: number) {
  return { x: center + p.valence * radius, y: center - p.arousal * radius }
}

/** Pixel → space, clamped to the legal square. */
export function toSpace(x: number, y: number, center: number, radius: number): MoodPoint {
  return {
    valence: clamp((x - center) / radius),
    arousal: clamp((center - y) / radius),
  }
}
