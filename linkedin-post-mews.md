# LinkedIn Post — Middle-Earth Wandering Simulator

## Versión en inglés (post principal)

I georeferenced a 1980s Middle-earth map onto Europe. Then things got out of hand.

Today I'm sharing the Middle-Earth Wandering Simulator.

It started with Pete Fenlon's MERP map (ICE, 1980s — one of the most beautiful cartographic works in RPG history). I georeferenced it onto Europe in QGIS, so every place inherits real WGS84 coordinates. Once the map was geographically anchored, everything became computable:

- Geography as data: biomes, rivers, roads and political regions as PostGIS layers, plus a DEM raster synthesized from the peaks marked on the map. You can query the elevation of any coordinate in Middle-earth.

- A climate system built from real 1950 European weather data — pre-industrial, no urban heat islands — with each region mapped to a real-world climate analog. Move the in-game calendar and the weather changes, and the traveller feels it: sustained rain and wind drain the character's energy.

- Routing with a custom Dijkstra over 4,119 hand-traced road segments. The cost of each edge is travel time: road type × biome × altitude × transport mode (on foot at 5 km/h, on horseback at 12 km/h). Off-road legs get penalized.

- A persistent character state: energy and shadow, fed by distance walked, combat, harsh weather and how well you slept. Shadow feeds back into what you encounter on the road. And yes — the character can die. The journey has real stakes.

- One AI-narrated chapter per day of travel — and this is the part I'm proudest of architecturally. The rules decide the facts, the prompt stages them, and the LLM only phrases them. Encounters arrive pre-resolved: the model writes the scene, it doesn't get to decide whether the warg wins. The GIS database is the author; the LLM is the ghostwriter.

Stack: Vue 3 + TypeScript (Feature-Sliced Design) · MapLibre GL · Node.js + Express · PostgreSQL + PostGIS · LLM provider cascade with automatic fallback · Docker on Railway.

It also turned out to be the best possible sandbox for the Master's in AI Automation & Agentic Engineering I'm doing right now: nothing teaches you where an LLM should and shouldn't be trusted like handing it a world it could break.

Live demo and five write-ups on each technical challenge (DEM, climate, routing, encounters, prompting) in the comments 👇

I'd love to hear your thoughts — especially from anyone working with PostGIS or LLM-in-the-loop systems.

#VueJS #TypeScript #PostGIS #GIS #LLM #AIEngineering #SoftwareDevelopment

---

## Versión en castellano

Georreferencié un mapa de la Tierra Media de los años 80 sobre Europa. Y la cosa se me fue de las manos.

Hoy quiero compartir el Middle-Earth Wandering Simulator.

Todo empezó con el mapa MERP de Pete Fenlon (ICE, años 80 — una de las obras cartográficas más lindas de la historia de los juegos de rol). Lo georreferencié sobre Europa en QGIS, así que cada lugar hereda coordenadas WGS84 reales. Una vez anclado geográficamente, todo se volvió computable:

- Geografía como datos: biomas, ríos, caminos y regiones políticas como capas de PostGIS, más un raster DEM sintetizado a partir de los picos marcados en el mapa. Podés consultar la elevación de cualquier coordenada de la Tierra Media.

- Un sistema climático construido con datos meteorológicos reales de la Europa de 1950 — preindustrial, sin islas de calor urbanas — donde cada región está mapeada a un análogo climático del mundo real. Movés el calendario del juego y el clima cambia, y el viajero lo siente: la lluvia y el viento sostenidos le drenan energía al personaje.

- Ruteo con un Dijkstra propio sobre 4.119 segmentos de caminos trazados a mano. El costo de cada arista es tiempo de viaje: tipo de camino × bioma × altitud × modo de transporte (a pie a 5 km/h, a caballo a 12 km/h). Los tramos fuera de camino se penalizan.

- Un estado de personaje persistente: energía y sombra, alimentados por la distancia caminada, el combate, el clima duro y qué tan bien dormiste. La sombra retroalimenta lo que te encontrás en el camino. Y sí: el personaje puede morir. El viaje tiene consecuencias reales.

- Un capítulo narrado por IA por cada día de viaje — y esta es la parte de la que más orgulloso estoy a nivel arquitectura. Las reglas deciden los hechos, el prompt los pone en escena, y el LLM solo los redacta. Los encuentros llegan ya resueltos: el modelo escribe la escena, pero no decide si el huargo gana. La base de datos GIS es el autor; el LLM es el escritor fantasma.

Stack: Vue 3 + TypeScript (Feature-Sliced Design) · MapLibre GL · Node.js + Express · PostgreSQL + PostGIS · cascada de proveedores LLM con fallback automático · Docker en Railway.

Además resultó ser el mejor sandbox posible para el Máster en AI Automation & Agentic Engineering que estoy cursando: nada te enseña mejor dónde se puede y dónde no se puede confiar en un LLM que darle un mundo que podría romper.

Demo en vivo y cinco artículos sobre cada desafío técnico (DEM, clima, ruteo, encuentros, prompting) en los comentarios 👇

Me encantaría escuchar opiniones — especialmente de gente que trabaje con PostGIS o sistemas con LLM-in-the-loop.

#VueJS #TypeScript #PostGIS #GIS #LLM #AIEngineering #SoftwareDevelopment

---

## Primer comentario (links)

🔗 Live demo & project overview: https://christiandelhey.com/projects/middle-earth-wandering-simulator/

The five technical write-ups:
1. Building a DEM from a hand-drawn map: https://christiandelhey.com/blog/mews-dem-system/
2. A climate system from 1950 weather data: https://christiandelhey.com/blog/mews-climate-system/
3. Routing with Dijkstra over hand-traced roads: https://christiandelhey.com/blog/mews-getting-directions/
4. Entities & the encounter engine: https://christiandelhey.com/blog/mews-entities-encounters/
5. Prompting Tolkien — the LLM as ghostwriter: https://christiandelhey.com/blog/mews-prompting-tolkien/

---

## Notas de publicación

- **Correcciones aplicadas vs. borrador original**: se quitó "weather" de la fórmula de costo de Dijkstra (el clima no afecta el routing, afecta la energía del personaje) y se reescribió "changes your travel time" en el bullet del clima.
- **Novedad agregada**: bullet de energía/sombra + muerte del personaje (lo más impactante de lo reciente). Inventario, diálogos NPC y fases lunares quedan para posts futuros.
- **Tono**: se quitaron los emojis de bullet y el hook "What if..." (patrones reconocibles de texto generado). Se mantuvo "the GIS database is the author; the LLM is the ghostwriter" y la mención al Máster.
- **Timing**: publicar el post principal y agregar el comentario con links inmediatamente después (LinkedIn penaliza links en el cuerpo del post). Mejor horario: martes a jueves, 9-11 am hora local.
- **Frecuencia**: un solo post está bien ahora. Si más adelante querés exprimir MEWS, cada blog post da para un mini-post individual espaciado cada 2-3 semanas.
