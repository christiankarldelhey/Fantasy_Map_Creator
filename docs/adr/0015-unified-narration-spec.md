# Unified narration spec: two kinds, universal fields, tag gating

ADR-0014 consolidated all quiet narrative into `places_narration` but left six kinds with divergent payload shapes (`place` kept prose in `payload.base`, `depiction` in the `description` column, `interaction` in `options`/`mechanics`, `arrival` in `base_lore`, conditions in a loose text DSL). We now unify the record into a single canonical shape: **every record may carry every field** — many columns stay NULL, but the model is one.

Two content fields replace the assorted prose slots: **`aspect`** ({en,es}) — what a place, feature or region shows from outside; **`presence`** ({en,es}) — what being there is like. The sighted/visited/entered mechanics read them directly. `secret`, `sections`, `beats`→`interactive`, `variants`, `lore`, `facts`, `notes`, `channel`, `traveller_use` are universal columns too; `payload` keeps only provenance (`origin`, `legacy_id`, `anchor_hint`).

`kind` shrinks to **`place` | `ambient`**: it says what the voice is anchored to (a location ficha vs. any scope-bound voice), not which legacy table the record came from. `depiction`, `arrival` and `lore` fold into `ambient`; `interaction` stops being a kind at all — **interactivity is a capability, not a category**. Any record may carry `interactive`: a list of situations, each with tag gating and mutually-exclusive `options` (`tag` driver, optional `skill`/`difficulty`, `outcomes.{success,failure}.{text,effects}`). A single-option situation is "something that happens without a choice" — the old beat and the old `rest` overnight collapse into the same mechanism. Selection is automatic (character state weights each option via its driver tag); the higher self exposes the same options to the player later without a schema change.

Gating is **universal tags**, not per-kind conditions: world and mind emit a tag set (`season:spring`, `region_day:3`, `entry:first`, `belief:no_birds`, `mind:fear:high`), and any conditional content declares `tags`/`not_tags`. Numeric conditions become cumulative tags (`region_day:3` present = day ≥ 3); non-mechanical triggers stay as `when` narrative text. The vocabulary is a **closed registry**: `tags.json` seeds a `narration_tags` table, so seeds, backend and Mind Engine speak one language and `validate-seeds` rejects unknown tags.

## Consequences

- The 169 `offer` records fold into their anchor's `interactive.options`; the 121 `rest`/`ovn` records become `context:overnight` situations whose `mechanics` move into `outcomes.effects` — `mechanics` and `action` disappear as separate concepts (action is implicit in the situation's tags).
- `description` (column) renames to `aspect`; `payload.base` promotes to `presence`; `base_lore`/`note` merge into `lore`/`notes`.
- The ambient corpus (174 authored records) gains its first reader: the same scope resolver that serves depictions now also serves `ambient`, `arrival` and `lore` content filtered by tag set.
- `places.json`/`narration.json` are rewritten to the canonical spec — the authored source IS the model, not an input the loader translates.
