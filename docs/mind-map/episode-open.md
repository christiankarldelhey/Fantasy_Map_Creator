# episode-open — traced steps

Golden day: Aranath to Sarn Athrad — day 1

```mermaid
flowchart LR
    s0["Mind<br/><i>get_or_create_mind</i>"]
    s1["Character<br/><i>get_or_create_character</i>"]
    s2["Detector<br/><i>body_projection</i>"]
    s3["Detector<br/><i>project_body</i>"]
    s4["Perceived day<br/><i>perceive_events</i>"]
    s5["Evocation<br/><i>retrieve</i>"]
    s6["Evocation<br/><i>dialogue_recall</i>"]
    s7["Need<br/><i>needs_pass</i>"]
    s8["Need<br/><i>resolve_break_items</i>"]
    s9["Mood<br/><i>episode_mood</i>"]
    s10["Pull<br/><i>update_mind_mood</i>"]
    s11["Belief<br/><i>active_convictions</i>"]
    s12["Lens<br/><i>build_brief</i>"]
    s13["Evocation<br/><i>voice_memories</i>"]
    s14["Lens<br/><i>render_lens</i>"]
    s0 --> s1
    s1 --> s2
    s2 --> s3
    s3 --> s4
    s4 --> s5
    s5 --> s6
    s6 --> s7
    s7 --> s8
    s8 --> s9
    s9 --> s10
    s10 --> s11
    s11 --> s12
    s12 --> s13
    s13 --> s14

```

### Mind — `get_or_create_mind()` `app/mind/provisioning.py`

_The lived interior of one Character: memories, beliefs, needs, mood._

- **reads**: Mind preset
- **writes**: Mind
- **rules (tests)**:
  - `tests/test_affect.py::test_hostile_encounter_darkens_the_day` — A confrontation that wounds is a bad day — the semantic pack reads
  - `tests/test_affect.py::test_host_valence_is_not_the_hosts_to_declare` — data.valence is dead on the wire — the mind reads the world's
  - `tests/test_affect.py::test_numeric_fields_push_valence` — 'shadow_effect' is a declared numeric fact — it reads as menace
  - `tests/test_affect.py::test_a_shut_door_is_felt_and_remembered` — The night's social truth travels as tags: 'lodging:turned_away'
  - `tests/test_affect.py::test_a_kind_night_warms` — 'lodging:charity' is felt as mercy — a charitable roof reads
  - `tests/test_affect.py::test_two_minds_feel_the_same_world_differently` — The whole point: a preset leaning 'orcs are dreaded' meets the
  - `tests/test_affect.py::test_a_bad_day_leaves_a_morning_after` — The felt day carries into the running mood: the day after the
  - `tests/test_attitudes.py::test_only_the_narrowest_attitude_line_speaks` — In the Lens, the horses-of-Mordor attitude answers a Mordor-horse
  - `tests/test_belief_horizon.py::test_transient_belief_fades_with_the_days` — 'This ford is dangerous these days' — close five quiet episodes
  - `tests/test_belief_horizon.py::test_enduring_belief_ignores_the_calendar` — 'The Dunedain are thieves' is about people, not days — five quiet
  - `tests/test_belief_horizon.py::test_reflection_reads_the_horizon` — The LLM declares horizon on create; absent or bogus values fall
  - `tests/test_belief_horizon.py::test_reflection_ignores_transient_harder` — A transient belief a reflection does not touch decays at the
  - _…172 more in graph.json_
- **example in**:
  ```json
  [{"game_id": "middle_earth"}, {"character_id": "142"}, {"hint_slug": "aranath"}]
  ```
- **example out**:
  ```json
  {"id": "mind-01", "game_id": "middle_earth", "character_id": "142", "preset_id": 419, "preset_slug": "aranath", "wiring": "…", "mood": "…", "counters": "…", "temperament": "…", "personality": "…"}
  ```

### Character — `get_or_create_character()` `app/mind/provisioning.py`

_One living copy of a person, with its own card (name, description, portrait, foundational phrase, voice instructions, skills) and its own Mind._

