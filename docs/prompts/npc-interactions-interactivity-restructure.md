# Prompt: Restructure `npc_interactions.csv` for player interactivity

## Role and context

You are working on a narrative game engine set in Middle-earth. The file `database/seeds/data/csv/npc_interactions.csv` contains narrative seeds for NPC encounters. Each row is consumed by a Node.js backend that builds a daily prompt for a large language model (LLM) narrator.

Today, each row only produces **flavour text**. The backend wants to start offering the player **choices during an encounter** and applying **mechanical outputs** when a choice is made. Your job is to rewrite the CSV and produce the SQL migration that supports the new schema.

You must:

1. Keep every existing row and every existing narrative column untouched, unless you are adding interactivity to that row.
2. Preserve every existing `id` UUID exactly as-is.
3. Add new columns and JSON payloads that describe when a choice is offered, what options are available, what skills or conditions gate them, and what outputs they produce.
4. Generate the SQL migration `database/migrations/add_interactivity_to_npc_interactions.sql` that adds the new columns to the database table.

---

## Current CSV schema

Header (must remain the first line):

```csv
id,entity_id,entity_type,interaction_form,shadow_band,character_id,cultural_family,region_id,npc_attitude,concrete_content,tension,traveller_stance,topic,topic_prose_hint
```

### Column meanings

- `id`: UUID primary key. **Never change.**
- `entity_id`: UUID of the specific entity this row is written for. May be empty for generic rows.
- `entity_type`: entity category, e.g. `humans`, `elves`, `dwarves`, `hobbits`, `orcs`, etc.
- `interaction_form`: encounter beat, e.g. `brief_exchange`, `aid_or_trade`, `confronts`, `observed_activity`, `watches`, `reacts_withdraws`, `stalks`, `sign_only`, `sound_only`, `glimpsed_far`.
- `shadow_band`: `low`, `mid`, or `high`. Maps the traveller's shadow mood to the row.
- `character_id`: slug of a specific playable character this row is for, e.g. `aranath`. Empty means generic.
- `cultural_family`: e.g. `dunadan_north`, `dunlending`, `gondorian`. Empty means generic.
- `region_id`: numeric region id. Empty means generic.
- `npc_attitude`, `concrete_content`, `tension`, `traveller_stance`: narrative instructions for the LLM.
- `topic`: encounter theme, e.g. `news_and_rumor`, `a_request_for_help`, `suspicion_of_strangers`.
- `topic_prose_hint`: optional extra prose direction for the LLM.

---

## New CSV schema

Append these columns to the header, in this exact order:

```csv
has_interaction,phase_context,default_option_label,default_option_description,options
```

### New columns

| Column | Type | Description |
|--------|------|-------------|
| `has_interaction` | `true` or `false` | Whether the player is offered one or more choices at this encounter. |
| `phase_context` | `morning`, `afternoon`, `night`, `overnight`, or `any` | Narrative phase when the choice is offered. Use `any` when it does not matter. |
| `default_option_label` | short text | Label for the always-available passive option (e.g. "Pass by", "Decline", "Listen only"). |
| `default_option_description` | prose | Narrative instruction describing what happens when the passive option is chosen. |
| `options` | JSON string | Array of actionable options. See format below. Use `""` if `has_interaction` is `false`. |

---

## `options` JSON format

The `options` cell must contain a single JSON array. It must be CSV-escaped: if the JSON contains a comma or double quote, wrap the entire cell in double quotes and escape inner double quotes as `""`.

Each option object has this shape:

```json
{
  "option_id": "snake_case_identifier_unique_within_row",
  "label": "Short player-facing label",
  "description": "Narrative instruction describing the action",
  "requirements": {
    "skills": { "skill_tracking": 3, "skill_lore": 2 },
    "conditions": { "wounded": ["none"], "fatigue_max": 80 },
    "energy_band_max": "worn",
    "shadow_band_max": "shadowed",
    "inventory_has": ["rope"]
  },
  "is_exclusive": false,
  "outputs": [
    { "type": "state_change", "target": "energy", "value": -5, "reason": "extra effort" },
    { "type": "clue", "clue_id": "east_road_raiders", "text": "A party of Dunlendings has been seen north of the ford." },
    { "type": "goal_encounter", "title": "Warn the next settlement", "description": "Carry the warning to the next village or Ranger station." }
  ]
}
```

### `requirements` rules

- `skills`: **ANY** listed skill that meets its threshold satisfies the requirement (OR logic). Use the exact column names from `character_state`: `skill_tracking`, `skill_persuasion`, `skill_ranged`, `skill_melee`, `skill_lore`.
- `conditions`: all listed conditions must match (AND logic).
  - `wounded`: list of allowed values, e.g. `["none", "wounded"]`.
  - `fatigue_max`: maximum fatigue value allowed.
  - `sick`: boolean.
