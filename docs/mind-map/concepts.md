# Concepts — the vocabulary of the mind, with live examples

Each concept is a `CONTEXT.md` term. Steps read and write them;
stored concepts show a real row from the golden day's replay.

## Mind

_The lived interior of one Character: memories, beliefs, needs, mood._

- **lives in**: `mind.minds`
- **steps**: `get_or_create_mind` (writes)
- **columns**: `id`, `game_id`, `character_id`, `preset_id`, `preset_slug`, `wiring`, `mood`, `counters`, `temperament`, `personality`, `body`, `created_at`
- **example (golden day)**:
  ```json
  {"id": "mind-14", "game_id": "middle_earth", "character_id": "142", "preset_id": 419, "preset_slug": "aranath", "wiring": {"beta": 0.4, "alpha": 0.4, "decay": 0.85, "gamma": 0.2, "degraded": false, "w_novelty": 0.25, "belief_cap": 12, "delta_felt": 0.2, "w_severity": 0.35, "w_attention": 0.15, "w_emotional": 0.15, "decay_sticky": 0.95}, "mood": {"cause": null, "arousal": 0.13175, "feeling": null, "valence": -0.005499999999999998, "dominant": "steady", "dominance": 0.0375}, "counters": {"rule:gloom": 1, "rule:exposure": 1}, "temperament": {"arousal": 0.2, "valence": 0.05, "dominance": 0.15}, "personality": {"moodiness": 0.25, "resistance": 0.45, "reflectiveness": 0.6}, "body": {"hunger": 0.0,…
  ```

## Episode

_One stretch of life a Mind lives at once, whatever the Host calls it (a day, a scene, a session)._

- **lives in**: `mind.episodes`
- **steps**: `wake_event` (reads), `update_streak_counters` (reads), `close_episode_memory` (reads), `detect_patterns` (reads)
- **columns**: `id`, `game_id`, `character_id`, `episode_ref`, `status`, `episode_idx`, `episode_date`, `events`, `narrator_payload`, `config_snapshot`, `perceived_day`, `lens_block`, `brief`, `mood`, `needs_active`, `decisions`, `outcome`, `lens_eval`, `narrative`, `narrative_language`, `narrative_translation`, `created_at`, `narrated_at`, `closed_at`
- **example (golden day)**:
  ```json
  {"id": "ep-01", "game_id": "middle_earth", "character_id": "142", "episode_ref": "trip:id-02:day:1", "status": "closed", "episode_idx": 1, "episode_date": "1950-11-21", "events": [{"id": null, "act": null, "data": "…", "tags": "…", "type": "climate", "when": "…", "check": null, "where": "…", "reading": "a cool air, sun and moving cloud and a passing shower", "intensity": null}, {"id": null, "act": null, "data": "…", "tags": "…", "type": "climate", "when": "…", "check": null, "where": "…", "reading": "the sun quits the plain early, and the dark comes with the wind, cool and grey, partly cloudy, a wind that does not rest and soft rain", "intensity": null}, {"id": null, "act": null, "data": "…"…
  ```

## Character

_One living copy of a person, with its own card (name, description, portrait, foundational phrase, voice instructions, skills) and its own Mind._

- **lives in**: `mind.characters`
- **steps**: `get_or_create_character` (reads), `perception_check` (reads), `get_or_create_character` (writes)
- **columns**: `id`, `game_id`, `character_id`, `kind`, `original_id`, `slug`, `name`, `type`, `gender`, `entity_name`, `description`, `description_es`, `portrait_url`, `foundational_phrase`, `voice_instructions`, `skills`, `created_at`, `updated_at`
- **example (golden day)**:
  ```json
  {"id": "chr-15", "game_id": "middle_earth", "character_id": "142", "kind": "copy", "original_id": null, "slug": null, "name": "Aranath", "type": null, "gender": null, "entity_name": null, "description": "Tall and silent, one of those who count the days by the stars and not by the calendar. He has spent years walking the borders of old Arnor, and this time he wal…", "description_es": null}
  ```

