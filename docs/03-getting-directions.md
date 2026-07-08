# Getting directions on Middle Earth (without passing through Mordor)

> *Google Maps has satellites and traffic data. I had a hand-drawn map, 4,119 road segments, and a stubborn refusal to install pgRouting.*

<!-- IMAGE: hero shot — a glowing route snaking across the map from the Shire toward the south -->

---

## "Just use pgRouting"

Reasonable advice. PostGIS has a whole routing extension; I could have leaned on it. But I wanted the cost of every step to depend on things pgRouting doesn't natively care about — **which biome you're slogging through, how high the ground is, what kind of road (if any) is under your boots** — and I wanted to understand every number that came out.

So the routing engine is a **hand-written Dijkstra in plain JavaScript** (`backend/services/routing.js`). No extension. Just a graph, a priority queue, and a lot of opinions about terrain.

---

## First, you need roads

The road network was traced by hand in QGIS on top of Fenlon's map and stored in the `roads` table as `GEOMETRY(LineString, 4326)`. It ended up being **4,119 segments**, sorted into a little medieval road hierarchy:

| Road type | Segments | Vibe |
| --- | --- | --- |
| **Royal Road** | 90 | The imperial highways. Fast, proud, rare. |
| **Main Road** | 667 | Solid inter-regional routes. |
| **Regular Road** | 1,059 | Your everyday connecting road (the baseline). |
| **Trail** | 2,303 | Paths and tracks. Most of the map, honestly. |
| *off-road* | — | No road at all. Here be brambles. |

<!-- IMAGE: the full road network drawn over the map, colour-coded by type -->

## The core idea: cost is *time*, not distance

The insight that makes routes feel real: **the weight of every graph edge isn't distance, it's travel time.** And time depends on your speed, which depends on everything around you:

```
speed = base_speed × road_mult × biome_mult × altitude_mult
cost  = segment_length / speed        // seconds
```

Those multipliers are where all the flavour lives. Here are the real numbers, straight from `TRANSPORT_CONFIGS`:

**Base speed**
- On foot: **5 km/h** (1.39 m/s)
- On horseback: **12 km/h** (3.33 m/s)

**Road multiplier** (walk / horse)

| Road | Walk | Horse |
| --- | --- | --- |
| Royal Road | ×1.2 | ×1.4 |
| Main Road | ×1.1 | ×1.3 |
| Regular Road | ×1.0 | ×1.0 |
| Trail | ×0.8 | ×0.6 |
| off-road | ×0.6 | ×0.4 |

**Biome multiplier** (walk / horse)

| Biome | Walk | Horse |
| --- | --- | --- |
| Plain | ×1.00 | ×1.00 |
| Forest | ×0.85 | ×0.75 |
| Desert | ×0.70 | ×0.60 |
| Marsh | ×0.55 | ×0.35 |

**Altitude multiplier** (walk / horse)

| Terrain | Walk | Horse |
| --- | --- | --- |
| Plain | ×1.00 | ×1.00 |
| Hills | ×0.80 | ×0.70 |
| Low mountains | ×0.65 | ×0.50 |
| Mid mountains | ×0.50 | ×0.30 |
| High mountains | ×0.35 | ×0.15 |

Notice the personality differences: a horse *loves* a Royal Road (×1.4) but *hates* a marsh (×0.35) far more than a person on foot does (×0.55). Horses are fast and fussy. This is why the shortest route on foot and on horseback can be genuinely different roads.

## Teaching each road what it crosses

A road segment doesn't know its own biome or altitude — those are separate PostGIS layers. So when the roads are loaded, each one is enriched on the fly using **`LATERAL` joins** with `ST_Intersects`:

```sql
SELECT r.id, r.name, ST_AsGeoJSON(r.geom)::json AS geometry,
       ST_Length(r.geom::geography)             AS segment_length,
       COALESCE(b.type, 'plain')                AS biome_type,
       COALESCE(al.altitude_type, 'plain')      AS altitude_type
FROM roads r
LEFT JOIN LATERAL (
  SELECT type FROM biomes
  WHERE ST_Intersects(r.geom, geom) LIMIT 1
) b ON true
LEFT JOIN LATERAL (
  SELECT altitude_type FROM altitude_layers
  WHERE ST_Intersects(r.geom, geom)
  ORDER BY priority DESC LIMIT 1
) al ON true;
```

Now every road knows if it runs through the forest, over the hills, or across a swamp — and can price itself accordingly.

## Building the graph (and why "everywhere is a node")

Each road is a LineString of many points. The graph is built from **every consecutive pair of vertices** of every road, in both directions:

```js
roads.forEach(road => {
  const coords = road.geometry.coordinates;
  for (let i = 0; i < coords.length - 1; i++) {
    addEdge(coords[i], coords[i + 1], road, getDistance(coords[i], coords[i + 1]));
  }
});
```

Vertices are keyed by rounded coordinates (`lng.toFixed(5),lat.toFixed(5)`), so roads that touch snap together into one connected network. Then it's textbook Dijkstra: a distance table, a `previous` map for reconstruction, and a queue that always expands the cheapest node next.

<!-- IMAGE: a zoomed-in diagram showing road vertices becoming graph nodes -->

## The "last mile" problem: off-road legs

Real destinations aren't sitting on a road vertex. A ruin in the wilds might be kilometres from the nearest track. So the router:

1. Finds the **closest road vertex** to your start and to your end.
2. Runs Dijkstra between those two vertices.
3. Adds two **off-road legs** — start→first-vertex and last-vertex→end — penalised at the off-road multiplier and measured precisely with `ST_Length` over `geography` (so distances are true metres on a sphere, not degrees on a flat plane).

The final answer comes back as GeoJSON with a tidy summary:

```
total_distance_km, on_road_distance_km, off_road_distance_km,
total_time_hours
```

…which is exactly what you need to answer the only question that really matters in Middle-earth: **how many days is this going to take?**

---

## So, about not passing through Mordor

Here's the quietly satisfying part: **I never wrote a rule that says "avoid Mordor."** I didn't have to.

Mordor is a hot desert (biome and climate), ringed by mid and high mountains. In the cost function that means brutal multipliers stacking on top of each other — `desert × mountains_high` on horseback is `0.60 × 0.15 = 0.09`, i.e. roughly **one-eleventh** of open-road speed. Dijkstra, being a pure optimiser with no sense of drama, looks at that and quietly routes *around* it every single time.

The geography *is* the game design. Bad places are expensive, so travellers avoid them — not because they're scared, but because the maths says so.

---

## Lessons from routing a fantasy world

- **Weight by time, not distance.** The moment cost became "travel time," terrain stopped being decoration and started making decisions.
- **Let the data enforce the story.** No hardcoded "avoid the volcano" — expensive terrain does the narrative work on its own.
- **`LATERAL` + `ST_Intersects` is the glue.** Keeping roads, biomes and altitude as separate layers and joining them at query time kept everything editable without re-baking the network.
- **Sometimes rolling your own is worth it.** A hundred lines of Dijkstra I fully understand beat an extension I'd have to fight.

Next: the roads were ready, but the world was empty. Time to fill it with things that watch you from the treeline. → *[Giving life to the map: creating the entities and the encounters](./04-entities-and-encounters.md)*