- `energy_band_max`: optional upper bound on energy band. Values: `fresh`, `normal`, `worn`, `spent`.
- `shadow_band_max`: optional upper bound on shadow band. Values: `clear`, `unease`, `shadowed`, `burdened`.
- `inventory_has`: optional list of item IDs. If the inventory system is not ready, include them anyway for future use.

If an option has **no requirements**, use `"requirements": {}`.

### `outputs` rules

Every action must produce at least one output. Use only these output types in this first pass:

| Type | Meaning | Required fields |
|------|---------|-----------------|
| `state_change` | Change a numeric state value. | `target`, `value` (negative or positive). Optional: `cap_min`, `cap_max`, `reason`. |
| `condition_set` | Set a categorical condition. | `target` (`wounded`, `sick`), `value`. |
| `clue` | Add a narrative clue / memory. | `clue_id` (kebab-case, unique-ish), `text`. |
| `goal_encounter` | Create an active encounter goal. | `title`, `description`. Optional: `duration_days`. |
| `goal_survival` | Surface or escalate a survival goal. | `source` (`thirst`, `hunger`, `wound`, `fatigue`, `shelter`), `description`. |
| `route_hint` | Give a route choice for the next day. | `description` (flavour only, no routing yet). |
| `narrative_only` | Flavour consequence, no state change. | `text`. |
| `item_gain` | Add an item (future). | `item_id`, `quantity`. |
| `item_loss` | Remove an item (future). | `item_id`, `quantity`. |

**Be conservative.** No random loot tables. No huge rewards. Outputs should feel like natural consequences of the action.

---

## Skill and condition context

The playable characters have these skills (0–10):

- `skill_tracking` — read sign, follow spoor, recognise tracks.
- `skill_persuasion` — talk past guards, ask for help, bargain.
- `skill_ranged` — bow skill, useful for hunting.
- `skill_melee` — close combat, useful for physical intervention.
- `skill_lore` — identify old tokens, read inscriptions, recognise rituals.

Current condition state:

- `fatigue` (0–100)
- `wounded` (`none`, `wounded`, `badly_wounded`)
- `sick` (boolean)
- `days_without_food`, `days_without_water` (survival pressure)
- `energy` (0–100) and `shadow` (0–100), internally converted to bands

Thresholds used elsewhere in the codebase:

- `track` → `skill_tracking >= 3`
- `hunt` → `skill_ranged >= 2` OR `skill_tracking >= 4`
- `persuade` → `skill_persuasion >= 2`
- `identify_lore` → `skill_lore >= 3`

---

## Goal types to support

- **`encounter` goals**: created when the player pursues a thread opened by an NPC. Example: a shepherd asks for help finding a lost cousin; if the player agrees, generate a `goal_encounter`.
- **`survival` goals**: created or surfaced when the player acts to address a survival pressure (thirst, hunger, wound, fatigue, shelter). Example: tracking a stream because the character is thirsty generates a `goal_survival`.
- **Long-term goals**: do **not** create new long-term quest arcs. You may reference an existing long-term goal if the row already implies it, but keep it narrative-only (`narrative_only`).

---

## Transformation rules

For each row in the original CSV, decide:

1. **Does this row offer a meaningful choice?** Set `has_interaction = true` only when the player could realistically intervene, investigate, parley, assist, trade, flee, or extract information.

   Typical interactive cases:
   - An NPC offers news, aid, trade, shelter, or a warning.
   - An NPC asks for help, directions, or company.
   - A suspicious or hostile encounter can be defused, misdirected, avoided, or parleyed.
   - A sign, track, token, or inscription invites closer inspection.
   - A discovery implies a survival need (water, shelter, food, safety).

   Keep purely atmospheric rows (`has_interaction = false`). Examples: distant glimpses, ambient animal activity, scenery descriptions.

2. **Always provide a passive default.** Every interactive row must have `default_option_label` and `default_option_description`. This is what happens if the player does nothing.

3. **Gate active options by skills or conditions.** Every active option must require something: a skill, an energy/shadow band, a condition, or a survival pressure. Do not create "free" powerful options.

4. **Match the narrative.** The `label` and `description` of each option must fit the existing `npc_attitude`, `concrete_content`, `tension`, `traveller_stance`, `topic`, and `topic_prose_hint`.

5. **Keep outputs deterministic.** One action produces one predictable set of outputs. If an option could succeed or fail, split it into two options with different requirements, or pick the most likely outcome.

6. **Preserve IDs and narrative columns.** Do not regenerate `id`. Do not rewrite `npc_attitude`, `concrete_content`, `tension`, `traveller_stance`, `topic`, or `topic_prose_hint` unless you are only fixing escaping.

7. **Use `phase_context` correctly.** Morning = 07:00–13:00, afternoon = 13:00–19:00, night = after dark at camp, overnight = specifically during the camp/rest period. Use `any` when the timing is flexible.

