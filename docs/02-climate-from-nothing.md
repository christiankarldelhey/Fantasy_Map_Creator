# How to create a Climate System from nothing

> *In which I refuse to invent weather, and instead steal a whole year of it from 1950.*

<!-- IMAGE: hero shot — the map tinted by climate zones, snow in the north, heat haze over Mordor -->

---

## The temptation I resisted

The easy way to give a fantasy map "weather" is to make it up. Roll some dice, pick "rainy," move on. It works, and it feels hollow, because invented weather has no memory: it never knows that the coast is milder than the interior, that mountains steal the rain, that summer nights in the south stay warm.

Since the whole project is built on the idea that Middle-earth is **georeferenced onto real European coordinates**, I had a better option sitting right there: use *real* weather.

But which real weather? Modern data is contaminated — cities, highways, the urban heat-island effect, a century of industrial warming. None of that belongs in a Third-Age world of villages and forests.

So I went back to **1950**: recent enough that good hourly records exist, old enough to be before the boom. A pre-industrial-ish Europe, which is about as close to "Middle-earth weather" as physics will politely allow.

---

## The core idea: every region has a real-world twin

The trick that makes the whole system work is a matchmaking exercise. For **every one of the 87 regions** of Middle-earth, I picked a **real European location** whose climate *feels* like that region should feel, and pinned it down with its **Köppen classification** and real coordinates.

The Shire is the Cotswolds. Rohan is the Hungarian steppe. Lórien is the primeval Białowieża forest. Mordor is... a volcanic corner of eastern Turkey, because of course it is.

<!-- IMAGE: a couple of side-by-side photos — Cotswolds vs "the Shire", Hortobágy vs Rohan -->

Each region simply points at a `climate_zone`:

```sql
-- regions.climate_zone_id → climate_zones.id
-- climate_zones stores: koppen, analog_location, analog_lat, analog_lon,
--                       desc, temperature pattern, precipitation pattern
```

## Then I downloaded a year and a half of history

For each of those analog locations I pulled **hourly** 1950 weather (ERA5 / Open-Meteo style) into the `climate_data` table: temperature at 2 m, relative humidity, precipitation, snowfall, cloud cover, wind speed and direction, surface pressure, soil moisture, evapotranspiration, shortwave radiation.

The result: **744,600 hourly climate rows**. An entire simulated year, breathing, for every climate zone on the map.

## The time-travel trick

Here's the part I'm quietly proud of. When you look at the weather in-game "right now," the system takes today's date, **keeps the month, day and hour, and swaps the year for 1950**:

```js
// today → the same moment in 1950
const now = new Date();
const month = String(now.getUTCMonth() + 1).padStart(2, '0');
const day   = String(now.getUTCDate()).padStart(2, '0');
const hour  = String(now.getUTCHours()).padStart(2, '0');
const timestamp1950 = `1950-${month}-${day} ${hour}:00:00`;
```

So if it's a drizzly October afternoon where you're sitting, it's a drizzly October 1950 afternoon in the Shire too. The same mapping happens on the client (`useGlobalClimateTime`) and the backend, so the calendar, the map and the story all agree on what the sky is doing. You can also wind the calendar forward or backward to visit other seasons.

There's even a `get_climate_at_point_with_transition()` PostGIS function so that borders between climate zones blend instead of snapping — no hard line where "temperate" instantly becomes "desert."

<!-- IMAGE: the in-game Middle-earth calendar widget showing live weather -->

---

## The full table: every region and its real-world climate twin

This is the heart of the system — the complete matchmaking list. (Middle-earth on the left, the real 1950 weather source on the right.)