## Mind preset

_A ready-made way of thinking (what to notice, how to remember, starting beliefs, the lived past it was born carrying) that is copied into an Original when it is created or edited._

- **lives in**: `mind.mind_presets (+ preset_wiring / starter_beliefs / leans / musings / memories)`
- **steps**: `get_or_create_mind` (reads)
- **columns**: `id`, `game_id`, `slug`, `name`, `description`, `created_at`, `temperament`, `personality`
- **example (golden day)**:
  ```json
  {"id": 419, "game_id": "middle_earth", "slug": "aranath", "name": "Aranath mind", "description": "Ranger of the old north; walks the borders of fallen Arnor and reads the land by its signs.", "created_at": "2026-09-30 11:10:40.739052+02:00", "temperament": {"arousal": 0.2, "valence": 0.05, "dominance": 0.15}, "personality": {"moodiness": 0.25, "resistance": 0.45, "reflectiveness": 0.6}}
  ```

## Event

_Something the Character lived in an Episode, reported by the Host already put into words — a reading plus the Tags it connects by._

- **lives in**: `wire events[] → mind.episodes.events`
- **steps**: `perceive_events` (reads), `perception_check` (reads), `meaning_of` (reads), `derive_tags` (reads), `retrieve` (reads), `dialogue_recall` (reads), `update_mind_mood` (reads), `build_brief` (reads), `encode_episode` (reads), `narrate_day` (reads), `wake_event` (writes)
- **columns**: `id`, `game_id`, `character_id`, `episode_ref`, `status`, `episode_idx`, `episode_date`, `events`, `narrator_payload`, `config_snapshot`, `perceived_day`, `lens_block`, `brief`, `mood`, `needs_active`, `decisions`, `outcome`, `lens_eval`, `narrative`, `narrative_language`, `narrative_translation`, `created_at`, `narrated_at`, `closed_at`
- **example (golden day)**:
  ```json
  [{"id": null, "act": null, "data": {}, "tags": [], "type": "climate", "when": {"hour": null, "light": null, "phase": "morning"}, "check": null, "where": {"place": null, "region": "Sandariand"}, "reading": "a cool air, sun and moving cloud and a passing shower", "intensity": null}, {"id": null, "act": null, "data": {}, "tags": ["weather:wet", "weather:windy"], "type": "climate", "when": {"hour": null, "light": null, "phase": "afternoon"}, "check": null, "where": {"place": null, "region": "Sandariand"}, "reading": "the sun quits the plain early, and the dark comes with the wind, cool and grey, partly cloudy, a wind that does not rest and soft rain", "intensity": null}, {"id": null, "act": null…
  ```

## Condition

_What the host's world says about a Character right now: position, body, counters, possessions, alive or dead._

- **lives in**: `wire condition → mind.minds.body`
- **steps**: `perceive_events` (reads), `perception_check` (reads), `needs_pass` (reads), `refresh_state_needs` (reads), `project_body` (reads), `body_projection` (writes), `project_body` (writes)
- **columns**: `id`, `game_id`, `character_id`, `preset_id`, `preset_slug`, `wiring`, `mood`, `counters`, `temperament`, `personality`, `body`, `created_at`
- **example (golden day)**:
  ```json
  {"hunger": 0.0, "thirst": 0.0, "unrest": 0.0, "fatigue": 0.12}
  ```

## Fate

_The Host's verdict on how an Episode ends, declared before the Episode is narrated, so the Mind knows the closing before it tells the stretch._

- **lives in**: `wire fate → mind.episodes.narrator_payload.fate`
- **steps**: `resolve_from_outcome` (reads), `resolve_from_outcome` (reads), `narrate_day` (reads)
- **columns**: `id`, `game_id`, `character_id`, `episode_ref`, `status`, `episode_idx`, `episode_date`, `events`, `narrator_payload`, `config_snapshot`, `perceived_day`, `lens_block`, `brief`, `mood`, `needs_active`, `decisions`, `outcome`, `lens_eval`, `narrative`, `narrative_language`, `narrative_translation`, `created_at`, `narrated_at`, `closed_at`
- **example (golden day)**:
  ```json
  "living"
  ```

