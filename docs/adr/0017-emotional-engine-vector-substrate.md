# The emotional engine: one vector substrate beneath mood, body, relations and memory

Emotion in the Mind is rebuilt as a single numeric substrate rather than a collection of mechanisms that each carry their own numbers (`affect.*` wiring, attitude stances, need urgency, mood blending, streak counters). The engine does not replace the pipeline — perceive, evocation, focus, lens, reflection all stay — it becomes the common logic they read and write: **one alphabet, one write path, one state.**

The alphabet is one sparse vector space, deliberately small:

- **Relation dims** (per Subject tag): `affection` −1..1 (−1 is hatred, not indifference), `trust` −1..1 (−1 is active distrust), `fear` 0..1, `familiarity` 0..1. Fear stays unipolar: its opposite is not one thing — safety is `trust`, courage is fear met by `dominance`, defiance is hatred with `dominance`.
- **Mood dims**: `valence`, `arousal`, `dominance`, −1..1.
- **Body dims** (`hunger`, `thirst`, `cold`, `fatigue`, `pain`, `illness`…) 0..1 — not a body the Mind owns but a continuous projection of the Condition; Detectors evolve into the declared mapping, and an Event may land an acute hit (`wounded` → `pain`) that decays back to what the next Condition reports.
- **Temperament**: a point in the Mood's own space where the Mood returns by inertia. **Personality**: the couplings — per-dim sensitivity, weight biases, moodiness (the regression rate), drift resistance — authored through Traits and presets.

Every Event is relational: it arrives without authored valence — Events never carry a declared emotional charge — and writes deltas only against Subject tags. The charge is computed at perception from two layers of declared data: *shared semantics* (a small common table keyed on `form`/`outcome` — `aid_or_trade` is objectively a favour, `attacks` objectively a harm, `sighted_far` objectively weighs less than `entered`) and *subject lean* (each Mind's authored dispositions per tag — a hobbit's `food` fondness, Celebrían's rain, a dwarf's `dunedain` prejudice — seeded by the preset and owned by the Mind). The Mood never reads Events: it is the coupling of the day's relation movements, the body's weight and the pull of the Temperament (`mood += W·Σdeltas + W·body + α·(temperament − mood)`). The only exception is the acute body hit.

Every perceived Event writes in two channels. The *felt* delta — the semantic delta deformed by the live Relation and Personality — moves the Mood: the dwarf feels the elf's help through his distrust. The *world* delta — what objectively happened — feeds the Relation as sediment, dampened only by Personality's drift resistance: a favour sediments as trust even when it was felt grudgingly, so a prejudice can erode without ever feeding on its own echo. Turning the enunciation remains Reflection's work — the arithmetic wears a stance down; the rewritten conviction is declared. A Relation is sediment — a row per Subject tag fed solely by perceived Events and Evocation, decaying toward indifference on its own: the bite is forgotten, the fear of dogs stays. An existing Relation amplifies compatible new deltas — hating orcs makes each orc sighting land harder.

Memory is one continuum: `memories` gains an `imprint` vector, `subjects` and a `depth` tier (fresh → consolidated → conviction). The `beliefs` table folds in — the felt part (subject + stance) lives in Relations, the enunciated part ("orcs are dangerous") is a conviction-tier Memory distilled by Reflection, and `horizon`/`evidence`/`origin` map onto decay tier, links and `seed|heard|prescribed` provenance. Nothing is dropped. Evocation is bidirectional: an evoked Memory re-feels a dampened share of its imprint, so remembering keeps Relations warm and rumination is real. Writes happen per Event as it is perceived, leaving a `mood_trace` that lets an Episode be narrated as an arc — a kind morning, a bitter afternoon — from numbers alone; regression and decay tick once at close.

Literary feelings are not dimensions: they are a declared *feeling lexicon* — named patterns over the live state (fear without dominance → dread; long-held low valence → melancholy; full-grown affection and trust → deep friendship). Richness lives in compounds, persistence and causes, not in the count of axes — the same trick the Mood labels already played, generalized.

## Considered Options

- **Separate vocabularies per component** (`mood_delta`, `relation_delta`, `body_delta` per Event): rejected; three emotional languages and three write paths, and "a Relation is the sum of one's memories about it" stops being literal.
- **PAD personality vector**: rejected; a valence-arousal-dominance point cannot express "a hobbit who loves food and ignores rain". Split instead into Temperament (resting point) plus Personality (couplings).
- **Relations derived on the fly from living Memories**: rejected; the fear would die the day the bite is forgotten. Sediment is written incrementally and outlives its sources.
- **Beliefs kept as a separate table**: rejected; it duplicates the depth axis — a conviction is a Memory at its deepest tier, not a different kind of thing.
- **Internally simulated body**: rejected; the glossary already rules the body stays in the Host's Condition, and a second body would diverge from the Host's accounting.

## Consequences

- One write path, two channels: perceive → semantic delta deformed by subject lean, Relation state and Personality — the felt part moves the Mood, the objective part feeds the Relation; acute Body hits excepted.
- `beliefs` and the attitudes view migrate into `relations` + conviction-tier Memories; preset seeds (Aranath, Celebrían) are preserved through `origin` and mapped fields.
- New authored data in two layers: the *shared semantics* table (form/outcome → world delta + contact weight — game-level, like Detectors) and the *subject lean* (preset/mind-level dispositions per tag), plus the feeling lexicon. The wire stays clean: Events carry facts and words, never numbers about how to feel.
- Detectors become the declared Condition→Body-dim mapping; Needs survive as the voices of dims crossing thresholds; Threads unchanged.
- Dead machinery: `affect.*` wiring, `felt_valence`/`world_valence` scalars, `attitude_drift`/`attitude_affect_gain`, `need_affect_scale/cap`, `mood_blend`, repetition-streak counters, `end_vitals`, `MOOD_LABELS`/`DOMINANT_EMOTIONS` (absorbed by the lexicon). Streaks and boredom emerge from `familiarity` instead.
- The scalar `valence` on Memories becomes a derived summary of `imprint`, no longer canonical.
- `theme_weights` become Personality weight biases; dormant Traits wake as engine couplings (moodiness, drift resistance, familiarity saturation).