8. **No new entity types or forms.** Do not invent new `entity_type` or `interaction_form` values.

9. **JSON escaping.** Every JSON string inside `options` must use double quotes and be properly escaped for CSV. If you are unsure, produce a minimal test: the cell should parse correctly when read by Python `csv.DictReader` followed by `json.loads(row["options"])`.

---

## Worked examples

### Example 1: Passive row

Original:

```csv
84b39d55-abad-48bc-b9de-f8e340377e20,3037a73b-8562-4b20-8462-552397c4c406,hobbits,reacts_withdraws,low,aranath,,,,Gone into the bracken so fast he almost missed them. One small face still watching from cover.,The face belongs to a Harfoot who has decided Rangers are safe but not comfortable. The look is someone waiting until he is well past before coming back out.,He is big and armed on their road. That is enough. He does not need to be a threat to be a problem.,Does not slow. Does not make eye contact with the face in the bracken. Passes at normal pace.,home_and_family,Have them chatter about their hole their garden their kin and the doings of the next farm over.
```

Transformed:

```csv
84b39d55-abad-48bc-b9de-f8e340377e20,3037a73b-8562-4b20-8462-552397c4c406,hobbits,reacts_withdraws,low,aranath,,,,Gone into the bracken so fast he almost missed them. One small face still watching from cover.,The face belongs to a Harfoot who has decided Rangers are safe but not comfortable. The look is someone waiting until he is well past before coming back out.,He is big and armed on their road. That is enough. He does not need to be a threat to be a problem.,Does not slow. Does not make eye contact with the face in the bracken. Passes at normal pace.,home_and_family,Have them chatter about their hole their garden their kin and the doings of the next farm over.,false,any,Pass by,The ranger keeps moving; the hobbit stays hidden and the moment passes.,"[]"
```

### Example 2: Interactive row — request for help

Original:

```csv
78ec1b9e-2df3-4772-9be2-ea92e4c45e8e,ca926d68-6b4e-42eb-b537-1f3c96f5227d,humans,brief_exchange,low,aranath,gondorian,77.0,Stepped out of a side-track directly in front of him. Startled but not hostile.,Something has been taking animals from the high pasture — there and gone by midday no tracks. He wants someone with him when he goes to look. He already asked his neighbors. They refused.,He is not ashamed of not wanting to go alone. He is being practical.,Asks what the schedule is. Goes with him.,a_request_for_help,Have them raise a trouble of their own — a beast a feud a missing kinsman — and hope the stranger might aid it.
```

Transformed (one possible interpretation):

```csv
78ec1b9e-2df3-4772-9be2-ea92e4c45e8e,ca926d68-6b4e-42eb-b537-1f3c96f5227d,humans,brief_exchange,low,aranath,gondorian,77.0,Stepped out of a side-track directly in front of him. Startled but not hostile.,Something has been taking animals from the high pasture — there and gone by midday no tracks. He wants someone with him when he goes to look. He already asked his neighbors. They refused.,He is not ashamed of not wanting to go alone. He is being practical.,Asks what the schedule is. Goes with him.,a_request_for_help,Have them raise a trouble of their own — a beast a feud a missing kinsman — and hope the stranger might aid it.,true,afternoon,Decline and move on,"The ranger is pressed for time; he offers a curt warning and keeps walking. The herdsman watches him go.","[{ ""option_id"": ""help_herdsman"", ""label"": ""Go with him to the pasture"", ""description"": ""The ranger agrees to scout the high pasture before dark."", ""requirements"": {}, ""is_exclusive"": false, ""outputs"": [{ ""type"": ""state_change"", ""target"": ""energy"", ""value"": -10, ""reason"": ""extra exertion and lost travel time"" }, { ""type"": ""goal_encounter"", ""title"": ""Find what took the animals"", ""description"": ""Scout the high pasture and discover what predator or creature has been preying on the herd."" }] }, { ""option_id"": ""track_pasture"", ""label"": ""Read the ground around the pasture"", ""description"": ""Before committing the ranger studies the grass and soil for sign."", ""requirements"": { ""skills"": { ""skill_tracking"": 3 } }, ""is_exclusive"": false, ""outputs"": [{ ""type"": ""clue"", ""clue_id"": ""pasture_predator_sign"", ""text"": ""The grass is torn by claws too large for a wolf and the dung reeks of carrion — a warg has been here."" }, { ""type"": ""state_change"", ""target"": ""energy"", ""value"": -5, ""reason"": ""careful search"" }] }]"
```

> Note: the JSON above shows `""` escaping so it can sit inside a CSV cell wrapped in double quotes. In your final file, produce valid CSV escaping, not Markdown code fences.

### Example 3: Survival-pressured row — thirsty traveller finds water sign

Original (hypothetical):