## Decision

_An act the Character chose, as opposed to what the world did to it: the pre-episode picking of each Situation's Interaction (ADR-0019), or any act the host records as chosen._

- **lives in**: `mind.episodes.decisions`
- **steps**: `choose` (writes)
- **columns**: `id`, `game_id`, `character_id`, `episode_ref`, `status`, `episode_idx`, `episode_date`, `events`, `narrator_payload`, `config_snapshot`, `perceived_day`, `lens_block`, `brief`, `mood`, `needs_active`, `decisions`, `outcome`, `lens_eval`, `narrative`, `narrative_language`, `narrative_translation`, `created_at`, `narrated_at`, `closed_at`
- **example**: _(none produced on the golden day)_

## Perceived day

_The Episode's Events as the Mind lived them: the raw `events[]` annotated with Perception, Reading, Salience, valence, Tags, Imprint and Pulls — the same facts, now felt._

- **lives in**: `mind.episodes.perceived_day`
- **steps**: `needs_pass` (reads), `episode_mood` (reads), `perceive_events` (writes), `resolve_break_items` (writes)
- **columns**: `id`, `game_id`, `character_id`, `episode_ref`, `status`, `episode_idx`, `episode_date`, `events`, `narrator_payload`, `config_snapshot`, `perceived_day`, `lens_block`, `brief`, `mood`, `needs_active`, `decisions`, `outcome`, `lens_eval`, `narrative`, `narrative_language`, `narrative_translation`, `created_at`, `narrated_at`, `closed_at`
- **example (golden day)**:
  ```json
  [{"id": null, "act": null, "data": {}, "tags": ["type:climate", "region:Sandariand"], "type": "climate", "when": {"hour": null, "light": null, "phase": "morning"}, "check": null, "where": {"place": null, "region": "Sandariand"}, "evoked": [], "source": "ambient", "imprint": {"familiarity": 0.002}, "reading": "a cool air, sun and moving cloud and a passing shower"}, {"id": null, "act": null, "data": {}, "tags": ["type:climate", "tag:weather:wet", "tag:weather:windy", "… 1 more"], "type": "climate", "when": {"hour": null, "light": null, "phase": "afternoon"}, "check": null, "where": {"place": null, "region": "Sandariand"}, "evoked": [], "source": "ambient", "imprint": {"affection": -0.01850000…
  ```

## Perception

_The verdict an Event earns passing through the Mind: noticed, unnoticed, or misread._

- **lives in**: `perceived_day[].perception (noticed | unnoticed | misread)`
- **steps**: `perception_check` (writes)
- **example**: _(none produced on the golden day)_

## Perception check

_A gate the Host declares on an Event — "noticing this takes this skill" (`check{skill, difficulty, gate?}`)._

- **lives in**: `perceived_day[].check (the seeded roll audit)`
- **example**: _(none produced on the golden day)_

## Salience

_How loudly a lived thing lands — the intensity with which the Mind lived the Event._

- **lives in**: `perceived_day[].salience`
- **example**: _(none produced on the golden day)_

## Novelty

_How much of an Event's Tag surface the Mind has never seen — new things arrive louder, familiar things sink to background._

- **lives in**: `derived per event: unseen tags ÷ tags (last 20 episodes)`
- **example**: _(none produced on the golden day)_

## Meaning

_What a kind of contact objectively means — the declared delta a Tag pattern carries (an attack means fear, an offered meal means trust), stored in the `semantics` pack and tunable per game._

- **lives in**: `mind.semantics (+ DEFAULT_SEMANTICS built-in pack)`
- **steps**: `feed_event` (reads), `meaning_of` (writes)
- **columns**: `id`, `game_id`, `key`, `delta`, `weight`, `body`, `salience_min`, `severity`, `wakes`, `enabled`
- **example**: _(none produced on the golden day)_

## Recurrence