- **reads**: Character
- **writes**: Character
- **example in**:
  ```json
  [{"game_id": "middle_earth"}, {"card": {"id": "142", "name": "Aranath", "preset": "aranath", "skills": {"lore": 3, "melee": 6, "ranged": 5, "insight": 5, "stealth": 7, "tracking": 7, "deception": 3, "endurance": 6, "persuasion": 3, "intimidation": 5}, "description": "Tall and silent, one of those who count the days by the stars and not by the calendar. He has spent years walking the borders of old Arnor, and this time he wal…", "entity_name": null, "portrait_url": "/portraits/Aranath.png", "syst…
  ```
- **example out**:
  ```json
  {"id": "chr-02", "game_id": "middle_earth", "character_id": "142", "kind": "copy", "original_id": null, "slug": null, "name": "Aranath", "type": null, "gender": null, "entity_name": null}
  ```

### Detector — `body_projection()` `app/mind/detectors.py`

_A declared rule that reads the Condition snapshot: it opens a Need when a field crosses its threshold, bends a perception roll while a state holds, or marks the Mind as altered._

- **reads**: Detector
- **writes**: Condition
- **example in**:
  ```json
  [{"game_id": "middle_earth"}]
  ```
- **example out**:
  ```json
  {"hunger": {"field": "days_without_food", "scale": 5.0, "invert": false}, "thirst": {"field": "days_without_water", "scale": 3.0, "invert": false}, "fatigue": {"field": "energy", "scale": 100.0, "invert": true}, "unrest": {"field": "shadow", "scale": 100.0, "invert": false}, "cold": {"field": "cold", "scale": 1.0, "invert": false}, "pain": {"field": "pain", "scale": 1.0, "invert": false}, "illness": {"field": "illness", "scale": 1.0, "invert": false}}
  ```

### Detector — `project_body()` `app/mind/engine.py`

_A declared rule that reads the Condition snapshot: it opens a Need when a field crosses its threshold, bends a perception roll while a state holds, or marks the Mind as altered._

- **reads**: Condition
- **writes**: Condition
- **rules (tests)**:
  - `tests/test_engine.py::test_body_projects_from_condition_and_takes_acute_hits` — The declared field→dim map; a wound lands on top of it.
- **example in**:
  ```json
  [{"condition": {"sick": false, "coins": 100, "energy": 88, "shadow": 0, "rations": 7, "wounded": "none", "coldShift": 3, "waterHeld": 2.25, "turnedAway": false, "distance_km": 48.06, "flaskFrozen": false, "walking_hours": 12}}, {"mapping": {"hunger": {"field": "days_without_food", "scale": 5.0, "invert": false}, "thirst": {"field": "days_without_water", "scale": 3.0, "invert": false}, "fatigue": {"field": "energy", "scale": 100.0, "invert": true}, "unrest": {"field": "shadow", "scale": 100.0, "i…
  ```
- **example out**:
  ```json
  {"hunger": 0.0, "thirst": 0.0, "fatigue": 0.12, "unrest": 0.0}
  ```

### Perceived day — `perceive_events()` `app/mind/perceive.py`

_The Episode's Events as the Mind lived them: the raw `events[]` annotated with Perception, Reading, Salience, valence, Tags, Imprint and Pulls — the same facts, now felt._

- **reads**: Event, Condition
- **writes**: Perceived day, Relation
- **example in**:
  ```json
  [{"game_id": "middle_earth"}, {"events": [{"id": null, "type": "climate", "when": {"hour": null, "phase": "morning", "light": null}, "where": {"region": "Sandariand", "place": null}, "act": null, "intensity": null, "reading": "a cool air, sun and moving cloud and a passing shower", "tags": [], "check": null, "data": {}}, {"id": null, "type": "climate", "when": {"hour": null, "phase": "afternoon", "light": null}, "where": {"region": "Sandariand", "place": null}, "act": null, "intensity": null, "r…
  ```
- **example out**:
  ```json
  [{"id": null, "type": "climate", "when": {"hour": null, "phase": "morning", "light": null}, "where": {"region": "Sandariand", "place": null}, "act": null, "intensity": null, "reading": "a cool air, sun and moving cloud and a passing shower", "tags": ["type:climate", "region:Sandariand"], "check": null, "data": {}, "perception": "noticed", "source": "ambient"}, {"id": null, "type": "climate", "when": {"hour": null, "phase": "afternoon", "light": null}, "where": {"region": "Sandariand", "place": n…
  ```

### Evocation — `retrieve()` `app/mind/retrieval.py`