```csv
a1b2c3d4-e5f6-7890-abcd-ef1234567890,,resources,observed_activity,low,aranath,,,,A stand of willows ahead; the ground underfoot softens and the air smells of wet stone.,Fresh water is near — a spring or a hidden creek — but finding the exact pool will take a careful eye.,He has been counting dry miles since morning; the chance is too useful to ignore.,Pushes through the willows and fills his flask.,water_source,
```

Transformed:

```csv
a1b2c3d4-e5f6-7890-abcd-ef1234567890,,resources,observed_activity,low,aranath,,,,A stand of willows ahead; the ground underfoot softens and the air smells of wet stone.,Fresh water is near — a spring or a hidden creek — but finding the exact pool will take a careful eye.,He has been counting dry miles since morning; the chance is too useful to ignore.,Pushes through the willows and fills his flask.,water_source,,true,afternoon,Pass it by,He notes the willows but keeps his pace; he can manage a while longer.,"[{ ""option_id"": ""search_water"", ""label"": ""Search for the spring"", ""description"": ""He leaves the trail and probes the willows for the source."", ""requirements"": { ""skills"": { ""skill_tracking"": 2 } }, ""outputs"": [{ ""type"": ""state_change"", ""target"": ""days_without_water"", ""value"": -1, ""reason"": ""found fresh water"" }, { ""type"": ""state_change"", ""target"": ""energy"", ""value"": 5, ""reason"": ""drink and rest briefly"" }] }, { ""option_id"": ""desperate_dig"", ""label"": ""Dig for water"", ""description"": ""Without the eye of a tracker he guesses at low ground and digs with his hands."", ""requirements"": { ""conditions"": { ""days_without_water_min"": 1 } }, ""outputs"": [{ ""type"": ""state_change"", ""target"": ""energy"", ""value"": -10, ""reason"": ""clumsy search"" }, { ""type"": ""state_change"", ""target"": ""days_without_water"", ""value"": -1, ""reason"": ""eventually finds seepage"" }] }]"
```

---

## Output files

Produce exactly these two files:

1. **`database/seeds/data/csv/npc_interactions.csv`** — the rewritten CSV.
2. **`database/migrations/add_interactivity_to_npc_interactions.sql`** — the SQL migration.

### SQL migration template

```sql
-- Migration: Add interactivity columns to npc_interactions
-- Description: Supports player choices and mechanical outputs during NPC encounters.

ALTER TABLE npc_interactions
  ADD COLUMN IF NOT EXISTS has_interaction BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phase_context TEXT CHECK (phase_context IN ('morning','afternoon','night','overnight','any')),
  ADD COLUMN IF NOT EXISTS default_option_label TEXT,
  ADD COLUMN IF NOT EXISTS default_option_description TEXT,
  ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN npc_interactions.has_interaction IS 'True when this row exposes one or more player choices.';
COMMENT ON COLUMN npc_interactions.phase_context IS 'Narrative phase when the decision is offered.';
COMMENT ON COLUMN npc_interactions.default_option_label IS 'Label for the always-available passive option.';
COMMENT ON COLUMN npc_interactions.default_option_description IS 'Narrative description of the passive outcome.';
COMMENT ON COLUMN npc_interactions.options IS 'JSON array of actionable options with requirements and outputs.';

-- Optional: persistent clue storage
CREATE TABLE IF NOT EXISTS character_clues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_state_id INT REFERENCES character_state(id) ON DELETE CASCADE,
    clue_id TEXT NOT NULL,
    source TEXT,
    text TEXT NOT NULL,
    discovered_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(character_state_id, clue_id)
);

-- Optional index for interactive lookups
CREATE INDEX IF NOT EXISTS idx_npc_interactions_has_interaction
  ON npc_interactions(has_interaction);
```

---

## Quality checklist

Before finishing, verify:

- [ ] The CSV header contains all 18 columns in the order specified.
- [ ] Every original row is present; no `id` has changed.
- [ ] `has_interaction` is `false` for purely atmospheric rows and `true` only when choices make sense.
- [ ] Every interactive row has a non-empty `default_option_label` and `default_option_description`.
- [ ] Every active option has a `requirements` object (empty `{}` only when truly no gate is needed).
- [ ] Every active option has at least one output.
- [ ] Output `type` values are taken only from the allowed list.
- [ ] JSON in `options` cells parses correctly as a JSON array.
- [ ] The SQL migration is idempotent (uses `IF NOT EXISTS`).

---

## Constraints (do not violate)

- Do **not** invent new `entity_type` values.
- Do **not** invent new `interaction_form` values.
- Do **not** change existing row UUIDs.
- Do **not** rewrite existing narrative columns unless escaping requires it.
- Do **not** create new long-term quest arcs.
- Do **not** add random loot or reward tables.
- Do **not** create options that are always free and universally beneficial.
