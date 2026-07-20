# Giving life to the map. Creating the entities and the encounters

> *A map with roads and weather is a very detailed way of being alone. This is the part where things start watching you back.*

<!-- IMAGE: hero shot — a collage of Middle-earth creatures emerging from a forest edge -->

---

## The empty-world problem

By this point I had terrain, climate and routes. You could plan a beautiful three-day walk from Bree to the edge of the Old Forest — and *nothing would happen*. No orcs, no wandering elves, no wolves at the treeline. Just you and some very well-modelled mud.

A living world needs two things: **a bestiary** (who exists) and **an encounter engine** (who you actually meet, and when). Both had to respect the geography, or the whole illusion collapses. Meeting a Corsair of Umbar in the snowfields of Forochel would break the spell instantly.

---

## The bestiary: 507 things that live somewhere

The `entities` table holds **507 entities** — creatures, peoples, hazards, even notable plants and sites — each with a UUID primary key. The type breakdown is a nice little portrait of the world:

| A few of the 29 types | Count |
| --- | --- |
| humans | 103 |
| carnivores | 44 |
| flying animals | 43 |
| elves | 31 |
| herbivores | 30 |
| reptiles | 28 |
| orcs | 18 |
| trolls | 10 |
| hobbits | 7 |
| maiar / giants / demons | 3 each |

The key field is **`probability_by_region`**, a JSONB array. Each entity carries a list of the regions it can appear in and *how likely* it is there, on a **1–8** scale (1 = you'd be unlucky to see it, 8 = it practically lives on the path). Entities also have an **`active`** pattern (`day`, `nocturnal`, or `all-day`) and a **`danger`** rating.

```json
// entities.probability_by_region
[
  { "region": "Mirkwood Wilds", "probability": 7 },
  { "region": "Woodland Realm", "probability": 4 }
]
```

<!-- IMAGE: a data view of an entity card — a giant spider with its region probabilities -->

## The encounter engine: from probabilities to a moment

The engine (`backend/services/encounters.js`) is written as **pure, testable functions** — no hidden state, seedable randomness — because "why did I meet a Balrog buying turnips" is a bug you want to be able to reproduce.

A day is split into three phases: **morning, afternoon, night.** Each phase rolls **once** with a **55% chance** of *something* happening. If it hits, exactly one entity is drawn from the region's pool. Here's how that pool gets built.

### 1. Start with the region's raw probabilities

For the region you're standing in, gather every entity that lists it, with its 1–8 level.

### 2. Bend the levels to the situation

The level is nudged up or down before it becomes a weight:

- **Time of day vs. activity** (±1): a nocturnal creature is likelier at night and rarer at noon; a diurnal one, the reverse.
- **Road type** (for *intelligent* beings only): you meet people where people go. A major road adds **+3**, a road **+2**, a trail **0**, and going off-road **−2**. You won't bump into a merchant caravan in a trackless bog.
- **Region population** (for intelligent beings only): a density ratio from 0 to 1 maps to **−2…+2**. The Shire is crowded; the Ettenmoors are not.

Only "thinking" types (elves, humans, orcs, dwarves, hobbits, trolls, ents…) react to roads and population. A wolf does not care that it's a Royal Road. Every adjustment is clamped to the 1–8 range so nothing runs away.

### 3. Turn levels into weights (the exponential trick)

A linear 1–8 scale makes an "8" only 8× a "1," which is far too flat — everything feels equally likely. So levels become weights on an **exponential curve**:

```js
weight = 1.6 ^ adjustedLevel
```

Now an 8 is roughly **43× more likely** than a 1. Common things feel common; rare things feel like an event. The pool is then normalised to percentages and one entity is drawn with a weighted roll.

There's also a per-day **exclusion list**, so you don't meet the same wandering ranger three times before lunch.

<!-- IMAGE: a bar chart showing the exponential weight curve, 1 through 8 -->

## From "who" to "what happens": the interaction resolver

Meeting a troll is not a story. *What the troll does* is. That's the job of `interactionResolver.js`, and it's where an encounter becomes a scene.

Once an entity is chosen, the resolver picks a **form** — one of ~18 interaction shapes, drawn from an `encounter_forms` table and filtered by the entity's `danger` level:

> `watches`, `stalks`, `sound_only`, `sign_only`, `glimpsed_far`, `drifts_closer`, `brief_exchange`, `aid_or_trade`, `confronts`, `hinders_passage`, `sudden_peril`, `attacks`, `presence_felt`, `reacts_withdraws`, `harvest_shelter`, `observed_activity`, `mistaken_for_object`, `scenery`…

A low-danger deer might get `glimpsed_far`; a hunting warg might get `stalks` then `attacks`. Selection is weighted, with two nice touches:

- **Anti-repetition:** forms used recently get their weight multiplied by **0.3**, so the chapter doesn't turn into "watched. watched. watched again."
- **Intensity control:** high-intensity forms are suppressed from stacking within a chapter unless the danger genuinely warrants it. One near-death scene per day is plenty.

### Dialogue, when it fits

If the chosen form is a talking one (`brief_exchange`, `aid_or_trade`, `confronts`), the resolver pulls a single **dialogue block** from `npc_interactions` — either a rich, entity-specific row or a generic topic hint for that entity type.

### The (optional) resistance roll

For dangerous, roll-triggering encounters there's a d20-style **resistance roll** — `die + resistance/10` against a `danger`-scaled threshold — producing `unscathed`, `wounded`, `badly wounded`, or `slain`. (It's feature-flagged off by default while the numbers get tuned, because permadeath-by-spreadsheet is a delicate art.)

The resolver hands the narrator a compact packet: **form, prose hint, dialogue content, outcome** — the skeleton of a scene, ready to be written.

---

## Why do it this way?

Because every knob is **grounded in the map and reproducible**. An encounter is the product of *where you are* (region), *when it is* (phase), *what road you're on*, *how crowded the land is*, and *the creature's own habits* — not a random draw from a global list. Meet a spider in Mirkwood and it feels inevitable; the same spider would never wander into the Shire, because its `probability_by_region` never mentions it.

And because the functions are pure and seedable, the same trip replays identically — invaluable for testing, and for not losing your mind.

---

## Lessons from populating a world

- **Probability belongs to *place*.** Hanging likelihoods off regions (not a global table) is what keeps the world coherent.
- **Exponential weights feel right; linear ones feel like noise.** `1.6^level` was the single biggest "it clicked" moment.
- **Separate *who* from *what*.** The encounter engine picks the creature; the resolver picks the drama. Keeping them apart kept both simple.
- **Seed your randomness.** A reproducible world is a debuggable world.

Next: I had a packet of cold facts — a wolf, at dusk, stalking, on a trail in the rain. Now I had to make it read like Tolkien wrote it. → *[Prompting and narrating like Tolkien from raw GIS information](./05-prompting-like-tolkien.md)*