| Middle-earth region | Köppen | Real-world analog | Coords (lat, lon) |
| --- | --- | --- | --- |
| Andrast | Cfb-coastal | Cape Finisterre, Galicia (Spain) | 42.88, -9.27 |
| Anfalas | Csa | Languedoc coast, Hérault (France) | 43.40, 3.70 |
| Angmar | Dfc | Jotunheimen valley (Norway) | 61.60, 9.00 |
| Anórien | Csa-Csb | Interior Umbria, Perugia (Italy) | 43.10, 12.39 |
| Apariach | Cfc | Donegal, NW (Ireland) | 54.65, -8.11 |
| Ardolyalinya | Cfb-Cfc | Kerry, SW (Ireland) | 51.97, -9.52 |
| Ardquetto | Cfb-Cfc | West Cork (Ireland) | 51.67, -9.46 |
| Ascahiriand | Cfc | Donegal, NW (Ireland) | 54.65, -8.11 |
| Bree | Cfb | Cotswolds, Gloucestershire (England) | 51.83, -1.82 |
| Celanoriand | Cfc | Bergen (Norway) | 60.39, 5.32 |
| Central Anduin | Dfb | Wachau, Lower Austria (Austria) | 48.37, 15.43 |
| Central Misty Mountains | ET-mountain | Gotthard Pass (Switzerland) | 46.55, 8.57 |
| Coldfells | Cfb-cold | Yorkshire Dales, N (England) | 54.22, -2.15 |
| Dagorlad | Dfb-dry | Cappadocia, Nevşehir (Turkey) | 38.65, 34.83 |
| Dale | Dfb | Nowy Targ, Lesser Poland (Poland) | 49.48, 20.03 |
| Dol Guldur | Dfb | Polesie, Belarus/Ukraine border | 52.10, 27.50 |
| Dor Rhúnen | Csa | Extremadura, Cáceres (Spain) | 39.47, -6.37 |
| Dor-en-Emyl | Csa | Alentejo (Portugal) | 38.57, -7.90 |
| Dorwinion | BSk-Dfb | Sea of Azov coast (Ukraine) | 46.85, 38.00 |
| Drúadan Forest | Csb | Maremma Toscana, Grosseto (Italy) | 42.75, 11.10 |
| Druwaith Laur | Cfb | Pembrokeshire, SW (Wales) | 51.68, -4.91 |
| Dunland | Cfb-Dfb | Powys, mid (Wales) | 52.33, -3.52 |
| En Egladil | Cfb | Białowieża Forest (Poland) | 52.70, 23.86 |
| En Udanoriath | Cfb-cold | Northumberland (England) | 55.25, -2.10 |
| Enedhwaith | Cfb | Ceredigion, mid (Wales) | 52.22, -3.94 |
| Eothraim | BSk | Poltava Oblast steppe (Ukraine) | 49.60, 34.55 |
| Ered Luin | Dfc | Voss (Norway) | 60.63, 6.42 |
| Ered Luin Vales | Cfb | Connemara Highlands (Ireland) | 53.47, -9.95 |
| Eregion | Cfb | Eifel, Rhineland (Germany) | 50.37, 6.65 |
| Esgaroth | Dfb | Lake Balaton north shore (Hungary) | 46.92, 17.90 |
| Ettenmoors | Cfb-cold | North Pennines (England) | 54.80, -2.30 |
| Evendim Hills | Cfb | Loch Lomond (Scotland) | 56.10, -4.60 |
| Fangorn | Cfb-Dfb | Bayerischer Wald, Bavaria (Germany) | 49.05, 13.35 |
| Forithilien | Csb | Val d'Orcia, Tuscany (Italy) | 43.05, 11.60 |
| Fornost | Cfb-cold | Northumberland (England) | 55.50, -2.00 |
| Forochel | Dfc-cold | Finnmark coast (Norway) | 70.66, 25.10 |
| Forovirian | Dfc | Gällivare, Lapland (Sweden) | 67.13, 20.66 |
| Gramuz | Dfb | Prešov (Slovakia) | 49.00, 21.24 |
| Hairavercien | Csa-Csb | Abruzzo (Italy) | 42.35, 13.50 |
| Harithilien | Csb | Gard, Provence (France) | 43.95, 4.40 |
| Harondor | BSh | Almería, Cabo de Gata (Spain) | 36.77, -2.19 |
| Iron Hills | Dfc | Chelyabinsk Oblast, Ural (Russia) | 54.70, 61.40 |
| Lairiardhon | Cfb | Clare, W (Ireland) | 52.85, -9.00 |
| Lamedon | Csa | Cilento, Campania (Italy) | 40.22, 15.30 |
| Lebennin | Csa | Emilia-Romagna Adriatic coast (Italy) | 44.35, 12.35 |
| Lildardhon | Cfb | Galway Bay coast (Ireland) | 53.27, -9.05 |
| Lone-lands | Cfb | North Yorkshire Moors (England) | 54.36, -0.80 |
| Lórien | Cfb | Białowieża Forest (Poland) | 52.70, 23.86 |
| Mänoriand | Cfc | Donegal, NW (Ireland) | 54.65, -8.11 |
| Minhiriath | Cfb | Morbihan, Brittany (France) | 47.65, -2.76 |
| Mintyrnath | Cfb | Poitou-Charentes (France) | 46.58, -0.34 |
| Mirkwood Wilds | Dfb | Bieszczady, Poland/Ukraine | 49.20, 22.50 |
| Mordor | BWh | Doğubayazıt, Eastern Anatolia (Turkey) | 39.55, 44.08 |
| Nan Anduin | Dfb | Morava valley (Czech Republic) | 49.20, 17.00 |
| North Misty Mountains | ET-mountain | Jotunheimen (Norway) | 61.60, 8.30 |
| Numeriador | Cfc | Letterkenny, Donegal (Ireland) | 54.95, -7.74 |
| Nurn | BSh-BSk | Lake Urmia basin, NW (Iran) | 37.50, 45.50 |
| Old Forest | Cfb | New Forest, Hampshire (England) | 50.87, -1.60 |
| Parth Celebrant | Dfb | Zlín region, Moravia (Czech Republic) | 49.22, 17.67 |
| Rammas Formen | Cfb | Galloway, SW (Scotland) | 54.90, -4.00 |
| Rast Vorn | Cfb-coastal | Cabo Fisterra, Galicia (Spain) | 42.88, -9.27 |
| Rivendell | Cfb-mountain | Engadine Valley (Switzerland) | 46.50, 9.83 |
| Rohan | Dfb | Hortobágy (Hungary) | 47.60, 21.00 |
| Ronalindon | Cfb | Connemara, Galway (Ireland) | 53.54, -9.80 |
| Ronen-in-Anduin | Dfb | Zlín region, Moravia (Czech Republic) | 49.22, 17.67 |
| Sandariand | Cfc | Erris, Mayo, W (Ireland) | 54.13, -9.90 |
| South Arthedain | Cfb | Cotswolds, Gloucestershire (England) | 51.83, -1.82 |
| South Downs | Cfb | South Downs, Hampshire (England) | 51.00, -1.00 |
| South Harlindon | Cfb-Cfc | West Cornwall (England) | 50.12, -5.54 |
| Talath Muil | Cfc | Cairngorms National Park (Scotland) | 57.16, -3.83 |
| Talath Uichel | ET-Dfc | Inari, Lapland (Finland) | 68.90, 27.01 |
| The Shire | Cfb | Cotswolds, Gloucestershire (England) | 51.83, -1.82 |
| Tol Fuin | Cfc | Lerwick, Shetland Islands (Scotland) | 60.15, -1.15 |
| Tolfalas | Csa | Gargano Peninsula, Puglia (Italy) | 41.85, 16.00 |
| Tower Hills | Cfb | Clare/Burren, W (Ireland) | 53.12, -9.06 |
| Trollshaws | Cfb-Dfb | NE Bohemia (Czech Republic) | 50.77, 15.05 |
| Vinyalas | Cfc | Inishowen, Donegal (Ireland) | 55.24, -7.10 |
| Weather Hills | Cfb | Peak District, Derbyshire (England) | 53.37, -1.80 |
| West Rhudaur | Cfb-Dfb | NE Bohemia (Czech Republic) | 50.77, 15.05 |
| Westmarch | Csa | Costa Brava, Girona (Spain) | 41.98, 3.21 |
| Wilderness of Arnor | Cfb-cold | Scottish Borders (Scotland) | 55.55, -2.80 |
| Wold | BSk | Dobruja, Romania/Bulgaria | 44.20, 28.60 |
| Woodland Realm | Dfb | Bieszczady Forest, Poland/Ukraine | 49.20, 22.50 |
| Woodmen | Dfb | Beskydy, Moravia (Czech Republic) | 49.55, 18.20 |