_The Mind's own noticing of repetition — items it synthesizes, not things the world did (source: mind)._

- **lives in**: `perceived_day (source: mind items — repetition / break)`
- **steps**: `resolve_break_items` (reads)
- **example**: _(none produced on the golden day)_

## Tag

_A word from the Tag registry — `family:value` — marking what an Event or Memory can connect to._

- **lives in**: `events[].tags (wire); families fixed by the registry`
- **steps**: `meaning_of` (reads), `detect_patterns` (reads), `derive_tags` (writes)
- **example**: _(none produced on the golden day)_

## Pull

_The only channel by which an Event moves the Mood: a `felt:*` Tag names a point on the mood wheel (the word IS the point — soft ring, strong ring, extreme or the `steady` origin), and the Mood travels a fraction of the way there — never past it._

- **lives in**: `perceived_day[].mood_pull — a felt:* tag's point on the mood wheel`
- **example**: _(none produced on the golden day)_

## Detector

_A declared rule that reads the Condition snapshot: it opens a Need when a field crosses its threshold, bends a perception roll while a state holds, or marks the Mind as altered._

- **lives in**: `mind.detectors`
- **steps**: `body_projection` (reads)
- **columns**: `id`, `game_id`, `kind`, `key`, `field`, `op`, `value`, `scale`, `group_key`, `ordinal`, `mod`, `urgency_base`, `urgency_per`, `urgency_from`, `urgency_map`, `need_type`, `description`, `enabled`
- **example (golden day)**:
  ```json
  {"id": 11, "game_id": "middle_earth", "kind": "altered", "key": "shadow_altered", "field": "shadow", "op": ">=", "value": 0.25, "scale": 100.0, "group_key": null, "ordinal": 0, "mod": null, "urgency_base": null}
  ```

## Need

_What the Mind lacks and asks of the Episode: something the body or spirit wants (food, water, rest, healing, relief from the shadow) or an open loop it carries (a Thread)._

- **lives in**: `mind.needs`
- **steps**: `resolve_break_items` (reads), `episode_mood` (reads), `build_brief` (reads), `choose` (reads), `needs_pass` (writes), `refresh_state_needs` (writes), `resolve_from_outcome` (writes), `update_streak_counters` (writes), `resolve_from_outcome` (writes)
- **columns**: `id`, `game_id`, `character_id`, `key`, `type`, `description`, `urgency`, `status`, `source`, `linked_entity`, `linked_region`, `opened_episode`, `due_episode`, `updated_episode`, `resolution`, `created_at`
- **example**: _(none produced on the golden day)_

## Thread

_An open loop the Mind carries as a Need — a promise, an unfinished encounter, a goal of any horizon, short or lifelong._

- **lives in**: `mind.needs (open-loop kinds)`
- **is a**: Need
- **columns**: `id`, `game_id`, `character_id`, `key`, `type`, `description`, `urgency`, `status`, `source`, `linked_entity`, `linked_region`, `opened_episode`, `due_episode`, `updated_episode`, `resolution`, `created_at`
- **example**: _(none produced on the golden day)_

## Mood

_How the Mind feels as it enters an Episode, always told through what caused it ("still uneasy since the orc tracks"), never as a bare label._

- **lives in**: `mind.minds.mood (running) + mind.episodes.mood (the day's)`
- **steps**: `update_mind_mood` (reads), `build_brief` (reads), `regress` (reads), `maybe_reflect` (reads), `derive_feeling` (reads), `voice_memories` (writes), `episode_mood` (writes), `update_mind_mood` (writes), `regress` (writes), `maybe_reflect` (writes)
- **columns**: `id`, `game_id`, `character_id`, `preset_id`, `preset_slug`, `wiring`, `mood`, `counters`, `temperament`, `personality`, `body`, `created_at`
- **example (golden day)**:
  ```json
  {"cause": null, "arousal": 0.13175, "feeling": null, "valence": -0.005499999999999998, "dominant": "steady", "dominance": 0.0375}
  ```

## Temperament

