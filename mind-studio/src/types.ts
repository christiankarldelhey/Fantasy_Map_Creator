// Shapes of the mind-engine's /studio/api (app/studio/api.py).

export interface Mood {
  valence?: number
  arousal?: number
  dominant?: string
}

// The episode's emotional plot (ADR 0017 · lens.mood_arc): one point per
// lived phase with the heaviest reading as its cause, plus the turn.
export interface MoodArcPoint {
  phase: string
  felt: Record<string, number>
  valence: number
  mood?: string | null
  cause?: string | null
}

export interface MoodTurn {
  phase: string
  swing: number
  reading?: string | null
}

export interface EpisodeMood extends Mood {
  need_pressure?: number
  thread_pressure?: number
  felt?: Record<string, number>
  trace?: { subject?: string | null; reading?: string | null; felt?: Record<string, number> }[]
  arc?: MoodArcPoint[]
  turn?: MoodTurn | null
}

// A perceived event's numeric payload — everything the day chart can
// draw: when it happened, what it felt like, what the body paid.
export interface PerceivedEvent {
  type: string
  perception: string
  reading: string | null
  salience: number
  when: { hour?: number | null; phase?: string | null }
  subject?: string | null
  valence?: number | null
  severity?: number | null
  world_valence?: number | null
  imprint: Record<string, number>
  data: {
    description?: string | null
    act?: string
    outcome?: string
    name?: string
    record?: string
    situation?: string
    npc_name?: string
    shadow_effect?: number
    after?: { energy?: number | null; shadow?: number | null }
    reading?: string | null
  }
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
  strength: number
  evidence: string[]
  born_episode: number | null
  updated_episode: number | null
}

// A Musing (CONTEXT.md · Musing): an authored line of inner voice —
// flavour for the narration, never evidence. No strength, no status;
// Reflection never touches it.
export interface MusingNode {
  id: string
  statement: string
  tags: string[]
  origin: 'seed' | string
  born_episode: number | null
}

export interface ActiveNeed {
  id: string | null
  key: string
  urgency: number
  description: string
}

// Lens sections come straight from the Episode brief (C35).
export type LensSection = 'focus' | 'carried' | 'day'

export interface LensLine {
  section: LensSection
  text: string
  kind?: string | null
  phase?: string | null
  why?: string | null
  ref: { kind: 'belief' | 'memory' | 'need' | 'musing'; id: string } | null
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
  mood: EpisodeMood
  needs_active: ActiveNeed[]
  perceived: PerceivedEvent[]
  lens: LensLine[]
  brief: EpisodeBrief | null
  narrative: string | null
  narrative_language: string | null
  narrative_translation: { language: string; text: string } | null
}

// A preset's nature as the personality picker shows it — what applying
// it would imprint (temperament + personality), nothing lived.
export interface PresetNature {
  slug: string
  name: string | null
  description: string | null
  temperament: Record<string, number>
  personality: Record<string, unknown>
}

export interface MindDetail {
  character_id: string
  game: string
  preset: string
  character: CharacterCard
  condition: Record<string, unknown>
  mood: Mood
  // ADR 0017: the resting point mood regresses to (fixed, nature) and
  // the couplings — moodiness, resistance, choice_variability…
  temperament: Record<string, number>
  personality: Record<string, unknown>
  wiring: Record<string, unknown>
  memories: MemoryNode[]
  beliefs: BeliefNode[]
  musings: MusingNode[]
  needs: { id: string; key: string; description: string; status: string }[]
  episodes: EpisodeView[]
}

// GET /studio/api/tags — the shared tag registry (ADR-0016).
export interface TagFamily {
  family: string
  consumers: string[]
  description: Record<string, string>
  // true when the family accepts any value matching its pattern ('*' row).
  open: boolean
  values: string[]
}

export interface TagRegistry {
  families: TagFamily[]
}
