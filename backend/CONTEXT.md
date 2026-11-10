# Game World

> *El mundo decide qué pasa: un mapa, un calendario, y los que lo cruzan.*

The host world the traveller journeys through: geography, the in-world calendar (TA 3017–3018), encounters, and the Movers whose presence is a function of the date. Owned entirely by the host; the Mind Engine only ever sees it as Condition and Events.

## Language

### Beings

**Entity**:
A kind of thing that can be met on the road — orcs, a bear, elves. An archetype with probabilities per region, never someone in particular.
_Avoid_: creature, NPC, monster

**Mover**:
An authored being whose reach is a function of the in-world date: a named person, a company, or a faceless host. Appears, moves and vanishes by the calendar on tracks the traveller cannot change. Owns a motivation and a story told Leg by Leg; not an Entity and never in the encounter pools' data.
_Avoid_: NPC, moving entity, actor, unit

### Legs — a Mover's story

**Leg**:
One stretch of a Mover's story: where it is, what it is doing, over a window of dates. Carries its own Beat and visibility. Movers appear, disappear and change what they are doing Leg by Leg.
_Avoid_: phase, stage, segment

**March**:
A Leg with a day-by-day Trail — for those whose movement is visibly geographic (armies, caravans, a rider on the roads).
_Avoid_: route leg, trip leg

**Presence**:
A Leg of region + date window + level — for those who roam an area and are met by chance (a ranger in Ithilien, an orc patrol).
_Avoid_: spawn zone, territory

**Resident**:
A Leg anchored to a location — for those who are simply there, always or in season (an innkeeper, a spy at his table, the watcher at a gate).
_Avoid_: static, garrison

**Trail**:
The baked day-by-day positions of a March; immutable seed data, read-only at runtime.
_Avoid_: path, track record

### Meeting them

**Crossing**:
The traveller coming inside a Mover's reach — inside a March's contact radius, a Presence hit, or stopping at a Resident's place. Fires that Leg's Beat. A Crossing is an event of the day, never a roll of the entity pools.
_Avoid_: collision, contact, meeting

**Trace**:
A Mover's sign felt from afar — inside a March's notice radius or through a signs-visibility Leg: tracks, smoke, rumours at an inn. Life at a distance, never an encounter.
_Avoid_: clue, hint, foreshadowing

**Beat**:
The authored content of a Crossing — who is met, what they are doing on that Leg, what the encounter leaves. Static in v1; the shape leaves room for interactive encounters later.
_Avoid_: script, cutscene, dialogue

**Unease**:
The tint a region carries while a hostile Leg is active in it — tension visible at a glance without revealing any position.
_Avoid_: heat, danger overlay, alert level

**One-shot**:
A Crossing is lived once per Leg: lingering where a host passes narrates further Traces, not repeated Beats.
_Avoid_: cooldown, dedup

### Places — where things happen

**Location**:
A named point of the gazetteer — geometry plus world facts (name, type, population, inhabitants, description), mostly sourced from TA ~1640 material. Answers "what exists and where"; carries no game logic.
_Avoid_: POI, waypoint, marker

**Place**:
An authored narrative record — what the traveller finds at a spot, its variants, its secret, what he can do there, what the day remembers. Written for TA 3018; when a Place and its Location disagree, the Place is canonical. A Place's geometry can be a point (a town), a line (a bridge, a causeway), or a polygon (a wood) — whatever the traveller can be *on*. Ambients and arrivals are Places that belong to a region rather than a point, so they carry no geometry.
A `place` record is always one specific spot where the traveller feels something, something happens, or he must decide — a tower, a wood, a castle, a hill, a hollow; at most a small group of hills. A road is not a place (a crossroads or a fork is); a river is not a place (a ford, a bridge or a boat crossing is). A person met there is named inside the Place only if fixed there; people who move are encounters, region-wide traits are ambients. Small landform Places are always welcome — a lone copse, a named hill — however small the story: the tree species, what is heard there, the hill's shape, the wind on top, how it looks from outside. Anchor them to real biome polygons or elevation features when available (`payload.refs` records the source feature ids).
_Avoid_: site, encounter card, quest

**location_ref**:
The link from a Place to the Location it is anchored to. One Location can host several Places; a Place may exist unanchored until it is positioned.
_Avoid_: FK, parent

**feature refs**:
Provenance links from a Place to gazetteer features of other types — `payload.refs` such as `{"water": [42], "road": [12, 13], "biome": [7]}`. Audit metadata for the georeferencing pass: the operative geometry is always the Place's own `geom` (copied or merged from the source features), never a live join.
_Avoid_: FK to roads/water/biomes, live reference

**size radius**:
The distance from a Place's point within which the traveller is *at* it — its variants, secret and options apply.
_Avoid_: trigger zone, bounding box

**influence radius**:
The distance from a Place's point within which it already exists narratively — locals know it by name and can be asked about it, and its signs are felt before arrival.
_Avoid_: aggro range, visibility radius