_The point in the Mood's own space where the Mood falls by inertia when nothing happens — the resting feeling a Mind returns to, from a hobbit's warm contentment to Celebrían's cool calm._

- **lives in**: `mind.minds.temperament`
- **steps**: `regress` (reads)
- **columns**: `id`, `game_id`, `character_id`, `preset_id`, `preset_slug`, `wiring`, `mood`, `counters`, `temperament`, `personality`, `body`, `created_at`
- **example (golden day)**:
  ```json
  {"arousal": 0.2, "valence": 0.05, "dominance": 0.15}
  ```

## Feeling

_A literary word the engine derives for the narration by matching the live vector state — Mood, Relations, Body and how long they have held — against a declared lexicon: fear with no dominance becomes dread, long-held low valence becomes melancholy, full-grown affection and trust become deep friendship._

- **lives in**: `derived: live vector × pack mind.feeling_lexicon`
- **steps**: `derive_feeling` (writes)
- **example**: _(none produced on the golden day)_

## Memory

_An impression a Mind kept from something it lived._

- **lives in**: `mind.memories`
- **steps**: `retrieve` (reads), `dialogue_recall` (reads), `voice_memories` (reads), `build_brief` (reads), `decay_pass` (reads), `forget` (reads), `maybe_reflect` (reads), `retrieve` (writes), `dialogue_recall` (writes), `voice_memories` (writes), `close_episode_memory` (writes), `encode_episode` (writes), `detect_patterns` (writes), `decay_pass` (writes)
- **columns**: `id`, `game_id`, `character_id`, `episode_ids`, `kind`, `tags`, `entity_id`, `region`, `desc`, `valence`, `importance`, `strength`, `evocations`, `last_evoked_episode`, `voiced`, `last_voiced_episode`, `consolidated`, `embedding`, `origin`, `created_episode`, `created_date`, `last_evoked_date`, `imprint`, `subjects`, `felt`, `feeling`, `depth`, `mutable`, `conviction`
- **example (golden day)**:
  ```json
  {"id": "mem-16", "game_id": "middle_earth", "character_id": "142", "episode_ids": ["ep-01"], "kind": "episodic", "tags": ["type:climate", "region:Sandariand"], "entity_id": null, "region": "Sandariand", "desc": "a cool air, sun and moving cloud and a passing shower", "valence": 0.0, "importance": 0.25, "strength": 0.25}
  ```

## Conviction

_A Memory at the deepest tier — where a Belief lives: one row, one truth._

- **lives in**: `mind.memories (facet conviction)`
- **is a**: Memory
- **columns**: `id`, `game_id`, `character_id`, `episode_ids`, `kind`, `tags`, `entity_id`, `region`, `desc`, `valence`, `importance`, `strength`, `evocations`, `last_evoked_episode`, `voiced`, `last_voiced_episode`, `consolidated`, `embedding`, `origin`, `created_episode`, `created_date`, `last_evoked_date`, `imprint`, `subjects`, `felt`, `feeling`, `depth`, `mutable`, `conviction`
- **example (golden day)**:
  ```json
  {"id": "mem-16", "game_id": "middle_earth", "character_id": "142", "episode_ids": ["ep-01"], "kind": "episodic", "tags": ["type:climate", "region:Sandariand"], "entity_id": null, "region": "Sandariand", "desc": "a cool air, sun and moving cloud and a passing shower", "valence": 0.0, "importance": 0.25, "strength": 0.25}
  ```

## Forgotten

_A Memory the Mind has lost: kept as a trace with the day it was lost so the Mind's history can be seen, but never evoked again._

- **lives in**: `mind.forgotten_memories`
- **is a**: Memory
- **steps**: `close_episode_memory` (writes), `decay_pass` (writes), `forget` (writes)
- **columns**: `id`, `game_id`, `character_id`, `episode_ids`, `kind`, `tags`, `entity_id`, `desc`, `valence`, `importance`, `evocations`, `voiced`, `consolidated`, `created_episode`, `created_date`, `forgotten_episode`, `last_strength`
- **example**: _(none produced on the golden day)_

