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
`felt:tense`); role is declared by TAG_CLASSES (subject/pattern/cause/
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
