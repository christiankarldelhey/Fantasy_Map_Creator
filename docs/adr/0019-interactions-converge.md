# Interactions converge — Situations stay narration, what the traveller does becomes a table

ADR-0018 deferred the interactions unification because the trigger hadn't arrived: no owner carried both vocabularies. It has arrived — the place-host is a real entity (31e49b1), and the smial's keeper can now meet two records in one owner: her door's overnight Situation and her own contact. The merge is designed now, against that concrete case.

**The split.** A **Situation** *is* a narration record — a row of `places_narration` or `entities_narration` (one record, one Situation; the 132 overnight records and the 618 contact situations confirm it). Its gate is the record's `tags`; its source is the record's own anchor or scope, so an Interaction never needs a polymorphic owner — it reaches its source only through its Situation (a Place for the lighthouse, an Entity for its keeper, a scope ladder for "any inn in Dunlending country"). A **generic** Situation is only the script: the Subject the Mind accretes on is always the concrete source met, Hallas even when nobody wrote him lines of his own.

**What moves to `interactions`.** Everything the traveller *does* and every outcome — even an inevitable act ("waves back and walks on") is a single Interaction, never prose on the record. The table is one row per option: `act`, `skill` ({name, min?, difficulty?}), `need_tags`, `outcomes` ({success, failure} → text + typed effect list, the commands/effects formats unified and `overnight_shelter` decomposed). FK is `places_narration_id` or `entities_narration_id` with a CHECK of exactly one. The `interactive` JSONB column dies in both narration tables.

**Gating, not mixing.** Situations branch deterministically by gate — a `race:*` Situation replaces the untagged default outright and brings its own Interactions; the same rule for season and weather. Prose varies inside a record (`variants`), what can be done varies *between* records. Race gates apply to being-voices only; how a people *feels* a place is the Mind's lean, never the record's.

**One choosing.** Every Situation resolves through one engine: the host says what is feasible (skill thresholds, what can be paid or carried), then asks the Mind before the Episode opens — `POST /choose` — which prefers among the feasible by its Relation with the source's Subject, Mood, body and Personality, and a weighted draw keeps the traveller from doing always the same (how much it varies is a Personality coupling, deliberately unnamed as a trait and editable in Mind Studio). The higher self will one day hand that same feasible pool to the player — every choice passes the same door, so no schema changes when it does. In-episode decisions (`/decide`, the day re-resolution, the perceived-day patch) die: the host applies effects *before* reporting, and the Events arrive already saying what happened.

**Never a declared feeling.** An Interaction's effects change only Condition — body, possessions, shadow (itself read by the Mind as one more dim projected from the Condition). How the choice was lived is computed by the Mind from the Event's Act through the shared semantics: the dwarf feels the elf's help through his distrust, and a `mood: +0.2` outcome would flatten that into a second write path.

**One vocabulary for choosing and feeling.** Each Interaction declares an **Act** — a small closed vocabulary owned by the Mind Engine (`approach`, `avoid`, `talk`, `trade`, `accept`, `help`, `defy`, `rest`), the same for every Host; a game may tune its weight, never invent one. Before, the Mind weighs it against the Relation; after, it is the form of what the traveller lived — "she refused the dwarf's help" needs no authored prose per option.

## Considered options

- **Options kept as JSONB inside narration records**: rejected — a chosen option feeds Memory and mechanics; it needs a stable id and real columns, not a JSON blob.
- **Polymorphic `source_kind + source_id`**: rejected — loses FK integrity, and generic-scope Situations have no single id to point at anyway; the record's own scope columns already do the job.
- **In-episode decide (the B5 pattern, generalized)**: rejected — one re-resolve per day scales badly to N choosings, and patching `perceived_day` afterwards lies about what happened.
- **Declared mood/effect deltas in outcomes**: rejected — a second emotional write path that ADR-0017 rules out for Events; the felt delta is computed, never authored.
- **Variants promoted to Situations wholesale**: rejected — 421 prose-only variants (season/weather faces) would duplicate every Interaction; the rule is prose inside, options between.
- **Acts authored per game pack**: rejected — the vocabulary must be universal to be agnostic; per-pack tuning of weights is enough.
- **Situations of multiple sources competing in one pool** ("the lighthouse *or* its keeper"): rejected for now — each Situation is owned by one source and resolved independently; the day's Events are richer for having both.

## Consequences

- One situation resolver serves both families — `ambientVoice.pickOption`, the `placesInteractions` overnight ladder and `interactionResolver`'s contact pickers retire; `availableActions` folds into the feasibility filter; the encounter `form` draw and `moverCrossings` keep saying only *which sources* the day brought.
- Mind side: a `choose` endpoint + Act preference engine replaces `_recommend` (theme_weights/beliefs give way to Relations, Mood, Personality); `decisions.py`'s perceived-day patchwork dies.
- Seed migration: 618 contact situations, 132 overnight situations and 63 mover-leg variants (whose dead `effects` — `shadow`, `hope` — become Interactions, `hope` → shadow relief) map through a `form → act` default corrected by hand where needed.
- Every Interaction lands as an Event on its source's own type (`land/place`, `encounter`) — a door accretes on two Relations at once.
- Mind Studio: the choosing coupling and the day's resolved tag set become visible and editable per character.

## Amendment (Wave D) — `interactive` lives, as `situations`

The original ADR had the `interactive` column dying outright. The final
cut kept it, slimmed and renamed to `situations` (the old name collided
with the `interactions` table): a record's `situations[]` is the authored
*Situation descriptor* store — `{id, tags, when, not_tags, once, mind,
situation, stance}` — gating and prose, the same job `variants` and
`facts` already do in JSONB. What died there is the executable half:
`options`, `commands`, `outcomes` moved to `interactions` and are not
duplicated. Fork detection reads the table's row count for a Situation,
never the JSONB.

Each table became a repository *db madre*: `interactions.json` is authored
first-class (acts, labels, need_tags, typed effects — `derive-interactions.mjs`
was the one-time migration, kept for provenance), and `places.json`,
`narration.json`, `entities_narration.json` carry only descriptors under
the `situations` key. The loader inserts each seed verbatim —
`interactions` is no longer a runtime derivation.
