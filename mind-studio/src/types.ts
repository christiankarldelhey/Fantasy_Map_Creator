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
  kind: 'original' | 'copy' | string
  // Whether the Mind already owns this card (vs the last wire snapshot).
  adopted: boolean
  slug: string | null
  type: string | null
  gender: string | null
  entity_name: string | null
  portrait_url: string | null
  description: string | null
  description_es: string | null
  foundational_phrase: string | null
  voice_instructions: string | null
  skills: Record<string, number>
  // Slug of the Original this copy descends from.
  original: string | null
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

// Legacy sections come from parsing the old Lens block; brief sections
// come straight from the Episode brief (C35).
export type LensSection =
  | 'beliefs' | 'yesterday' | 'evoked' | 'today' | 'needs'
  | 'focus' | 'carried' | 'day'

export interface LensLine {
  section: LensSection
  text: string
  kind?: string | null
  phase?: string | null
  why?: string | null
  ref: { kind: 'belief' | 'memory' | 'need'; id: string } | null
  resonated: boolean
}

// The Episode brief (C35): what the Mind put at the centre, what it
// carries in, what the day does to it — and what stayed silent, why.
export interface BriefLine {
  id?: string
  kind?: string
  text: string
  part?: 'carried' | 'day'
  phase?: string | null
  why?: string | null
}

export interface SilencedCandidate {
  kind: string
  text: string
  reason: string
  stage?: 'filter' | 'pick'
}

export interface EpisodeBrief {
  focus: BriefLine | null
  carried: BriefLine[]
  day: BriefLine[]
  silenced: SilencedCandidate[]
  chosen_by?: string
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
  brief: EpisodeBrief | null
  narrative: string | null
  narrative_language: string | null
  narrative_translation: { language: string; text: string } | null
}

export interface VoiceBand {
  below: number | null
  above_m: number | null
  phrase: string | null
  phrases: string[] | null
}

export interface VoicePack {
  game: string
  bands: Record<string, { rows: VoiceBand[]; custom: boolean }>
  thresholds: Record<string, { value: number; custom: boolean }>
  phrases: Record<string, { items: string[]; custom: boolean }>
  facets: {
    event_type: string
    field_path: string
    unit: string | null
    description: string | null
    custom: boolean
  }[]
}

export interface Accent {
  thresholds: Record<string, number>
  phrases: Record<string, string[]>
  bands: Record<string, { ordinal: number; below: number | null; phrase: string | null }[]>
}

export interface TraitView {
  value: number
  label: string
  low: string
  high: string
  help: string
}

export interface MindDetail {
  character_id: string
  game: string
  preset: string
  character: CharacterCard
  condition: Record<string, unknown>
  mood: Mood
  traits: Record<string, TraitView>
  concerns: Record<string, number>
  wiring: Record<string, unknown>
  memories: MemoryNode[]
  beliefs: BeliefNode[]
  needs: { id: string; key: string; description: string; status: string }[]
  episodes: EpisodeView[]
}
