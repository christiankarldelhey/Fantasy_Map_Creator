# Mind Engine — canonical contract

The living schema document for the Mind Engine cleanup (map: issue #189).
Each section is written down as the decision for that phase settles —
decisions live in their wayfinder tickets; this document states what the
system IS once they're executed.

## Phase 1 — The event wire (open contract)

An Event is `{type, when{hour?, phase?, light?}, where{region?, place?},
act?, intensity?, reading?, tags[], check?, data{...}}` — strict
`extra='forbid'` on every level. The flat keys are the universal
vocabulary every kind shares: what the traveller was doing (`act`, the
interaction verb vocabulary), the host's declared force (`intensity`,
0-4), its one-line reading, its declared markers, and the perception
gate (`check` — universal, not an encounter privilege). `data` holds
only what the kind owns. `when.light` is the host's solar reading at
that hour (`dawn|day|dusk|night`): the world knows its own sunrise; the
mind narrates what was visible, it never derives daylight from a clock
— a 17:42 in autumn is dark whatever `phase` says. `data.intensity`
(0-4) remains the canonical force dial wherever the envelope doesn't
carry it.

**Decided — wire pruning:** these emitted-but-unread keys are deleted from
the wire: `mover`, `resolved_choice`, `npc_people`, `npc_gloss`,
`npc_gender`, `sighted`, `sighted_far`, `slot`, `eaten`, `distance_km`,
`aspect`, `aspect_es`, `presence`, `presence_es`, `where.family`,
`where.point`, `narration_notes.journey_context`, plus the duplicate
clocks (`biomes[].hour_float`, `sighted.hour_float` — `when.hour` is the
only clock) and internal ids (`record`, `situation` — what survives of
provenance rides `data.provenance`, untagged).

**Decided — the interaction kind:** `interaction` events are the
traveller's own acts, emitted whenever a situation option applies
(contact forks, overnight, ambient — any act: talk/avoid/accept/defy/
rest/stay…). Registered kind: `role: moment`, `source: world`,
`encodes: true`, reading = the applied outcome prose riding the
envelope `reading` (what `data.description` once said for this type
only). Minted at choose-time
(Wave C), chronologically before the parent event (encounter / rest /
ambience), which keeps its own `reading`. One rule: world-thing +
your-response = parent + interaction; no choice → parent alone.

**Decided — subject identity:** one real thing, one Relation row, one
namespace per role — no `tag:` prefix on identity:

- `entity:<slug>` — any concrete being or thing met (entity record,
  named person — `data.npc` folds into `entity:`; always the slug,
  never the display name). Primary subject, full sediment.
- `place:<slug>` — the location something happened AT (`where.place`,
  or legacy `data.place`): the stage, a secondary subject — the ford
  hears a splash of what the orcs did there, ranked below `entity:` on
  purpose (specificity 2 vs 4). The place you passed and the place you
  slept in feed the same row.
- `family:<slug>` — a kind of being (`data.family`), between entity
  and entity_type for attitude matching.
- `tag:<family>:<slug>` — classes and content only (`entity_type`,
  `kind`, `form`, `topic`, `food`, `drink`, `rest`…).

`data.entity` carries the participant slug; `where.place` carries the
location. Rest events anchor like land events: `where.place` +
`data.name`/`data.kind`. One slugifier (`naturalLanguage/text.js`,
underscores) spells every subject — hyphens and display names were the
same Relation split into three.

**Decided — one body channel:** `condition` is THE Condition channel —
detectors, checks and need-refresh read only it. `OpenCharacter.state`
is removed; `PerceiveRequest.character` is documented as (and may be
renamed to) the projected condition, not a character card.

**Decided — outcome vocabularies:** two domains, kept separate —
encounter outcomes (`wounded`/`slain`/…: what the world did to you)
vs interaction outcomes (`success`/`failure`: how your own choice went).
`tag:outcome:success` gets a base semantic row; `failure` stays latent
— it cannot occur today (no `skill.difficulty` or `outcomes.failure`
authored on any row) and rides the phase-8 skill-interactions decision.
`payload.felt` is the authored per-row tone that overrides the base;
per-outcome felt would need a schema extension, deferred.

