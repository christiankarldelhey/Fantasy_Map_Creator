// Shapes of the story-engine's /studio/api (app/studio/api.py).

export interface Mood {
  valence?: number
  arousal?: number
  dominant?: string
}

export interface MindSummary {
  character_id: string
  name: string
  preset: string
  episodes: number
  memories: number
  mood: Mood
  last_lived_at: string | null
}

export interface MindList {
  game: string
  default: string | null
  minds: MindSummary[]
}

export interface CharacterCard {
  name: string | null
  description: string | null
  foundational_phrase: string | null
  voice_instructions: string | null
  skills: Record<string, number>
}

export interface MemoryNode {
  id: string
  kind: 'episodic' | 'pattern' | string
  desc: string
  tags: string[]
  valence: number
  importance: number
  strength: number
  evocations: number
  voiced: number
  consolidated: boolean
  born_episode: number | null
  last_evoked_episode: number | null
  forgotten_episode: number | null
  state: 'alive' | 'forgotten'
}

export interface BeliefNode {
  id: string
  statement: string
  origin: 'seed' | 'reflected' | string
  status: string
  kind: string
  horizon: string
  confidence: number
  evidence: string[]
  born_episode: number | null
  updated_episode: number | null
}

export interface ActiveNeed {
  id: string | null
  key: string
  urgency: number
  description: string
}

export type LensSection = 'beliefs' | 'yesterday' | 'evoked' | 'today' | 'needs'

export interface LensLine {
  section: LensSection
  text: string
  ref: { kind: 'belief' | 'memory' | 'need'; id: string } | null
  resonated: boolean
}

export interface EpisodeView {
  id: string
  idx: number | null
  ref: string | null
  date: string | null
  status: string
  mood: Mood
  needs_active: ActiveNeed[]
  perceived: {
    type: string
    perception: string
    reading: string | null
    salience: number
    evoked: string[]
  }[]
  evoked: string[]
  voiced: string[]
  lens: LensLine[]
  narrative: string | null
  narrative_language: string | null
}

export interface MindDetail {
  character_id: string
  game: string
  preset: string
  character: CharacterCard
  condition: Record<string, unknown>
  mood: Mood
  memories: MemoryNode[]
  beliefs: BeliefNode[]
  needs: { id: string; key: string; description: string; status: string }[]
  episodes: EpisodeView[]
}
