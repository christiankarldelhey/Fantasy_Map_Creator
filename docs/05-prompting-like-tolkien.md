# Prompting and narrating like Tolkien from raw GIS information

> *The database knows the traveller crossed a marsh at 14:00, met a warg (danger 3, stalks), and it was raining. Somehow that has to come out sounding like the Professor wrote it — not like a weather API had a feeling.*

<!-- IMAGE: hero shot — a page of "chapter" prose beside the raw JSON that produced it -->

---

## The gap between a row and a sentence

Everything in the previous four articles produces **facts**. Beautiful, structured, geographically honest facts:

```
region: Midgewater; biome: marsh; altitude: plain;
temp_2m: 9.4°C; precipitation: light; phase: afternoon;
encounter: { entity: "Warg", type: "carnivores", danger: 3, form: "stalks" }
```

Nobody wants to read that. The final challenge was turning that packet into a **chapter** — one day of travel, in flowing prose, in the sober, concrete voice of Tolkien. And doing it without the two classic failure modes of AI writing: **the weather report** ("The temperature was 9.4°C with light rain") and **the purple soup** ("A sense of ancient wonder washed over her trembling heart").

The solution has three layers: **turn data into hints (not prose), assemble a strict prompt, and hand it to an LLM on a short leash.**

---

## Layer 1: rules turn data into *hints*, not sentences

Before any AI is involved, a rule-based service (`naturalLanguage.js`, with help from `terrainPhrases.js`) converts the raw day into **reference notes**. Crucially, these are hints *about what is there*, never finished prose to be copied.

Region-specific flavour lives in a `region_biome_descriptions` table — hand-written phrase pools keyed by region and category — and gets sampled with a **seeded RNG** so the same trip always reads the same way:

```js
// pick a marsh-phrase for whichever region we're in, deterministically
pickPhraseForRegions(phrasesMap, day.regions, 'marsh', day.rng);
```

The output is a set of labelled note blocks — `TERRAIN NOTES`, `ROAD NOTES`, `WEATHER NOTES`, `CREATURE NOTES`, `LOCATION NOTES` — plus water crossings and an elevation-effort summary. Reference material, not a script.

<!-- IMAGE: diagram — raw day JSON flowing through naturalLanguage.js into labelled note blocks -->

## Layer 2: the prompt is a stage, not a suggestion

`prompt.js` assembles those notes into one carefully staged message. It returns `{ system, user }`.

### The system prompt sets the voice

This is the whole personality of the narrator, and it is mostly a list of things **not** to do:

> *"You are a storyteller in the tradition of J.R.R. Tolkien. Sober, concrete prose: you name hills, rivers and roads for what they are and let the facts suggest emotion rather than declaring it."*

Its rules, paraphrased:

- **Restraint over ornament.** No abstract filler ("a sense of wonder," "his heart pounded").
- **Weather is atmosphere, not a report.** It appears only when it shifts the mood or blocks the march — **never as figures or exact hours.** (This single rule kills the weather-report problem.)
- **Every encounter must MAKE something happen** — a decision, an exchange, a consequence. No threats that dissolve into nothing.
- **Don't invent** places or creatures that aren't in the data.
- **The notes are RAW MATERIAL, not a checklist.** Use what serves the story, discard the rest, and *never copy the wording*.

### The user message stages the day

The day is narrated in **three movements — morning, afternoon, night at camp** — and the prompt is built from composable sections that only appear when relevant:

- **`NARRATOR'S LENS`** — the chosen character's perspective filter (the immortal Elf vs. the mortal Ranger see the same road very differently).
- **`JOURNEY CONTEXT`** — the ultimate destination + a non-AI summary of yesterday, for continuity.
- **`SPECIAL INSTRUCTIONS`** — a distinct opening for day 1 (departure, motivation) and a distinct closing for the last day (arrival, reflection).
- **`DO NOT REUSE`** — yesterday's terrain phrases, explicitly banned so the prose doesn't loop.
- **`CHARACTER STATE OF MIND`** — optional inner thoughts to slip in near-verbatim, in the character's own voice.
- **`TODAY'S WAY IN`** — one sensory element to build the morning around, with an order to *start in the middle of an action*, not at dawn with the weather.
- The land/road/weather/creature notes, and finally the **encounters**, phase by phase.

### Encounters arrive pre-decided

This is the key trick for keeping the AI honest. The encounter's **form, dialogue topic, character stance and outcome** were already resolved by the engine (see the [previous article](./04-entities-and-encounters.md)). The prompt hands them over as instructions to *render*, not choices to *make*:

```
* Warg (carnivores, nocturnal) in Midgewater — a lean grey hunter of the fells.
    FORM: stalks. followed unseen from the treeline, closing slowly
    OUTCOME (narrate this, do not change it): wounded.
```

The model writes the scene; it does **not** get to decide whether the warg wins. The world already decided that. The AI is a prose renderer, not a dungeon master.

---

## Layer 3: the LLM, on a short leash and with a spare

The finished `{ system, user }` prompt goes to `ai.js`, which runs a **provider cascade with automatic fallback** so a rate limit never kills a story mid-journey:

1. **Gemini 2.0 Flash** — primary. (temperature `0.7`, `maxOutputTokens` 2048.)
2. **Groq `llama-3.3-70b-versatile`** with `GROQ_API_KEY` — fallback #1.
3. **Groq** again with `GROQ_API_KEY_2` — fallback #2.

```js
// simplified
const gemini = getGeminiClient();
if (gemini) { try { return await tryGenerateGemini(...); }
              catch (e) { if (!isRateLimitError(e)) return null; } }
// 429? fall through to Groq key #1, then key #2
```

Only a **rate-limit (429)** triggers a fallback; a genuine error fails fast instead of silently trying every door. Temperature sits at a deliberately unspicy **0.7** — enough variation to feel alive, not so much that the narrator starts freestyling dragons into the Shire.

<!-- IMAGE: a finished chapter rendered in the UI's "book" view -->

---

## Why not just let the AI do everything?

I could have thrown the whole day at a big model and said "write a Tolkien chapter." It would have produced something plausible and slightly wrong *every time* — inventing a river here, forgetting the warg there, letting a mortal survive a fall he shouldn't.

By splitting the work — **rules decide the facts, the prompt stages them, the LLM only phrases them** — the geography stays true, outcomes stay consistent with the game's own logic, and the model does the one thing it's genuinely great at: choosing the right words. The GIS database is the author; the LLM is the ghostwriter.

---

## Lessons from ghostwriting for a dead author

- **Give the model hints, not homework.** Passing finished sentences invites copy-paste; passing labelled *notes* forces fresh prose.
- **Constrain by negation.** Half the system prompt is "do not," and that's what produces restraint.
- **Decide outcomes outside the model.** Pre-resolving encounters is the difference between a consistent world and improv.
- **Always bring a spare key.** A three-provider cascade means "the AI is down" never becomes "your journey is over."
- **Seed everything.** Deterministic phrase-picking means a chapter is a fact about the trip, not a coin flip.

---

*This is the last of the five build stories. Together they trace the whole path: shape the [ground](./01-the-dem-system.md), give it a [sky](./02-climate-from-nothing.md), let people [travel](./03-getting-directions.md) it, fill it with [life](./04-entities-and-encounters.md), and finally teach it to tell its own story. A hand-drawn map, taken as seriously as a real one.*