**Decided — check seed:** `game_id + character_id + episode_date +
event_index + skill`. Deterministic per episode (replay-safe) but each
character and each day rolls different dice — the originally intended
entropy, restored without wire changes.

**Decided — canonical Event schema:** every event keeps the strict
envelope plus a per-type `data` contract (see audit). Additional
normalizations: `data.place` deleted (`where.place` is the only place
channel); `data.entity_id` deleted (`entity` carries the slug);
`when.phase` has exactly three canonical values — `morning`/`afternoon`/
`night` (`before_sleep` is normalized to `night` at emission);
`rest.data.entity_type` renamed to `kind` (place-kind vocabulary, same
as land events); `rest.data.entity`/`entity_name` deleted — the night's
place rides `where.place` + `data.name` like any land event.
`data.after` on interaction events stays as the persisted mid-day
vitals snapshot for Studio.

**Decided — open body:** `fate` is the ONLY terminality signal —
`episode.terminal` is deleted (derived: `fate != 'living'`); `arc`
stays a top-level frame field (the trip's name — `narration_notes`
itself died, see Phase 11); `episode` is the display frame
`{index, at}` only.

*Phase 1 complete: the wire is strict, pruned, one body channel, one
subject-identity scheme, one terminality signal, interaction as a
first-class kind.*

## Phase 2 — Naming

**Decided:** `episode.mood.felt` → `imprint` — it accumulates the
summed world delta (the same concept `perceived_day[].imprint` names
at item level), not the `felt:*` mood-pull channel.

**Decided:** backend `character_state.resistance` → `willpower` —
it is willpower vs corruption (roll bonus + shadow blunting). The
mind's `personality.resistance` keeps its name (resistance to
contradicting evidence). Same for `PerceiveRequest.character` →
`condition` (it carries the projected condition, not a card).

**Open:** shadow vocabulary (phase 13).

## Phase 3 — Perception

**Decided:** `unnoticed` events keep their vague-memory channel. Zero delta
(nothing sediments), `reading: null` (nothing narrates at the time), but the
residue can encode a memory whose `desc` is an authored `mind.unnoticed`
phrase. Later evocation surfaces it as unexplained disquiet — the reader saw
the event, the character only feels its trace.

**Decided:** `misread` keeps narrating and encoding the twisted reading
(`mind.misread` phrase into `reading` → beat + memory `desc`) while the true
`world_delta` sediments. The text distorts; the learning stays honest.

**Decided:** the altered-state machinery is deleted wholesale —
`mind.altered_states`, the `state.conditions` name-matching path (dead: the
host never declares named conditions), `kind='altered'` detectors and
`altered_by_state`. In its place: on a failed check, `misread` probability
equals the normalized `shadow` (0-1), rolled on the check's seed
(`misread:{skill}`) so replays stay deterministic. Linear, no threshold.
The `check_mod` shadow detectors (roll penalties) stay — they are a
different mechanism (shadow clouds the roll; misread lies about the result).

## Phase 4 — Relations

**Decided:** `tag:npc:*` joins `_SPECIFICITY` at level 4 — a named person is
as specific a subject as an `entity:` row. Before this, the most specific
being in a scene inherited only splash while the place/kind took the whole
delta.

**Decided:** Relations are never deleted. A decayed-to-zero row is dormant,
not dead: an evoked memory re-feeds each touched subject at `EVOKE_SHARE`
(0.3) of its stored imprint — the echo re-sediments what it still believes —
and a live re-encounter sediments on top of the surviving row (keeping
`display_name` and residual `familiarity`). Reset keeps them for now; revisit
if reset ever means "new mind".

**Note (cleanup):** `standing()` returns `None` for "never met" while
`standing_relation()`/`feed_event()` use `{}` — same absence, two answers.
Normalize on `None` = "never met" at implementation.