## Past

_What the Mind lived and kept: its Memories, the Forgotten and the patterns repetition left._

- **lives in**: `mind.memories + mind.forgotten_memories (the kept, the lost, the patterns)`
- **steps**: `close_episode_memory` (writes)
- **columns**: `id`, `game_id`, `character_id`, `episode_ids`, `kind`, `tags`, `entity_id`, `region`, `desc`, `valence`, `importance`, `strength`, `evocations`, `last_evoked_episode`, `voiced`, `last_voiced_episode`, `consolidated`, `embedding`, `origin`, `created_episode`, `created_date`, `last_evoked_date`, `imprint`, `subjects`, `felt`, `feeling`, `depth`, `mutable`, `conviction`
- **example (golden day)**:
  ```json
  {"id": "mem-16", "game_id": "middle_earth", "character_id": "142", "episode_ids": ["ep-01"], "kind": "episodic", "tags": ["type:climate", "region:Sandariand"], "entity_id": null, "region": "Sandariand", "desc": "a cool air, sun and moving cloud and a passing shower", "valence": 0.0, "importance": 0.25, "strength": 0.25}
  ```

## Evocation

_When a Memory connects to the Episode and comes forward — it is not only read but lightly re-felt: the Mood is pulled a dampened share toward how the Memory felt and the Relation is fed again, never as much as living it._

- **lives in**: `derived per open: memories the day connects to`
- **example**: _(none produced on the golden day)_

## Belief

_Something the Mind holds true: a statement, how firmly it is held (from barely to a way of life) and what it is about — the world, the self, others, or what matters (a Value)._

- **lives in**: `mind.memories (conviction facet)`
- **is a**: Conviction
- **steps**: `active_convictions` (reads), `build_brief` (reads), `belief_fade_pass` (reads), `maybe_reflect` (reads), `active_convictions` (writes), `belief_fade_pass` (writes), `maybe_reflect` (writes)
- **columns**: `id`, `game_id`, `character_id`, `episode_ids`, `kind`, `tags`, `entity_id`, `region`, `desc`, `valence`, `importance`, `strength`, `evocations`, `last_evoked_episode`, `voiced`, `last_voiced_episode`, `consolidated`, `embedding`, `origin`, `created_episode`, `created_date`, `last_evoked_date`, `imprint`, `subjects`, `felt`, `feeling`, `depth`, `mutable`, `conviction`
- **example (golden day)**:
  ```json
  {"id": "mem-16", "game_id": "middle_earth", "character_id": "142", "episode_ids": ["ep-01"], "kind": "episodic", "tags": ["type:climate", "region:Sandariand"], "entity_id": null, "region": "Sandariand", "desc": "a cool air, sun and moving cloud and a passing shower", "valence": 0.0, "importance": 0.25, "strength": 0.25}
  ```

## Relation

_The emotional sediment a Subject leaves in the Mind: not an entity in the world but the standing sum of everything the Mind has felt about it — the love for a place, the fear of a kind, the trust in a person._

- **lives in**: `mind.relations`
- **steps**: `decay_all` (reads), `choose` (reads), `perceive_events` (writes), `voice_memories` (writes), `decay_all` (writes), `feed_event` (writes)
- **columns**: `id`, `game_id`, `character_id`, `subject`, `display_name`, `affection`, `trust`, `fear`, `familiarity`, `feeling`, `origin`, `last_fed_episode`, `last_surfaced_episode`
- **example (golden day)**:
  ```json
  {"id": "rel-17", "game_id": "middle_earth", "character_id": "142", "subject": "region:Weather Hills", "display_name": null, "affection": 0.0, "trust": 0.0, "fear": 0.0, "familiarity": 0.392, "feeling": null, "origin": "seed", "last_fed_episode": null}
  ```

## Lens

_What the Mind tells the narrator about an Episode: what matters to it, one central line and a few that connect to it._