_When a Memory connects to the Episode and comes forward — it is not only read but lightly re-felt: the Mood is pulled a dampened share toward how the Memory felt and the Relation is fed again, never as much as living it._

- **reads**: Event, Memory
- **writes**: Memory
- **example in**:
  ```json
  [{"episode": {"id": "ep-08", "game_id": "middle_earth", "character_id": "142", "episode_ref": "trip:id-09:day:1", "status": "open", "episode_idx": 1, "episode_date": "…", "events": "…", "narrator_payload": "…", "config_snapshot": "…"}}, {"perceived_day": [{"id": null, "type": "climate", "when": {"hour": null, "phase": "morning", "light": null}, "where": {"region": "Sandariand", "place": null}, "act": null, "intensity": null, "reading": "a cool air, sun and moving cloud and a passing shower", "ta…
  ```
- **example out**:
  ```json
  [{"id": "mem-10", "game_id": "middle_earth", "character_id": "142", "episode_ids": "…", "kind": "episodic", "tags": "…", "entity_id": null, "region": "Ettenmoors", "desc": "…", "valence": -0.75}, {"id": "mem-11", "game_id": "middle_earth", "character_id": "142", "episode_ids": "…", "kind": "episodic", "tags": "…", "entity_id": null, "region": "Coldfells", "desc": "…", "valence": -0.8}, {"id": "mem-12", "game_id": "middle_earth", "character_id": "142", "episode_ids": "…", "kind": "episodic", "tag…
  ```

### Evocation — `dialogue_recall()` `app/mind/retrieval.py`

_When a Memory connects to the Episode and comes forward — it is not only read but lightly re-felt: the Mood is pulled a dampened share toward how the Memory felt and the Relation is fed again, never as much as living it._

- **reads**: Event, Memory
- **writes**: Memory
- **rules (tests)**:
  - `tests/test_c23_recall.py::test_dialogue_recall_finds_the_memory_that_answers` — 'Seen any wolves on the south road?' stirs the wolf sighting —
  - `tests/test_c23_recall.py::test_dialogue_recall_stays_silent_without_a_match` — A question about bread prices must not dredge up the warg.
  - `tests/test_c23_recall.py::test_dialogue_recall_respects_refractory` — The wolf memory consulted yesterday cannot answer again today.
- **example in**:
  ```json
  [{"item": {"id": null, "type": "encounter", "when": {"hour": 2.5, "phase": "night", "light": "night"}, "where": {"region": "Mänoriand", "place": null}, "act": "talk", "intensity": 1.0, "reading": "Herb-lands — The spring is clean and the herbs are well-established, which means this ground has not been poisoned or disturbed recently. A gift from the road.", "tags": ["type:encounter", "entity:herb_lands", "tag:form:harvest_shelter", "… 4 more"], "check": {"gate": "tracking", "skill": 7, "min": 0.0…
  ```
- **example out**:
  ```json
  {"id": "mem-13", "game_id": "middle_earth", "character_id": "142", "episode_ids": "…", "kind": "conviction", "tags": "…", "entity_id": null, "region": null, "desc": "…", "valence": -0.1}
  ```

### Need — `needs_pass()` `app/mind/needs.py`

_What the Mind lacks and asks of the Episode: something the body or spirit wants (food, water, rest, healing, relief from the shadow) or an open loop it carries (a Thread)._

- **reads**: Condition, Perceived day
- **writes**: Need
- **example in**:
  ```json
  [{"game_id": "middle_earth"}, {"episode": {"id": "ep-08", "game_id": "middle_earth", "character_id": "142", "episode_ref": "trip:id-09:day:1", "status": "open", "episode_idx": 1, "episode_date": "…", "events": "…", "narrator_payload": "…", "config_snapshot": "…"}}, {"perceived": [{"id": null, "type": "climate", "when": {"hour": null, "phase": "morning", "light": null}, "where": {"region": "Sandariand", "place": null}, "act": null, "intensity": null, "reading": "a cool air, sun and moving cloud a…
  ```
- **example out**:
  ```json
  []
  ```

### Need — `resolve_break_items()` `app/mind/perceive.py`

_What the Mind lacks and asks of the Episode: something the body or spirit wants (food, water, rest, healing, relief from the shadow) or an open loop it carries (a Thread)._

