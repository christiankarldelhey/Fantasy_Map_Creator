# Mind Engine

The inner life of fictional or synthetic characters: who they are, what they notice, what they remember and believe. Any story, game, film or simulation can plug a character into it; the world around the character stays the host's.

## Language

### Ownership

**Host**:
The story, game or simulation that a Character lives in. It decides what happens; the Mind Engine decides how it was lived.
_Avoid_: game, client

**Character**:
One living copy of a person, with its own card (name, description, portrait, foundational phrase, voice instructions, skills) and its own Mind. Owned by the Mind Engine; hosts reference it, never redefine it.
_Avoid_: character state, clone, NPC card

**Original**:
The authored Character that new Characters are copied from; its card is the default every copy starts with. Editing a copy never touches the Original.
_Avoid_: template, base character

**Foundational phrase**:
The authored text that defines who a Character is and how they think; the root of every narration of them.
_Avoid_: system prompt, persona

**Condition**:
What the host's world says about a Character right now: position, body, counters, possessions, alive or dead. Owned by the host and reported to the Mind Engine as a read-only snapshot.
_Avoid_: character state, stats

### The mind

**Mind**:
The lived interior of one Character: memories, beliefs, needs, mood. Exactly one per Character.
_Avoid_: brain, psyche

**Episode**:
One stretch of life a Mind lives at once, whatever the Host calls it (a day, a scene, a session). The unit of the Mind's timeline.
_Avoid_: day, turn, scene, session

**Memory**:
An impression a Mind kept from something it lived. It strengthens when evoked, weakens with time, and below a threshold becomes Forgotten.
_Avoid_: record, entry

**Forgotten**:
A Memory the Mind has lost: kept as a trace with the day it was lost so the Mind's history can be seen, but never evoked again.
_Avoid_: deleted, erased

**Trait**:
A human-scale dial of how a Mind works (how fast it forgets, how much it notices, how deeply things affect it). One Trait moves many engine settings at once.
_Avoid_: knob, wiring, parameter

**Concern**:
Something a Mind gives weight to: it notices it more, remembers it more and evokes it more. Says nothing about whether the Mind likes or fears it.
_Avoid_: interest, theme weight, salience, fixation

**Lens**:
What the Mind tells the narrator before an Episode is narrated: active beliefs, memories surfacing, what the body asks for.
_Avoid_: lens block, prompt section, mind block

**Resonated**:
A Lens line whose trace shows up in the narration that followed. The gap between what a Mind holds and what resonated is what actually changed the story.
_Avoid_: voiced, bled, used

**Mind preset**:
A ready-made way of thinking (what to notice, how to remember, starting beliefs) that is copied into an Original when it is created or edited. Copied, never linked: changing a preset later changes no one.
_Avoid_: mold, archetype, profile

### Voice of the data

**World voice**:
How a Host's raw data is put into words for the narrator: which ranges of each measurement get which phrase. Belongs to the Host and applies to every Character in it.
_Avoid_: NL pack, natural-language layer, bands

**Accent**:
A Character's exceptions to the World voice: a few ranges or phrases they say differently. Everything not accented falls back to the World voice.
_Avoid_: override, band override