- **lives in**: `mind.episodes.brief + mind.episodes.lens_block`
- **steps**: `direct` (reads), `render_lens` (reads), `narrate_day` (reads), `build_brief` (writes), `render_lens` (writes)
- **columns**: `id`, `game_id`, `character_id`, `episode_ref`, `status`, `episode_idx`, `episode_date`, `events`, `narrator_payload`, `config_snapshot`, `perceived_day`, `lens_block`, `brief`, `mood`, `needs_active`, `decisions`, `outcome`, `lens_eval`, `narrative`, `narrative_language`, `narrative_translation`, `created_at`, `narrated_at`, `closed_at`
- **example (golden day)**:
  ```json
  {"day": [{"id": "musing:mu_223d51a4175d4c9089c17aa6345c3f6b", "why": "called up by: Owls — They are going about their own business. Their busine", "kind": "musing", "part": "day", "text": "As long as birds keep singing at dawn, not everything is lost.", "phase": "morning", "score": 0.21, "render": "(a thought of theirs) As long as birds keep singing at dawn, not everything is lost.", "connects_to": "event:6"}, {"id": "musing:mu_8f32f011822e4b9e843d43758ee8da58", "why": "called up by: Owls — They are going about their own business. Their busine", "kind": "musing", "part": "day", "text": "A bird landing on my hand trusts without knowing my name; that is a sacred kind of faith.", "phase": "morn…
  ```

## Focus

_The one thing an Episode turns on for a Mind, the centre of its Lens._

- **lives in**: `mind.episodes.brief.focus`
- **steps**: `build_brief` (writes), `direct` (writes)
- **columns**: `id`, `game_id`, `character_id`, `episode_ref`, `status`, `episode_idx`, `episode_date`, `events`, `narrator_payload`, `config_snapshot`, `perceived_day`, `lens_block`, `brief`, `mood`, `needs_active`, `decisions`, `outcome`, `lens_eval`, `narrative`, `narrative_language`, `narrative_translation`, `created_at`, `narrated_at`, `closed_at`
- **example (golden day)**:
  ```json
  {"id": "event:12", "why": "salience 0.55", "kind": "event", "part": "day", "text": "crossed into Sandariand", "phase": "morning", "score": 0.55, "render": "crossed into Sandariand"}
  ```

## Musing

_An authored line of the Character's inner voice — how this person sounds inside in a kind of moment (solitude, a friendly encounter, after danger, near animals)._

- **lives in**: `mind.musings`
- **steps**: `build_brief` (reads)
- **columns**: `id`, `game_id`, `character_id`, `statement`, `tags`, `origin`, `formed_episode`, `last_spoke_episode`
- **example (golden day)**:
  ```json
  {"id": "mu_f21de25532ee498c8bd0463f820cfbe1", "game_id": "middle_earth", "character_id": "142", "statement": "I have spent years walking the borders of fallen Arnor; this time I walk alone.", "tags": ["context:solitude"], "origin": "seed", "formed_episode": null, "last_spoke_episode": null}
  ```

## Inner language

_The single language the Mind Engine thinks and narrates in (English): World voice, Memories, Lens and narration all live in it._

- **lives in**: `mind.episodes.narrative (the channel, not a row)`
- **steps**: `narrate_day` (writes)
- **columns**: `id`, `game_id`, `character_id`, `episode_ref`, `status`, `episode_idx`, `episode_date`, `events`, `narrator_payload`, `config_snapshot`, `perceived_day`, `lens_block`, `brief`, `mood`, `needs_active`, `decisions`, `outcome`, `lens_eval`, `narrative`, `narrative_language`, `narrative_translation`, `created_at`, `narrated_at`, `closed_at`
- **example (golden day)**:
  ```json
  "<generation stubbed — run --narrate>"
  ```

## Reflection

_The Mind's only re-reading of itself: a close-time pass that, when its trigger fires, rewrites what the Episode left — it may lend a carried cause better words, or turn a prejudice by rewriting the Conviction's facet and imprint._

- **lives in**: `derived per close (LLM pass, trigger-gated)`
- **example**: _(none produced on the golden day)_