**Decided (user): context subjects never take a stranger's splash.**
`where.region` rides every event of the day, so at `CATEGORY_SPLASH`
(0.3) every wolf, storm and bad rest poisoned the land itself — every
region saturated into 'feared and hated', which is unreadable. Now
`region` and `kind` (`_CONTEXT_FAMILIES`) feed only as the narrowest
subject — the land learns what IT did (its own weather, the crossing
itself, a day with no actor), never a share of what happened inside
it. `kind` still generalizes a place when the place is primary
(sighting Esgaroth is about a town). `place:` keeps splash — the ford
where the orcs took the bridge earning a reputation is a concrete
spot's memory, not a country's guilt.

**Decided (user): a standing feeling names its biggest cause.** 'Ered
Luin — feared, and hated for it' narrates as noise without the why.
`inner_lines` appends ` since {desc}` — the most important memory
touching that subject that agrees with where the feeling points
(same-sign valence preferred, so a dread cites its darkest day, not
the warm one that outranked it).

## Phase 5 — Memories & retrieval

**Decided:** evocation splits into candidate vs voiced. A candidate (evoked
but not chosen by the brief) is observable but inert: it records
`evocations`, `last_evoked_episode` and the episode link — nothing else.
Only a **voiced** memory (one the Lens gives a brief line) consolidates:
`strength += boost`, relation re-feed at `EVOKE_SHARE`, and the mood pull.
Rationale (user): an invisible echo would move the mood with no narrated
cause — the reader could not understand why the character is sad or angry.
A memory is truly remembered only when the narration remembers it.

**Confirmed (preserve):** a voiced memory reaches the narrator with its full
`desc` — the remembered details, not a pointer — prefixed with its age and
anchored to the perceived item that stirred it (focus.py memory lines).
`retrieve()` stops applying effects; `build_brief` marks `voiced` and the
echo effects apply to the voiced set within the same open call.

**Decided (user): a memory stores the felt as it actually landed —
`memory.felt`.** How it felt through this personality is core to what a
memory IS, and the pull (`mood_pull` — word, refracted target, gain) used
to die at encode: only `imprint` (the world's suggestion — the objective
Relation sediment) and a 1-dim `valence` survived. Now `felt` stores the
pull verbatim, and the two channels keep their own domains (perceive's
split, honoured at re-feel): `voice_memories` feeds Relations from
`imprint` and pulls mood toward `felt.target` — remembering re-feels what
was felt, not what the world suggested. Studio exposes both.

**Decided (user): felt proximity joins the retrieval score — weight
only, never a gate.** `score += delta_felt (0.2) · proximity`, where
proximity is the wheel distance between the day's `mood_pull` targets
and the memory's stored `felt` target. With few memories the contact
gate suffices; the more a mind keeps, the more the score must
discriminate among the connected — of three wolf memories, the one that
felt like today leads. A memory that rhymes emotionally but shares
nothing stays silent: felt is a tiebreaker among the relevant, not a
reason of its own.

**Decided (user): 'tense' is an alias for 'afraid', not a sector of its
own.** The wheel's 106° outer word is now `afraid` — the human-felt
name of that zone (anticipation vs fear was a real distinction, but
two sectors on one wheel crowded the space). `FELT_ALIAS =
{'tense': 'afraid'}` canonicalizes at two borders: `felt_word` (an
authored `felt:tense` tag still lands — the pull's stored word comes
out `afraid`) and `mood_point` (stored pulls and pack data that still
say `tense` resolve to the same point). The soft ring keeps `uneasy`.
The Studio disc and its Spanish labels (`afraid` → `asustado`) follow
the same wheel; `tense`/`tenso` stays in labels for legacy stored
words.

## Phase 6 — Repetition

**Decided:** ONE repetition mechanism — pattern memories. Recurrence items
(synthetic wear items) and streak-rules→needs (`exposure`, `gloom`,
`mind.counters['rule:*']`, `update_rule_streaks`, `rule_fired_today`) are
deleted. Rationale: the recurrence item moved the mood with no narrated
cause — it violates the visible-cause rule just settled for memory echoes.
Needs stay detector-driven (condition fields, not history).