- **reads**: Recurrence, Need
- **writes**: Perceived day
- **example in**:
  ```json
  [{"game_id": "middle_earth"}, {"perceived": [{"id": null, "type": "climate", "when": {"hour": null, "phase": "morning", "light": null}, "where": {"region": "Sandariand", "place": null}, "act": null, "intensity": null, "reading": "a cool air, sun and moving cloud and a passing shower", "tags": ["type:climate", "region:Sandariand"], "check": null, "data": {}, "perception": "noticed", "source": "ambient"}, {"id": null, "type": "climate", "when": {"hour": null, "phase": "afternoon", "light": null}, …
  ```
- **example out**:
  ```json
  null
  ```

### Mood — `episode_mood()` `app/mind/lens.py`

_How the Mind feels as it enters an Episode, always told through what caused it ("still uneasy since the orc tracks"), never as a bare label._

- **reads**: Perceived day, Need
- **writes**: Mood
- **rules (tests)**:
  - `tests/test_relations.py::test_a_shade_names_the_counter_current` — A good day dimmed by a melancholy tower — the pull that did not
- **example in**:
  ```json
  [{"game_id": "middle_earth"}, {"perceived_day": [{"id": null, "type": "climate", "when": {"hour": null, "phase": "morning", "light": null}, "where": {"region": "Sandariand", "place": null}, "act": null, "intensity": null, "reading": "a cool air, sun and moving cloud and a passing shower", "tags": ["type:climate", "region:Sandariand"], "check": null, "data": {}, "perception": "noticed", "source": "ambient"}, {"id": null, "type": "climate", "when": {"hour": null, "phase": "afternoon", "light": nul…
  ```
- **example out**:
  ```json
  {"valence": 0.022, "arousal": 0.109, "day_valence": 0.042, "dominant": "steady", "thread_pressure": 0.0, "felt": {"familiarity": 0.633, "affection": 0.317, "trust": 0.115, "fear": 0.0}, "trace": [{"subject": "region:Sandariand", "reading": "a cool air, sun and moving cloud and a passing shower", "felt": "…", "mood_pull": "…"}, {"subject": "region:Sandariand", "reading": "the sun quits the plain early, and the dark comes with the wind, cool and grey, partly cloudy, a wind that does not rest and s…
  ```

### Pull — `update_mind_mood()` `app/mind/lens.py`

_The only channel by which an Event moves the Mood: a `felt:*` Tag names a point on the mood wheel (the word IS the point — soft ring, strong ring, extreme or the `steady` origin), and the Mood travels a fraction of the way there — never past it._

- **reads**: Mood, Event
- **writes**: Mood
- **example in**:
  ```json
  [{"game_id": "middle_earth"}, {"ep_mood": {"valence": 0.022, "arousal": 0.109, "day_valence": 0.042, "dominant": "steady", "thread_pressure": 0.0, "felt": {"familiarity": 0.633, "affection": 0.317, "trust": 0.115, "fear": 0.0}, "trace": [{"subject": "region:Sandariand", "reading": "a cool air, sun and moving cloud and a passing shower", "felt": "…", "mood_pull": "…"}, {"subject": "region:Sandariand", "reading": "the sun quits the plain early, and the dark comes with the wind, cool and grey, part…
  ```
- **example out**:
  ```json
  {"valence": 0.022, "arousal": 0.109, "dominance": 0.0, "dominant": "steady", "feeling": null, "cause": null}
  ```

### Belief — `active_convictions()` `app/mind/attitudes.py`

_Something the Mind holds true: a statement, how firmly it is held (from barely to a way of life) and what it is about — the world, the self, others, or what matters (a Value)._

