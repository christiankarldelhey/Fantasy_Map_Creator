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
An impression a Mind kept from something it lived. It strengthens when evoked, weakens with time, and below a threshold becomes Forgotten. Reaches the Lens only when it connects to the Episode, always told as past; being recent is not a reason on its own.
_Avoid_: record, entry

**Forgotten**:
A Memory the Mind has lost: kept as a trace with the day it was lost so the Mind's history can be seen, but never evoked again.
_Avoid_: deleted, erased

**Belief**:
Something the Mind holds true, with a confidence that grows or erodes with what it lives. Reaches the Lens only when the Episode puts it at stake; who the Character is lives in the Foundational phrase, not in its beliefs.
_Avoid_: core idea, main idea, value

**Need**:
What the body or spirit asks of the Character (food, water, rest, healing, relief from the shadow), always told with what caused it. Reaches the Lens when it is new, worsening or touched by the Episode; past an urgency threshold it always speaks, even unchanged.
_Avoid_: drive, requirement, status effect

**Mood**:
How the Mind feels as it enters an Episode, always told through what caused it ("still uneasy since the orc tracks"), never as a bare label.
_Avoid_: emotion label, affect, dominant

**Trait**:
A human-scale dial of how a Mind works (how fast it forgets, how much it notices, how deeply things affect it). One Trait moves many engine settings at once.
_Avoid_: knob, wiring, parameter

**Concern**:
Something a Mind gives weight to: it notices it more, remembers it more and evokes it more. Says nothing about whether the Mind likes or fears it.
_Avoid_: interest, theme weight, salience, fixation

**Lens**:
What the Mind tells the narrator about an Episode: what matters to it, one central line and a few that connect to it. Split by time: what the Character carries in before anything happens, and what the Episode does to it, revealed only at the moment it happens; the Lens never names what the Character has not lived yet. Anything that touches nothing in the Episode stays silent; an absent belief or memory is a signal, not a gap.
_Avoid_: lens block, prompt section, mind block, mind inventory

**Focus**:
The one thing an Episode turns on for a Mind, the centre of its Lens. Usually something that happens in the Episode; a Need past its urgency threshold or a strongly connected Memory can take its place. Everything else in the Lens connects to it. An Episode where nothing weighs enough has no Focus, and is narrated as the quiet stretch it was. Being the Focus also marks how the Episode is remembered: it tends to become that Episode's lasting Memory.
_Avoid_: thread, weight, heart, main event

**Resonated**:
A Lens line whose meaning shows up in the narration that followed, judged on the narration before it is translated. The gap between what a Mind holds and what resonated is what actually changed the story.
_Avoid_: voiced, bled, used

**Mind preset**:
A ready-made way of thinking (what to notice, how to remember, starting beliefs) that is copied into an Original when it is created or edited. Copied, never linked: changing a preset later changes no one.
_Avoid_: mold, archetype, profile

### Voice of the data

**Inner language**:
The single language the Mind Engine thinks and narrates in (English): World voice, Memories, Lens and narration all live in it. Any other language a reader asks for is a translation of the finished narration, never a second way of narrating.
_Avoid_: base language, source language, narration language

**World voice**:
How a Host's raw data is put into words for the narrator: which ranges of each measurement get which phrase. Belongs to the Host and applies to every Character in it.
_Avoid_: NL pack, natural-language layer, bands

**Accent**:
A Character's exceptions to the World voice: a few ranges or phrases they say differently. Everything not accented falls back to the World voice.
_Avoid_: override, band override
