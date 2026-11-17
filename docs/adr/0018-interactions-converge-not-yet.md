# Interactions converge toward one model — deliberately not yet

Status: recorded as a candidate, not implemented.

Two interaction vocabularies exist today, in different shapes:

- **Places** carry `interactive[]` (ADR-0015): tag-gated situations with
  mutually-exclusive options and `{text, effects}` outcomes — "first
  visit → ask for shelter / ask about the road".
- **Entities** carry `kind='contact'` records (ex `npc_interactions`):
  the dialogue vocabulary the encounter draw picks from — topic,
  attitude, concrete content, options, commands.

Both describe "what can pass between the traveller and this thing".
The obvious unification — one `interactions` table with a polymorphic
owner (`place` | `entity`) — was raised and **deferred**:

- The shapes overlap but are not the same: `interactive[]` is a
  situation menu resolved by tag gating; `contact` rows are lottery
  entries resolved by the encounter draw. Converging them means
  deciding whether the draw becomes tag-gated or situations become
  weighted — a mechanics decision, not a schema decision.
- The trigger that would force the question hasn't arrived: entities
  carrying `interactive[]` (a person with her own situation menu) or
  places carrying contact-vocab. When either becomes real, the
  convergence should be designed then, against a concrete consumer.
- Both tables already reserve the field: `entities_narration` has an
  `interactive` prose column; `places_narration` records may carry
  `interactive[]`. Nothing today blocks the future merge.

## When to revisit

- A Place-host (ADR: minted resident entities) needs her own
  situation menu — she is exactly the case where both vocabularies
  meet in one owner.
- The encounter draw wants tag gating like `interactive[]` has.

Until then, this ADR exists so the question is not re-invented
without the context above.
