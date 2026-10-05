// Deterministic placement for the wiring. Nodes never move between
// Episodes — scrubbing the tape only lights, dims or reveals them — so
// the Mind reads as one physical object that rewires, not a reshuffle.
//
//   beliefs   an inner ring around the centre ("what they hold true")
//   memories  a spiral outward by birth order: the past coils outside;
//             a memory that is evidence for a belief is pulled near it
//   needs     hang below, weights on a string
import type { BeliefNode, MemoryNode } from '../types'

export const VIEW = { w: 1000, h: 680, cx: 500, cy: 300 }
const GOLDEN = Math.PI * (3 - Math.sqrt(5))

export interface Point { x: number; y: number }

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

export function layoutMind(
  beliefs: BeliefNode[],
  memories: MemoryNode[],
): Map<string, Point> {
  const pos = new Map<string, Point>()
  const ordered = [...beliefs].sort(
    (a, b) => (a.born_episode ?? -1) - (b.born_episode ?? -1)
      || a.statement.localeCompare(b.statement),
  )
  ordered.forEach((b, i) => {
    const a = -Math.PI / 2 + (i / Math.max(ordered.length, 1)) * Math.PI * 2
    pos.set(b.id, {
      x: VIEW.cx + Math.cos(a) * 128,
      y: VIEW.cy + Math.sin(a) * 104,
    })
  })

  const anchorOf = new Map<string, string>()
  for (const b of ordered) {
    for (const ev of b.evidence) if (!anchorOf.has(ev)) anchorOf.set(ev, b.id)
  }

  const spiral = [...memories].sort(
    (a, b) => (a.born_episode ?? 0) - (b.born_episode ?? 0)
      || b.importance - a.importance || a.id.localeCompare(b.id),
  )
  spiral.forEach((m, i) => {
    const angle = i * GOLDEN + hash(m.id) * 0.4
    const r = 205 + Math.sqrt(i) * 30
    let x = VIEW.cx + Math.cos(angle) * r * 1.25
    let y = VIEW.cy + Math.sin(angle) * r * 0.62
    const anchor = anchorOf.get(m.id)
    const ap = anchor ? pos.get(anchor) : undefined
    if (ap) {
      // Pulled a third of the way toward the belief it holds up.
      x += (ap.x - x) * 0.35
      y += (ap.y - y) * 0.35
    }
    pos.set(m.id, {
      x: Math.min(VIEW.w - 90, Math.max(40, x)),
      y: Math.min(VIEW.h - 150, Math.max(36, y)),
    })
  })
  return pos
}

/** A slack cable between two points — sags like a real wire. */
export function cable(a: Point, b: Point, sag = 0.18): string {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const len = Math.hypot(b.x - a.x, b.y - a.y)
  return `M${a.x},${a.y} Q${mx},${my + len * sag} ${b.x},${b.y}`
}
