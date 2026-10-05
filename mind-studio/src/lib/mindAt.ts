// Rebuild a Mind as it stood on one Episode of its timeline.
//
// What the Mind stores: each Memory's birth Episode, its strength today
// (or at the moment it was lost, for Forgotten traces), each Belief's
// birth, and per-Episode snapshots (needs, evoked, voiced, Lens). The
// strength in between is not stored — it is interpolated geometrically,
// which is how decay actually works (strength *= rate per Episode).
import type {
  ActiveNeed, BeliefNode, EpisodeView, MemoryNode, MindDetail,
} from '../types'

export type MemoryPhase = 'alive' | 'newborn' | 'fading' | 'trace'

export interface MemoryAt extends MemoryNode {
  phase: MemoryPhase
  strengthAt: number
  evokedNow: boolean
  voicedNow: boolean
}

export interface BeliefAt extends BeliefNode {
  newborn: boolean
  inLens: boolean
  resonatedNow: boolean
}

export interface MindAt {
  episode: EpisodeView
  memories: MemoryAt[]
  beliefs: BeliefAt[]
  needs: ActiveNeed[]
  counts: { alive: number; forgotten: number; beliefs: number; born: number }
}

function strengthAt(m: MemoryNode, k: number, lastIdx: number): number {
  const born = m.born_episode ?? 0
  const end = m.forgotten_episode ?? lastIdx
  const start = m.kind === 'pattern' ? 1 : Math.max(m.importance, m.strength, 0.05)
  if (end <= born || k >= end) return m.strength
  const t = Math.min(1, Math.max(0, (k - born) / (end - born)))
  return start * Math.pow(Math.max(m.strength, 0.01) / start, t)
}

export function mindAt(mind: MindDetail, k: number): MindAt | null {
  const episode = mind.episodes.find((e) => e.idx === k)
  if (!episode) return null
  const lastIdx = Math.max(...mind.episodes.map((e) => e.idx ?? 0))
  const evoked = new Set(episode.evoked)
  const voiced = new Set(episode.voiced)

  const memories: MemoryAt[] = []
  for (const m of mind.memories) {
    const born = m.born_episode ?? 0
    if (born > k) continue
    const lost = m.forgotten_episode
    const phase: MemoryPhase =
      lost != null && lost < k ? 'trace'
        : lost === k ? 'fading'
          : born === k ? 'newborn'
            : 'alive'
    memories.push({
      ...m,
      phase,
      strengthAt: phase === 'trace' ? 0 : strengthAt(m, k, lastIdx),
      evokedNow: evoked.has(m.id),
      voicedNow: voiced.has(m.id),
    })
  }

  const lensBeliefs = new Map(
    episode.lens
      .filter((l) => l.ref?.kind === 'belief')
      .map((l) => [l.ref!.id, l.resonated] as const),
  )
  const beliefs: BeliefAt[] = mind.beliefs
    .filter((b) => b.born_episode == null || b.born_episode <= k)
    .map((b) => ({
      ...b,
      newborn: b.born_episode === k,
      inLens: lensBeliefs.has(b.id),
      resonatedNow: lensBeliefs.get(b.id) === true,
    }))

  return {
    episode,
    memories,
    beliefs,
    needs: episode.needs_active,
    counts: {
      alive: memories.filter((m) => m.phase !== 'trace' && m.phase !== 'fading').length,
      forgotten: memories.filter((m) => m.phase === 'trace' || m.phase === 'fading').length,
      beliefs: beliefs.length,
      born: memories.filter((m) => m.phase === 'newborn').length,
    },
  }
}

/** What changed on each Episode — the marks printed on the tape. */
export function episodeMarks(mind: MindDetail) {
  return new Map(
    mind.episodes.map((e) => {
      const k = e.idx ?? 0
      return [k, {
        born: mind.memories.filter((m) => m.born_episode === k).length,
        lost: mind.memories.filter((m) => m.forgotten_episode === k).length,
        beliefs: mind.beliefs.filter((b) => b.born_episode === k).length,
        resonated: e.lens.filter((l) => l.resonated).length,
      }] as const
    }),
  )
}