**Decided:** the pattern's break day stays narratable. At close, a live
pattern whose tag did NOT appear today emits a relief line ("the first dry
day" — positive, salient, encodable as volatile memory) the same day. The
pattern itself only dissolves if the absence persists across the window.
Two distinct narratable moments: the day it changes, and the fade.

## Phase 7 — Character preset & the Condition channel

**Decided:** a preset is personality + authored content only —
`personality`, `temperament`, starter beliefs, musings, seed relations.
Wiring leaves the preset and resolves at game level (shared physics for
every mind). Non-human minds with their own physics (a creature that never
sleeps) become impossible — accepted trade-off: no such minds are planned,
and one physics keeps debugging legible. The remaining preset work is
content authoring — real dial values per character — not design.

## Phase 8 — Choices

**Decided:** `/choose` scoring keeps four terms —
`need + attention + relation + temperature` — with three fixes:

1. Relation bias walks the specificity ladder (like `standing_relation`)
   instead of exact-matching `choice.subject` — the most specific Relation
   among the option's subjects applies. Revives the dead channel.
2. Uniform scores stay a pure temperature draw — no preference means an
   honest random pick.
3. Mood enters as a small bias: a strongly negative/aroused mood pulls
   toward AWAY_ACTS (yesterday's fear makes today's legs quicker) — modest
   weight, distinct from per-subject relation fear.

Constraint (user): the rewrite must simplify the code and keep it legible —
clarity over cleverness.

## Phase 9 — Felt → prose

**Decided:** the landing mood speaks only when the day moved it — a mood
beat at the last phase carrying the `dominant` word, emitted when
`|landing − entering|` passes a threshold and no `turn` already covered it.
A flat day does not declare neutrality. Implemented as one more key in
`mind.mood_render` (`landing`), not a new channel.

**Decided:** every landed Pull speaks where it happened — the felt beat.
Each noticed item whose `mood_pull` gain passes the bar
(`_FELT_BEAT_MIN_GAIN`) emits one phase-routed line, `{anchor} left them
{word}`: the anchor is the subject's Relation display (so the line can
echo inside its own encounter's block) or the reading's first clause.
Items the arc already spoke — the phase's shade, the turn's cause — and
mind-voiced items (needs, streaks, whose lines already speak) stay
silent: the same pull never says itself twice.

**Principle (user's architectural note):** the mind narrates *changes*, not
states. This is already true in three places without being named — pattern
detection + the break day (repetition), the mood arc's turn/shades and now
the moved landing (felt), and should be the transversal design rule: the
engine detects a pattern, notices when it breaks or when it starts to
chafe, and the breaking moment is a milestone in the character's life —
for good or ill, always worth narrating. When in doubt, prefer
delta-detection over state-reporting.

## Phase 10 — Tags

**Decided:** flat `family:value` namespaces — the `tag:` prefix dies. Every
tag reads "dimension: value" (`weather:wet`, `entity:orcs`, `npc:bungo`,
`felt:afraid`); role is declared by TAG_CLASSES (subject/pattern/cause/
ambient), not by a prefix. `where.place` stops minting `tag:place:*` — a
concrete place rides `entity:`; `place:` stays for place-kinds without a
ficha. Bare single-segment host tags die — all tags must be namespaced.

**Decided (family sweep):** `name` joins `UNTAGGED_FIELDS` — a display name
is metadata, not vocabulary (the narrator already receives it via
`reading`/`entity_name`). `thread` joins `UNTAGGED_FIELDS` — the needs
machinery reads it from `data` directly; its key is not vocabulary.

**Decided:** provenance ids get a home — `data.provenance = {record,
situation_id, interaction_id, scope}` groups "which world row produced
this" out of flat `data`. DB ids stop polluting the tag space (unique ids
read as eternal novelty) while remaining inspectable for Studio/debug.

**Decided:** interaction `data.tags` stops copying `need_tags` — `need:*`,
`mind:*`, `risk:*` are choice drivers ("why the mind picked this"), not
world content ("what happened"). They stay on the choice wire; the event
carries only authored semantic tags.

**Decided (family sweep, end):** `wounded:` is dead — nothing emits it
today; only the `:none` sentinel guard in `_content_tags` references it.
Keep the guard, drop the family. The tag space after this phase contains
only declared meaning families plus `entity:`/`region:`/`type:`/`npc:`.

## Phase 11 — Prompter payload

**Decided:** `narration_notes.lands` dies — events are the single source of
truth for the land. What the block uniquely carried moves into timed `land`
events:

- `describeRegions` — already duplicated by region land events: gone.
- Elevation effort — a `land` event at the peak/hardest-climb hour
  (derivable from `elevation_profile` positions).
- Road-type transitions — one `land` event per change of surface
  (road → trail → cross-country), timed at the transition segment. Leaving
  the road entirely is a narrated moment in its own right — "let go of the
  path and struck out cross-country" — currently invisible.

Anything without a derivable `when` folds into the nearest land event as
context `data`, never as an invented timestamp.

**Note (cleanup):** `OVERNIGHT_COLOUR_NOTE` becomes stale — the `rest`
event's `reading` already describes the night.

**Decided (revised — the whole channel dies):** `narration_notes` is
deleted from the open wire entirely — events are the single world
channel. Each piece found its home:

- `lands` → `land`/`subtype:'terrain'` event (road notes + elevation,
  timed to the peak's phase) — implemented.
- `climate_state` → `ambience`/`subtype:'climate_state'` event at first
  light — implemented.
- `equipage` → dead: the body's lacks already ride `condition` and the
  Needs voice them (thirst is a need, not a narrator note).
- `end_state` → dead: `fate` already rides the wire; the per-fate final
  wording lives mind-side in `terminal_day.end_state_section`.
- `journey_context` → dead: the prompt rebuilds it from `arc`.

**Decided:** the `PsychePacket` dies with it. `POST /episodes` returns
`{episode_id}` only — narration re-derives the mind's take from the
episode row, and observability reads `GET /episodes/{id}` (extended
with `brief` + `lens_eval`).

**Decided (prompt shape):** the narrator prompt splits standing from
daily. `system` carries what is identical every chapter — voice and
style, the character's header and authored lens, the land-notes and
encounter rules, the language instruction — so it becomes per-character
rather than global. `user` carries only the day: `=== {NAME} TODAY ===`
(the mind's volatile carried state; the lens block's own 'X today.'
opener folds into the title), journey context, special instructions,
climate, `=== TODAY ===`, and `=== THE CHAPTER'S RULES ===` closing the
skeleton contract + the chapter's closing instruction. The
`narration_notes` channel dies on this too — `OVERNIGHT_COLOUR_NOTE`
was already stale (the `rest` reading describes the night) and is gone
rather than relocated.

**Decided (the sky as titles):** `when.light` transitions mark the
skeleton as dividers — `— dusk falls —`, `— after dark —`,
`— first light —`, `— daylight —` — so an autumn 17:42 reads as night
by declaration, never by the narrator's clock guess. An opening sky is
told only when it surprises (dusk/night); the inline `(after dark)`
cue stays for lights that never got a divider and goes quiet under one.

**Decided (every inner line names its kind):** a Lens/stirs line that
is not the day itself says what it is — `(a memory, N days ago)`,
`(a standing feeling)`, `(a belief they hold)`, `(a thought of theirs)`
— so the narrator can tell a wound remembered from a wound now, and a
memory that cannot be dated is still marked `(a memory)`. Day-facing
lines (needs, felt beats, the turn, the Focus) stay bare: they already
read as present. The old `N days ago —` prefix dies — an undated
memory used to render bare and read as a live event.

**Decided (user): a recollection is an event, and rides inside the
event that woke it.** The evoked key was always on the perceived item;
now the prompt honours it — each brief line, felt beat and shade carries
`anchor` (its index into the perceived day, which mirrors `events` 1:1),
and `_stir_beats` attaches it to the matching beat: indented under the
line for notes/weather, the `echo` slot for encounters (memory or
standing feeling only — a felt pull is not "called to mind").

**Decided (user): nothing floats — the stirs block is dead.** A line
the day never touched never reaches the narrator: a standing feeling
for trolls the day never met, a memory nothing woke. Attachment order:
`anchor`/`connects_to` first, then subject-name matching (own phase,
then anywhere in the day — the subject's event is the only beat it can
ride). What remains is placed by kind: a need joins the event that IS
its domain (`_NEED_DOMAIN` — hunger at the meal, the weather complaint
under the weather, exhaustion at the camp), else the day's last beat —
the body's report at day's end; turn, shade and a day-Focus
(`(the day's centre) …`) close their own phase; a line anchored to a
moment the skeleton never rendered still belongs inside that phase's
last beat. Everything else — unanchored memories, dispositions,
musings — stays silent. A line that merely restates its own beat's
words is consumed, never printed twice; a Focus is exempt — marking
the centre over its own event is not repetition.

**Decided (user): the wake — the day's first event, real and
perceived.** A `type: 'wake'` event is prepended to `episode.events`
at open (`wake_event`, composed from the previous episode's rest —
only a literally consecutive night counts), so it is perceived like
any other event, carries `perceived_day` index 0, and shows in Mind
Studio as the day's first fact. It names where last night ended (the
previous rest's place) and what the night was worth — but only when
it was worth something (`rest:good` / `rest:poor`; a common night
earns no comment). Needs that are urgent, or that answer to no day's
event (exhaustion, sickness, unrest, a hunger on a foodless day),
speak under the wake rather than waiting for a scene that never
comes; with no previous rest the wake may appear on demand, as a bare
waking. The stateless narrate path (`previous_rest` without episodes)
synthesizes the same beat — the words come from one source,
`wake_anchor`.

**Decided (user): needs travel in events, like `evoked`.** Every day
line may carry `key` and `urgent` beside its anchor fields; the
renderer attaches a need under the day's *first* event of its domain
— the thirst speaks at the first meal, the weather complaint under
the first sky — and all climate complaints gather at that first
climate event rather than repeating under later skies. So any event
— meal, weather, rest, encounter, the wake — can carry both a
memory and the body's word about it.

**Decided (user): nothing carried floats — the Lens lists no carry.**
The `carried` bucket of `memory_beats` (lines not born today: needs,
memories, the mood's cause, a carried Focus) never renders in the
Lens — a `What they carry into this Episode:` list was proven dead
weight, lines the narrator could not place. Every carried line rides
the same attachment rules as a day line: yesterday's thirst speaks at
today's first meal, a memory whose subject an event touches surfaces
inside that event, and a carried line nothing touches stays silent.
The centre itself is no exception: a carried Focus rides the same
channel and speaks its own mark in scene — `(the day's centre) …` —
never announced twice. The Lens keeps only the entering mood's word;
the `(a memory…)` legend lives in `=== THE CHAPTER'S RULES ===`,
spoken only when the day carries such a marker.

**Decided (user): the memory says WHY it came back — and the whole
recollection travels.** The desc rides complete; the contact that woke
it is named inside the parens: `(a memory, 4 days ago — another land
crossed into) crossed into Talath Muil`. `via` is the shared contact tag
(subject families first — `the same orcs`, `Talath Muil again` — then
flag tags — `another land crossed into` — then a shared coarse facet —
`something of the same kind`). The line also carries HOW the memory
felt — appended as `— it left them afraid`, the same construction the
day's felt beats speak — so the narrator gets
the charge, not a dossier. And when no tag can name the rhyme but the
pull landed on the same wheel spot (delta_felt did the lifting at
retrieve), the via admits it: `— the same feeling`. The situational
rhyme and the felt charge
already exist on the wire; naming the rhyme lets the narrator connect
the event to the recollection instead of guessing at the link.

**Decided (user): the narrated felt word is the LANDED one, not the
suggestion.** `felt[].target` is where the pull actually came down
through this personality — so `— it left them X` names it with
`mood_name(target)`: a pull the world authored `afraid` that this
character refracted toward the alert sector narrates `watchful`. The
authored `word` stays on the record (suggestion vs landing, both kept)
and serves as fallback for pulls stored before `target` existed. The
same rule covers the day's felt beats: the word rendered is the landed
one, and a pull that landed at the Neutral core (`steady`) does not
speak — it did not move them.

**Decided (user): the skeleton reads as sentences a human can scan.**
Every rendered line gets a leading capital and a closing stop
(`_sentence`); marker-led lines (`(a memory…)`, `(a standing feeling)`)
keep their lowercase entry. One bullet style — `-` everywhere, the
encounter `*` is dead. A light divider tells the sky once: an encounter
already announced reads `Later — an encounter:`, never `After dark —`
twice. A beat whose text is a prefix of one already printed (or
contains it) yields to the longer — a night told twice tells once.
And the same felt pull speaks once per day: three grim moments in one
land say `Ered Luin left them afraid` a single time.

## Phase 12 — Open & close

**Verified (no new decisions):** the close pipeline order is sound —
`resolve_from_outcome` settles needs before the memory pass (a closed
chapter releases its memory in the same sweep), then encode/decay/patterns,
mood regress toward temperament, `decay_all` on relations, `maybe_reflect`.
`update_streak_counters` dies with the streak-rules deletion (phase 6).
Re-close idempotency already correct.

## Phase 13 — Shadow / the dark weight

**Decided:** `shadow` stays the canonical name for the character's burden —
it is the literary concept this models. The family mapped cleaner than the
audit suggested: `shadowFactor` (spawn multiplier) and `shadowBand` (level
band) are honest derivatives and stay. `shadow_altered` already died with
the altered machinery.

**Decided:** the two delta names unify — `entity.shadow_weight` and
`outcome.shadow_effect` both become `shadow_delta`. One name for "what this
does to your shadow" whether it rides an entity or an outcome.

## Phase 14 — Personality dials

**Decided:** one new-working dial only — `reflectiveness` scales
`reflection_every` (how often the close-time LLM reflection fires), keeping
its existing `voice_gain` role on musings. `rumination` is shelved — the
past does not return unbidden for now. `resistance`, `moodiness`,
`choice_variability`, `temperament` stay as-is.

**Decided:** the reflection's job expands — besides moving beliefs, the
LLM may reword the `desc` of any memory row it reflects on (retelling
reconsolidates) — episodic memories mature into richer descs, reinforced
beliefs sharpen, and **contradicted beliefs may be rewritten, not just
weakened**: "el Este es seguro" surviving three attacks becomes "el Este
ya no es lo que era" — the mind changes its opinion in words, mirroring
what `resistance` does in values. Values are never AI-touched — only the
wording.

**Verified:** the entering mood already reaches the open as
`"Still weighing on them (from yesterday): {cause.reading}"` via
`mind.mood.cause` — the "deprimido porque vio ruinas" channel exists;
making it surface consistently is prompter work, not design.

**Decided (AI wording rule):** the deterministic layer always owns values
and selection; the LLM only rewords. The mood is computed mechanically
every day — the reflection may rewrite the *wording* of the current
`mood.cause` ("las ruinas grises le quedaron pesando" instead of the
template), but the AI text is bound to the cause it described: when the
mood moves to a different cause, the AI text invalidates and the template
returns. One LLM call per reflection — beliefs, memory descs, mood-cause
wording — all of it phrasing over physics already computed.

## Phase 15 — Mind Studio

**Decided:** Studio reflects the settled vocabulary, not just a layout fix:
DayChart and MoodSpace stack vertically (legible), `imprint` replaces
`felt`, perception reads `noticed|unnoticed|misread`, and each memory
shows `evocations`/`voiced`/candidate-vs-voiced — the rumination
observability made visible.

## Phase 16 — Pipelines & cross-cutting cleanup

**Decided:** repair what serves the live authoring loop, delete the rest —
`validate-seeds.js` and `export-narration.js` get fixed against the
post-#187 schema (they are the write→export→validate→load cycle);
`export-current-data.js` (generic dumper, no owner) is deleted. The
remaining scripts (`verify-*`, `derive-*`, `seed-movers`, `post-deploy`,
`pg-dump`) get audited at implementation time — same rule: serves the loop
or dies.

**Inventory (confirmed dead from the audit, implementation scope):**
`paths` feature chain, dead climate/character/locations/DEM-peaks endpoint
clusters, orphaned migrations, dead `resolveNarrative` exports, dead Python
moon-phase port, undocumented `ENABLE_RESISTANCE_ROLL`, `WOUND_COSTS`
ReferenceError, missing ownership checks, stale manifests/docs.
