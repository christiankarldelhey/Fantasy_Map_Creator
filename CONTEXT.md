# Mind Engine

> *La vida interior de un personaje: el mundo decide qué pasa; la mente decide cómo se vivió.*
>
> *Mind Engine — the umbrella it lives in: la capa narrativa de cualquier historia: tu mundo pone los hechos; nosotros ponemos la mente que los vive y la voz que los cuenta.*

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
What the host's world says about a Character right now: position, body, counters, possessions, alive or dead. Owned by the host and reported to the Mind Engine as a read-only snapshot — the one channel where numbers are legal.
_Avoid_: character state, stats

### The report

**Arc**:
The larger narrative an Episode belongs to, whatever the Host calls it — a journey, a season, a chapter of a longer tale. It names what the stretch is part of.
_Avoid_: trip, storyline, campaign

**Event**:
Something the Character lived in an Episode, reported by the Host already put into words — a reading plus the Tags it connects by. Events are the only channel by which the world reaches the Past: a Memory is born from what was lived or not at all. An Event's type names its Kind, not the shelf its source record sat on.
_Avoid_: log entry, action, occurrence

**Kind**:
What an Event's type names — the kind of experience (a meal, a river crossing, a night's rest, the Mind's own hunger). A Kind is declared data, not code: an undeclared Kind is still an Event and the Mind treats it as a worldly Moment by default.
_Avoid_: event type enum, event class

**Kind registry**:
The declared contract of every Kind the Mind knows: the Role it plays in the Episode, its Event source, how it is put into words, whether it may become a Memory, the fields it expects and which of them can feed Relations. Adding a new Kind is a declaration here — the engine never branches on a type name.
_Avoid_: event schema, type config

**Role**:
The part a Kind plays in the Episode's telling: a **Frame** kind sets the day's backdrop (weather, land, mileage) — narrated, never the Focus; a **Moment** is something that happened — it can take the Focus; a **Voice** is the Mind's own body speaking (a Need) — it earns its own lines through the Needs path and is never world-evidence.
_Avoid_: event category, event tier

