# The Mind Engine owns Characters; hosts own Condition

Character identity (name, description, portrait, foundational phrase, voice instructions, skills, archetype) moves from the game's `character_state` into the Mind Engine, so a Character can live in hosts that have no character table of their own (films, synthetic users, other games). Everything the world's rules mutate (position, energy, fatigue, shadow, wounds, hunger counters, coins, inventory, alive/dead, owning player) stays in the host and reaches the mind as a read-only snapshot on each episode open.

## Considered Options

- **Host owns the whole card, admin writes through to it**: rejected; ties the admin to one host's database.
- **Mind owns body and inventory too**: rejected; the mind would have to execute world rules, breaking "the mind proposes, the host executes" (`proposed_commands`). Skills are the exception that moves, because perception gates already read them.
- **`shadow` stays in the host** despite sounding psychological: in Middle Earth it is a mechanical counter; the mind consumes it as a signal.
