# The Mind knows no field it was not told: vitals are declared, not hardcoded

The character snapshot the host sends on each open is read only through declared Detectors: each game declares which snapshot fields feed which Needs and which fields modulate checks ("when `suit_food_pct` drops below 0.3, open hunger"). The Mind Engine carries no field name of any host: the `days_without_food`/`days_without_water`/`energy`/`shadow`/`wounded` reads in `needs.py` and `checks.py`, and the hardcoded event-type lists like `_NEVER_FOCUS` in `focus.py`, all move to per-game data.

## Considered Options

- **Canonical body channels** (the host maps its resources to a fixed `vitality`/`spirit`/`wounds` vocabulary): rejected; it forces every character into one body shape — a detective with no "spirit" invents one or loses the dimension.
- **Documented conventions** (the current Middle-Earth field names kept as the implicit contract): rejected; the core stays Middle-Earth-shaped — agnostic in name only.

## Consequences

- Physiological Detectors became `mind.detectors` rows in the same declarative family as the composite rules (field/op/value → Need + urgency formula or severity map); check modifiers and the altered-state trigger became rows too (`check_mod` in elif `group_key` chains, `altered`). A `detector.<key>.<param>` wiring key retunes one brain.
- The character contract gained a free-form `state` channel so a host reports vitals the built-in pack never named.
- **Status of the fallback**: `DEFAULT_DETECTORS` ships the built-in pack as code defaults, like `DEFAULT_RULES`/`DEFAULT_PHRASE_LISTS` — an unseeded game gets it, rows override per key, `enabled=false` silences. Moving the *whole* built-in pack (nl_defaults, composite-rule defaults included) to a minimal generic pack remains a separate migration, not done here.
- A host that declares nothing gets the built-in pack; a host whose fields simply aren't read stays honest — its unreported fields make the default detectors silent.