**Event source**:
Which channel an item of the perceived day came from: the **world** (something that happened to the Character), the **ambient** frame (the backdrop that colours it), a **Decision** the Character made, or the **Mind** itself (a Need, a streak's wear). Mind items feel and speak but never pose as world-evidence — they spike no Reflection and feed no streaks. Not the Source of a Belief (lived or heard) — that says how the Mind came to hold something true, this says where a lived thing entered from.
_Avoid_: origin, channel

**Ambience**:
The world's own voice made into an Event — a resolved ambient situation the world fired for the Episode ("the wall that hums, night 1"), one Event per situation with its authored reading. A Moment-role Kind: it can take the Focus and it can call up a Musing, but it is world, not interiority — the inner voice is the Musing. Named 'moment' until #158.
_Avoid_: moment (the old name; Moment is a Role, not this Kind), ambience as mood

**Fate**:
The Host's verdict on how an Episode ends, declared before the Episode is narrated, so the Mind knows the closing before it tells the stretch. Not the close's outcome, which records what was actually kept.
_Avoid_: ending, result

**Narration notes**:
The Host's pre-verbalized world material for the narrator — what is not itself a lived Event: climate continuity, lands crossed, equipage, end state, journey context. The per-phase world prose rides the Events' own readings; one verbalization serves Memory and narration alike.
_Avoid_: world notes, briefing, prompt material

**Tag**:
A word from the Tag registry — `family:value` — marking what an Event or Memory can connect to. One thing may carry several Tags: an exact match links strongly, a shared family weakly.
_Avoid_: flag, label, keyword

**Tag registry**:
The closed catalog of Tag families and values every consumer consults — content gating, Event streams, Memory, the admin view alike. Families are fixed; a family's values may be fixed or open by pattern.
_Avoid_: taxonomy, vocabulary

### The mind

**Mind**:
The lived interior of one Character: memories, beliefs, needs, mood. Exactly one per Character. Everything it holds lives in one of three parts: Identity, State or Past. The body is not one of them — it stays in the Host's Condition.
_Avoid_: brain, psyche

**Identity**:
Who the Mind is and what it holds true; changes slowly. The Foundational phrase, Beliefs, Traits and Concerns.
_Avoid_: personality, profile, self

**State**:
How the Mind arrives at this moment; changes Episode to Episode. Mood and Needs.
_Avoid_: status, condition, stats

**Past**:
What the Mind lived and kept: its Memories, the Forgotten and the patterns repetition left.
_Avoid_: memory (one Memory is a single impression), history, log

**Episode**:
One stretch of life a Mind lives at once, whatever the Host calls it (a day, a scene, a session). The unit of the Mind's timeline.
_Avoid_: day, turn, scene, session

**Memory**:
An impression a Mind kept from something it lived. It strengthens when evoked, weakens with time, and below a threshold becomes Forgotten. Reaches the Lens only when it connects to the Episode, always told as past; being recent is not a reason on its own.
_Avoid_: record, entry

**Forgotten**:
A Memory the Mind has lost: kept as a trace with the day it was lost so the Mind's history can be seen, but never evoked again.
_Avoid_: deleted, erased

**Conviction**:
A Memory at the deepest tier — where a Belief lives: one row, one truth. The statement is the desc, the Stance the imprint, the Subject the subjects, and a conviction facet carries what the continuum does not (kind, horizon, status, strength, evidence, source). Convictions evoke and re-feel like any Memory, but forgetting never eats them: a prejudice is not mislaid, it is turned — the Reflection's words rewrite the facet and turn the imprint with them; a weakened one fades to a whisper below the Evocation floor, never to silence.
_Avoid_: core memory, truth memory

**Evocation**:
When a Memory connects to the Episode and comes forward — it is not only read but lightly re-felt: the Mood is pulled a dampened share toward how the Memory felt and the Relation is fed again, never as much as living it. Remembering keeps feelings alive; how much it stirs is the Personality's.
_Avoid_: recall, retrieval, flashback

**Belief**:
Something the Mind holds true: a statement, how firmly it is held (from barely to a way of life) and what it is about — the world, the self, others, or what matters (a Value). A Belief lives as a Conviction — a Memory at the deepest tier, not a row of its own; the belief and the impression of having always held it are the same thing. Lived evidence moves it: what confirms it hardens it, what contradicts it wears it down, and the firmer it is the harder it moves. A Belief about passing circumstances also fades as the days pass; one about how the world is does not. An experience can start a Belief, but faintly. Reaches the Lens only when the Episode puts it at stake. When it is about something concrete it also carries a Subject, a Stance and a Source.
_Avoid_: core idea, main idea, thought, latent belief

**Value**:
A Belief about what matters or what is right ("one does not abandon a companion"), as opposed to one about how the world is. Facts do not move it; acting for or against it, or seeing it put to the test, does.
_Avoid_: morality score, alignment, principle

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

**Relation**:
The emotional sediment a Subject leaves in the Mind: not an entity in the world but the standing sum of everything the Mind has felt about it — the love for a place, the fear of a kind, the trust in a person. Born only from lived experience (a Relation is never declared, only accreted), it outlives the Memories that made it: the bite is forgotten, the fear of dogs stays. Without new evidence it slowly fades toward indifference. Attitudes and Impressions are its seeds — what the Mind arrived already feeling.
_Avoid_: relationship, reputation, attitude, affinity

**Source**:
How a Mind came to hold a Belief: lived it or heard it (a legend is something heard long ago). Lived outweighs heard; a heard Belief turns lived the first time the Character meets its Subject.
_Avoid_: provenance, origin, reliability

**Musing**:
An authored line of the Character's inner voice — how this person sounds inside in a kind of moment (solitude, a friendly encounter, after danger, near animals). Flavour for the narration, never evidence: no strength, no reinforcement, and Reflection never touches it. Not a Belief: nothing lived can contradict "the night knows me better than any face". A Character's old Accents — their own phrases for the world's weather and places — live here too.
_Avoid_: thought, belief, quote

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
How the Mind feels as it enters an Episode, always told through what caused it ("still uneasy since the orc tracks"), never as a bare label. A point in valence × arousal space, moved only by Pulls, the body's drag and the drift back to Temperament. The Reflection may lend a carried cause better words — an AI-written overlay that dies with the cause it described, never the physics beneath it.
_Avoid_: emotion label, affect, dominant

**Pull**:
The only channel by which an Event moves the Mood: a `felt:*` Tag names a point on the mood wheel (the word IS the point — soft ring, strong ring, extreme or the `steady` origin), and the Mood travels a fraction of the way there — never past it. How far is the pull's gain: the Event's salience, the standing the Relation already holds toward the source (a known place pulls harder than a stranger's field), the Personality's moodiness, and how near the target sits to the Temperament. The Relation also refracts the target itself: the same `felt:melancholy` rain lands as quiet comfort on one who loves the rain and as unease on one who dreads it — the Tag declares the tone, the Relation decides where it falls.
_Avoid_: mood delta, emotional damage, affect push

**Temperament**:
The point in the Mood's own space where the Mood falls by inertia when nothing happens — the resting feeling a Mind returns to, from a hobbit's warm contentment to Celebrían's cool calm. Not a second state: every quiet Episode the Mood drifts back toward it, at the pace the Personality sets.
_Avoid_: baseline, default mood, character

**Shade**:
A Pull that moved the Mood against where it stood without turning it — the melancholy a ruin casts into a good day, the warmth an inn lends a grey one. Only the world can cast one (the Mind's own Needs already speak); the strongest per phase is whispered to the narrator in scene, so the day keeps its dominant feeling and still remembers what brushed against it.
_Avoid_: mixed emotion, secondary mood, counter pull

**Personality**:
How a Mind's engine is tuned: how strongly lived experience swings the Mood versus how firmly it returns to the Temperament, how sensitive each kind of feeling is, how fast Relations accrete or let go. Authored through Traits and presets — the engine is one; every Character's Personality tunes it differently.
_Avoid_: personality type, trait list, stats

**Feeling**:
A literary word the engine derives for the narration by matching the live vector state — Mood, Relations, Body and how long they have held — against a declared lexicon: fear with no dominance becomes dread, long-held low valence becomes melancholy, full-grown affection and trust become deep friendship. The physics stay numbers; the Lens carries the word and its cause.
_Avoid_: emotion label, mood name

**Trait**:
A human-scale dial of who the Mind is — how much things affect it, how much it notices, how it clings to what it believes, how the new attracts it. A living Trait acts every Episode (one dial moves many engine settings at once); a dormant Trait speaks to how the Character will act — carried as data from day one, waiting for its mechanism. Never a measure of memory or habit: those are internals, not personality.
_Avoid_: knob, wiring, parameter, stat, ability

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
(absorbed into **Musing**) — a Character's own phrasing for the world's conditions now lives among their authored inner voice, not in an exceptions table.
_Avoid_: override, band override
