# Mind Engine

> *La vida interior de un personaje: el mundo decide qué pasa; la mente decide cómo se vivió.*
>
> *Story Engine — the umbrella it lives in: la capa narrativa de cualquier historia: tu mundo pone los hechos; nosotros ponemos la mente que los vive y la voz que los cuenta.*

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
Something the Mind holds true, with a confidence that grows or erodes with what it lives. Reaches the Lens only when the Episode puts it at stake — or, for the Beliefs that are the thoughts a person keeps for themselves, when nobody touched the Mind at all (a belief tagged `context:solitude` speaks on the days that met no one). Who the Character is lives in the Foundational phrase, not in its beliefs. A Belief may carry facets that let the Mind act on it, not just voice it: a Subject and a Stance (an Attitude or an Impression), a Source, a Pull, or a ritual (a Habit). A Belief without facets is a plain thought.
_Avoid_: core idea, main idea, value

**Subject**:
What a Belief is about when it is about something in the world: a kind of being (horses, orcs, dwarves) or a place (a region, a named location). A Subject may be broad or narrow — the kind, the family within the kind, or one named being — and the narrowest match speaks for what happened (the horses of Mordor are not 'horses' to Celebrian).
_Avoid_: target, topic, entity

**Stance**:
How much a Belief likes or loathes its Subject, from loathing to love. Separate from Concern: a Mind can watch something closely and love it, or watch it closely and dread it.
_Avoid_: valence, opinion score, disposition

**Attitude**:
A Belief with a Subject that is a kind of being and a Stance toward it — the prehistory every encounter with that kind carries. Encounters move it slowly; one that marks the Character deeply (saved from death, badly wounded) moves it a lot. Encounters can wear a Stance down to almost nothing, but never turn it — turning a prejudice is the Reflection's work, which rewrites the Belief with the Stance turned.
_Avoid_: relationship, reputation, faction standing

**Impression**:
A Belief with a Subject that is a place and a Stance toward it. Lived or only heard (its Source); the first visit tests a heard Impression, and the gap between what the Mind expected and what it found is felt.
_Avoid_: location note, region opinion, lore

**Source**:
How a Mind came to hold a Belief: lived it, heard it, or carries it as legend. Lived outweighs heard; a heard Belief turns lived the first time the Character meets its Subject.
_Avoid_: provenance, origin, reliability

**Pull**:
A Belief's sensitivity to a state of the Character's Condition: as that state deepens, the Belief speaks more and weighs more (a darkening thought under the shadow), or less (a virtue the shadow dims). The state is one the Host declared.
_Avoid_: modifier, corruption, buff

**Latent belief**:
A Belief held so faintly it rarely speaks, often the opposite of something the Character firmly holds — the virtue or the doubt that life can grow into conviction.
_Avoid_: hidden belief, secret, potential

**Habit**:
A Belief about a small ritual the Character keeps (a pipe at the fire) tied to something it possesses. With the possession at hand the ritual can colour the Episode; when it runs out, the lack becomes a Need.
_Avoid_: vice, routine, addiction

**Need**:
What the Mind lacks and asks of the Episode: something the body or spirit wants (food, water, rest, healing, relief from the shadow) or an open loop it carries (a Thread). Always told with what caused it. Reaches the Lens when it is new, worsening or touched by the Episode; past an urgency threshold it always speaks, even unchanged.
_Avoid_: drive, requirement, status effect, quest

**Thread**:
An open loop the Mind carries as a Need — a promise, an unfinished encounter, a goal of any horizon, short or lifelong. It opens when an Event declares it and resolves when the world closes it or the outcome says so; it is something the Character lived, never a flag the host tracks. A Character may also bring Threads with it from its preset — a personal goal that wakes when the Episode reaches the place it is about.
_Avoid_: quest, goal, mission, plot hook

**Detector**:
A declared rule that reads the Condition snapshot: it opens a Need when a field crosses its threshold, bends a perception roll while a state holds, or marks the Mind as altered. The host teaches the Mind its body vocabulary as data — the Mind knows no field it was not told.
_Avoid_: hardcoded check, built-in sensor

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

**Environmental variant**:
A place description the Host keeps in several conditioned versions — base plus one per season or weather state (`summer`, `winter`, `rain`, `snow`, `cold`, `heat`). The Host resolves which variant a day gets before reporting it, so the Mind Engine always sees plain prose; a missing variant falls back to base. Not World voice: World voice turns a global measurement into a phrase, a variant is authored prose about one place.
_Avoid_: seasonal phrase, weather text, conditional description

**Accent**:
A Character's exceptions to the World voice: a few ranges or phrases they say differently. Everything not accented falls back to the World voice.
_Avoid_: override, band override