- **reads**: Belief
- **writes**: Belief
- **rules (tests)**:
  - `tests/test_c20_evocation.py::test_past_the_fresh_window_memory_without_contact_stays_unevoked` — A memory whose tags share neither a tag nor a coarse facet with
  - `tests/test_c20_evocation.py::test_shared_facet_evokes_as_a_weaker_contact` — ADR-0016: 'tag:form:attacks' meeting 'tag:form:confronts' is the
  - `tests/test_c20_evocation.py::test_single_segment_tags_share_no_facet` — 'entity:orcs' and 'entity:wolves' are different beings — 'some
  - `tests/test_c20_evocation.py::test_memory_sharing_a_tag_with_today_evokes` — tests/test_c20_evocation.py::test_memory_sharing_a_tag_with_today_evokes
  - `tests/test_c20_evocation.py::test_semantic_overlap_evokes_even_without_shared_tags` — B8 is the second door: same words, different tags — the mind
  - `tests/test_c20_evocation.py::test_purely_ambient_memories_never_evoke` — Weather and vitals are ambience — the recurrence channel owns
  - `tests/test_c20_evocation.py::test_a_meal_memory_can_evoke_on_food` — Food is a subject now — the road-bread IS a thing you can think
  - `tests/test_c20_evocation.py::test_region_alone_does_not_make_contact` — 'Things happened here once' is geography, not story — the
  - `tests/test_c20_evocation.py::test_between_connected_memories_the_felt_rhyme_ranks_first` — Of the memories that touch today, the one that FELT like it
  - `tests/test_c20_evocation.py::test_felt_proximity_never_opens_the_gate` — A memory that rhymes emotionally but shares nothing with today
  - `tests/test_c23_recall.py::test_memory_dwelt_on_yesterday_sits_quiet_today` — Contact or not — a memory evoked last episode is refractory and
  - `tests/test_c23_recall.py::test_recency_ages_from_the_event_not_the_recall` — Two same-weight memories: one old but recalled yesterday, one
  - _…5 more in graph.json_
- **example in**:
  ```json
  [{"character_id": "142"}]
  ```
- **example out**:
  ```json
  [{"id": "mem-05", "game_id": "middle_earth", "character_id": "142", "episode_ids": "…", "kind": "conviction", "tags": "…", "entity_id": null, "region": null, "desc": "A dog never asks who your grandfather was before it shares your fire.", "valence": 0.6}, {"id": "mem-06", "game_id": "middle_earth", "character_id": "142", "episode_ids": "…", "kind": "conviction", "tags": "…", "entity_id": null, "region": null, "desc": "When the Eagles keep the road, I sleep with both eyes shut for once.", "valenc…
  ```

### Lens — `build_brief()` `app/mind/focus.py`

_What the Mind tells the narrator about an Episode: what matters to it, one central line and a few that connect to it._

- **reads**: Event, Memory, Belief, Need, Mood, Musing
- **writes**: Lens, Focus
- **rules (tests)**:
  - `tests/test_c35_brief.py::test_loudest_event_is_the_focus_and_lives_in_its_phase` — tests/test_c35_brief.py::test_loudest_event_is_the_focus_and_lives_in_its_phase
  - `tests/test_c35_brief.py::test_quiet_episode_has_no_focus` — tests/test_c35_brief.py::test_quiet_episode_has_no_focus
  - `tests/test_c35_brief.py::test_beliefs_speak_only_when_the_day_puts_them_at_stake` — tests/test_c35_brief.py::test_beliefs_speak_only_when_the_day_puts_them_at_stake
  - `tests/test_c35_brief.py::test_a_belief_touched_by_words_alone_still_counts` — tests/test_c35_brief.py::test_a_belief_touched_by_words_alone_still_counts
  - `tests/test_c35_brief.py::test_needs_speak_when_new_worsening_or_urgent_and_carry_their_origin` — tests/test_c35_brief.py::test_needs_speak_when_new_worsening_or_urgent_and_carry_their_origin
  - `tests/test_c35_brief.py::test_an_urgent_need_can_take_the_focus` — tests/test_c35_brief.py::test_an_urgent_need_can_take_the_focus
  - `tests/test_c35_brief.py::test_a_need_born_today_speaks_at_night_never_before` — tests/test_c35_brief.py::test_a_need_born_today_speaks_at_night_never_before
  - `tests/test_c35_brief.py::test_entering_mood_connects_to_a_matching_focus` — tests/test_c35_brief.py::test_entering_mood_connects_to_a_matching_focus
  - `tests/test_c35_brief.py::test_anchored_memory_waits_for_its_phase` — tests/test_c35_brief.py::test_anchored_memory_waits_for_its_phase
  - `tests/test_c35_brief.py::test_an_anchored_memory_names_why_it_woke` — The via is the rhyme: the contact tag the memory shares with the
  - `tests/test_c35_brief.py::test_an_anchored_memory_speaks_even_when_the_focus_is_elsewhere` — The day itself stirred the memory — evocation already was the
  - `tests/test_c35_brief.py::test_the_people_ladder_meets_across_family_and_type` — #86: 'dunlendings' is the same folk whether the day's tag says
  - _…321 more in graph.json_