A few things jump out of that table:

- **Ireland and Britain do a lot of heavy lifting.** Most of Arnor, Lindon and the Shire lean on the mild, wet Atlantic fringe (`Cfb`/`Cfc`) — which is exactly the damp, green, "it might rain" mood the north of the map deserves.
- **The south warms up sensibly.** Gondor's coasts borrow Mediterranean `Csa`/`Csb` climates from Italy, Spain and southern France.
- **Evil is dry.** Mordor (`BWh`, hot desert), Nurn and the eastern steppes reach all the way to Turkey, Iran and the Ukrainian/Russian plains. The bad neighbourhoods are, geographically, the parched ones.
- **The far north is genuinely Arctic.** Forochel and Talath Uichel pull from Norwegian and Finnish Lapland (`Dfc`/`ET`), up past 68° latitude.

---

## What this buys the story

Because the weather is real and seasonal, everything downstream inherits that realism for free:

- A journey in **winter** through the northern moors is cold and miserable in a way the *data itself* enforces — I never had to hand-author "it is cold here."
- The **AI narrator** receives real temperature, precipitation and cloud for the exact day and place, so its descriptions of sky and mud are grounded, not generic.
- Travel cost can react to weather upstream of the route calculation.

---

## Lessons from stealing a year of weather

- **Real data has memory; invented data doesn't.** Coastlines stay mild, interiors swing hard, mountains bite — all for free, because 1950 already knew.
- **Matchmaking is the design work.** The code is easy; deciding that Rohan is Hungary and Mordor is eastern Anatolia is the part that gives the world its soul.
- **Blend your borders.** Transition zones between climates were the difference between "a map with regions" and "a world."

Next: with ground *and* sky in place, I had to let people actually travel across it — without accidentally routing them through Mordor. → *[Getting directions on Middle Earth (without passing through Mordor)](./03-getting-directions.md)*
