// Shapes of the mind-engine's /studio/api (app/studio/api.py).

// --- Mind map (docs/mind-map/graph.json, ADR-0021) ---------------------------

export interface MindMapStep {
  fn: string
  term: string
  reads?: string[]
  writes?: string[]
}

export interface MindMapTrace {
  term: string
  fn: string
  in: unknown[]
  out: unknown
  depth: number
}

export interface MindMapGraph {
  meta: { generated: string; source_hash: string; golden_day: { label: string } }
  glossary: Record<string, string>
  concepts: Record<string, { lives_in?: string; is_a?: string; stage?: string }>
  steps: MindMapStep[]
  test_rules: Record<string, string[]>
  request: Record<string, any>
  prompt: { system?: string; user?: string }
  trace: {
    open: MindMapTrace[]
    close: MindMapTrace[]
    flow: { open: MindMapTrace[]; close: MindMapTrace[] }
  }
  tables: Record<string, { table: string; columns: Record<string, string> }>
}

export interface Mood {
  valence?: number
  arousal?: number
  // In the engine's space (MOOD_DIMS) though not yet drawn anywhere.
  dominance?: number
  dominant?: string
  // The reading that explains this mood, while it still explains it.
  cause?: { reading?: string | null; valence?: number; date?: string | null } | null
}

// The episode's emotional plot (ADR 0017 · lens.mood_arc): one point per
// lived phase with the heaviest reading as its cause, plus the turn.
export interface MoodArcPoint {
  phase: string
  felt: Record<string, number>
  valence: number
  // The phase's posture in mood space — its region gives the word.
  arousal?: number
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
  // The day's own direction (pull-weighted) — distinct from `valence`,
  // which is the landing after pulls + pressures.
  day_valence?: number
  felt?: Record<string, number>
  trace?: {
    subject?: string | null
    reading?: string | null
    felt?: Record<string, number>
    mood_pull?: PerceivedEvent['mood_pull']
  }[]
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
  // The felt pulls this event exerts on the mood (#184): each names a
  // wheel word and the point it drags toward (already refracted by the
  // character's standing), gain the fraction of the way it moves.
  mood_pull?: { word: string; target: { valence: number; arousal: number }; gain: number }[] | null
  // Legacy: pre-#184 episodes stamped the raw delta instead of a pull.
  mood_delta?: Record<string, number> | null
  data: {
    description?: string | null
    act?: string
    outcome?: string
    name?: string
    record?: string
    situation?: string
    npc_name?: string
    entity_name?: string
    provenance?: string
    // Current wire name for the shadow the event cost ('shadow_effect'
    // is the legacy name pre-envelope days carry).
    shadow_delta?: number
    shadow_effect?: number
    after?: { energy?: number | null; shadow?: number | null }
    reading?: string | null
  }
}

export interface MindSummary {
  character_id: string
  name: string
  portrait_url: string | null
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
  // What the memory is about — the Subject tags it touches (entity,
  // kind, region, place) plus the stored anchors. Forgotten traces
  // kept entity only.
  subjects?: string[]
  entity_id?: string | null
  region?: string | null
  valence: number
  // How it felt as it landed (pull word/target/gain) and the
  // imprint-derived relational word — never on forgotten traces.
  felt?: { word?: string }[] | null
  feeling?: string | null
  importance: number
  strength: number
  evocations: number
  voiced: number
  consolidated: boolean
  // The memory-continuum tier — fresh | consolidated | conviction.
  // Conviction rows also carry the belief facet (kind, horizon, status).
  depth?: string | null
  conviction?: {
    kind?: string
    horizon?: string
    status?: string
    strength?: number
    evidence?: string[]
    source?: string
  } | null
  born_episode: number | null
  last_evoked_episode: number | null
  forgotten_episode: number | null
  state: 'alive' | 'forgotten'
}

// A Relation (CONTEXT.md): the standing the lived day sedimented per
// subject — affection/trust bipolar, fear/familiarity unipolar.
export interface RelationNode {
  id: string
  subject: string
  display_name: string | null
  affection: number
  trust: number
  fear: number
  familiarity: number
  feeling: string | null
  origin: 'seed' | 'heard' | 'lived' | string
  last_fed_episode: number | null
  last_surfaced_episode: number | null
}

export interface BeliefNode {
  id: string
  statement: string
  // The Subject tags the conviction touches — what it refers to.
  subjects: string[]
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
  // Raw wire events as the Host sent them (episodes.events) and the
  // same items after perception annotated them (episodes.perceived_day).
  events: Record<string, unknown>[]
  lived: Record<string, unknown>[]
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
  relations: RelationNode[]
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