- **example in**:
  ```json
  [{"perceived_day": [{"id": null, "type": "climate", "when": {"hour": null, "phase": "morning", "light": null}, "where": {"region": "Sandariand", "place": null}, "act": null, "intensity": null, "reading": "a cool air, sun and moving cloud and a passing shower", "tags": ["type:climate", "region:Sandariand"], "check": null, "data": {}, "perception": "noticed", "source": "ambient"}, {"id": null, "type": "climate", "when": {"hour": null, "phase": "afternoon", "light": null}, "where": {"region": "Sand…
  ```
- **example out**:
  ```json
  {"focus": {"id": "event:12", "kind": "event", "part": "day", "phase": "morning", "text": "crossed into Sandariand", "score": 0.55, "why": "salience 0.55"}, "carried": [], "day": [{"id": "musing:mu_50ce6a2c186d46e384fbc67aaf2824b9", "kind": "musing", "part": "day", "phase": "morning", "text": "As long as birds keep singing at dawn, not everything is lost.", "score": 0.35, "connects_to": "event:6", "why": "called up by: Owls — They are going about their own business. Their busine"}, {"id": "musing…
  ```

### Evocation — `voice_memories()` `app/mind/retrieval.py`

_When a Memory connects to the Episode and comes forward — it is not only read but lightly re-felt: the Mood is pulled a dampened share toward how the Memory felt and the Relation is fed again, never as much as living it._

- **reads**: Memory
- **writes**: Memory, Relation, Mood
- **rules (tests)**:
  - `tests/test_c23_recall.py::test_a_voiced_memory_refeels_the_felt_it_landed_not_the_suggestion` — Remembering re-feels what was felt, not what the world suggested:
- **example in**:
  ```json
  [{"memories": [{"id": "mem-13", "game_id": "middle_earth", "character_id": "142", "episode_ids": "…", "kind": "conviction", "tags": "…", "entity_id": null, "region": null, "desc": "…", "valence": -0.1}]}, {"idx": 1}]
  ```
- **example out**:
  ```json
  null
  ```

### Lens — `render_lens()` `app/mind/lens.py`

_What the Mind tells the narrator about an Episode: what matters to it, one central line and a few that connect to it._

- **reads**: Lens
- **writes**: Lens
- **rules (tests)**:
  - `tests/test_c17_prompt.py::test_render_lens_has_no_banner_and_opens_with_today` — tests/test_c17_prompt.py::test_render_lens_has_no_banner_and_opens_with_today
  - `tests/test_c17_prompt.py::test_render_lens_lists_nothing_that_floats` — tests/test_c17_prompt.py::test_render_lens_lists_nothing_that_floats
  - `tests/test_c17_prompt.py::test_render_lens_quiet_episode_says_so` — tests/test_c17_prompt.py::test_render_lens_quiet_episode_says_so
  - `tests/test_c24_mood.py::test_lens_names_the_entering_mood_when_it_stands_somewhere` — The wheel word reaches the Lens even without a cause — 'the day
- **example in**:
  ```json
  [{"character_name": "Aranath"}, {"brief": {"focus": {"id": "event:12", "kind": "event", "part": "day", "phase": "morning", "text": "crossed into Sandariand", "score": 0.55, "why": "salience 0.55", "render": "crossed into Sandariand"}, "carried": [], "day": [{"id": "musing:mu_50ce6a2c186d46e384fbc67aaf2824b9", "kind": "musing", "part": "day", "phase": "morning", "text": "As long as birds keep singing at dawn, not everything is lost.", "score": 0.35, "connects_to": "event:6", "why": "called up by:…
  ```
- **example out**:
  ```json
  "Aranath today."
  ```

## Declared steps the golden day did not exercise

- **Episode** `wake_event()` — ['Episode'] → ['Event']
- **Need** `refresh_state_needs()` — ['Condition'] → ['Need']
- **Focus** `direct()` — ['Lens'] → ['Focus']
- **Forgotten** `forget()` — ['Memory'] → ['Forgotten']
- **Decision** `choose()` — ['Need', 'Relation'] → ['Decision']
