# Compendio de regiones y locations

Generado a partir de `database/seeds/data/geojson/regions.geojson`, `database/seeds/data/sql/locations.sql`, `database/seeds/data/csv/climate_zones.csv` y `database/seeds/data/csv/kingdoms.csv`.

La asignación de cada location a su región se resolvió por point-in-polygon (el mismo criterio que `database/migrations/add_region_id_to_locations.sql`).

## Índice

- [Anduin Vales](#anduin-vales)
  - Central Anduin
  - Nan Anduin
  - Ronen-in-Anduin
- [Angmar](#angmar)
  - Angmar
- [Arthedain](#arthedain)
  - Bree
  - En Udanoriath
  - Evendim Hills
  - Fornost
  - Rammas Formen
  - South Arthedain
  - Talath Muil
  - The Shire
  - Weather Hills
- [Belegaer Sea](#belegaer-sea)
  - Belegaer sea
- [Cardolan](#cardolan)
  - Eregion
  - Minhiriath
  - Mintyrnath
  - South Downs
- [Dagorlad](#dagorlad)
  - Dagorlad
- [Dale](#dale)
  - Dale
- [Dor Guldur](#dor-guldur)
  - Dor Guldur
- [Dorwinion](#dorwinion)
  - Dorwinion
- [Druadan Forest](#druadan-forest)
  - Druadan Forest
- [Dunland](#dunland)
  - Dunland
- [Enedhwaith](#enedhwaith)
  - Enedhwaith
- [Eothraim](#eothraim)
  - Eothraim
- [Esgaroth](#esgaroth)
  - Esgaroth
- [Fangorn](#fangorn)
  - Fangorn
- [Forlindon](#forlindon)
  - Apariach
  - Ascahiriand
  - Celanoriand
  - Ered Luin
  - Mänoriand
  - Numeriador
  - Sandariand
  - Tol Fuin
  - Vinyalas
- [Forochel](#forochel)
  - Forochel
- [Forovirian](#forovirian)
  - Forovirian
- [Gondor](#gondor)
  - Andrast
  - Anfalas
  - Anorien
  - Dor Rhunen
  - Dor-en-Emyl
  - Druwaith Laur
  - Forithilien
  - Hairavercien
  - Harithilien
  - Harondor
  - Lamedon
  - Lebennin
  - Tolfalas
  - Westmarch
- [Gramuz](#gramuz)
  - Gramuz
- [Harlindon](#harlindon)
  - Ardolyalinya
  - Ardquetto
  - Ered Luin
  - Ered Luin Vales
  - Lairiardhon
  - Lildardhon
  - Ronalindon
  - South Harlindon
  - Tower Hills
- [Iron Hills](#iron-hills)
  - Iron Hills
- [Lorien](#lorien)
  - Lorien
- [Mirkwood Wilds](#mirkwood-wilds)
  - Mirkwood Wilds
- [Misty Mountains](#misty-mountains)
  - Central Misty Mountains
  - North Misty Mountains
- [Mordor](#mordor)
  - Mordor
- [Moria](#moria)
  - Moria
- [Nurn](#nurn)
  - Nurn
- [Old Forest](#old-forest)
  - Old Forest
- [Rast Vorn](#rast-vorn)
  - Rast Vorn
- [Rhudaur](#rhudaur)
  - Coldfells
  - En Egladil
  - Ettenmoors
  - Lone-lands
  - Trollshaws
  - West Rhudaur
- [Rivendell](#rivendell)
  - Rivendell
- [Rohan](#rohan)
  - Rohan
  - Wold
- [Talath Uichel](#talath-uichel)
  - Talath Uichel
- [Wilderness of Arnor](#wilderness-of-arnor)
  - Parth Celebrant
  - Wilderness of Arnor
- [Woodland Realm](#woodland-realm)
  - Woodland Realm
- [Woodmen](#woodmen)
  - Woodmen

## Anduin Vales

### Central Anduin

**Tipo:** province · **Área:** ~64.032 km² · **Familia cultural:** northman

**Clima real análogo:** Wachau, Lower Austria (Köppen: `Dfb`)

The High Pass (Cirith Forn en Andrath, S. 'High-climbing Pass of the North') cuts through the central Misty Mountains connecting Rivendell and Eriador in the west to the upper Anduin Vales and Rhovanion in the east. It encompasses the Orcish stronghold of Goblin-gate, the eyrie of the Great Eagles, the Northman market-town of Maethelburg, the western foothills of Rhudaur, and the broad river plain of the Anduin. Geology consists of limestone and granite with massive igneous basalt intrusions. western foothills consist of red sandstone, while eastern valleys contain oily black shale; rich in copper, iron, silver, gold, and mithril.

**Descripciones ambientales (rotativas):**

- The middle vale of the Great River — broad grey water running south between wooded banks, misty at dawn and hiding the far shore under curtains of rain.
- Woods and willow-islands crowd the eastern shore; the west is open grassland rolling away under a wide sky. The river narrows and quickens where the channel steepens.
- The River is the road here — boats go south with the current until the rapids of Sarn Gebir bar the way, where white water breaks on tooth-like rocks and the portage is steep and stony.
- At dusk mist lies among the trees and along the pale margins of the water; stars come out over the stony hills, and the river carries small uncertain sounds through the dark.
- Between the banks the world narrows to water and wind — rain that curtains the view, fog that hides the shores, and after the storm a hard bright sky.
- Below the narrowing gorge the river opens again on still water and long fens; the reeds whisper in the grey light and small birds pipe among them.

**Locations (3):**

- **Melburg** _(city · pop. 1200 · Northmen)_ — Maethelburg (Fuerte del Encuentro) controlaba prácticamente todo el comercio del valle alto del Anduin y producía grandes cantidades de estaño de las minas bajas de las Hithaeglir. Los viajeros que iban al oeste se abastecían aquí antes de cruzar las Montañas Nubladas; los que llegaban del este descansaban en el pueblo. Construida sobre un montículo artificial detrás de una palizada de madera enorme, albergaba una cantidad inusualmente alta de espías por su cercanía a Angmar y a las fortalezas orcas de Gundabad.
- **Carrock** _(point of interest · Beornings)_ — La Carroca era un gran islote rocoso del Anduin, entre Iach Iaur y Maethelburg, tenido en profunda reverencia espiritual por los beórnidas que vivían cerca. El Anduin era poco profundo aquí, lo que permitía un vado junto a la Carroca, aunque la corriente rápida volvía el cruce verdaderamente peligroso.
- **Thingastathbaurg** _(town · pop. 150 · Woodmen)_ — Una aldea de los Hombres de los Bosques en los Valles del Alto Anduin; su nombre significa 'Fuerte del Lugar de Asamblea' en la lengua de Rhovanion. Sus casas largas de madera y su salón empalizado ocupan un claro del bosque; los Hombres de los Bosques de aquí son gente recia que vive de la caza, del monte y de la agricultura pequeña. Los grandes árboles del Bosque Negro quedan cerca; la aldea se basta a sí misma y está siempre atenta.

---

### Nan Anduin

**Tipo:** province · **Área:** ~60.115 km² · **Familia cultural:** northman

**Clima real análogo:** Morava valley, Czech Republic (Köppen: `Dfb`)

Nan Anduin is the long, wide, and highly fertile alluvial valley through which the Great River Anduin flows between the Misty Mountains and Mirkwood. It contains some of the richest soil in Middle-earth, supporting scattered communities of Beornings, Woodmen, and Northman pioneers.

**Descripciones ambientales (rotativas):**

- The northern Vales of Anduin — the green land between the Misty Mountains and Mirkwood's eaves, where the River runs broad and the Beornings keep their bee-pastures and their halls.
- Great oaks and elms clothe the vales, deep in mast and honey; the meadows are loud with bees, and the Carrock — the great stone — stands mid-river where the eagles come.
- The Gladden Fields spread quiet where the mountain-streams come down — a reedy fen that once saw a king lost and a doom begin.
- Between the mountains and the Wood the vale is a green corridor — the Old Ford crosses the River where the stepping-stones break the current into fast bright channels.
- The Beornings' country — wood-men and bee-keepers who hate goblins and guard the fords; their halls stand hidden in the oakwoods and their bread is famous.
- Black winters and green abundant summers; the river swells with the mountain rain, and the fords are crossing or drowning by the sky's decision.

**Locations (1):**

- **Rhosgobel** _(point of interest · pop. 1 · 100% Ista)_ — Construido por Radagast hacia la T.E. 1100.. Lugar de curación y de saber de las hierbas; refugio frente al Bosque Negro; puesto de observación sobre Dol Guldur.. Rhosgobel es un lugar sencillo formado con las ramas de un gran roble velludo.

---

### Ronen-in-Anduin

**Tipo:** province · **Área:** ~23.681 km² · **Familia cultural:** northman

**Clima real análogo:** Zlín region, Moravia, Czech Republic (Köppen: `Dfb`)

Ronen-in-Anduin is the eastern floodplains and low rolling hills bordering the Great River Anduin as it passes through the territory of Rhovanion. It represents a transition zone between the river valleys and the wide eastern steppes.

**Descripciones ambientales (rotativas):**

- The south vale of Anduin — the long lake of Nen Hithoel under bare peaks, the dark gorge of the Argonath above it, and the thunder of Rauros at its foot.
- The River opens from the narrows into still water ringed by wooded slopes; the green lawns of the old landing lie under the hills where the high seats of the watch once stood.
- Eastward the land rises into the Emyn Muil — a knife-edged country of cliffs and gullies where the rock is broken and the going is slow and cruel.
- Below the Falls the land falls away to fens and then the dead meres; the River's song here is all the sound there is, and it is loud.
- The mists of the falls hang golden in the afternoon; the water's fury shakes the quiet air, and the spray rises like smoke from the deep channel.
- A stern and splendid country — water, rock and height; the pillars of the kings stand in the narrows, and the River goes on south whether the land permits or not.

**Locations (2):**

- **Framsburg** _(city · pop. 340 · Northmen)_ — Wraecaburg, aunque no estaba directamente bajo el dominio del Rey Brujo, sufría ataques frecuentes y daba cobijo a mucha gente de mal vivir venida de fuera de Rhovanion. Sus hombres comerciaban de tanto en tanto con sus parientes de Maethelburg, pero las relaciones se fueron volviendo cada vez más desconfiadas.
- **Gundabad** _(dwarven mine · pop. 2400 · Orcs)_ — El Monte Gundabad era un sitio sagrado de los Enanos y un enclave importante del norte de las Montañas Nubladas. Fue tomado por los orcos varias veces y acabó convertido en la capital del reino orco septentrional, una amenaza constante para los Pueblos Libres del norte.

---

## Angmar

### Angmar

**Tipo:** province · **Área:** ~76.142 km² · **Familia cultural:** enemy

**Clima real análogo:** Jotunheimen valley, Norway (Köppen: `Dfc`)

Angmar is a cold, militarized realm north of Arnor, ruled by the Witch-king of the Nazgûl; it exists primarily as a war machine, built on harsh land, hardened frontier peasants, and armies of men, orcs, and monsters. Geology consists of deeply eroded limestone that robs the surface soil of water, with igneous and metamorphic outcrops near the mountains. carn dûm is built on a massive block of dull red granite.

**Descripciones ambientales (rotativas):**

- The Witch-king's war realm of grey walls, muddy camps and enforced misery. Carn Dûm sits on dark red granite among mountains that cage everyone within. Cold, Orcs and fear are the three pillars of Angmar.
- The Witch-king's domain: dark granite mountains, muddy camps and a cold that has moral weight. Carn Dûm sits on red rock above everything; the mountains form a wall that keeps both weather and people inside.
- Despite Angmar's grimness, the Dúnedain who fight here know every herb that grows in the frozen margins — aloe in sheltered courtyards, athelas where the rock-springs emerge. Survival knowledge dressed as botany.
- Carn Dûm on the heights; fortified villages below it; patrol roads connecting everything. The landscape has been organized for warfare and nothing else; every feature serves a military purpose or is ignored.
- Arctic cold from the Forodwaith to the north, channelled and concentrated by the mountain walls. Mean temperatures that kill the careless; blizzards that move in within hours. The cold is not a backdrop — it is a weapon.
- Orcs, fear and subjugated human peasants doing the farming that keeps the armies fed. The ordinary life of Angmar runs on the same machinery as any other kingdom; it is just organized around malice instead of anything else.

**Locations (11):**

- **Anghul** _(castle · pop. 80 · Sauron)_ — Anghul ('Viento de Hierro' en sindarin) es una de las seis grandes fortalezas de Angmar, situada en una colina sobre el Anghir, al pie del escarpe de Nan Angmar. Vigila con ceño el Valle del Anghir y controla la Tierra de Nadie. Una guarnición de trescientos hombres busca espías; su comandante es uno de los Ashâktur del Rey Brujo. Muros de piedra oscura; el viento que baja del escarpe es amargo y constante. El estandarte de la guarnición es el Cuervo Negro sobre Rojo.
- **Barad Eldanar** _(castle · pop. 400 · Sauron)_ — Un antiguo castillo arnoriano en el borde oriental del Dyr Úvadan, hogar ancestral de la Casa Eldanar — una de las familias de los Fieles de Elendil. Es una de las fortificaciones numenóreanas más antiguas del noroeste de la Tierra Media. Hacia la T.E. 1325 los angmarim la tomaron; el señor legítimo, Elenuil, escapó por un túnel secreto, y desde entonces la familia habita en Fornost. Hoy una guarnición angmarim bien armada ocupa los muros.
- **Morkai** _(castle · pop. 1000 · 100% Angmarean (Mixed Mannish))_ — Barad Morkai se alza sobre un risco de granito por encima del Camino de Angmar — una fortaleza de piedra negra construida por el Rey Brujo para vigilar todo movimiento que entre o salga de Nan Angmar. El camino pasa justo bajo sus muros; el viajero siente el peso de esa vigilancia al pasar. La ocupa de forma permanente una guarnición numerosa, y las llanuras anchas del sur sirven de campo de instrucción para los orcos.
- **Shedûn** _(castle · pop. 940 · 100% Angmarean (Mixed Mannish))_ — Shedûn es una fortaleza del Rey Brujo que domina las llanuras anchas al pie de Angmar, usada para la administración regional y como punto de reunión de las fuerzas orcas que se instruyen en la llanura de abajo. Sus muros de piedra son de factura angmarim — pesados y oscuros — y la vista desde las almenas abarca un campo de instrucción vasto donde las compañías orcas ejercitan con una eficiencia siniestra.
- **Gram** _(dwarven mine · pop. 1000 · Orcs)_ — Los siervos del Rey Brujo erigieron esta fortaleza de montaña en el ramal meridional de las Montañas Nubladas que forma el límite de Nan Angmar. Gram era la plaza fuerte orca más formidable al oeste de las montañas; ningún hombre había escapado nunca de sus profundidades para dar una relación coherente de su interior.
- **Carn Dûm** _(fortified town · pop. 5000 · 60% Angmarean, 40% Orcish)_ — Carn Dûm se asienta en el extremo noroccidental de las Montañas Nubladas, última gran fortaleza del Rey Brujo y capital de Angmar. Sus cavernas y túneles fueron cavados en origen por Enanos; el Rey Brujo los amplió y fortificó enormemente después de la T.E. 1300. Casi nada se sabe de su interior — pocos de los Pueblos Libres que se han acercado han vuelto. La montaña que se alza encima está siempre oscura de nubes de nieve, y el camino que lleva a la puerta está vigilado en cada curva.
- **Ahus** _(town)_ — Una aldea tosca de los Hombres Crueles de Angmar, cerca de la fortaleza de Angsûl. Sus chozas bajas de piedra y madera se asientan a la sombra de las colinas septentrionales del reino del Rey Brujo, y allí vive una tribu leal a él. El asentamiento huele a humo y a grasa animal; la vida aquí es dura y guerrera, y a los forasteros rara vez se los recibe bien.
- **Litash** _(town · pop. 3400 · 95% Angmarean (Mixed Mannish), 5% Orc)_ — Litash guarda los accesos orientales de Angmar desde su posición al pie de la montaña, con una guarnición numerosa de las tropas humanas mixtas del Rey Brujo. Centro de instrucción de los sacerdotes de la Religión Oscura y base de recaudación de tributos en el este de Angmar, es un pueblo sombrío de cuarteles y salas rituales. Los sacerdotes que caminan sus calles visten túnicas oscuras; los soldados rasos son bastos y desconfiados. A los viajeros que llegan desde el este se los detiene y se los interroga antes de dejarlos pasar.
- **Phaluran** _(town)_ — Un municipio del distrito de Tulban, en Angmar, construido a mediados de la Tercera Edad y hogar de unos 3.500 habitantes en su mejor momento. El asentamiento es un lugar tosco de frontera — casas de madera oscura a la sombra de las colinas de Angmar, con su gente atada a la voluntad del Rey Brujo. Con la caída de Angmar, el pueblo termina abandonado. Hacia el final de la Tercera Edad solo quedan ruinas: oscuras, batidas por el viento y evitadas por todos.
- **Kuska** _(village · pop. 390 · 100% Angmarean (Mixed Mannish: Dunnish, Brygath Easterling, Estaravë))_ — Kuska se asienta en el Paso de Angmar, tres millas al oeste de Barad Morkai, fundada por las fuerzas de Angmar para mantener abastecida la fortaleza. La aldea es un lugar sombrío: barracas y depósitos de madera rodeados por una palizada tosca, poblados casi por completo por la gente humana mezclada — dunlendinos, orientales brygath, estaravë — que sirve a los ejércitos del Rey Brujo. Los suministros suben sin parar por el camino hacia Morkai; el único propósito de Kuska es alimentar la máquina de guerra que tiene encima.
- **Cargash** _(watchtower · pop. 50 · 100% Angmarean (Mixed Mannish))_ — Construida por el Rey Brujo hacia la T.E. 1400.. Pensada para dar al Rey Brujo aviso de intrusos y una base desde la que golpear Arthedain.. De Mindil Cargash parten patrullas regulares para barrer En Udanoriath, que se extiende entre Angmar y Arthedain.

---

## Arthedain

### Bree

**Tipo:** province · **Área:** ~4.311 km² · **Familia cultural:** hobbit

**Clima real análogo:** Cotswolds, Gloucestershire, England (Köppen: `Cfb`)

Arthedain is the northern Dúnedain kingdom in Eriador, cradled between the Blue Mountains and the Misty Mountains and bounded by the rivers Lhûn and Baranduin, a cool, sparsely populated realm of rocky hills, downs, marshes, and the Shire, ruled from Fornost as the last Númenórean realm in the North in T.A. 1640.

**Descripciones ambientales (rotativas):**

- A village of Men and hobbits at the crossing of the East Road and the Greenway — a huddle of thatched roofs inside a hedge and dike on the green hill's flank.
- Bree Hill rises steep above the gate; beyond the hedged townlands the Chetwood covers the northern slopes and the wild country begins at once to the east.
- The Prancing Pony stands at the turning of the ways; behind its windows are firelight, smoke, many voices, and news of all the roads that still carry travellers.
- Eastward the Midgewater Marshes spread flat and reedy — pools, midges and hidden birds, and no road through them worth the name.
- Bree-land is an island of hearth and bed in a wilderness gone empty; the Greenway is grass-grown, the old kingdom is a story, and the inn is the last bright thing for fifty miles.
- Mild but exposed weather — the east wind is bitter in winter, and the rain curtains the hill for days at a time when the westerlies come in.

**Locations (3):**

- **Bree** _(town · pop. 410 · 45% Stoor Hobbit, 50% Bree-man, 5% Dúnadan)_ — Poblada por dunlendinos migrantes a comienzos de la Segunda Edad.. Punto de acopio de los productos de las granjas vecinas; centro de comercio por su ubicación en el cruce del Camino Verde y el Gran Camino del Este.. Bree es el pueblo más grande de las Tierras de Bree, una región de Arthedain apacible, agrícola y en buena medida autónoma. El pueblo está construido alrededor de una gran colina y lo protege un dique formidable coronado por un seto espeso. En las laderas de la Colina de Bree se encuentran numerosos smials, o agujeros-hobbit. En Bree viven tanto Hombres como hobbits, lo que la vuelve uno de los pocos lugares de la Tierra Media donde hay cooperación entre pueblos de razas distintas. Por su posición central, Bree ve pasar por sus calles mucha gente extraña, y el pueblo es un sitio perfecto para conseguir o vender información.
- **Archet** _(village · pop. 100 · 80% Bree-men (Northman/Dunnish Mix), 20% Stoor Hobbit (Kuduk))_ — Archet queda en el linde del Bosque de Chet, en las Tierras de Bree, fundada por colonos venidos de la comunidad principal de Bree en la T.E. 1420. Es una aldea puramente agrícola, dedicada a cultivar cereal y verduras para el mercado local. Casas de labranza bajas, de piedra y madera, dan al camino; el Bosque de Chet se alza oscuro y cercano al este. La gente de Archet suele desconfiar de los forasteros más que la de Bree misma, y la aldea tiene un carácter callado y cerrado sobre sí.
- **Combe** _(village · pop. 200 · 60% Bree-man, 40% Stoor Hobbit)_ — Poblada por granjeros de Bree en la T.E. 1415.. Centro económico para quienes no quieren hacer el viaje a Bree; agricultura.. Combe es la más aislada de las aldeas de las Tierras de Bree.

---

### En Udanoriath

**Tipo:** province · **Área:** ~8.938 km² · **Familia cultural:** dunadan_north

**Clima real análogo:** Northumberland, England (Köppen: `Cfb-cold`)

En Udanoriath, meaning the 'No-Man's-Land' or the 'Dwelling-less Waste', is a bleak, barren, and wind-scarred frontier zone located between the southern border of Angmar and the northern boundaries of Arthedain (near the North Downs). This cold highland waste is a desolate, rocky steppe plagued by bitter northern winds and constant military skirmishes. It serves as a buffer and raiding corridor where the Witch-king's patrols clash with Arnor's remnants, overseen by spy-towers like Mindil Cargash.

**Descripciones ambientales (rotativas):**

- Barren steppe buffer zone between Angmar and the North Downs of Arthedain, the Witch-king's raiding corridor. Rocky and wind-scoured, with spy-towers disguised as ruins; in winter the blizzard kills in the open within hours.
- Barren steppe buffer zone between Angmar and the North Downs, the Witch-king's raiding corridor. Rocky, wind-scoured, with spy-towers disguised as ruins; the blizzard can kill in the open within hours in winter.
- Minimal tundra vegetation — moss, stunted grass, the occasional hardy scrub in a wind-shadow. The land offers nothing except transit; it has been used for transit since Angmar found it useful as a corridor.
- Flat ground between two higher territories with no natural feature to encourage stopping. The ruined towers along the edge could be old Dúnedain watchtowers or Angmar's eyes dressed in old stone; in practice the distinction is academic.
- The worst of the cold channels through here between the northern wastes and Arthedain. Wind chill rather than ambient temperature is the danger; the wind off the Forodwaith comes through without obstacle.
- Nobody lives here by choice. Angmar's patrols move through; Ranger scouts move through. The steppe is defined entirely by what it connects.

**Locations:** —

---

### Evendim Hills

**Tipo:** province · **Área:** ~50.377 km² · **Familia cultural:** dunadan_north

**Clima real análogo:** Loch Lomond, Scotland (Köppen: `Cfb`)

The Evendim Hills (Sindarin Emyn Uial, 'Hills of Twilight') are the upland region around the valley of the Cornalas and the northern shore of Lake Evendim (Nenuial) in western Arthedain. For one season they are pale brown under constant cool mists cupped in the valley, for another they lie soft and white under snow, and in the Awakening and the Poem the valley becomes a shifting tapestry of lush greens. Though unproductive by southern standards—steep hillsides strain shepherds’ knees and narrow vales have thin soil—the hills have long been the heart of Arthedain, their rippling waters and mists inspiring poets and musicians.

**Descripciones ambientales (rotativas):**

- Hills encircling Lake Nenuial in western Arthedain, with the marble ruins of Annúminas on the southern shore. Silver mist on full-moon nights wrapping the ruins in ghostly light; great beauty and greater melancholy.
- Hills around Lake Nenuial, with the marble ruins of Annúminas on the southern shore. The lake is large enough to generate its own mist; on full-moon nights the ruins emerge from it and submerge again as the light shifts.
- Gorse and heather on the exposed upper slopes; the lakeside has been allowed to naturalise into meadow and alder-wood over the generations since Annúminas was abandoned. The ruins make sense as part of the landscape now.
- Lake Nenuial fills a glacial basin with no obvious outflow; the Nenuial has its own weather, its own mist, its own quality of reflection. The hills around it are incidental to the lake's dominant presence.
- Cool and damp, moderated by the lake. The hills get more snow than the lakeside; the lake rarely freezes completely. Annúminas stands in water-mist through most of the year.
- Almost no one lives here permanently except the rangers who visit the ruins and the lake-fishermen who work the Nenuial from small boats. The beauty is real and the melancholy is real and neither cancels the other.

**Locations (33):**

- **Bareketta** _(castle · pop. 320 · 100% Dúnadan)_ — Bareketta es una hacienda hermosa en la orilla oriental del Nenuial, asiento principal de la familia Eketta — uno de los dos clanes nobles más poderosos de Arthedain. Fue construida pensando tanto en la belleza como en la defensa: torres gráciles de piedra miran sobre el lago, y los jardines entre los muros se atienden con cuidado. La hacienda es cómoda y tiene mucho servicio; a quien se le permite entrar encuentra una casa que se toma la hospitalidad en serio.
- **cavern** _(cavern)_ — 
- **Bodroth** _(city)_ — Bodroth era una ciudad de Eketyar, en Arthedain, situada en las orillas septentrionales del Lago Evendim, unas cuarenta millas al norte de Annúminas. Tenía una población de unos 4.900 habitantes en la T.E. 250, pero decayó a lo largo de la Tercera Edad y acabó abandonada, aunque sobrevivió a la caída del último Rey por varias generaciones.
- **Adrahil's Shield** _(inn)_ — 
- **Azaghâl's Anvil** _(inn)_ — 
- **Blymiras Inn** _(inn)_ — 
- **Brelmodoc's Rest** _(inn)_ — 
- **Groddig Inn** _(inn)_ — 
- **Ralt's Corner** _(inn)_ — 
- **Ron Hyarr** _(manor)_ — 
- **Rond Morvin** _(manor)_ — Una casa señorial arthedana apartada, en un valle fluvial al oeste de los Páramos del Norte, cerca de la Cuaderna del Norte de la Comarca. Rond Morvin controla el vado donde el Men Lindon cruza el arroyo Barluin; funciona como punto de reunión para las ferias locales y las levas de la milicia. La casa es un edificio sólido de piedra con establos y graneros, y su gente está acostumbrada a alojar viajeros y partidas de leva.
- **Rond Orro** _(manor)_ — Una casa señorial de la región, cuyo carácter y cuya gente dependen del señor local.
- **manor** _(manor)_ — 
- **manor** _(manor)_ — 
- **manor** _(manor)_ — 
- **manor** _(manor)_ — 
- **manor** _(manor)_ — 
- **Ambon Noirinyaron** _(ruins)_ — Ambon Noirinyaron — antaño una gran mansión élfica — no es hoy mucho más que cimientos invadidos por la maleza y unas pocas columnas en pie. La piedra labrada indica un oficio de los Altos Elfos; las lianas y el musgo cubren lo que queda. El lugar tiene un aire de quietud melancólica.
- **Annúminas** _(ruins · N/A)_ — Fundada en el 3396 por el Rey Supremo Elendil.. Sede real de Arnor; lugar de un palantír; capital de Arthedain después de la T.E. 861.. Annúminas fue el hogar de los Reyes de Arthedain hasta que la ciudad fue saqueada en el 1409, cuando las hordas del Rey Brujo invadieron todas las antiguas tierras de Arnor. Annúminas tuvo en su momento el lugar de la más hermosa de las ciudades dúnedain del Norte, con avenidas anchas y arboladas y edificios gráciles de mármol blanco. Ninguna muralla rodeaba la ciudad, tenida por un lugar de paz y estudio. Los saqueadores han dejado casi limpias las ruinas, pero abundan los relatos sobre bóvedas selladas bajo la biblioteca y el palacio.
- **Barad Garan** _(ruins)_ — Barad Garan no es más que una ruina — torres derribadas, murallas abiertas — el cascarón de la fortaleza que fue. No queda guarnición; el viento pasa por los portales abiertos y los pájaros anidan en la piedra agrietada.
- **Bauruin** _(ruins)_ — Gobel Paurruin ('Aldea del Puño de Fuego') fue en su momento un municipio próspero sobre el Uialduin, unas setenta millas al noroeste de Annúminas. En su mejor momento, a comienzos de la Tercera Edad, tenía unos 3.600 habitantes. Hacia la T.E. 1400 estaba abandonado. Lo que el viajero encuentra hoy es un fantasma de cimientos cubiertos de musgo y muros partidos recuperados por la maleza y los sauces — los lugareños lo tienen por lugar encantado y no se quedan después del anochecer.
- **Cerin Balgrist** _(ruins)_ — Cerin Balgrist fue en su momento una ciudad de importancia, pero lleva generaciones en ruinas. El viajero no encuentra más que piedra gastada, portales derrumbados y plazas vacías donde es de suponer que alguna vez hubo mercado.
- **Faranel** _(ruins)_ — Faranel es una ciudad en ruinas de las tierras del norte, con sus barrios antaño habitados hoy expuestos al viento y a la lluvia. La extensión de las ruinas sugiere una población considerable en su mejor momento; hacia mediados de la Tercera Edad no queda en pie un solo edificio habitado.
- **Firaen** _(ruins)_ — Firaen es el fantasma de un asentamiento — muros que se desmoronan, techos hundidos y silencio. La comunidad que vivió aquí fue expulsada o se extinguió hace mucho, y desde entonces la naturaleza viene recuperando lentamente la piedra.
- **Maegoth** _(ruins)_ — Maegoth fue una ciudad, pero el viajero no encuentra más que escombros. Muros que se desmoronan, torres partidas y cimientos invadidos por la maleza se extienden un buen tramo por la ladera — recuerdo de un tiempo en que esta región estaba más poblada y era más próspera.
- **Minas Ongoth** _(ruins)_ — Minas Ongoth está en ruinas sobre su cerro, con las torres partidas y las puertas podridas hace mucho. El sitio domina una buena vista de la comarca circundante, que es probablemente la razón por la que se construyó aquí; ahora solo lo ocupa el viento.
- **Rildolach** _(ruins)_ — Rildolach yace en ruinas entre las colinas, con sus calles viejas cubiertas de maleza. Los viajeros que se acercan lo bastante para verla con claridad describen un asentamiento de piedra de la época arnoriana, derrumbado y invadido por la vegetación, sin habitantes ni señal de ocupación reciente.
- **Thoronbar** _(ruins)_ — Thoronbar fue una aldea que no sobrevivió a los trastornos de mediados de la Tercera Edad. Sus ruinas son modestas: un puñado de cimientos de piedra y un pozo partido, medio enterrados en el pasto al borde de una senda vieja.
- **tower** _(tower)_ — 
- **tower** _(tower)_ — 
- **tower** _(tower)_ — 
- **Caras Celairnen** _(town · pop. 400 · 85% Dúnadan, 15% Riverman)_ — Poblada por primera vez alrededor de la T.E. 740.. Pueblo de mercado regional en el suroeste de Arthedain.. Caras Celairnen es el centro de cultura puramente dúnadan más occidental del Norte.
- **Mindo-o-Galad** _(watchtower)_ — 

---

### Fornost

**Tipo:** province · **Área:** ~54.792 km² · **Familia cultural:** dunadan_north

**Clima real análogo:** Northumberland, England (Köppen: `Cfb-cold`)

Fornost Erain, the 'Norbury of the Kings', was once the grand, fortified northern capital of the kingdom of Arthedain, located at the northern end of the North Downs. Now a silent, massive ruin known as Deadmen's Dike, it is haunted by ghosts, wraiths, and the memories of the fallen Dúnedain. The ruins are characterized by crumbling stone ramparts, collapsed halls, and overgrown ditches.

**Descripciones ambientales (rotativas):**

- Fortified capital of Arthedain on the North Downs, still the heart of the last Dúnedain kingdom of the north. Grey walls, maintained ramparts, the Royal Court and the Seers; but more empty houses with each generation and Angmar darkening the north.
- Arthedain's grey-walled capital on the North Downs, still functioning but emptying slowly. Maintained ramparts, a working court and the northern palantír in the tower; more empty houses each generation as the population contract continues.
- The town is built into the Down itself; the walls and the natural rock-face are difficult to separate at a distance. What was once a city now fits within a smaller perimeter that the garrison can actually defend.
- The North Downs here are chalk and flint, with the escarpment dropping north toward the empty ground. Fornost sits at the highest defensible point; below it, the ground is farmed by whoever is left.
- Cold winters and grey springs that define northern Arthedain. The Down keeps the worst wind off the town; the town generates its own heat from density that it is slowly losing.
- Dúnedain who have decided to stay. Not from optimism — they know the numbers — but from the particular stubbornness of people who will not be the ones to lower the last flag.

**Locations (13):**

- **camp** _(camp)_ — 
- **Carondor** _(castle)_ — 
- **Minas Foros** _(castle)_ — 
- **Fornost Erain** _(fortified city · pop. 3100 · 95% Dúnadan, 5% Mixed Mannish)_ — Fornost Erain — la 'Fortaleza de los Reyes' — corona una loma empinada en las laderas meridionales de las Quebradas del Norte, capital de Arthedain. Es tanto fortaleza como ciudad: anillos concéntricos de murallas de piedra encierran el palacio real, la gran biblioteca y los barrios de mercaderes de los dúnedain. Las calles son ordenadas y están bien empedradas; los hombres que las caminan son altos y de rostro grave, con el porte de un pueblo que se sabe heredero de Númenor. Más allá de las murallas, las Quebradas del Norte se extienden en todas direcciones.
- **Aikanáro's Bow** _(inn)_ — 
- **The Alcarin Star** _(inn)_ — 
- **Éadburg's Stable** _(inn)_ — 
- **manor** _(manor)_ — 
- **manor** _(manor)_ — 
- **Barad Formen** _(tower)_ — Una torre del norte de la Comarca o de la región de Arthedain, cuyo carácter lo define su función de almenara o de puesto de guarnición. Es una estructura de piedra sin adornos en terreno elevado.
- **Maenthirost** _(town)_ — Un pueblo de la Comarca o del norte de Eriador, cuyo carácter refleja las comunidades agrícolas modestas de la región.
- **town** _(town)_ — 
- **Rood** _(village · pop. 280 · 70% Dúnadan, 30% Mixed Mannish)_ — Creció alrededor del tránsito fluvial del Baranduin a comienzos de la Tercera Edad.. Punto de acopio de las granjas de la zona; estación de embarque de carga en el Baranduin.. Con el saqueo de Annúminas, Rood empezó a decaer y se volvió una guarida de ladrones y bandidos.

---

### Rammas Formen

**Tipo:** province · **Área:** ~26.112 km² · **Familia cultural:** dunadan_north

**Clima real análogo:** Galloway, SW Scotland (Köppen: `Cfb`)

The Rammas Forod (Sindarin 'Great Wall of the North'; Adûnaic Ramênytunêny, actually 'South-wall') is a low chain of hills dividing the down-lands of northern Arthedain from the watershed of the Wash Tundra. To the west it widens into the Talath Muil, while to the east its hills thin out and merge into the Everlasting Plain. Born as debris from the collapse of the Iron Mountains in the War of Wrath, the ridge has shed rock and soil into the valleys on either side, allowing modest forests to grow along its flanks. Clear air and narrow defiles offer room for small farms and gardens, and for a time the Rammas served as a religious retreat for the Faithful of Arnor.

**Descripciones ambientales (rotativas):**

- Natural limestone escarpment crossing northern Arthedain, the kingdom's first geological line of defence. Blackthorn and hawthorn on its slopes, few watched passes and the sensation of crossing a threshold into colder country.
- Limestone escarpment crossing northern Arthedain, the kingdom's first geological boundary. Blackthorn and hawthorn on the slopes, with few passes watched and the threshold feeling of crossing from one kind of country into a colder one.
- The escarpment supports a sudden burst of spring vegetation on its south face — blackthorn, hawthorn, wildflowers in the limestone crevices. The north face is bare and the wind off it is a different quality of cold.
- A natural wall of pale limestone with a sharp break in topography. South of it, the cultivated land of Arthedain; north of it, the increasingly empty and cold ground toward the northern frontiers.
- The south face catches sun and shelter; the north face catches everything that comes down from Forochel. The difference in microclimate between the two sides of the escarpment is visible in what grows.
- Watched passes rather than continuous wall; a patrol-point rather than a fortification. The Dúnedain who monitor the crossings know which passes are used and by whom, and that knowledge is the defence.

**Locations (7):**

- **camp** _(camp)_ — 
- **camp** _(camp)_ — 
- **camp** _(camp)_ — 
- **camp** _(camp)_ — 
- **Bar en Dagorath** _(fortress · pop. 80)_ — 
- **manor** _(manor)_ — 
- **ruins** _(ruins)_ — 

---

### South Arthedain

**Tipo:** province · **Área:** ~87.035 km² · **Familia cultural:** dunadan_north

**Clima real análogo:** Cotswolds, Gloucestershire, England (Köppen: `Cfb`)

Arthedain is the northern Dúnedain kingdom in Eriador, cradled between the Blue Mountains and the Misty Mountains and bounded by the rivers Lhûn and Baranduin, a cool, sparsely populated realm of rocky hills, downs, marshes, and the Shire, ruled from Fornost as the last Númenórean realm in the North in T.A. 1640.

**Descripciones ambientales (rotativas):**

- The most gentle and inhabited part of Arthedain, with rolling hills, green hedgerows and the Shire of the Hobbits to the south. The Brandywine to the east and the Great East Road connect this fertile land to the wider world.
- Rolling hills and green hedgerows, the most ordered and comfortable part of what remains of Arthedain. The Shire begins at the Brandywine and the Hobbits have kept their portion tidy in ways the wider world has not.
- The vegetation here is the domesticated version of what Eriador once was: hedgerow elms, pasture grasses, kitchen gardens. The wildness has been gardened out of the south, which is either comforting or melancholy depending on who you are.
- The Brandywine forms the Shire's eastern edge and the Great East Road divides the land cleanly — north toward Bree, south toward nothing much. The crossroads make this the most travelled part of the north.
- Milder than northern Arthedain, wet enough for good grass and cold enough to keep the summers honest. Snow rarely lasts more than a week on the low ground.
- Hobbits in the Shire and Dúnedain passing through; both groups have learned to be invisible in their own ways, for entirely different reasons.

**Locations (16):**

- **Fanduin** _(city · pop. 500)_ — Fanduin tuvo una población bastante grande, de 4.100 habitantes en la T.E. 250, pero sus números decayeron durante la parte media de la Tercera Edad y el asentamiento acabó abandonado antes del fin de la Edad.
- **Tarmabar** _(keep · pop. 82 · 100% Dúnadan)_ — Construido por la familia Tarma en la T.E. 2.. Base de poder rural y residencia de verano de los Señores de Tarma.. Los Tarma solo son superados en poder por el Rey mismo, y tienen un historial de insubordinación contra el trono.
- **Parth Ainatir** _(point of interest)_ — Parth Aertirith (S. 'Prado de la Guardia Sagrada') era un claro élfico de acampada en el límite de Sîrgala y Harlindon. Los Elfos abandonaron el lugar después de una gran desgracia: Elcaldil de Girithlin, joven y ebrio heredero de los Girithlin, acosó a una muchacha élfica y fue derribado por Glorfindel el de los Cabellos de Oro, tras lo cual la Casa Girithlin tuvo a su familia y a su destino por maldito.
- **Bar Irlossiel** _(ruins)_ — Castillo en ruinas. Barad Perinluoss, conocido comúnmente como el Castillo Silencioso, fue un antiguo refugio élfico en el sur de Sîrgala — una comunidad independiente de Elfos Silvanos y de refugiados religiosos arthedanos que juraron lealtad a una medio elfa llamada Iralussiel la Tranquila. Iralussiel murió de manera misteriosa alrededor de los siglos XI o XII de la T.E., y desde entonces el refugio quedó envuelto en una paz inquietante.
- **Endrist** _(ruins)_ — Antaño un municipio populoso de 4.600 habitantes en el oeste de Siragale, conocido en su mejor momento como Enedhriss. A comienzos de la Tercera Edad ya estaba en decadencia; hacia la T.E. 1400 había sido abandonado por completo. El viajero encuentra hoy solo el trazado fantasmal de los cimientos viejos bajo la maleza de las laderas bajas de las Pinnath Luin — ni fuego, ni voz, solo el viento entre la piedra partida.
- **Enerond** _(ruins · pop. 5)_ — Ciudad en ruinas. Enerond era un municipio de Brethyar, en Arthedain, sobre la orilla oriental del río Lhûn. Tenía unos 5.100 habitantes en la T.E. 250, que fueron decayendo a lo largo de la Tercera Edad hasta su abandono antes del fin de la Edad.
- **Silent Castle** _(ruins)_ — Bar Airlossiel ('Hogar de la Doncella Solitaria de la Nieve'), conocido también como el Castillo Silencioso, es una antigua torre élfica en un rincón olvidado del sur de Sîrgala. Su comunidad original de Elfos Silvanos y refugiados arthedanos juró lealtad a una maga medio elfa, Airlossiel la Callada, que se convirtió en una de los Sin Casa tras una herida de morgul en la T.E. 1409. Su espíritu sigue atado a los cimientos de la torre; desde entonces el refugio quedó envuelto en una paz casi inquietante, y pocos visitantes se van con un relato completo de lo que vivieron. Los Montaraces mandan aquí de tanto en tanto a hombres con heridas incurables; algunos vuelven años después, curados pero confundidos.
- **Aran Nov** _(town)_ — 
- **Cor Wilishar** _(town)_ — Un asentamiento nandorin construido sobre un risco alto por encima del Baranduin y el Nenglos. La aldea fue abandonada en los años que siguieron a la Gran Plaga y al derrumbe de Cardolan (hacia la T.E. 1700). A mediados de la Tercera Edad, los viajeros que se acercan al risco solo encuentran los apoyos de piedra de las plataformas viejas y los restos herrumbrados de las escalas de cuerda; los nandor que vivieron aquí ya no están.
- **Dol Occum** _(town)_ — Una torre de colina sobre el Men Formen, en el sur de Arthedain, dentro de la aldea de Occum. La torre es un puesto de vigilancia dúnadan que domina el camino; la aldea de alrededor, de casas de madera y piedra, provee de suministros a la guarnición. El nombre viene de un nombre más antiguo en oestron que significa 'valle de los bueyes', y el ganado sigue siendo la riqueza principal de la zona.
- **Greenfields** _(town)_ — Centro de mercado del norte de la Comarca, Greenfields sirve además de punto de encuentro para los comerciantes de las Colinas del Crepúsculo y de más allá de las fronteras. Cuando hay, se venden aquí truchas del Lago Evendim y lucios del curso alto del Brandivino; los buenos géneros de lana tejidos con la oveja de los Páramos del Norte son una especialidad, y se hacen en tallas para la Gente Grande además de para hobbits. El Oficial Jefe del pueblo es más duro que la mayoría, porque tiene que tratar con Montaraces, Hombres del Río y tramperos de las colinas que bajan del norte. Un bosquecillo al este del pueblo guarda un monumento a la victoria de Bandobras Tuk sobre los trasgos del Monte Gram.
- **Greenholm** _(town · pop. 310 · Humans, Hobbits, Silvan Elves)_ — Un puesto tranquilo de mediados de la Tercera Edad, hogar de unas pocas familias arthedanas que convivían con los Elfos de las cercanías, encargados de observar las idas y venidas de los mortales por cuenta de los señores de los Puertos Grises. Uno de esos Elfos, el sinda Calenlinn, era un herbolario experto y aficionado a los granos fermentados.
- **Iach Sarn** _(town · pop. 220)_ — Iach Sarn se apiñaba al pie de una colina de caliza, rodeada de granjas pequeñas y de bosquecillos de madera dura. En la orilla sur, justo río abajo del camino principal, quedaban las ruinas de una aldea más antigua, de construcción de tierra y piedra. Unos escalones gastados bajaban por un terraplén de escombros hasta los muelles de la ribera, donde se alineaban balsas y botes de pesca sin pintar.
- **Long Cleeve** _(town)_ — La comunidad de la Comarca con mejor acceso a las Colinas de Evendim y al Norte Extremo. Long Cleeve es un pueblo de mercado animado que comercia en pieles, marfil, asta y cuero de ciervo traídos por Montaraces, gente de las colinas y tramperos de más allá de las fronteras. Aquí tienen su cuartel los oficiales de la Guardia del Norte, que llevan arcos y lanzas en lugar de los bastones de siempre. Un bosquecillo cercano guarda un monumento a Bandobras Tuk, héroe de la Batalla de los Campos Verdes y también el vecino más famoso que tuvo el pueblo.
- **Tying Field** _(town)_ — Una aldea hobbit de la Cuaderna del Oeste, llamada en origen Tying Field — hogar de las familias Gamwich, Gammidge y Roper. Aquí está el cordelería de los Gamwidge, y el comercio de cuerda de cáñamo del pueblo es bien conocido. Un vado sobre el arroyo Flexen da acceso al lugar, aunque los bosques vecinos de Mistvale tienen una fama inquietante. En el vado no hay posada.
- **Gamwich** _(village · pop. 120 · 50% Harfoot, 30% Stoor, 20% Fallohide)_ — Poblada durante la migración de los hobbits a la Comarca, T.E. 1601-1610.. Comunidad agrícola.. Gamwich es la traducción al oestron del nombre kuduk Galabas.

---

### Talath Muil

**Tipo:** province · **Área:** ~34.926 km² · **Familia cultural:** dunadan_north

**Clima real análogo:** Cairngorms National Park, Scotland (Köppen: `Cfc`)

Talath Muil ('Drear Plain') is the rugged highland plain forming the northwestern marches of Arthedain, dividing northern Arthedain from the Wash Tundra and the Vale of the Lhûn. It is a windswept, largely treeless upland of low grass and open grassland, dotted with large wildflower meadows and small copses of ash and birch. To the east it abuts the rocky western edges of the northern Hills of Evendim, whose rough ground is difficult to traverse even on foot, and whose rocky hills gradually mellow into grass-covered downs and finally spill northeast into the dry plateau of the Rammas Forod.

**Descripciones ambientales (rotativas):**

- High windswept plateau on the northwest marches of Arthedain, with short grass, wildflower meadows and ash groves bent eastward by the constant west wind. Wide and silent; the Ered Luin visible on clear days to the south.
- High windswept plateau on the northwest marches of Arthedain, with the west wind bending every ash and birch permanently eastward. Wide and silent, with the Ered Luin a line on the southern horizon.
- Low grasses and wildflowers in brief spring bloom; gorse and heather through the rest of the year. Small copses of wind-bent ash in the depressions where the soil is deep enough to support them.
- Flat and open in a way that few places in Arthedain are. The view in all directions is clear; the exposure to the west wind is total. A landscape that keeps no secrets about itself.
- The wind arrives from the Atlantic with nothing to slow it between the coast and the plateau. Cold and persistent; the warmth of summer barely dents it. The wildflowers of spring are the plateau's only real concession to gentleness.
- Shepherds and the occasional Dúnedain patrol. Nobody lives here in winter if they can avoid it; the summer grazing is good enough to bring people back. The plateau has the patient character of land that has been used but never loved.

**Locations (3):**

- **Himihiril** _(castle · pop. 50 · Gondor)_ — 
- **Larad** _(ruins)_ — Larad es una ruina al borde de un río — los restos de una ciudad antes habitada, ahora silenciosa y vacía. Sus muros de piedra han caído en parte; las calles están cubiertas de maleza y las únicas visitas son algún pastor que se guarece de la lluvia.
- **Faemar** _(town · pop. 850)_ — Faemar fue una aldea situada a mitad de camino a lo largo del largo y angosto Taur Galen, junto a un vado que cruzaba el río. El valle empinado río abajo hacía imposible la agricultura; los aldeanos vivían de la caza silvestre, de bayas, hierbas, nueces y de la madera para carbón.

---

### The Shire

**Tipo:** province · **Área:** ~26.091 km² · **Familia cultural:** hobbit

**Clima real análogo:** Cotswolds, Gloucestershire, England (Köppen: `Cfb`)

The Shire was a country in northwestern Middle-earth, inhabited by the Hobbits. It was located in the region of Eriador, and was under the control of the Reunited Kingdom as a Free Land.
By the late Third Age it was one of the few heavily-populated areas left in Eriador. Its name in Westron was Sûza, "Shire," or Sûzat, "The Shire." Contrary to popular misconception, the Shire was not the birthplace of Frodo Baggins, as he was born in Buckland, which at the time was not formally part of the Shire despite being colonized by Shire hobbits.

**Descripciones ambientales (rotativas):**

- The Shire — the green and ordered country of the hobbits: hedgerow-lined lanes, smial-doors in the hillsides, orchards, and the slow Water under the mill.
- Four Farthings of the best farmland in the north — river-meadows, grain-fields, pipe-weed beds, and the high sheep-country of the Northfarthing moors.
- The East Road runs through to the Brandywine Bridge; Buckland across the river is a strip of hedged land held against the Old Forest's black wall.
- Mild weather and reliable rain; frost is rare and deep snow rarer. The hedgerows hold the wind, and the seasons come soft-footed and on time.
- A land that minds its own business; the ways are safe, the doors are round, and the world outside is a rumour that comes late and is not much believed.
- In autumn the trees are laden and the bees are busy; in spring the lanes are white with blossom. The year's wheel turns here as it should.

**Locations (28):**

- **Bag end** _(point of interest)_ — Construido por Bungo Bolsón dentro de la Colina, sobre el Bolsón de Tirada de Hobbiton, como regalo de casamiento para su mujer, Belladonna Tuk, hacia la T.E. 2890. Es el agujero-hobbit más lujoso de la Cuaderna del Oeste, y se entra por una puerta verde perfectamente redonda con un pomo de bronce brillante. Dentro, todas las habitaciones están en un mismo nivel: dormitorios, cocinas, despensas, estudios, guardarropas y comedores dispuestos a lo largo de un pasillo-túnel confortable. Las mejores habitaciones dan al jardín y al prado, al oeste. Hogar de Bilbo Bolsón y más tarde de su heredero, Frodo Bolsón.
- **Bankling** _(town)_ — Conocido en la zona como 'Bankling' y más tarde como Cauce Blanco, este pueblo hobbit de buen tamaño se asienta de lleno sobre el Gran Camino del Este, en medio de las mejores tierras de labranza de la Cuaderna del Este. Los carros pesados cruzan el Scary Pike por el Vado de Budge, al norte, mientras que un buen puente de madera lleva el tránsito liviano hasta Waterbury, al otro lado del río. El pueblo es conocido por sus campos de cereal y de lino y por la taberna de la Hiedra Ruborosa, lugar de reunión de la Sociedad de la Ceja, la Pluma y el Pergamino — un club hobbit de gente leída con gusto por el saber de los Elfos, lo que les da fama de raros entre sus vecinos.
- **Brocken Borings** _(town)_ — Una aldea hobbit del lado occidental de las Colinas de Scary, centrada en las minas de cobre y estaño, algunas de las cuales se remontan a los mineros enanos de la Segunda Edad. Los hobbits de aquí — sobre todo el clan Bolger — usan los pozos viejos como smials, sin hacer caso de las historias antiguas de los Hombres del Río sobre galerías encantadas. Ha habido ruidos inexplicables, presencias sentidas y caras vislumbradas en los pasadizos oscuros; en un galpón pequeño del parque se exhiben como curiosidades unas 'pepitas de neblin' — nódulos de cobre con la forma aproximada de Enanos durmiendo. Una comunidad hobbit remota y cerrada sobre sí misma.
- **Bywater** _(town)_ — Poblada como aldea de cruce de caminos por Hombres de Arthedain a comienzos de la Tercera Edad; repoblada más tarde durante las migraciones hobbit a la Comarca, T.E. 1601-1610. Es una aldea agrícola y de mercado en el cruce del Gran Camino del Este, frecuentada por comerciantes y viajeros que van y vienen entre Hobbiton y la Cuaderna del Este. Delagua queda justo al norte del Gran Camino del Este, a orillas de un estanque pequeño, y es conocida por la posada del Dragón Verde.
- **Dwaling Bank** _(town)_ — En origen 'Dwola's Bank', una aldea de ribera con acceso al Brandivino por un arroyo que atraviesa un pantano — una entrada relativamente desguarnecida desde Arthedain. En tiempos anteriores, los Hombres del Río de aquí hacían carbón y no llamaban la atención, sabiendo que había una comunidad élfica unas millas al noroeste. Después de la caída de Arthedain, un acuerdo discreto dejó la orilla occidental del Brandivino a los de la Comarca, y la aldea se convirtió en un asentamiento hobbit apacible llamado Dwaling — parada para gente tranquila del norte y base del tránsito fluvial hacia Rood.
- **Flynettle** _(town)_ — Flynettle, a mediados de la Tercera Edad, es un embarcadero tosco y un campamento de pesca sobre el Anduin — nada más que una plataforma de atraque y un puñado de galpones que usan las tripulaciones de los botes fluviales. La antigua Deep Hallow House es una ruina que se desmorona en la orilla, y los lugareños la evitan.
- **Grimsly Dale** _(town)_ — Una aldea agrícola de Pelosos situada en un codo del río Fairwater, un lugar tranquilo y famoso por sus flores. Aunque pocos lo recordaban, hubo alguna vez en la zona un sendero de paisaje que era un desvío popular del Circuito del Bosque. La razón de esa popularidad se veía en la concentración densa de arbustos de bayas y de plantas en flor a lo largo de los caminos de la ribera. El nombre de la aldea, en cambio, viene de los huesos de hombres y de caballos que también aparecían junto al sendero: una partida grande de dúnedain fue emboscada aquí durante el Azote de la T.E. 1409.
- **Hobbiton** _(town · pop. 504 · Hobbits)_ — Hobbiton era una aldea hobbit destacada de la Cuaderna del Oeste de la Comarca, al norte del Gran Camino del Este. Allí estaba Bolsón Cerrado, en la Colina — la residencia de Bilbo Bolsón y más tarde de Frodo Bolsón.
- **Longbottom** _(town)_ — Una aldea hobbit de la Cuaderna del Sur, históricamente importante por ser el primer lugar de la Comarca donde se cultivó la hierba de pipa. Alrededor del C.C. 1070 (T.E. 2670), Tobold Corneta de Valle Largo trajo la planta desde Bree y empezó a cultivarla en sus jardines, dando origen a la famosa variedad 'Hoja de Valle Largo'. La aldea queda en un valle suave de la Cuaderna del Sur y sus campos están dedicados en buena parte al cultivo de la hierba de pipa, la industria principal de la región.
- **Michel Delving** _(town · pop. 650 · 45% Harfoot, 30% Stoor, 25% Fallohide)_ — Cavada Grande es el pueblo más grande y la capital administrativa de la Comarca, extendida sobre las laderas suaves de las Quebradas Blancas, en la Cuaderna del Oeste. La Casa del Alcalde y la Casa de los Mathoms — depósito de curiosidades hobbit — son sus dos edificios más notables. Casi todas las casas son de piedra encalada, con puertas y ventanas redondas; huertas y canteros de flores bordean cada callejón. El día de mercado es el punto alto de la semana y atrae a los hobbits de las aldeas vecinas a vender sus productos y ponerse al día con las noticias.
- **Nobottle** _(town)_ — Nobottle era una aldea maderera pequeña, apenas apartada del camino del Fairwater entre Cavada Pequeña y Delagua. Su Gremio de Taladores era conocido en toda la Cuaderna del Oeste.
- **Overhill** _(town)_ — Una aldea hobbit nueva al norte de Screaming Hill, poblada por el clan Albo de los Barleycorn y los Pelosos Beechkin, que llegaron a la Comarca después de ser perseguidos por bandidos. Los dos clanes comparten una desconfianza hacia la Gente Grande que a veces se vuelve hostil; otros hobbits están incómodos con las desapariciones de Hombres que se aventuran en el ángulo entre el arroyo Baining y Screaming Hill. En tiempos posteriores, más apacibles, Overhill se vuelve una comunidad agrícola acomodada; los Bolsón son dueños de buena parte de la tierra de alrededor.
- **Pincup** _(town)_ — Una aldea hobbit tranquila y arbolada de la Cuaderna del Sur. La familia Pendle, que la fundó, desapareció hace mucho; los Goodbody son hoy sus vecinos más prominentes, aunque los Tuk son los principales propietarios de la tierra. La aldea tiene fama de ser un lugar apartado y boscoso como pocos, y de tanto en tanto aparecen artefactos élficos sîrrandrai en las colecciones de mathoms del lugar.
- **Rendwalk and The Briary** _(town)_ — Waymoot (en origen Wood Junction) es una aldea de la Comarca en la Cuaderna del Oeste, sobre el Gran Camino del Este, quince millas al oeste de Delagua, donde el camino principal que viene del Vado de Sarn se une al Gran Camino del Este. Es una parada natural para los viajeros: una posada modesta y algunas casas se agrupan en el cruce. El nombre pasó del arnoriano 'Wood Junction' al hobbit 'Waymoot' a lo largo de los siglos.
- **Rushy** _(town)_ — Una aldea de ribera en la Marjala, donde Hombres del Río y hobbits Fuertes conviven con cierta incomodidad. Euric Thuigildsun, el anciano patriarca de pelo blanco de los clanes de Hombres del Río del lugar, mira a los nuevos inmigrantes Fuertes con aceptación cautelosa, esperando alguna ventaja comercial. Su rival Thuidimer, de la vecina Flynettle, le gana la mano con regularidad. Los rumores sobre criaturas reptilianas extrañas vistas en las sendas del pantano entre Rushy y Flynettle agregan una nota inquietante a una aldea ya tensa.
- **Tookbank** _(town)_ — Un pueblo de mercado hobbit en la Tierra de los Tuk, asociado a la familia Tuk. Su mercado trae granjeros y artesanos de toda la zona en los días de feria.
- **Tuckborough** _(town · pop. 320)_ — Tuckborough era el asiento ancestral de la familia Tuk, en el País de las Colinas Verdes, en la Cuaderna del Oeste. La zona de alrededor incluía el centro de mercado de Whitwell, la aldea de artesanos de la madera de Tuckburrow, y Dolwich, que abastecía de madera y granito a las Cuadernas del sur.
- **Waterbury** _(town)_ — Una aldea hobbit en la orilla norte del Fairwater, frente a Bankling, que da acceso al Gran Camino del Este a los mineros de las Colinas de Scary. Ha crecido más que su asentamiento gemelo a medida que aumentó la migración hobbit. Más tarde se convierte en la aldea de Budgeford.
- **Whitwell** _(town)_ — Una aldea hobbit pequeña cerca de Tuckborough, en la Comarca, conocida por sus buenos pozos y sus callejones tranquilos. Los Tuk la tomaron a su cargo alrededor de la T.E. 1620, y tuvo una notoriedad breve cuando sus habitantes empezaron a cobrar peaje en el camino y retuvieron a un Mensajero del Rey — una multa dura zanjó el asunto. Paladin Tuk tiene tierras de labranza aquí. La aldea es pequeña y amable, aunque se dice que a los Tuk de Whitwell no siempre los reciben bien en ciertos vados desde el incidente del peaje.
- **Willowbottom** _(town)_ — Una aldea de la Cuaderna del Este de la Comarca, cerca del Baranduin y de las Marismas de Overbourne. Un vado secreto que usan las Compañías Errantes de los Elfos queda por aquí cerca. La aldea se asienta sobre el arroyo Elfwood, cerca de donde el Thistle Brook desemboca en el Shirebourn — un paisaje pantanoso, orillado de sauces, de cabañas hobbit bajas y huertas.
- **Wood Junction** _(town)_ — Una aldea de la Comarca en la Cuaderna del Oeste, quince millas al oeste de Delagua sobre el Gran Camino del Este, donde el camino del Vado de Sarn se junta con el camino principal. Llamada en origen Wood Junction en tiempos arnorianos, los hobbits lo acortaron más tarde a Waymoot. Es una parada natural: una posada cómoda y unas pocas casas se agrupan en el cruce, con el movimiento del tránsito entre Delagua y Bree.
- **Woodhall** _(town)_ — Una aldea hobbit de la Cuaderna del Este, en el linde norte del Boscaje, fundada en la T.E. 1612 por Pelosos de los clanes Staghorn y Huckle sobre el sitio de una vieja aldea eriadorana. El asentamiento anterior fue destruido en la T.E. 1409, cuando los orcos jinetes de lobos degollaron a sus habitantes. La aldea hobbit nueva se asienta donde esos mismos manzanares siguen dando fruto y los hongos crecen en terrazas sombreadas. Cerca hay un claro de las Compañías Errantes de los Elfos; a veces se ve pasar Elfos al anochecer.
- **Frogmorton** _(village · pop. 230 · 60% Harfoot, 30% Fallohide, 10% Stoor)_ — Frogmorton es una aldea hobbit acomodada sobre el Gran Camino del Este, en la Cuaderna del Este; su posición central en el camino la vuelve una parada natural para quien atraviesa la Comarca. Los granjeros de los alrededores traen aquí sus productos al mercado en días fijos, y una posada decente atiende el tránsito del camino. La tierra que la rodea está bien trabajada y es apacible, como corresponde al carácter próspero de la Cuaderna del Este.
- **Little Delving** _(village · pop. 120 · 50% Harfoot, 25% Stoor, 25% Fallohide)_ — Poblada durante la migración de los hobbits a la Comarca, T.E. 1601-1610.. Comunidad agrícola.. Situada en las Quebradas Blancas, Cavada Pequeña tiene una proporción mayor de smials.
- **Oatbarton** _(village · pop. 200 · 50% Harfoot, 40% Stoor, 10% Fallohide)_ — Poblada en la T.E. 1625 por una familia de Bree.. Agricultura.. Los hobbits rurales de Oatbarton tienen bastante contacto con los Hombres.
- **Sackville** _(village · pop. 110 · 50% Stoor, 45% Harfoot, 5% Fallohide)_ — Poblada durante la migración a la Comarca, 1601-1610.. Agricultura.. La cercanía de los rudos Hombres de las Colinas Rojas de Eriador le da a los habitantes de Sackville fama de gente tosca.
- **Scary** _(village · pop. 130 · 40% Harfoot, 35% Stoor, 25% Fallohide)_ — Scary es una aldea hobbit de minería y cantería en la agreste Cuaderna del Este, que provee casi todo el mineral de estaño y de cobre que se usa en la Comarca. Sus casas de piedra son más recias que el promedio de los asentamientos hobbit — los mineros prefieren la construcción sólida — y las colinas de alrededor están picadas de pozos de mina y frentes de cantera. La aldea tiene un carácter algo más duro que el resto de la Comarca: menos flores y más botas de barro.
- **Stock** _(village · pop. 210 · 55% Stoor, 20% Fallohide, 25% Harfoot)_ — Stock se asienta en el valle fértil del Baranduin, y sus campos bien trabajados producen algunos de los mejores hongos de la Comarca — un hecho del que los lugareños están calladamente orgullosos. Es una aldea acomodada, de mayoría Fuerte, de edificios bajos de piedra y turba cerca del río, poblada en los primeros días de la Comarca. Los viajeros que van camino a la balsa de Gamoburgo pasan por aquí, y el olor a tierra fresca y a bancales de hongos es agradable con el tiempo húmedo.

---

### Weather Hills

**Tipo:** province · **Área:** ~11.813 km² · **Familia cultural:** dunadan_north

**Clima real análogo:** Peak District, Derbyshire, England (Köppen: `Cfb`)

Arthedain is the northern Dúnedain kingdom in Eriador, cradled between the Blue Mountains and the Misty Mountains and bounded by the rivers Lhûn and Baranduin, a cool, sparsely populated realm of rocky hills, downs, marshes, and the Shire, ruled from Fornost as the last Númenórean realm in the North in T.A. 1640.

**Descripciones ambientales (rotativas):**

- The Weather Hills — a long line of bare ridges south of the East Road, where the watch-towers of fallen Arthedain stand ringed and ruined on the heights.
- Weathertop is the crown of the line — bare and windy, with the whole world spread below; the old fortress of Amon Sûl held the chief of the northern seeing-stones.
- Scrub and stunted trees between barren reaches; the paths are faint and the thickets are tangled, and kingsfoil grows where a wise eye knows to look.
- Rain sweeps the hills in fine soaking veils off the west; the ridges run with water and the stone is black and streaming, and after rain the air is washed and the sky is pale.
- A cold, watching country — the ruins see a long way and the land sees back; travellers keep to the Road and the hollows, and do not camp on the heights.
- East and south the marsh-pools and the thickets run on toward the wild; the hills are the last wall of the settled world before the Road goes into the Lone-lands.

**Locations (1):**

- **Amon Sûl** _(ruins · N/A)_ — Construida en su origen por Elendil en la Segunda Edad.. Depósito de un palantír; más tarde sirvió como mojón en el punto de encuentro de los tres Reinos del Norte.. Desde este punto se tiene una vista excelente del Gran Camino del Este mientras se dirige hacia Rhudaur. Por eso la colina fue foco estratégico del oeste de Arthedain y de Cardolan, y tiene una larga historia de conflictos a su alrededor. La torre de Amon Sûl albergó un palantír, que fue llevado a Fornost después de la invasión de Angmar en la T.E. 1409.

---

## Belegaer Sea

### Belegaer sea

**Tipo:** province · **Área:** ~2.062.053 km² · **Familia cultural:** wild

**Clima real análogo:** — (Köppen: `—`)

The Belegaer, or Great Sea, is the vast ocean separating Middle-earth (Endor) from the Undying Lands of Aman in the far West. In the coastal domains of Lindon, Arnor, and Gondor, it comprises key areas such as the Gulf of Lhûn (Nen Lhûn) and the Bay of Belfalas (Nen Belfalas). The deep gulf of Nen Lhûn, formed in the cataclysms of the First Age, serves as the calm and misty harbor for the Elven ships sailing from Mithlond, rich in salmon, lobsters, and shellfish. Further south, the vast Bay of Belfalas rests on Endor's continental shelf, driven by the warm, counterclockwise Southron Stream which collides with the cold Great Stream off the Cape of Andrast, creating turbulent, dangerous waters home to sharks, grey sperm whales, and giant squids.

**Descripciones ambientales (rotativas):**

- The Great Sea — grey and boundless water west of all lands, where the waves sigh and murmur against the shores of Middle-earth without ceasing.
- Out of the Havens the white ships take the Straight Road west; for all else the sea is a wall of distance and a road without end.
- Grey water, salt wind, and the wheeling of sea-birds. The light here is the light of the West — pale, clean, and very old.
- Storm-wracked in winter, broad and glimmering in summer. The sea keeps its own season and its own law, and the shore is only where it begins.
- Sea-birds beat upstream against the breeze where the great rivers come down; the sound of the surf is the oldest sound in the world.
- Westward the water runs to the world's rim. Men may sail it and return; the Elves sail it and do not.

**Locations (2):**

- **Tol Ramdal** _(watchtower)_ — Una isla pequeña al este del Golfo de Lhûn, en el sur de Forlindon, que sirve de puerto principal para los Altos Elfos que emprenden viajes por mar a las tierras del sur. El muelle pequeño de piedra y la torre de almenara de la isla los mantiene un puñado de Elfos; el aire trae aquí la sal del mar abierto y la música tenue de quienes están por partir hacia el oeste.
- **Vorondrast** _(watchtower)_ — Una torre de vigilancia de Forlindon, mantenida como parte del sistema de puestos que guardan las costas y los pasos de este reino élfico del noroeste. Es de piedra y está expuesta a los elementos; una guarnición pequeña hace la guardia.

---

## Cardolan

### Eregion

**Tipo:** province · **Área:** ~63.158 km² · **Familia cultural:** dunadan_north

**Clima real análogo:** Eifel, Rhineland, Germany (Köppen: `Cfb`)

Eregion is a Noldorin-founded realm on the western side of the Misty Mountains, centered on the great city of Ost-in-Edhil and famed for its jewel-smiths, close friendship with Khazad-dûm, and the forging of the Rings of Power.

**Descripciones ambientales (rotativas):**

- Hollin — the empty land of the holly-trees west of Moria, where the Noldor once had their fairest realm in exile and only the hollies and the stones remember it.
- Low ridges of broken stone crowned with dark holly; the three peaks of Moria close the eastern sky, and the old Elven road still runs beneath the heather toward the shut doors.
- The streams are dry or diminished — the Sirannon's course is a thread of red-stained stones, and where its water was dammed long ago the land was changed and never healed.
- A clean cold country under a wide sky; the wind comes off the mountains keen and clear, and the silence has an edge of watchfulness.
- Nothing remains of Ost-in-Edhil but shapeless mounds and the buried lines of old walls; travellers camp here now where the jewel-smiths once worked.
- At dawn in winter the hollies are crowned with light and red berries, and the snowy peaks stand ahead like the doors of the world — it is the most beautiful hour in a sad land.

**Locations (3):**

- **Minas Melosse** _(point of interest)_ — 
- **Ost-in-edhil** _(ruins · N/A)_ — Ost-in-Edhil fue la gran ciudad élfica de Eregion, fundada en la Segunda Edad por Galadriel y Celeborn y más tarde hogar de Celebrimbor el herrero, que forjó aquí los Grandes Anillos. Sus ruinas todavía muestran la piedra elegante de los artesanos Gwaith-i-Mírdain; arcos partidos y dinteles tallados medio enterrados en la hiedra sugieren un asentamiento de una sofisticación poco común. Hoy no habita esos salones caídos más que el viento y la memoria de lo que se perdió cuando Sauron llevó la ciudad a la ruina.
- **Pillars of Stone** _(ruins)_ — 

---

### Minhiriath

**Tipo:** province · **Área:** ~84.033 km² · **Familia cultural:** dunadan_north

**Clima real análogo:** Morbihan, Brittany, France (Köppen: `Cfb`)

Cardolan, the Land of Red Hills, is the southern successor-kingdom of Arnor between the Baranduin and the Gwathló–Mitheithel, a windswept land of treeless plains, red downs, marshy river basins and the barrow‑haunted hills whose shattered Dúnedain realm never fully recovered from war, civil strife and plague.

**Descripciones ambientales (rotativas):**

- Deforested plain between the Baranduin and the Gwathló, once dense woodland felled by the Númenóreans for their shipyards. Depopulated since the Great Plague, with abandoned villages in the scrub and Dúnedain barrows across the open land.
- The plain between the two great rivers, once dense woodland that the Númenóreans felled for their shipyards. Abandoned since the Great Plague, with scrub growing back through the ruins of villages and the mounds of Dúnedain graves.
- Birch and bracken on the old field-systems, bramble over the village foundations. The land is slowly making its own decisions about what comes next, with no one watching closely enough to object.
- Flat, broad and waterlogged in the wet seasons, when the Gwathló and Baranduin both push their floodplains outward. In summer it dries to a country of pale grass and old earthworks.
- Atlantic weather from the west meets nothing to stop it on this plain. Rain arrives in long grey curtains; the winters are damp rather than severe, which doesn't mean they're easy.
- Wandering Gwathuirim tribes and the occasional Dúnedain Ranger who comes through quickly and tells no one why. No permanent settlements; the last ones died with the Great Plague.

**Locations (23):**

- **Minas Girithlin** _(castle · pop. 60 · 70% Cardolani, 20% Eriadoran, 10% Dunnish)_ — Minas Girithlin es un castillo recio asentado en las colinas, hogar ancestral de los Príncipes de Dol Girithlin, construido hacia la T.E. 590 para dominar la comarca circundante. Sus muros han resistido varios sitios sin ser abiertos; la guarnición es leal y experimentada. El salón del Príncipe, dentro, es cómodo aunque no lujoso — la casa de un noble en servicio, con establos y una armería bien provista.
- **Sunthra Unsar** _(city · pop. 6000 · Dunlendings)_ — Levantada en su origen con el nombre de Mistalonde, la ciudad aparece en los registros desde mediados de la Segunda Edad hasta la T.E. 1503, cuando Gordaig de Saerlann la tomó y la rebautizó Sunthra Unsar. La ciudad reconstruida se convirtió en el asiento del poder del clan saerlannés (Dynion), y sus habitantes eran casi por completo hombres de las colinas.
- **Balost** _(fortress · pop. 132 · 60% Dunman/Eriadoran, 35% Cardolani, 5% Dúnadan)_ — Terminado en la T.E. 923 por Hir Girithlin.. Base para la administración de las haciendas rurales; punto fuerte estratégico en el valle del Gwathló, entre Tharbad y Saralainn.. Balost es un castillo recio que resistió muchos ataques desde fuera.
- **Amrelor** _(ruins)_ — Amrelor es una ruina. Cualquiera haya sido el propósito de este asentamiento, quedó abandonado hace mucho, y los muros de piedra labrada llevan generaciones cayéndose. Los lugareños evitan el sitio porque lo tienen por lugar de mala suerte.
- **Cathiel** _(ruins)_ — Ciudad en ruinas. Cathiel era un asentamiento de Ethir Gwathló, en Cardolan, unas setenta y cinco millas tierra adentro desde las bocas del Gwathló. Tenía una población de unos 4.000 habitantes en la T.E. 250, que fue decayendo a lo largo de la Tercera Edad hasta quedar abandonada hacia la T.E. 1640.
- **Fangoth** _(ruins)_ — Fangoth es hoy una ruina, con las murallas derribadas y las calles vacías. Fue en su momento una ciudad de cierta importancia; quedó abandonada después de los problemas que asolaron esta región a mediados de la Tercera Edad. Solo se distinguen todavía arcos partidos y el trazado de las calles viejas bajo la maleza.
- **Forondir** _(ruins)_ — Forondir es una ruina desde hace tanto que los lugareños ya no conocen su nombre original. De lo que debió de ser una ciudad de cierta importancia solo quedan muros partidos y plazas cubiertas de maleza.
- **Guinnion** _(ruins)_ — La aldea de Guinnion está abandonada desde hace mucho — un puñado de piedras de cimiento cubiertas de musgo y callejones ahogados por la maleza donde vivió una comunidad pequeña. El sitio queda tranquilo, apartado del camino, y pasa desapercibido para todos salvo para los viajeros más curiosos.
- **Lond Daer** _(ruins · N/A)_ — Establecido como colonia de Númenor por Aldarion en el siglo noveno de la Segunda Edad.. Un puerto numenóreano en las costas de Endor.. Lond Daer fue arrasado por una ola cataclísmica en la S.E. 3319.
- **Nadior** _(ruins)_ — Ciudad en ruinas. Nadior era un asentamiento de Ethir Gwathló, en Cardolan, en una bahía pequeña de la costa de Minhiriath, unas setenta millas al oeste de las bocas del Gwathló. Tenía una población de unos 4.900 habitantes en la T.E. 250, que fue decayendo a mediados de la Tercera Edad hasta quedar abandonada hacia la T.E. 1640.
- **Carathel** _(town)_ — 
- **Chalnen** _(town)_ — Una aldea que era el puesto más septentrional de Saerlann a lo largo del Minsiril. En tiempos revueltos es un lugar tosco, conocido entre los mercenarios como 'el pueblo del vicio': refugio de gente de campamento, espías, desertores y oportunistas. Cyllin, el jefe del lugar, hace negocios con quien pague. Chozas de piedra y callejones de barro; unas pocas cervecerías que no cierran nunca.
- **Cithiel** _(town)_ — Fue en su momento un municipio grande, de 4.400 habitantes, sobre el Baranduin, en Minhiriath. Hacia la T.E. 1400 el pueblo viejo estaba abandonado. Desde entonces el sitio ha sido repoblado a menor escala por tribus eriadoranas, que lo llaman Cuncan — un grupo tosco de construcciones de madera y barro entre los cimientos del asentamiento anterior, mucho más grande.
- **Dol Ninden** _(town)_ — Dol Nendin ('Colina del Agua Silenciosa') es un asentamiento de Minhiriath que ha cambiado de manos en los conflictos de la región entre los Señores Aliados y los cardolandrim. El pueblo se asienta en una colina prominente sobre un afluente tranquilo, y sus muros de piedra llevan las marcas de asaltos pasados. En tiempos de paz es un centro de mercado modesto para las tierras de labranza de alrededor.
- **Gwahilmoth** _(town)_ — Un municipio de Dol Caladir, en Minhiriath, unas sesenta millas al oeste de Tharbad, en las tierras bajas centrales del Baranduin. En su mejor momento (T.E. 250) tuvo unas 5.000 almas. Sin embargo, hacia mediados de la Tercera Edad su población había mermado mucho, tras la Gran Plaga y la inestabilidad de la región, y para la T.E. 1640 el asentamiento está abandonado en buena parte. El viajero encuentra un paisaje melancólico de cimientos de piedra vacíos y callejones cubiertos de maleza, donde el pasto empuja entre los adoquines viejos.
- **Ilfin** _(town)_ — Antaño un municipio de 3.100 habitantes en la costa de Cardolan, Dol Ilfin quedó abandonado hacia la T.E. 1640, tras la Gran Plaga y el derrumbe de la región. El viajero que llega aquí a mediados de la Tercera Edad no encuentra más que ruinas curtidas por el clima en la ladera costera — ventanas vacías en muros que se desmoronan, y gaviotas anidando donde antes vivía gente.
- **Linnuis** _(town)_ — 
- **Talsir** _(town · pop. 250)_ — Talsir fue una de las ciudades libres de Cardolan, en la orilla occidental del Gwathló, unas 170 millas río abajo de Tharbad. Con una población de unos 4.300 habitantes en la T.E. 250, era una parada fluvial importante y uno de los pocos asentamientos del antiguo Minhiriath que sobrevivió hasta la última parte de la Tercera Edad.
- **Telwaen** _(town)_ — Fue en su momento un municipio grande, de 5.000 habitantes, en las tierras altas de los Girithlin, en Minhiriath, llamado Thuilwaen ('Yelmos manchados'). Hacia la T.E. 1400 su población se había derrumbado y el pueblo quedó abandonado. Lo que queda hoy es una ruina entre la maleza de las tierras altas, con los muros de piedra caídos y los callejones cubiertos de vegetación. Los lugareños no se demoran ahí.
- **town** _(town)_ — 
- **Cairg Dinas** _(village)_ — 
- **Helegnel** _(village)_ — Antaño una ciudad libre de Cardolan, Gobel Helegnel fue un asentamiento de unas 4.100 personas a comienzos de la Tercera Edad, en las tierras centrales de Dol Tinereb, unas 110 millas al oeste de Tharbad. Hacia la T.E. 1400 su población había mermado y el pueblo quedó abandonado. Lo que el viajero encuentra a mediados de la Tercera Edad es un paisaje de muros de piedra que se desmoronan y hogares vacíos, desapareciendo poco a poco bajo el bosque que vuelve a crecer.
- **Malehaut** _(village · pop. 45)_ — Un pueblo costero eriadorano de Fonntir, en Minhiriath, conocido como Atem ('braza') o Carmalehaute ('el pueblo de Malehaut') en dunlendino. Hacia la T.E. 2740 tenía unos 2.700 habitantes — un puerto de trabajo, con pescadores, comerciantes y gente que vive según los ritmos del mar.

---

### Mintyrnath

**Tipo:** province · **Área:** ~61.436 km² · **Familia cultural:** dunadan_north

**Clima real análogo:** Poitou-Charentes, France (Köppen: `Cfb`)

Cardolan, the Land of Red Hills, is the southern successor-kingdom of Arnor between the Baranduin and the Gwathló–Mitheithel, a windswept land of treeless plains, red downs, marshy river basins and the barrow‑haunted hills whose shattered Dúnedain realm never fully recovered from war, civil strife and plague.

**Descripciones ambientales (rotativas):**

- Marshy coastal strip where the Baranduin and Gwathló meet Belegaer in a labyrinth of marshes and shifting sandbars. Migratory birds in their thousands in autumn, tidal fords only the Gwathuirim know and land that changes with every tide.
- Coastal marshland where the Baranduin and Gwathló combine their flood-plains before meeting the sea. Shifting sandbars, tidal fords only the Gwathuirim can read, and the smell of estuary mud at every tide.
- Migratory birds in their thousands in autumn — godwits and knots and grey plovers in flocks that darken the sky above the sandbars. The estuaries are rich; the birds find them before the Gwathuirim have finished counting the numbers.
- The land here is genuinely uncertain about what it is. Tidal flats at high water; mud-and-reed banks at low water; the channels shift with the spring floods and the autumn storms. Nothing stays where it was.
- Mild maritime climate controlled entirely by the sea. The wind off Belegaer is constant; the rain follows the tide more than the season. Frost is rare; genuinely warm days are rarer.
- Gwathuirim who know which channels can be forded at which tides, which fords shift, which ones are permanent. That knowledge is their only navigational advantage in a landscape that resists outsiders.

**Locations (7):**

- **Argond** _(castle · pop. 60 · 50% Dunman/Eriadoran, 40% Cardolani, 10% Dúnadan)_ — Terminado por el Príncipe de Dol Calantir en la T.E. 887.. Plaza fuerte y centro administrativo de un señorío rural.. Aunque parece formidable, el Argond no fue concebido pensando en la defensa. Su discutible disposición defensiva todavía no ha pasado la prueba de un sitio en regla.
- **Tharbad** _(fortified town · pop. 21345 · 60% Cardolani, 20% Dunnish, 10% Northman, 5% Eriadoran, 5% Other Mannish)_ — Un puerto fluvial numenóreano que data de mediados de la Segunda Edad.. Un gran centro urbano; el centro administrativo efectivo de Cardolan; un puesto de la autoridad gondoriana.. Desde la caída del rey Ostoher en la T.E. 1410, el antiguo puerto numenóreano de Tharbad ha decaído de la gloria que tuvo en otras edades.
- **Filimer** _(ruins)_ — Filimer yace en ruina silenciosa, con los muros desmoronados apenas distinguibles del paisaje que los rodea. La gente del lugar dice que fue un asentamiento de cierto tamaño, pero no se conserva registro de quién lo construyó ni de cuándo cayó. Los viajeros que pasan solo ven piedra partida medio tragada por el pasto y la maleza espinosa.
- **Dinach** _(town)_ — Un pueblo de cima en Mintyrnath, a dos días de camino al noroeste de Tharbad. Se asienta en un espolón estratégico que domina la unión de los ríos Sendiel y Andeithel, donde un viejo puente arnoriano de piedra todavía cruza el agua. A mediados de la Tercera Edad, Dinach es una posta tosca: una guarnición pequeña ocupa la torre vieja, y los edificios de piedra a lo largo del Men Formen dan cobijo a viajeros, contrabandistas y agentes de una facción o de otra. Los campos bajos junto al río se inundan cada primavera.
- **Entamundo** _(town)_ — Un pueblo de la región, cuyo carácter está moldeado por la geografía y la economía del lugar.
- **Metraith** _(town · pop. 340 · 70% Cardolani, 30% Eriadoran)_ — Fundada por Tarcil de Arnor como residencia de verano, T.E. 514.. Asiento de los Señores de Dol Tinare; centro de abastecimiento y mercado menor para el tránsito del Camino Verde.. Los Príncipes de Tinare habitan en Metraith una mansión grande y ruinosa.
- **Undrond** _(town)_ — Udûdhrond ('Bóveda oculta y profunda') fue en su momento un municipio de 4.300 habitantes en la orilla occidental del Gwathló, unas ochenta millas río abajo de Tharbad. Hacia mediados de la Tercera Edad su población se había derrumbado tras la Gran Plaga, y para la T.E. 1970 el pueblo estaba abandonado por completo. Lo que queda es un tramo de cimientos de piedra desmoronados a lo largo de la ribera, medio ocultos por la vegetación — un silencio de lugar encantado donde antes había un mercado movido.

---

### South Downs

**Tipo:** province · **Área:** ~33.891 km² · **Familia cultural:** dunadan_north

**Clima real análogo:** South Downs, Hampshire, England (Köppen: `Cfb`)

Arthedain is the northern Dúnedain kingdom in Eriador, cradled between the Blue Mountains and the Misty Mountains and bounded by the rivers Lhûn and Baranduin, a cool, sparsely populated realm of rocky hills, downs, marshes, and the Shire, ruled from Fornost as the last Númenórean realm in the North in T.A. 1640.

**Descripciones ambientales (rotativas):**

- Chalk hills of southern Cardolan, once the granary of the southern Arnor kingdom. Dúnedain towers on the crests, wild pasture where wheat fields once grew and nomadic shepherds in a land that history has forgotten.
- Chalk hills of southern Cardolan, once the grain country of Arnor's southern kingdom. Dúnedain towers standing on the crests above wild pasture that has replaced the wheat; nomadic shepherds in a land that history has finished with.
- The native forest was felled centuries ago and never replanted; the chalk now carries open pasture and the occasional bramble thicket where the seeds found purchase. The land is recovering toward something, slowly.
- Rolling chalk downs with the towers on the heights — visible from miles away, too thin to garrison, too significant to demolish. The paths below them are still used because paths on chalk endure.
- Southern Cardolan's climate is milder than the north — shorter winters, earlier springs, the southern influence of Belegaer moderating both extremes. The grass grows well; the towers stand in weather that could be worse.
- Shepherds who have no particular connection to the Dúnedain history beneath their feet. They use the tower-ruins as shelter when the weather closes in.

**Locations (2):**

- **ruins** _(ruins)_ — 
- **ruins** _(ruins)_ — 

---

## Dagorlad

### Dagorlad

**Tipo:** province · **Área:** ~38.185 km² · **Familia cultural:** enemy

**Clima real análogo:** Cappadocia, Nevşehir, Turkey (Köppen: `Dfb-dry`)

Dagorlad is the wide, flat battle-plain north and northeast of Udûn and the main pass into Mordor, once covered with wild grains and grasses and now a bare, declining expanse dotted with cairns and barrows where the Last Alliance fought Sauron at the end of the Second Age.

**Descripciones ambientales (rotativas):**

- The battle-plain before the Black Gate — cracked earth, slag-mounds and reeking pits where the hosts of the Last Alliance fought and nothing has grown rightly since.
- North of the plain the Dead Marshes spread — a drowned waste of meres and reeds where corpse-lights burn over the pools and the faces of the drowned wait beneath the green water.
- Three pale dusty roads run to the Morannon and no further. The land between them is a graveyard with no graves — the dead are under the pools, or the dust, or nowhere.
- A bitter east wind blows here off the heights of the Emyn Muil; it carries the cold smell of decay and turns sharply cold at dusk.
- Nothing lives here but carrion-birds and the faint lights on the fen-water. The mounds that should be barrows are pits of filth; the land itself seems to exhale poison.
- Before dawn the air sometimes brings a message — a breath from the south with a faint tang of the Sea, as if to prove the world is not all shadow.

**Locations (1):**

- **Tirith Nindir** _(castle · pop. 60 · Gondor)_ — Una antigua fortaleza gondoriana construida para proteger y vigilar los accesos a la llanura de la Dagorlad.

---

## Dale

### Dale

**Tipo:** province · **Área:** ~1.087 km² · **Familia cultural:** northman

**Clima real análogo:** Nowy Targ, Lesser Poland, Poland (Köppen: `Dfb`)

The Grey Mountains (Ered Mithrin) form a long, cold northern range between Mirkwood and the Forodwaith, with abrupt cliffs above the Wilderland, gentler northern slopes fading into tundra and the Talath Oiohelka, and the dragon-haunted basin of the Withered Heath between the eastern forks of the range.

**Descripciones ambientales (rotativas):**

- The valley of the Lonely Mountain — green fields and a walled town rebuilt where a dragon's desolation once lay grey for miles. Erebor's peak stands over all, and the River Running comes down beside the gate.
- Young pine and rowan clothe the slopes where the old burning was; the scars in the rock are still visible above the new green. Ravens keep their watch on Ravenhill as they did when the Mountain was a kingdom.
- The road to the Front Gate runs beside the river under the Mountain's shadow; below, the valley opens to the plain where the grey ruins of the old town were a warning for an age.
- A mountain valley of sharp seasons — deep snow in winter, green flood of growth in spring, and the cold shade of the peak even at midsummer.
- Men of Dale and dwarves of the Mountain share the valley; the sound of hammers comes up from the forges under the hill, and the town prospers again under the King under the Mountain.
- South and west the land was once burned bare; now the woods creep back year by year, and the memory of the fire is a grey line in the stone.

**Locations (1):**

- **Dale** _(town · pop. 570 · 100% Northman)_ — Valle es un pueblo hermoso de Hombres del Norte urbanos, asentado en un valle abrigado al pie de la Montaña Solitaria; es la sede del Thyn y un centro manufacturero para los Hombres del Norte rurales de la región. Sus casas de piedra y sus talleres son famosos por los juguetes finos y los mecanismos de relojería; el día de mercado trae comerciantes desde Esgaroth y más allá. La montaña que se alza detrás del pueblo le da un fondo imponente y una sensación de permanencia.

---

## Dor Guldur

### Dor Guldur

**Tipo:** province · **Área:** ~35.829 km² · **Familia cultural:** enemy

**Clima real análogo:** Polesie, Belarus/Ukraine border (Köppen: `Dfb`)

Southern Mirkwood and Southern Rhovanion form a wild, embattled region stretching from the Old Forest Road down to the Dagorlad and the Emyn Muil, dominated by the dark forest around Dol Guldur, the horse-plains of Talath Harroch, and the Anduin vales and Brown Lands that lie between Mirkwood and Gondor. Geology consists of primarily sedimentary strata of limestone and shale, with significant granite projections such as the cinder cone of amon lanc and the mountains of mirkwood.

**Descripciones ambientales (rotativas):**

- Dol Guldur's fortress dominates southern Mirkwood from Amon Lanc. Trees twisted toward darkness, Great Spider webs blocking every path and the smell of decay that stays in the clothes for days. The Brown Lands stretch dead beyond the Anduin.
- Dol Guldur's fortress on Amon Lanc, and the forest that serves it. Trees twisted toward the dark hill as if magnetised; Great Spider webs blocking the paths; the smell of decay that comes from something older than rot.
- Furry oak and chap-beech grown strange under the shadow — trunks thicker at the base than any forest has a right to be, the understorey killed by the spider-webs that filter what little light reaches the floor.
- Amon Lanc at the centre: the volcanic hill that Dol Guldur occupies with the architectural inevitability of something that was always going to be there. The trees grow toward it as if they have no choice.
- The climate of Dol Guldur's shadow is perpetual chill even in summer; the canopy blocks both sun and wind so that the air inside is still and cold and smells of things that decompose slowly. The Brown Lands begin across the Anduin.
- Great Spiders who have been here since before Sauron returned, and orcs who serve the fortress, and the fortress itself, which serves a purpose that the whole forest bends itself to enable.

**Locations (1):**

- **Dol Guldur** _(fortress · pop. 250 · 90% Orcish, 5% Troll, 5% Other)_ — Dol Guldur — 'Colina de la Hechicería' — se alza en el extremo meridional del Bosque Negro, en la cima del Amon Lanc, un cono de cenizas extinguido. Desde alrededor de la T.E. 1050 la ocupa un poder llamado el Nigromante, que ha llenado la fortaleza de orcos y trolls y ha extendido una sombra sobre el sur del bosque. La colina está envuelta en una penumbra permanente; los árboles de alrededor están muertos o retorcidos, y la oscuridad del Bosque Negro es más profunda a su sombra. Ningún viajero se acerca por su voluntad.

---

## Dorwinion

### Dorwinion

**Tipo:** province · **Área:** ~8.422 km² · **Familia cultural:** northman

**Clima real análogo:** Sea of Azov coast, Ukraine (Köppen: `BSk-Dfb`)

Dorwinion, or the 'Wineland,' is a wealthy and fertile country located along the northwest coast of the Sea of Rhûn and the lower reaches of the swift River Celduin and the rushing Uldona. Known throughout Middle-earth for producing the finest wines, its culture is dominated by the Dorwinrim, a hardy, adaptable, and highly diplomatic merchant people. Their capital, Shrel-Kain, is the largest port on the sea and serves as the mercantile and diplomatic hub of the entire region.

**Descripciones ambientales (rotativas):**

- The Wineland on the northwest shore of the Sea of Rhûn, producer of the finest wines in Middle-earth. Shrel-Kain is the great inland sea's greatest port; the Dorwinrim are the diplomats and merchants who trade with half the world.
- The Wineland on the northwest Sea of Rhûn, producer of the most valued wine in Middle-earth. Shrel-Kain's great port and the Dorwinrim merchants who trade with every kingdom that can reach them.
- Terrace-cultivated vineyard estates on the sun-facing hill slopes; mixed woodland on the hills behind; the sea-plain below. The landscape is as organised as a ledger: every slope assigned a variety, every variety a market.
- The Sea of Rhûn creates a moderating microclimate that makes viticulture possible this far north and east. The warmth off the inland sea extends the growing season enough for grapes that wouldn't survive twenty miles inland.
- Warm summers with enough rain from the sea; mild winters that don't go below the point where the vines suffer. The agricultural calendar here is determined by the grapes and everything else works around them.
- Dorwinrim merchants who have made diplomacy and commerce the same thing. They trade with Thranduil's Elves and with the Easterlings and with Gondor and they keep everyone's secrets equally, which is their main commercial advantage.

**Locations:** —

---

## Druadan Forest

### Druadan Forest

**Tipo:** province · **Área:** ~6.633 km² · **Familia cultural:** wild_wose

**Clima real análogo:** Maremma Toscana, Grosseto, Italy (Köppen: `Csb`)

The Drúadan Forest (S: 'Tawar-in-Drúedain') is an ancient, dense, and secretive oakwood situated in northeastern Gondor along the northern slopes of the White Mountains. Bordered by the beacon-hills of Eilenach and Nardol, this forest is the ancestral home of the Woses (Drúedain), a primeval, secretive race of master woodsmen who lead primitive, clan-based lives in hidden hollows and valleys completely apart from Gondorian civilization.

**Descripciones ambientales (rotativas):**

- A dark remnant of the world's first woods, clinging to the feet of the White Mountains — close pines, deep silence, and paths that are not meant for outside feet.
- The Stonewain Road runs through it half-buried — grey slabs laid before the City was built, still carrying those who the wood permits to pass.
- The Wild Men of the woods live here and are seldom seen; their carved watch-stones stand along the ways, and the drums in the trees are the only greeting strangers get.
- The forest is cool and dim even at midsummer; under the pines the air smells of resin and old earth, and sound does not carry far.
- Few roads, fewer paths. The wood is a fortress without walls — the trees and their people have held it against every power that came through the valley.
- Beyond the dark eaves the land opens to the plain of the City; inside them the world is a green dusk and a held breath.

**Locations (1):**

- **Sindbar** _(town · pop. 540 · Gondor)_ — Un pueblo gondoriano pequeño cerca del linde más occidental del Bosque de Drúadan, unas ocho millas al norte del Monte Nardol. Sus casas de piedra y su mercado tranquilo atienden a las granjas dispersas y a los leñadores de la zona. La mayoría de los viajeros evita el Bosque de Drúadan vecino; a los woses casi nunca se los ve, pero siempre se sospecha que están mirando.

---

## Dunland

### Dunland

**Tipo:** province · **Área:** ~66.639 km² · **Familia cultural:** dunlending

**Clima real análogo:** Powys, mid-Wales (Köppen: `Cfb-Dfb`)

Dunland is the rugged foothill and plateau country south of the Glanduin, east of the Gwathló and north of the Isen, a land of highlands and plains ruled by fractious Dunlending clans who herd, raid and scheme along the vital Old South Road and the Isen Gap.

**Descripciones ambientales (rotativas):**

- The country between the Gap of Rohan and the ring of Isengard — green hills and long empty downs, poorer since the forests were felled for the traitor's fires.
- The hill-folk keep to their own speech and their old wrongs; their hidden steads are on the high ground, and the eyes on the ridges miss nothing.
- The North-South Road runs through it past Isengard; the ring-wall and the black tower stand in the valley's end under the mountain wall, and the place smells of smoke and iron.
- Stump-fields and bitter brakes where woods once stood; the surviving groves are few and guarded. The land itself seems to remember being green.
- West the Misty Mountains wall the sky, and the gorges of the Isen cut down through them — a loud river in a narrow bed, crossed at the fords where battles were fought.
- Bare winters, wet autumns, and a wind that comes out of the Gap with ice in it; Dunland is a hard country that has been made harder.

**Locations (14):**

- **Angrenost** _(citadel · pop. 3000 · 100% Gondorian)_ — Angrenost — conocida en edades posteriores como Isengard — es un complejo fortificado gondoriano en el Paso de Calenardhon, con sus defensas centradas en la torre indestructible de Orthanc. Un muro circular enorme, de una milla de diámetro, encierra el Orthanc y los terrenos de alrededor; ninguna máquina de sitio ha dañado nunca ni la torre ni el muro anular. La fortaleza administra los accesos noroccidentales a Gondor y mantiene vigilancia sobre todo movimiento por el Paso.
- **Arailt** _(fortress · pop. 120 · Dunlendings)_ — El Refugio de Arailt fue el antiguo asiento del clan dunlendino Arailt. Para la época de la Guerra del Anillo estaba abandonado desde hacía mucho; los rohirrim habían establecido un campamento de exploradores sobre las ruinas y las cuevas cercanas.
- **Beanach** _(town)_ — 
- **Carnach** _(town)_ — Ost-Dunhoth fue en su momento un municipio de unas 3.200 personas en Enedhwaith. Hacia la T.E. 1400 su población se había vaciado por completo. Lo que queda es un campo de ruinas cubiertas de maleza — muros partidos de piedra vieja medio enterrados en el pasto y los matorrales, sin habitantes permanentes. Los dunlendinos del lugar tienen el sitio por maldito y no construyen aquí.
- **Creatrach** _(town)_ — En el Coit Cerdd, en los límites de Dunfearn, se alza la ruina de una vieja torre de vigilancia gondoriana llamada Harndirion ('Guardia del Sur'). Los Montaraces del Norte mantienen aquí un campamento semipermanente entre las piedras antiguas. Los dunlendinos del lugar la llaman Craig-y-Din ('Roca del Castillo') y le pasan bien lejos.
- **Daithen** _(town)_ — Un solar de clan dunlendino en Dunfearn, cerca de las Montañas Nubladas, cuyo nombre significa 'Fuego Antiguo'. Una aldea tosca de tierras altas, de casas largas de madera y corrales de ganado, gobernada por el jefe Menu con el consejo del hechicero local Selyf Hen. En las mañanas frías el humo de los fuegos queda bajo en el valle.
- **Dun Fidach** _(town)_ — Lo que fue una fortaleza dúnadan llamada Amon Mîn ('Colina entre los pasos') — un puesto de vigilancia que dominaba el Camino Verde en Dor Wathui — está abandonado desde hace mucho. Los Montaraces del Norte lo mantuvieron un tiempo breve después de la disolución de Arnor, pero al final lo dejaron caer. Los dunlendinos llaman a las ruinas 'Dinas Gwydd'; de tanto en tanto un campamento pequeño de Montaraces se refugia aquí.
- **Dun Udrost** _(town)_ — Echad Dagoras ('Campamento de Dagoras') es una vieja ruina élfica al sur de Eregion, unas sesenta millas al sudeste de Ost-in-Edhil. Los Montaraces del Norte la usan como campamento temporario; los dunlendinos del lugar la llaman Dinas Yddryst o Dol Du ('Peaje oscuro') y evitan el sitio. Unos pocos muros de piedra partidos e hiladas de cimiento entre la maleza — de atmósfera inquietante.
- **Golgoch** _(town)_ — 
- **Gwâl Draig** _(town)_ — Una aldea dunlendina de Dunfearn que creció alrededor de un antiguo Templo de la Justicia, construido hacia la T.E. 1200. El templo original — con forma de gran cabeza de toro de piedra, de sesenta pies de alto — es hoy el núcleo de una aldea llamada Gwâl Draig, hogar de la tribu Draig-lûth, descendientes de los primeros fieles del templo. La tribu todavía lleva al Dragón Turukulon como símbolo. La aldea es un asentamiento tosco de casas de madera alrededor del templo viejo de piedra; unos guardias con túnicas blancas y hachas de filo ancho vigilan la entrada.
- **Laur Dunnen** _(town · pop. 420)_ — Larach Duhnnan quedaba en territorio del Clan Feargan, pero el paso de tránsito extranjero la volvió terreno neutral para las conversaciones y el comercio entre tribus. No tenía murallas y dependía para su defensa de la fortaleza Feargan vecina; se asentaba en uno de los pocos cruces accesibles del Dunstrem, por el que los señores del clan cobraban un peaje modesto.
- **Odharn** _(town)_ — 
- **Vindacil** _(town)_ — 
- **Cillien** _(village · pop. 145 · 100% Dunman)_ — Cillien es una aldea dunlendina de las colinas de Enedwaith, el punto de reunión de las familias dispersas del Clan Eogbann. Su edificio más notable es la Casa del Sanador — una casa larga de madera donde los sanadores del clan practican su oficio y atienden a cualquiera de la región que haga el viaje hasta aquí. La aldea es pequeña y cerrada sobre sí misma, con sus casas largas dispuestas en un círculo tosco alrededor de un fogón común.

---

## Enedhwaith

### Enedhwaith

**Tipo:** province · **Área:** ~116.836 km² · **Familia cultural:** dunlending

**Clima real análogo:** Ceredigion, mid-Wales (Köppen: `Cfb`)

Dunland is the rugged foothill and plateau country south of the Glanduin, east of the Gwathló and north of the Isen, a land of highlands and plains ruled by fractious Dunlending clans who herd, raid and scheme along the vital Old South Road and the Isen Gap.

**Descripciones ambientales (rotativas):**

- Wild land between the Gwathló and the Isen, of heathland, peat bogs and low oaks. Depopulated since the wars of the north, the Gwathuirim tribes survive at its margins. A landscape of bleak beauty under vast Atlantic skies.
- Heathland and peat bog under Atlantic skies, almost entirely depopulated since the northern wars. The Gwathuirim cling to its margins; the interior is open, bleak and genuinely beautiful in the right light.
- What the Númenóreans and then Sauron didn't fell, the climate finished: Enedhwaith is now low oak and heather on rolling ground, with bogs filling the valley-bottoms. The forest is coming back, slowly, on its own terms.
- The Gwathló runs the eastern edge and the Isen cuts the south; between them the land does what it likes. No roads are maintained here; only sheep-tracks and the routes the Gwathuirim memorised generations ago.
- Relentless Atlantic weather that makes every season an argument. The mild temperature means it doesn't snow often, but the damp and wind are constant. The light has a particular quality in autumn.
- Gwathuirim tribes on the fringes, herding and keeping themselves to themselves. They have no use for either Gondor or Rohan; their ancestral memory stretches back to before either existed.

**Locations (6):**

- **Lond Angren** _(city · pop. 2300 · Gondor)_ — Lond Angren (S. Puerto de Hierro) empezó como un pequeño puesto numenóreano de la Segunda Edad y creció hasta ser una ciudad y un señorío que controlaba el oeste de Enedwaith, cerca de la desembocadura del río Angren.
- **Erynwaith** _(point of interest)_ — 
- **Bar Adorn** _(town · pop. 600)_ — Bar Adorn era un asentamiento sobre el río Adorn, cerca de las fronteras occidentales de Rohan, que funcionaba como puesto comercial menor entre los rohirrim y los dunlendinos de la región.
- **Erynwaith** _(town)_ — 
- **Ostiras** _(town · pop. 400)_ — 
- **Alclud** _(village)_ — 

---

## Eothraim

### Eothraim

**Tipo:** province · **Área:** ~143.129 km² · **Familia cultural:** northman

**Clima real análogo:** Poltava Oblast, Ukraine (steppe) (Köppen: `BSk`)

The territory of the Eothraim comprises the vast, fertile southern plains and rolling grasslands of southern Dor Rhunen, southwest of the Eorstan Hills and extending west toward Greenwood the Great. Watered by the Warwater and Surubeki rivers, this lush environment is home to the Eothraim—fierce, honest, and courageous horse-masters who live as semi-nomadic herders and hunters.

**Descripciones ambientales (rotativas):**

- Great tall-grass plains where the Warwater and Surubeki feed the pastures of a semi-nomadic horse-people. The wind rules the landscape and the horizon is always wide. The Eothraim live by following their herds.
- Grass taller than a horse's shoulder, bending all one direction in the east wind. The Eothraim read the land by its moving — which way the herds have gone, which way the rain is coming — and they are rarely wrong.
- Wild rye and sweet grass run unbroken to the horizon, with willows marking the hidden courses of the Warwater and Surubeki. The Entwives are said to have walked here once, and the richness of the soil still answers for it.
- The plains flatten so completely that a rider on the ridge can see tomorrow's weather arriving from two days away. No hills interrupt; the only shelter is the river-valley, where poplars cluster and the water slows.
- Summers here are warm and long enough to fatten cattle, winters cold enough to kill the careless. Between them a brief furious spring when the plains flower gold and white before the grass reclaims everything.
- A semi-nomadic horse-people who own the land by moving across it. Their camps leave no mark; only the cropped grass and the wheel-ruts of the wagons say anyone passed at all.

**Locations (2):**

- **Eolburg** _(town · pop. 220 · Northmen)_ — Buhr Ailgra es una de las pocas colonias permanentes de los Eothraim, que siguen los movimientos migratorios de sus rebaños por las llanuras de Rhovanion. La aldea es una comunidad sencilla, de casas hechas de paja y turba, rodeada por una recia cerca de tierra.
- **Vidusbaurg** _(town · pop. 520 · Northmen)_ — Buhr Widu, situada cerca del pequeño Lago del Bosque, conservaba algo del esplendor real de los días de Vidugavia. Los príncipes Grammuz que la gobernaron después de la Plaga no tuvieron fuerza para devolverle su gloria anterior. Como la mayoría de las aldeas de los Hombres del Norte en las llanuras, consistía en casas largas de madera y techo de paja, defendidas por un muro de tierra y recias torres de madera.

---

## Esgaroth

### Esgaroth

**Tipo:** province · **Área:** ~5.631 km² · **Familia cultural:** northman

**Clima real análogo:** Lake Balaton north shore, Hungary (Köppen: `Dfb`)

Northern Mirkwood is the northern half of the great forest once known as Greenwood the Great, stretching between the Anduin, the Grey Mountains, the Withered Heath and the upper River Running, and including Thranduil’s woodland realm, the Long Lake, the Lonely Mountain and the Iron Hills.

**Descripciones ambientales (rotativas):**

- Lake-town on the Long Lake — a wooden town on piles over the water, reached by a great bridge, where the trade of the Woodland Realm comes down the Forest River in barrels.
- The lake stretches long between the mountains and the wood; its southern arms end in marsh and winding channels where the river gathers itself and plunges over cascades.
- The ways are waterways — boats and barges where other towns have carts, and lantern-lit piers instead of streets. The town's life is the lake's life.
- Cold winds and falling leaves mark the autumn; in winter the margins freeze and the wooden ways creak over black water. The lake remembers the Dragon's wrath and the Master's fall.
- Mountain on the north horizon — the Lonely Mountain fills the sky beyond the lake-head, and all roads of the eye run to it.
- A grey, wet, busy place — fish-fires and woodsmoke on the water, gulls crying round the barrels, and the mountains reflected broken in the ripples.

**Locations (1):**

- **Esgaroth** _(town · pop. 910 · 90% Northman, 10% Mixed Mannish)_ — Esgaroth — la Ciudad del Lago — está construida sobre grandes plataformas de madera por encima del Lago Largo, unida a tierra por un solo puente. Fundada como estación comercial de temporada a comienzos de la Tercera Edad, ha crecido hasta ser el mercado principal del norte de Rhovanion, donde se intercambian los productos de Valle, Erebor, el Reino del Bosque y las llanuras anchas. Las plataformas crujen con agrado bajo los pies; el humo de los fogones se arrastra sobre el agua; la Casa del Gobernador se alza en el centro del pueblo flotante, con su estandarte visible desde la orilla.

---

## Fangorn

### Fangorn

**Tipo:** province · **Área:** ~33.175 km² · **Familia cultural:** unique_fangorn

**Clima real análogo:** Bayerischer Wald, Bavaria, Germany (Köppen: `Cfb-Dfb`)

Fangorn is an ancient forest on the southeastern slopes of the Misty Mountains, bordered to the north by the plains running to the Silverlode (Celebrant), to the west by the high peaks, to the east by the Wold and to the south by the open plains of Calenardhon. It is the last great remnant of the immense forest that once covered much of Eriador and Calenardhon and is uniquely tended by the Ents, who act as tree-herds and guardians of this 'giant garden'. The module also treats the surrounding borderlands along the Entwash and Limlight as part of the same regional system.

**Descripciones ambientales (rotativas):**

- Fangorn — the oldest wood left in the world, deep and tangled under its eaves, where the trees are watchful and the paths are the forest's to give or take.
- The Entwash comes down through it from the mountains; beside the stream the growth is dark and thick, and the air is stifling and strangely thin beneath the boughs.
- The floor is buried in drifts of leaves; shafts of sunlight come down like pillars through the canopy, and bark that looks grey in the gloom gleams brown and ochre where the light finds it.
- The shepherds of the trees still walk here — slow, deep-voiced, and older than kingdoms. The wood has a will and a memory, and it does not forget an axe.
- Northward the wood thins to birch-groves and bare slopes where gaunt pines stand; a sharp white peak shows beyond the valley like a horn of the mountains.
- The forest is not safe for hasty feet or sharp steel; under its green dusk the silence is alive, and the traveller who harms it is watched from the beginning to the end.

**Locations:** —

---

## Forlindon

### Apariach

**Tipo:** province · **Área:** ~17.026 km² · **Familia cultural:** sindar

**Clima real análogo:** Donegal, NW Ireland (Köppen: `Cfc`)

Lindon is the westernmost Elvish realm of Middle-earth, the remnant of Ossiriand that survived the War of Wrath. After the breaking and flooding of Beleriand, the Great Sea breached the Blue Mountains to form the Gulf of Lhûn, dividing Lindon into Forlindon (North Lindon) and Harlindon (South Lindon), with the River Lhûn as the eastern border against Arnor. Throughout the Second and early Third Age it is the principal Elven coastal realm and home of the Grey Havens (Mithlond). Geology consists of folded sedimentary rock (slate and sandstone) with rich iron lodes and abundant coal deposits in forlindon.

**Descripciones ambientales (rotativas):**

- Northern promontory of Forlindon pointing into Belegaer. Dark fractured cliffs battered by the sea, tall heather and peat bog inland, and seabird colonies on every ledge. On clear days Tol Fuin is visible to the northwest.
- Northern Forlindon's cliff promontory, with fractured basalt dropping into heavy seas and seabird colonies on every ledge. On clear days Tol Fuin is visible to the northwest as a dark smear on the horizon.
- Tall heather and peat bog inland; the exposed rock supports nothing larger. The clifftops are genuinely dangerous in high wind; the seabirds breed here because nothing else can reach the nesting-ledges.
- The northernmost point of Lindon juts into Belegaer. The sea here is cold and often rough; the cape breaks the Atlantic swell into something more immediate and violent. It is the weather-edge of a weather-prone coast.
- Cold, wet and wind-battered year-round. The brief northern summer is pleasant on the inland heath; the clifftops are never quite not dangerous.
- Seabirds, seals in the coves, and the occasional Elvish lookout who comes to watch Tol Fuin. The cape does not encourage settlement.

**Locations (6):**

- **Mirimar** _(city · pop. 560)_ — 
- **Tir Lawen** _(city · pop. 800 · Noldor)_ — 
- **Vinyathrad** _(city · pop. 800)_ — Edenathrad ('Vado Nuevo') es un vado y una aldea al norte del antiguo Sarn Athrad, sobre el Gelion. Reemplazó al vado más viejo para el tránsito práctico entre Forlindon y las tierras del este. La aldea es un asentamiento pequeño de casas de piedra y madera cerca de la ribera; Amboron es su jefe. Comerciantes y viajeros cruzan aquí con regularidad.
- **lovithil** _(manor)_ — 
- **Forlond** _(town · pop. 840 · 50% Silvan Elvish, 40% Sinda, 10% Noldo)_ — Forlond es el puerto élfico meridional de Lindon, oculto en la cabecera de un fiordo empinado en la orilla oriental del Golfo de Lhûn. Fundado después de la ruina de Beleriand, es sobre todo un asentamiento de construcción de naves — el sonido de los martillos sobre la madera y de los mazos de calafateo se oye en cualquier visita. Los Elfos de aquí son de linajes mezclados y están más acostumbrados a las visitas de mortales que en la mayoría de los asentamientos élficos, aunque el puerto no queda sobre ningún camino y es difícil de encontrar.
- **Amon Ereb** _(watchtower)_ — Una colina solitaria de laderas suaves pero dominantes en el sur de Forlindon, el punto más alto entre el Ramdal y el Gelion. En la Tercera Edad, la torre de Car Sidh ('Casa de la Paz') corona su cima — asiento de Rhiannon, una noble mithren que patrocina la mayor casa de sanadores eldarin de Forlindon. Allí viven unos doscientos Elfos; sus salones son luminosos y ordenados, y las laderas en terrazas conservan las marcas tenues de terraplenes mucho más antiguos, de la Primera Edad. La colina es un mojón visible a millas de distancia a través de las tierras llanas del sur.

---

### Ascahiriand

**Tipo:** province · **Área:** ~25.518 km² · **Familia cultural:** sindar

**Clima real análogo:** Donegal, NW Ireland (Köppen: `Cfc`)

Lindon is the westernmost Elvish realm of Middle-earth, the remnant of Ossiriand that survived the War of Wrath. After the breaking and flooding of Beleriand, the Great Sea breached the Blue Mountains to form the Gulf of Lhûn, dividing Lindon into Forlindon (North Lindon) and Harlindon (South Lindon), with the River Lhûn as the eastern border against Arnor. Throughout the Second and early Third Age it is the principal Elven coastal realm and home of the Grey Havens (Mithlond). Geology consists of folded sedimentary rock (slate and sandstone) with rich iron lodes and abundant coal deposits in forlindon.

**Descripciones ambientales (rotativas):**

- Northernmost sub-region of Forlindon, the most rain-swept and mist-prone part of Lindon. Moss-bogs, heath and silver birches in sheltered valleys; rounded hills of intense green grass and a watchful silence facing the wild north.
- Northern Forlindon, the most rain-swept part of Lindon. Moss-bogs and silver birch in sheltered valleys; rounded green hills of intense colour that come from permanent moisture and the particular quality of northern light.
- Heath and sedge-bog on the exposed ground; birch and alder in the valley-bottoms where the drainage improves. The constant drizzle keeps everything intensely green in a way the southern Lindon regions don't quite achieve.
- The northernmost inhabited part of Lindon, with the coast immediately to the west and the Ered Luin to the east. The hills are rounded and old, their harshness smoothed by a geological time that precedes the Elves.
- Cold, wet and grey for most of the year, with the Atlantic feeding moisture into the coast from the west and the mountains catching the clouds from the east. Summer is real but brief and mild.
- The quietest part of a quiet land. Elves who live here chose the rain and the silence and have made something of both.

**Locations (3):**

- **Tir Lawen** _(city · pop. 600)_ — Tir Lawen es una ciudad élfica noldorin de las tierras salvajes del norte; sus agujas altas se ven desde las colinas de alrededor como un punto de luz en un paisaje por lo demás oscuro. Fundada a comienzos de la Tercera Edad como refugio élfico, es uno de los pocos lugares de asentamiento noldorin fuera de Lindon e Imladris. La piedra labrada de la ciudad es de calidad excepcional; sus salones son luminosos y su gente, reservada con los forasteros mortales.
- **Rhomros** _(manor)_ — Rhomros ('Espuma Sonora') es un pueblo de Galfalas donde el río Tauron (Celos) llega a la Bahía de Lune. La madera cortada en los bosques de Forlindon baja flotando hasta aquí para la construcción de naves; un astillero pequeño y un aserradero dominan la ribera. Casas bajas de piedra y madera dan a la bahía; el olor a resina y a aserrín queda flotando en el aire.
- **Lond Thalos** _(town · pop. 700)_ — Lond Thalos (S. Puerto de Thalos) funcionaba a la vez como comunidad médica y de herbolarios y como puerto maderero que abastecía de madera a los astilleros de los Puertos Grises.

---

### Celanoriand

**Tipo:** province · **Área:** ~22.032 km² · **Familia cultural:** sindar

**Clima real análogo:** Bergen, Norway (Köppen: `Cfc`)

Lindon is the westernmost Elvish realm of Middle-earth, the remnant of Ossiriand that survived the War of Wrath. After the breaking and flooding of Beleriand, the Great Sea breached the Blue Mountains to form the Gulf of Lhûn, dividing Lindon into Forlindon (North Lindon) and Harlindon (South Lindon), with the River Lhûn as the eastern border against Arnor. Throughout the Second and early Third Age it is the principal Elven coastal realm and home of the Grey Havens (Mithlond). Geology consists of folded sedimentary rock (slate and sandstone) with rich iron lodes and abundant coal deposits in forlindon.

**Descripciones ambientales (rotativas):**

- The most storm-exposed coast of Forlindon, ironically named the Land of the Bright Sun. Thirty-metre cliff-waves in winter, tree-bending westerlies, but in calm the sea turns to living silver and the clifftops to emerald. A land of extremes.
- The most storm-exposed coast of Forlindon, ironically named the Land of the Bright Sun. Thirty-metre cliff-waves in the worst of the Atlantic winter; tree-bending westerlies; but in calm the sea turns to living silver.
- Heath and gorse on the clifftops, wind-pruned and horizontal in growth habit. The trees gave up on the exposed ground a long time ago; only in the sheltered lee-valleys do they stand upright.
- Vertical dark cliffs dropping into green-blue water, with sea-spray reaching the clifftops on rough days. The violence and the beauty operate on exactly the same principle: scale and indifference.
- The most dramatic weather in Lindon, concentrated on a coast that faces into the Atlantic storms without any mitigation. The calm days that give the region its ironic name are real; they're also outnumbered.
- The Elves who live here came because of the extremity, not in spite of it. They find something valuable in the contrast between the winter storms and the days when the sea goes still and bright. The name isn't entirely sarcastic.

**Locations (4):**

- **Estomar** _(city · pop. 324 · Noldor)_ — 
- **Mindolhendi** _(city · pop. 900)_ — 
- **Mirolos** _(city · pop. 300 · Noldor)_ — Mirolos (S. Sueño de Joya; también Londalos) fue un asentamiento de los noldor fundado por seguidores de los Hijos de Fëanor en la primera década de la Segunda Edad, la comunidad más grande de la región de Hûb Conath. Fundada por Maglor antes de su desaparición, fue incendiada durante el Largo Invierno, cuando un dragón del norte entró en la zona.
- **Tir Bronadui** _(manor)_ — Un asentamiento élfico de los noldor en la costa septentrional de Lothlann — la única comunidad élfica de estas tierras frías. En origen fue una aldea con una lampistería alta que guiaba a los navegantes perdidos, y creció hasta ser un puesto puramente militar que guarda la ruta que rodea las Ered Luin hacia Lothlann y Forlindon. Su torre de vigilancia de piedra se ve a millas de distancia a lo largo de la costa gris; los noldor de aquí son pocos, disciplinados y vigilantes. Después de la destrucción de Angmar (T.E. 1975) la guarnición se perdió casi por completo intentando rescatar a Arvedui, y los sobrevivientes partieron hacia el sur.

---

### Ered Luin

**Tipo:** province · **Área:** ~41.726 km² · **Familia cultural:** sindar

**Clima real análogo:** Voss, Norway (Köppen: `Dfc`)

Ered Luin, also known as the Blue Mountains, is an ancient mountain range separating Lindon from Eriador. Extending 590 miles from the Ice Bay of Forochel down to Orod Elu in the south, the range is formed of grey rock with a bluish tint caused by a high concentration of copper ores. The mountains are riddled with natural caverns, marble and limestone formations, and once held precious metals, though Dwarvish mining has left them depleted of gold except for minor remote veins. Geology consists of marble and limestone with folded sandstone and shale foothills. abundant copper, iron, and tin ores are actively mined by the dwarves (naugrim).

**Descripciones ambientales (rotativas):**

- The Blue Mountains and green Lindon between them and the Sea — the last piece of drowned Beleriand, split by the Gulf of Lhûn where the water comes far inland.
- Tall pine-woods and oakwoods on the seaward slopes, older than any other living woods in the west. The range itself is old and worn, its peaks low and blue in the sea-haze.
- West of the gulf lie the Grey Havens and the white quays; the ships that leave them do not return. The road to the water is the oldest road still travelled.
- Dwarf-halls and elven havens share the land — the mountains hold the mansions of old Nogrod's kin, and the coast keeps the last ports of the Eldar.
- Sea-weather rules here — long grey rains, salt wind, snow that lies long on the high moors but rarely in the sheltered vales.
- Everything in Lindon smells of the Sea; even the mountain streams run with a salt wind behind them, and the sunsets over the water are the last sight of the world.

**Locations (5):**

- **Buzdum Mazar** _(dwarven mine · pop. 490 · Dwarves)_ — La mina más grande de Nan-i-Naugrim y capital de los Enanos de Anchas Vigas desde la Segunda Edad. Hacia mediados de la Tercera Edad, Edennogrod — el Khazad en buena parte arruinado que se alza sobre Nan-i-Naugrim — dominaba la zona. Al final de la Tercera Edad la gobernaba el señor feudal Grár, que llevaba entre los de la Comarca el título honorífico de Rey de la Montaña.
- **Nan i Naugrim** _(dwarven mine · pop. 430)_ — La mina más grande de Nan-i-Naugrim y capital de los Enanos de Anchas Vigas desde la Segunda Edad. Hacia mediados de la Tercera Edad, Edennogrod — el Khazad en buena parte arruinado que se alza sobre Nan-i-Naugrim — era una sombra de lo que había sido. Al final de la Tercera Edad la gobernaba el señor feudal Grár, que llevaba entre los de la Comarca el título honorífico de Rey de la Montaña.
- **Galenros** _(point of interest)_ — Una diminuta aldea élfica al sur del espolón de Forered Luin — quince casas, cuarenta y un Elfos en total, de linajes diversos. Fue fundada en la Segunda Edad como retiro comunal por filósofos, artistas y amantes de la naturaleza de los Altos Elfos que buscaban apartarse del bullicio de Mithlond. Para su gobierno responde a Tawarobel. El visitante encuentra un puñado de casas delicadas de madera y piedra, medio ocultas entre los árboles y unidas por senderos sinuosos — un aire de quietud y de orden cuidadoso marca todo el lugar.
- **Barad Caranthit** _(ruins)_ — Una cima rocosa de Forlindon, al sur de las Pinnath Luin, agujereada por excavaciones enanas antiguas. Es el escenario de una batalla en la S.E. 1700, donde una partida de Enanos y Elfos resistió hasta el final frente a los orcos. Para la Tercera Edad es una ruina: muros que se desmoronan y terraplenes cubiertos de maleza, visitados solo por los audaces o los curiosos. Las historias viejas dicen que un sobreviviente escapó para levantar una hueste enana — los túneles van más profundo de lo que parecen.
- **Culwic** _(village · pop. 400 · Gondor, Dwarves)_ — Culwic, conocida en su origen como Himtil o Himobel (S. Aldea Fría) y más tarde como Colwich, era un pueblo pequeño del oeste de Arthedain, sobre el Pequeño Lhûn, justo al norte de los límites de Dor Lelvin y Lindon. Su población mixta de Hombres y Enanos sostenía con su industria y su agricultura a los asentamientos enanos del norte.

---

### Mänoriand

**Tipo:** province · **Área:** ~26.701 km² · **Familia cultural:** sindar

**Clima real análogo:** Donegal, NW Ireland (Köppen: `Cfc`)

Lindon is the westernmost Elvish realm of Middle-earth, the remnant of Ossiriand that survived the War of Wrath. After the breaking and flooding of Beleriand, the Great Sea breached the Blue Mountains to form the Gulf of Lhûn, dividing Lindon into Forlindon (North Lindon) and Harlindon (South Lindon), with the River Lhûn as the eastern border against Arnor. Throughout the Second and early Third Age it is the principal Elven coastal realm and home of the Grey Havens (Mithlond). Geology consists of folded sedimentary rock (slate and sandstone) with rich iron lodes and abundant coal deposits in forlindon.

**Descripciones ambientales (rotativas):**

- Inner Forlindon along the Linduin, a land of constant drizzle and moss-green on every surface. Damp heather hills, pool-fed waterfalls in side valleys and Elvish homes built to face the sound of water. The quiet, rainy heart of Lindon.
- Inner Forlindon along the Linduin river, where moss covers every surface and the constant drizzle is simply the weather. Damp heather hills, pool-fed waterfalls in side valleys and Elvish homes oriented toward the sound of water.
- The Linduin runs through the centre of it, small but persistent. Its tributaries feed the bog-pools and the bog-pools feed the atmosphere. Everything here is damp to the touch; the moss is measured in inches rather than millimetres.
- The valley opens east-west and the rain comes in from the Atlantic and stays. The hills funnel it down; the bog holds it. The result is a permanent dampness that the Elves here have made central to their aesthetic.
- Mild winters, cool summers, persistent drizzle. No extremes; just the slow accumulation of moisture through every season. The plants that thrive here are the plants that have made peace with never being dry.
- Sindar who chose this valley for its particular quality of sound — rain on moss, water on stone, the Linduin on its gravel-bed. They've lived inside that sound long enough to find silence uncomfortable.

**Locations (3):**

- **Turonost** _(city · pop. 890 · Noldor)_ — 
- **Amon Draug** _(point of interest)_ — Amon Draug, la colina más alta de Forlindon, se hallaba cerca del punto medio de las colinas Emyn Cûn, donde nacía el Gelion. Desde su cima era posible ver el Belegaer.
- **Estomar** _(town)_ — 

---

### Numeriador

**Tipo:** province · **Área:** ~64.387 km² · **Familia cultural:** sindar

**Clima real análogo:** Letterkenny, Donegal, Ireland (Köppen: `Cfc`)

Numeriador is the cold, rugged, and wind-swept northern plateau of Eriador, lying north of the Hills of Evendim. It is a sparsely populated, rolling wilderness of grasses and stunted shrubs, once part of the kingdom of Arnor.

**Descripciones ambientales (rotativas):**

- Cold, wind-swept plateau north of the Hills of Evendim, the edge of the inhabited world before Forochel. Thin soil over rock, juniper scrub, scarce shepherds and wolves that grow bolder every winter.
- Cold wind-swept plateau at the edge of the inhabited world, just north of the Hills of Evendim. Thin soil over granite, juniper and heather as far as the eye carries, and wolves that grow bolder through winter.
- Dwarf-willow and wild rye in the hollows; hardy moss on the exposed rock; the occasional juniper bush that has made itself indistinguishable from the surrounding stone. The vegetation is honest about how little encourages it.
- Granite plateau with the Ered Luin visible to the west and Forochel beginning somewhere to the north without a clear border. The land becomes bleaker in a gradient that has no visible bottom.
- Short cold summers, long dark winters. The growing season is barely sufficient for what grows here naturally; nothing was ever farmed on this plateau and nothing ever will be.
- Scattered shepherds who follow their flocks between the marginal pastures and retreat to lower ground in winter. Wandering Dúnedain Rangers who use the emptiness as cover. Wolves.

**Locations (4):**

- **Enerond** _(ruins · pop. 120 · Gondor)_ — Enerond es una ciudad en ruinas en la orilla oriental del Lhûn, con sus edificios de piedra caídos y su población desaparecida hace mucho. Decayó de manera constante a lo largo de la Tercera Edad; hacia la T.E. 2050 no vive un alma entre los muros viejos.
- **Eredimar** _(village · pop. 92 · Silvan Elves, Dwarves, Men, Hobbits)_ — Eredimar (S. Hogar de la Montaña) se hallaba al pie de las Ered Luin, en el valle de Imladorn (S. El Valle Boscoso). Aunque albergaba a menos de cien personas, era notable por su diversidad: hobbits, Enanos, Elfos y Hombres se habían asentado allí en distintos momentos. Unas fuentes de azufre cercanas le dieron a Eredimar renombre como lugar de curación, y tres albergues bien mantenidos recibían a los viajeros.
- **Eruimar** _(village · pop. 98)_ — Eruimar (S. Hogar Solitario) se asentaba al pie del Ramluin (S. Muro Azul), bajo el punto más oriental donde las lomas de las Ered Luin daban paso a acantilados rocosos. A pesar de su emplazamiento remoto, su aislamiento venía de la distancia y no del bosque ni de encantamiento alguno. La aldea no tenía más de treinta y cinco casas; fundada por los dúnedain, hacia mediados de la Tercera Edad la mayoría de sus unos 150 habitantes eran Hombres del Río u Hombres del Norte.
- **Tawarobel** _(village)_ — El asentamiento principal de Dor Lelvin, perteneciente a la casa señorial de Bar Erui, en el extremo del Ramb Luin. Una aldea de unas 150 personas, en su mayoría mortales, con una presencia élfica pequeña; la casa señorial estuvo largo tiempo asociada al linaje de Gildor Inglorion. Casas de piedra y madera se asientan al borde de una vieja hacienda élfica cuyos jardines y huertos todavía se atienden con cuidado élfico.

---

### Sandariand

**Tipo:** province · **Área:** ~21.864 km² · **Familia cultural:** sindar

**Clima real análogo:** Erris, Mayo, W Ireland (Köppen: `Cfc`)

Lindon is the westernmost Elvish realm of Middle-earth, the remnant of Ossiriand that survived the War of Wrath. After the breaking and flooding of Beleriand, the Great Sea breached the Blue Mountains to form the Gulf of Lhûn, dividing Lindon into Forlindon (North Lindon) and Harlindon (South Lindon), with the River Lhûn as the eastern border against Arnor. Throughout the Second and early Third Age it is the principal Elven coastal realm and home of the Grey Havens (Mithlond). Geology consists of folded sedimentary rock (slate and sandstone) with rich iron lodes and abundant coal deposits in forlindon.

**Descripciones ambientales (rotativas):**

- The most settled sub-region of Forlindon, mild and green thanks to the Gulf of Lhûn. Oak forests and clover meadows, the oldest and best-preserved Elvish settlements in northern Lindon and the road to the port of Forlond.
- Southernmost Forlindon, mild and green thanks to the Gulf. The oldest Elvish settlements in northern Lindon sit among oak forest and clover meadow; the road to Forlond passes through here and the port gives it a connection the other sub-regions lack.
- Oak forest with a relatively open understorey; clover in the meadows between the trees. The most cultivated part of Lindon outside the immediate surrounds of Mithlond itself.
- The Gulf of Lhûn buffers the worst of the Atlantic weather; the Ered Luin to the east blocks the continental cold. The result is a climate that is genuinely mild rather than merely not-extreme.
- The longest growing season in Lindon. Mild winters that rarely freeze; summers warm enough to be pleasant. The Elves here have had time to establish an aesthetic and they've done so.
- The oldest Elvish community in northern Lindon, connected to the wider world through Forlond's port. They have watched ships come and go for a long time; it has not made them incurious.

**Locations (3):**

- **Sarn Athrad** _(town)_ — Sarn Athrad ('Vado de Piedra') es el antiguo vado pedregoso de los Enanos sobre el río Gelion, cerca de la desembocadura del Rathloriel, por el que el viejo Camino de los Enanos entraba desde las Montañas Azules a Beleriand Oriental. Aquí se libró en la Primera Edad la Batalla de Sarn Athrad entre los Elfos y los Enanos de Nogrod. Hacia mediados de la Tercera Edad el vado viejo ha sido reemplazado por Edenathrad, un poco más al norte; el vado original es un lugar tranquilo y salvaje, recordado en la leyenda pero poco visitado.
- **Annost** _(watchtower)_ — 
- **Mindon Bron** _(watchtower)_ — Una torre de vigilancia en el Paso de Caranthir, en Forlindon, mantenida por los Montaraces de Lindon para guardar la ruta de los intrusos que vienen rodeando las Ered Luin. Una guarnición pequeña mantiene encendida la almenara; la torre es una estructura de piedra sin adornos en una loma batida por el viento, con vista al paso de abajo.

---

### Tol Fuin

**Tipo:** province · **Área:** ~8.449 km² · **Familia cultural:** sindar

**Clima real análogo:** Lerwick, Shetland Islands, Scotland (Köppen: `Cfc`)

Lindon is the westernmost Elvish realm of Middle-earth, the remnant of Ossiriand that survived the War of Wrath. After the breaking and flooding of Beleriand, the Great Sea breached the Blue Mountains to form the Gulf of Lhûn, dividing Lindon into Forlindon (North Lindon) and Harlindon (South Lindon), with the River Lhûn as the eastern border against Arnor. Throughout the Second and early Third Age it is the principal Elven coastal realm and home of the Grey Havens (Mithlond). Geology consists of folded sedimentary rock (slate and sandstone) with rich iron lodes and abundant coal deposits in forlindon.

**Descripciones ambientales (rotativas):**

- Dark isle off the northern coast of Forlindon, remnant of the highlands of Beleriand drowned beneath the waves. Black vertical cliffs, cold peat bogs of perpetual mist and the melancholy echo of a land lost under Belegaer.
- Dark island off northern Forlindon, all vertical basalt cliffs and cold peat bog. What Beleriand was before it drowned is all that Tol Fuin is now — the highest peaks of a lost kingdom, still above water, still trying to remember.
- Seabird colonies on every ledge of every cliff face; peat bogs inland that are permanently waterlogged; wind that comes off Belegaer without interruption for a thousand miles. A place of austere, waterlogged beauty.
- The island barely rises above the sea in the south, where salt marsh grades into shore. The northern cliffs are thirty metres of pure black basalt. Nothing explains the difference except the island's own strange geology.
- Cold, wet, and windy all year round. The sea moderates the temperature so it's never extreme, but it never gets genuinely warm either. The bogs are frozen at the surface for a few months in deepest winter.
- No permanent settlement. Sea-birds, seals on the southern beaches, and the particular melancholy of a place that was part of something larger before the sea came.

**Locations:** —

---

### Vinyalas

**Tipo:** province · **Área:** ~12.505 km² · **Familia cultural:** sindar

**Clima real análogo:** Inishowen, Donegal, Ireland (Köppen: `Cfc`)

Lindon is the westernmost Elvish realm of Middle-earth, the remnant of Ossiriand that survived the War of Wrath. After the breaking and flooding of Beleriand, the Great Sea breached the Blue Mountains to form the Gulf of Lhûn, dividing Lindon into Forlindon (North Lindon) and Harlindon (South Lindon), with the River Lhûn as the eastern border against Arnor. Throughout the Second and early Third Age it is the principal Elven coastal realm and home of the Grey Havens (Mithlond). Geology consists of folded sedimentary rock (slate and sandstone) with rich iron lodes and abundant coal deposits in forlindon.

**Descripciones ambientales (rotativas):**

- Southern Forlindon along the lower Linduin, the last sub-region to be named by the Elves. Dense alders, spring-flooded meadows with frogs and storks and the wide slow green river that speaks only of time, not history.
- Southern Forlindon along the lower Linduin, where the river grows slow and green before meeting the Gulf. Dense alder groves, spring floods leaving stork-haunted meadows and a wide quiet water that speaks of time rather than history.
- Alder and willow on the flood-margin; tall reeds in the backwaters; frogs and storks and the particular kind of silence that comes from a slow river in warm air. The last named sub-region of Lindon.
- The Linduin broadens and slows here as it approaches the Gulf; the floodplain spreads accordingly. In spring it floods silently and completely; in summer it is a green waterway between meadows of exceptional richness.
- The mildest climate in northern Lindon, sheltered from the Atlantic by the hills to the north and warmed by the Gulf of Lhûn to the south. Spring arrives earliest here and summer stays longest.
- Sindar Elves who chose the river over the sea or the forest. Their settlements are low and riparian, built for proximity to the Linduin; the sound of moving water defines the place as much as the Elves do.

**Locations:** —

---

## Forochel

### Forochel

**Tipo:** province · **Área:** ~69.796 km² · **Familia cultural:** lossoth

**Clima real análogo:** Finnmark coast, Norway (Köppen: `Dfc-cold`)

The Cape and Bay of Forochel are a rough, cold and storm-wracked peninsula and bay thrusting into Belegaer and the Encircling Sea, the last remnant of lands once lying beyond the Iron Mountains, scarred by Morgoth’s malice but rich in marine life, whaling, furs and treacherous ice. Geology consists of barren shelf of granite worn smooth by the passage of great ice sheets, with little accessible mineral wealth.

**Descripciones ambientales (rotativas):**

- Arctic peninsula of bare glacier-smoothed granite where the Lossoth hunt seals on winter ice and summer icebergs drift in dark green waters. Austere tundra beauty of coloured mosses, alpine flowers and arctic seabirds.
- Arctic peninsula of bare glacier-smoothed granite, where the Lossoth track seals on winter ice and summer icebergs drift past in dark green water. Brief flowers in the tundra and Arctic seabirds on the cliffs.
- Stunted conifers and birch in the sheltered southern valleys; tundra grasses and lichens on the exposed ground; rare medicinal herbs that the Lossoth have been gathering long enough to name. The flora is sparse and specific.
- Granite polished by glaciers into rounded forms; the fjords cutting deep into the rock; the vast bay of the Ice Bay visible from the heights. A landscape made entirely by ice and water and the absence of heat.
- The coldest inhabited land in Middle-earth. The southern valleys are bearable in summer; the interior is brutal in winter. The ice-fishing tradition requires going onto the frozen bay in temperatures that kill the careless.
- Lossoth who hunt sea-mammals and gather roots and have a complete material culture adapted to arctic conditions. Their knowledge of the terrain and ice is the most specialised in the north.

**Locations:** —

---

## Forovirian

### Forovirian

**Tipo:** province · **Área:** ~75.803 km² · **Familia cultural:** enemy

**Clima real análogo:** Gällivare, Lapland, Sweden (Köppen: `Dfc`)

Mount Gundabad is the northernmost and one of the highest peaks of the Misty Mountains, a triple‑spired volcanic giant honeycombed into a vast Orc‑city and forge complex, capital of the Orcs of the Mountains and a key client realm of Angmar.

**Descripciones ambientales (rotativas):**

- Gundabad, the triple-spired volcanic capital of the Mountain Orcs, with hundreds of underground levels of forges and armories. Black rock, dirty snow and smelter smoke rising from chimneys cut into the living stone.
- Gundabad on its volcanic triple-peak, the Mountain Orc capital with hundreds of underground levels of forge and armory. Black rock, dirty snow and smelter smoke rising from chimneys cut into the living stone.
- The surface around the mountain has been stripped bare by centuries of Orc occupation — no trees, scrub reduced to whatever can survive in the shadow of constant smoke. The rock is soot-stained for miles.
- The mountain itself is visually distinctive: three peaks and the particular darkness of the rock under a permanent layer of smoke and ash. It is visible from a long distance in clear weather and rarely seen in clear weather.
- Perpetually cold and darkened by smoke. The wind here carries ash and the smell of metal. What passes for summer at Gundabad is a brief reduction in severity rather than an actual change in character.
- Mountain Orcs and their forges. The organisation here is military-industrial: everything exists to produce weapons and soldiers. The mountain has been producing both for longer than the Dúnedain kingdom lasted.

**Locations:** —

---

## Gondor

### Andrast

**Tipo:** province · **Área:** ~147.219 km² · **Familia cultural:** gondorian

**Clima real análogo:** Cape Finisterre, Galicia, Spain (Köppen: `Cfb-coastal`)

Southern Gondor comprises the fertile river valleys, coastal plains, highland vales and mountain flanks between the White Mountains (Ered Nimrais) and the Bay of Belfalas, encompassing the provinces of Lebennin, Belfalas/Dor-en-Ernil, Lamedon, Anfalas and the Pinnath Gelin—the heartland of Númenórean civilization in Middle-earth.

**Descripciones ambientales (rotativas):**

- Westernmost cape of Gondor where the White Mountains plunge into Belegaer in vertical cliffs. Dark fern-and-yew valleys shelter the Orodbedhrim tribe of Drúedain, so invisible in the terrain that Gondor's maps cannot find them.
- Westernmost cape of Gondor where the White Mountains drop in vertical cliffs into Belegaer. The Orodbedhrim Drúedain are invisible in the fern-and-yew valleys; Gondor's maps show the coastline but not the people.
- Fern, yew and ancient oak in the narrow valleys; exposed heath on the headlands; the sea accessible only through the cliffs or by paths the Drúedain have made and maintained for their own use.
- The cape catches the full Atlantic weather with nothing to the west for a thousand miles. The cliffs take the swell; the valleys are sheltered enough for habitation if you know them.
- Wet and wild, with the Atlantic climate at its most pronounced. The wind here has direction and purpose. Rain arrives on specific days rather than as a general condition.
- Orodbedhrim Drúedain who have been invisible in this landscape since before Gondor existed. Gondor has walked past them for centuries without noticing. They find this arrangement satisfactory.

**Locations (7):**

- **Bar Nevedui** _(castle · pop. 600 · Gondor)_ — Un castillo modesto del sur de Andrast, sobre el río Nevduin, parte del remoto condado de Bar Morthil. Sus muros son de piedra gris del lugar y los mantiene una guarnición doméstica pequeña; la tierra de alrededor la cultivan de forma dispersa unos dependientes dunir que proveen al fuerte de suministros a cambio de protección frente a los saqueadores Corsarios.
- **Tharagdonrost** _(city · pop. 800 · Gondor)_ — Una ciudad de la región cuyo tamaño y carácter la vuelven un centro importante de población y de comercio.
- **Bar Morthil** _(point of interest · Dúnedain)_ — Una hacienda real en el extremo más occidental de Andrast — la vivienda más lejana de todo Gondor. Una sola casa señorial de piedra domina los acantilados verticales de Ras Morthil, donde el océano rompe cientos de pies más abajo. La hacienda se mantiene todo el año a cargo de un guardián y de sus sirvientes; mira al oeste, hacia el mar abierto, y fue construida por los hijos de Elendil como memorial de la Númenor hundida. Reyes y Senescales vienen aquí a veces a buscar soledad.
- **Haerlond** _(town · pop. 390 · 60% Gondorian, 40% Dunnish)_ — Haerlond es un pequeño pueblo portuario gondoriano en la punta de Andrast, cuyo muelle modesto atiende a los barcos averiados al doblar el cabo traicionero. Asentamiento numenóreano en su origen, en la Segunda Edad, recibió fuero real del rey Turambar en la T.E. 602. Los pescadores de aquí tienen mano para remendar cascos y aprovisionar naves castigadas por las tormentas; su aldea es pequeña y batida por el viento, de muros encalados y una sola calle que baja hasta el embarcadero.
- **Bar Engui** _(village · pop. 60)_ — Un caserío pequeño sobre el río Engui, en Andrast, uno de los rincones más remotos de Gondor. Un puñado de garths con muros de piedra se agrupa cerca del río; la gente de aquí son pescadores y pequeños agricultores dunir que rara vez ven forasteros.
- **Hwarin** _(village · pop. 100)_ — Una pequeña aldea costera de Rast Rhaen, un garth abrigado en la costa central de Andrast. Sus pocas casas de piedra y sus botes de pesca ocupan una cala protegida; la gente son pescadores dunir que viven del mar y evitan llamar la atención de los barcos que pasan.
- **Lond Rhaen** _(village · pop. 120)_ — Una pequeña aldea de pescadores en la costa noroccidental de Andrast, abrigada en una bahía segura de Rast Rhaen. Un puñado de casas con muros de piedra da al agua; la gente de aquí son pescadores dunir cuyos botes rara vez se aventuran lejos del amparo de la bahía.

---

### Anfalas

**Tipo:** province · **Área:** ~175.672 km² · **Familia cultural:** gondorian

**Clima real análogo:** Languedoc coast, Hérault, France (Köppen: `Csa`)

Southern Gondor comprises the fertile river valleys, coastal plains, highland vales and mountain flanks between the White Mountains (Ered Nimrais) and the Bay of Belfalas, encompassing the provinces of Lebennin, Belfalas/Dor-en-Ernil, Lamedon, Anfalas and the Pinnath Gelin—the heartland of Númenórean civilization in Middle-earth.

**Descripciones ambientales (rotativas):**

- Long shore of salt marshes, estuaries and reed-beds where sea and land blur. Fishermen in flat-bottomed boats and sheep-farming on the Pinnath Gelin sustain this region quietly forgotten by politics but essential to the south.
- Salt marsh, estuary and reed-bed where the land keeps forgetting to end. Flat-bottomed boats work the channels between reed-islands; the shepherds on the Pinnath Gelin above watch the same fog every morning.
- Sparse coastal oak and pine survive on the headlands, wind-scoured and stunted, rooted in rock above the fishing villages. Below them, the salt makes everything short and tough.
- The Pinnath Gelin hills are the spine of the region — green enough in summer, grey in winter — with a few rivers cutting down to an Anduin estuary that smells of tidal mud at low water.
- A temperate maritime climate that means grey drizzle more than dramatic weather. The coast rarely sees frost; the hills behind it sometimes do. The sea rules the mood of the land.
- Fishermen who know every tide-channel and shepherds who know every pass in the Pinnath Gelin, and both groups largely indifferent to what Gondor decides in Minas Tirith.

**Locations (25):**

- **Gwaerost** _(castle · pop. 50)_ — Un castillo del suroeste de Anfalas en manos de la Casa Maldring de Haerlond. Sus torres de piedra dominan el camino de la costa; la hacienda que lo rodea cultiva cereal y cría ovejas en la llanura ventosa de Anfalas. El castillo es a la vez guarnición en servicio y casa señorial — práctico antes que elegante, con una guarnición pequeña y la casa del señor compartiendo sus muros.
- **Tir Feren** _(castle · pop. 80 · Gondor)_ — Un castillo gondoriano que domina Parth Feren, en el extremo occidental de Pinnath Gelin. Construido con piedra del lugar, vigila las colinas de hayas que le dan su nombre ('Guarda de las Hayas'). Una guarnición pequeña y la casa del señor mantienen el castillo; el parque de hayas viejas que lo rodea es apacible en verano, pero queda expuesto al viento del mar en invierno.
- **Annulond** _(city · pop. 1200 · Gondor)_ — El pueblo principal de Pinnath Gelin, asentado en la punta de una lengua de tierra donde un arroyo bajado del Ram Galen se une al Lefnui. La gente de Annúlond mantiene el único puente que cruza el Lefnui en esta región. El pueblo es modesto pero ordenado: casas pequeñas de piedra, de uno o dos pisos, bordean las calles, y la casa grande del teniente-Cáno se alza junto a la plaza principal abierta, que baja en pendiente hasta el muelle del río. Como la zona queda en el interior apacible de Gondor, nunca se construyó una muralla. Fuera del pueblo, la casa señorial del Caballero de Annúlond domina las granjas de sus vasallos y las parcelas de los arrendatarios.
- **Lond Galen** _(city · pop. 5000 · Gondor)_ — La capital de Anfalas y su pueblo más grande, asentado cerca de la desembocadura del Celgalen, donde el río llega a la Bahía de Belfalas. Unos 5.000 habitantes trabajan como mercaderes, artesanos, marinos y funcionarios; casi todos atienden además parcelas fuera del pueblo para su pan diario. El edificio principal es la pequeña casa señorial del gobernador; unas pocas casonas nobles se alzan por encima de las habituales construcciones de piedra de uno o dos pisos. Un muro de quince pies (reconstruido en la T.E. 1652, cuando las incursiones de los Corsarios se volvieron endémicas) encierra la zona poblada, y un fuerte pequeño guarda el acceso sur.
- **Serelond** _(city · pop. 1300 · Gondor)_ — Un pueblo de Anfalas sobre el Celgalen, con unos 1.300 habitantes dedicados a la industria pequeña, al comercio local y a la agricultura de subsistencia. Casas de piedra de uno o dos pisos bordean las calles; mercado semanal; feria anual. El edificio del concejo es el más alto. Un asentamiento provincial gondoriano típico y ordenado.
- **Aerost** _(fortress · pop. 300 · Gondor)_ — Una fortaleza costera sobre el Rathon Gondor, en Anfalas, unas cuarenta millas al oeste de Lond Galen. Construida después de la Gran Incursión sobre Pelargir (T.E. 1634) para defender la costa entre el Celgalen y el Lefnui, Aerost es un eslabón clave en la cadena de torres de fuego de Anfalas. Desde sus muros los vigías pueden avisar a los asentamientos vecinos de una incursión de los Corsarios en pocas horas. Las almenas de piedra del fuerte están gastadas por el viento salado, y un pequeño asentamiento de soldados y sus familias se acurruca a su sombra.
- **Dol Gwaer** _(fortress · pop. 400)_ — Una casa señorial del Nan Celgalen, en el oeste de Anfalas, asiento de una familia noble gondoriana menor. Su salón de piedra y las construcciones anexas se asientan en un valle arbolado; la hacienda de alrededor cultiva cereal y cría ovejas. Una casa pequeña de criados y arrendatarios mantiene el lugar en orden.
- **Lomost** _(fortress · pop. 120 · Gondor)_ — Junto con su fortaleza hermana de Aerost, Lómost ('Fortaleza del Eco') es una de las dos almenaras costeras decisivas para la defensa de Anfalas frente a las incursiones de los Corsarios. Construida en la T.E. 1634, después de la Gran Incursión sobre Pelargir, se alza en la costa occidental de Anfalas y puede transmitir noticia de un enemigo que se acerque a Lond Galen o a Annon Drúin en pocas horas por medio de su torre de fuego. La fortaleza es una construcción costera sólida, de piedra oscura, castigada por el viento del mar; la guarnición es pequeña pero está atenta.
- **Pinnornost** _(fortress · pop. 540)_ — Una fortaleza fronteriza de Anfalas que guarda el paso del Len Lefnui a la entrada del Nan-i-Feryth, llamada así por su posición en una loma cubierta de pinos. Pinnornost fue construida en la T.E. 823 para sostener el paso en la frontera con los clanes daen de Haerawreigion. Una torre de fuego se comunica con una torre hermana treinta millas al este. Hacia la T.E. 2157 se juzgó que la guarnición costaba demasiado mantenerla; la fortaleza fue cerrada y desde entonces se ha ido deteriorando poco a poco.
- **Car Gaul** _(manor · pop. 30)_ — Una hacienda libre en el Condado de Nan Lefnui, sobre el curso bajo del Lefnui. Es propiedad de la familia Bannor, que cultiva los campos y pastos de este rincón remoto de la frontera occidental de Gondor. La casa señorial es una granja sólida de piedra, con un patio y un corral de establos pequeños.
- **Osgar** _(manor · pop. 40)_ — 
- **Rond Deren** _(manor · pop. 15)_ — Una casa señorial recogida entre las colinas del norte de Anfalas, entre Umb Estelwain y Rond Rhandir, en el Condado de Agarinna. Rond Deren es un caserón de piedra con granjas anexas — una hacienda tranquila y bien mantenida, de una familia noble gondoriana menor que atiende sus tierras y se mantiene al margen de la política mayor.
- **Tir Eiliant** _(manor · pop. 30 · Gondor)_ — El asiento señorial de Anfalas, hogar tradicional del gobernador provincial (Cáno). Una casa señorial de piedra y los edificios anexos, en una posición defendible que domina Anfalas; la casa del Cáno y su personal administrativo la mantienen como sede principal de la autoridad en la llanura costera.
- **Haerlond** _(point of interest)_ — Una pequeña aldea portuaria de Andrast, cuyo modesto muelle atiende a los barcos averiados al doblar el cabo peligroso. Bajo las casas de madera de la aldea yacen las ruinas enterradas de un asentamiento numenóreano más antiguo, visibles cuando el terreno se mueve. Los marinos conocen Haerlond como último refugio antes del mar abierto; los aldeanos tienen mano para remendar cascos y aprovisionar naves.
- **Annodrun** _(ruins · Gondor)_ — Annodrun fue una ciudad que no sobrevivió a los trastornos de su edad. Sus ruinas son extensas — muros derrumbados, plazas de mercado vacías y los tocones de columnas viejas — pero están deshabitadas y van desapareciendo lentamente bajo la vegetación.
- **Corgonin** _(town)_ — Un pueblo pequeño junto a un afluente del Morthond, en el este de Pinnath Gelin. Corgonin toma su nombre — 'Círculo de Piedras' — de un monumento misterioso en un montículo cercano: un obelisco negro y alto rodeado por un anillo de doce menhires grises. Nadie conoce su origen, y los lugareños lo evitan en general, aunque de tanto en tanto alguna oveja perdida se mete dentro. El pueblo en sí es un punto de reunión importante en invierno para los arreos de ovejas de la Mesta; el comercio de la lana domina la vida en primavera, con los esquiladores llenando todas las casas y una gran feria fuera de los muros.
- **Edhellond** _(town · pop. 2400 · 80% Silvan Elvish, 20% Sinda)_ — Fundada por Elfos que huían de la Ruina de Beleriand a comienzos de la Segunda Edad.. Punto de partida para los Elfos que dejan la Tierra Media.. Edhellond está situada sobre un islote dentado en la desembocadura del río Morthond.
- **Tirith Cobas** _(town)_ — Una torre élfica en la orilla occidental de Lond Cobas, fundada por Celeborn el Sabio como puesto avanzado de Edhellond. Se alza en la cima de una colina alta y sirve de faro para los barcos que pasan, comunicándose por señales de luz con Tirith Aear, en Dol Amroth, al otro lado del agua. La torre la usan como lugar de reunión y de retiro los líderes de los linajes de Edhellond. El viajero que llega por mar ve la luz mucho antes de que la torre misma se haga visible.
- **town** _(town)_ — 
- **Adavalinda** _(village · pop. 140)_ — Una aldea pequeña en la orilla oriental del Lefnui, donde el río se junta con la confluencia del Rámanen. Sirve de punto de partida para los viajeros que buscan cruzar las Montañas Blancas por el Cirith Iaur, unas cuarenta millas al noroeste. La balsa que hay aquí es el último cruce fácil antes de que el río se angoste y solo admita botes de fondo plano. Casas de piedra y madera se agrupan alrededor del embarcadero, y sus habitantes viven en buena medida de guiar viajeros y de trabajar el río.
- **Calenin** _(village)_ — 
- **Doldorth** _(village)_ — Una aldea de la región de Ithilien, en Gondor; un asentamiento modesto de casas de labranza de piedra rodeadas por los jardines de hierbas y los huertos por los que Ithilien es famosa. Al viajero que llega en primavera o en verano lo golpea el perfume de las hierbas en flor y las terrazas ordenadas que suben por la ladera. La vida es tranquila; la gente cultiva hierbas, olivas y cereal.
- **Druabad** _(village · pop. 206)_ — 
- **Limmon** _(village)_ — 
- **Rond Rhandir** _(village)_ — Una aldea del lado norte del Ram Galen, con unas cincuenta familias y 300 habitantes. Casi todos son granjeros — vasallos, arrendatarios o pequeños propietarios que cultivan cereal y heno. Todas las casas son de piedra, de un piso y una o dos habitaciones, salvo la casa algo más grande, de dos pisos, del noble del lugar. En invierno los hombres van a los bosques cercanos a cortar madera y bajan los troncos flotando hasta los molinos del valle del Morthond. Después de la esquila se hace una feria de mercado fuera de la aldea.

---

### Anorien

**Tipo:** province · **Área:** ~49.185 km² · **Familia cultural:** gondorian

**Clima real análogo:** Umbria interior, Perugia, Italy (Köppen: `Csa-Csb`)

Anórien is the northern fief of Gondor that occupies the strip of land between the northern slopes and valleys of the White Mountains and the west bank of the Anduin, opposite northern Ithilien. Established towards the end of the Second Age along with Ithilien and Lebennin as part of Gondor’s Anduin heartland, it later remains the only Gondorian fief north of the White Mountains when Calenardhon is ceded to the Éothéod to become Rohan. The region is defined by mountain-fed valleys, tall grasslands and scattered woods, pierced by the Great West Road and guarded by beacon-peaks and the Drúadan Forest.

**Descripciones ambientales (rotativas):**

- The green province north of the White Mountains — the Pelennor's fenced fields and orchards running up to the City walls, with the beacon-hills marching east along the mountain feet.
- Tended woods of beech and fir on the foothills; beyond them the dark pines of Drúadan keep their own counsel. Every height carries a beacon against a day of need.
- The Great West Road runs straight through the townlands to the fords of the Isen. Farms, dykes and orchards crowd close here; this is the garden and granary of the City.
- Warm summers, hard bright winters off the mountains. The wind that comes down at evening smells of high snow even when the fields are in flower.
- Country-folk of the Mark's kin and the City both — farmers and herdsmen who keep the beacons and the roads, and look south to the white wall that walls the world.
- The Rammas wall rings the fields; outside it the land climbs in long green slopes to the hills where the signal-fires wait, unlit but ready.

**Locations (14):**

- **Minas Tirith** _(fortified city · pop. 25000 · Gondor)_ — Llamada en su origen Minas Anor (S. Torre del Sol), Minas Tirith fue construida al pie del Monte Mindolluin, en las Ered Nimrais. La ciudad se levantaba en siete niveles concéntricos de piedra blanca, con cada puerta desplazada respecto de la anterior, y la Torre Blanca albergaba el último palantír en poder de Gondor. Junto con Osgiliath y Minas Ithil formaba el núcleo de Gondor.
- **Bar Astirian** _(manor · pop. 20)_ — La Casa Astorion (S. Bâr Astorion) fue el antiguo hogar de la Casa Astorion, una familia noble gondoriana. Se hallaba en las afueras de las Bocas del Entaguas, al norte de Min-Rimmon, donde la familia tenía tierras extensas.
- **Bar Duilin** _(town)_ — Un pueblo de Anórien situado sobre el Anduin, frente a la fortaleza isleña de Cair Andros. Su ubicación lo vuelve una posta natural para los soldados, los mensajeros y los suministros que cruzan hacia la fortaleza y desde ella; un campamento de guarnición y un embarcadero dominan la ribera. Casas de piedra y barracas de madera bordean el camino principal que baja hasta la balsa.
- **Bar Erui** _(town)_ — Un caserío de montaña de no más de treinta y cinco casas en las lomas de las Montañas Azules, conocido como Eruimar u 'Hogar Solitario'. Aunque es remoto, se lo divisa con facilidad desde lejos. Fundado como puesto comercial dúnadan para tramperos y montañeses, conserva ese carácter a mediados de la Tercera Edad, con un arroyo pequeño, el Laughing Brook, que atraviesa el asentamiento. La taberna del lugar puede llenar una noche larga con relatos salvajes de las colinas.
- **Dol Caranthan** _(town · pop. 320)_ — Un pueblo de Anórien en la orilla occidental del Anduin, al norte de Cair Andros, asiento de la familia noble local de la Casa Caranthôn. Sus casas de piedra dan al gran río, y el embarcadero de la balsa ve un tránsito regular de soldados y mercaderes. El salón de la familia Caranthôn es el edificio más grande del asentamiento.
- **Dunmardo** _(town · pop. 111)_ — Un pueblo gondoriano pequeño, o una aldea grande, en el centro de Anórien; asiento del condado y solar ancestral de la familia noble del mismo nombre. Su nombre sindarin significa 'asentamiento del oeste'. Casas de piedra, una casa señorial y un mercado pequeño caracterizan a este asentamiento provincial ordenado.
- **Emlin** _(town)_ — Una aldea pequeña de pescadores en el Ángulo más meridional de Lossarnach, donde el río Erui llega al gran Anduin. Sus casas de piedra y sus muelles de madera dan a la confluencia; la gente de aquí son pescadores que trabajan las aguas ricas del encuentro de los ríos. Hay botes de fondo plano y redes tendidas en cada orilla.
- **Imloth Melui** _(town)_ — Imloth Melui ('Valle de las flores dulces') es un valle fértil de Lossarnach salpicado de asentamientos pequeños, huertos y jardines de hierbas. Su asentamiento principal es Arnach, sede de Forlong el Gordo, Señor de Lossarnach. El valle es famoso por sus rosas y por sus hierbas curativas; al viajero que pasa a caballo en primavera lo golpea el color y el perfume de las laderas en terrazas. La Casa de la Mano Suave y la Casa de la Dama Vanyalos son conocidas en todo el sur de Gondor por sus sanadores.
- **Tir Elena** _(town · pop. 490 · Gondor)_ — Un pequeño pueblo gondoriano de Anórien, en el linde nororiental del Bosque de Drúadan — capital y asiento de la Casa Elenion, los barones locales. Casas de piedra con techos de teja bordean el camino que pasa por el borde del bosque; el Bosque de Drúadan queda apenas más allá de la línea de árboles, al sur. A los woses del bosque no se los ve nunca en el pueblo, pero su presencia se siente siempre.
- **Astirian** _(village)_ — La casa señorial ancestral de la Casa Astorion, una familia noble gondoriana de Anórien, en los bordes de las Bocas del Entaguas, al norte de Min-Rimmon. La casa es una sólida residencia gondoriana de campo, de piedra labrada, rodeada de tierras de labranza y pastos extensos. La familia Astorion tiene estas tierras desde comienzos de la Tercera Edad; su salón se alza como un mojón callado en la llanura verde y plana.
- **Amon Dîn** _(watchtower · pop. 120 · 100% Gondorian)_ — La construcción de una plataforma de señales fue ordenada en la S.E. 3325 por Anárion de Gondor. Mejorada en el siglo quinto de la Tercera Edad.. Parte de la red de comunicaciones septentrional de Gondor.. Amon Dîn era la primera, contando de este a oeste, de una cadena de siete torres de almenara. Su fuego de vigilancia transmitía a Minas Anor el aviso de cualquier ataque a las fronteras septentrionales de Gondor.
- **Calenhad** _(watchtower · pop. 90 · 100% Gondorian)_ — Su construcción fue ordenada en la T.E. 491 por el Rey de Gondor, sobre el sitio de una plataforma de señales anterior.. Comunicaciones en el norte de Gondor.. Calenhad es la sexta almenara de la cadena que se extiende desde Minas Anor hacia el noroeste.
- **Halifirien** _(watchtower · pop. 100 · 100% Gondorian)_ — La torre actual se terminó en la T.E. 529.. Eslabón de la cadena de comunicaciones de Gondor en Anórien.. Halifirien se asienta en el límite de Anórien y Calenardhon.
- **Min-rimmon** _(watchtower · pop. 75 · 100% Gondorian)_ — La torre actual se terminó en la T.E. 516.. Eslabón de la red de comunicaciones septentrional de Gondor.. La quinta almenara de la serie se construyó en una montaña llamada Rimmon.

---

### Dor Rhunen

**Tipo:** province · **Área:** ~218.264 km² · **Familia cultural:** gondorian

**Clima real análogo:** Extremadura, Cáceres, Spain (Köppen: `Csa`)

Dor Rhunen, the 'Land of the East,' comprises the semi-arid, vast southern plains and rolling grasslands surrounding the southern shores of the Sea of Rhûn. Extending southwest toward the desolate Battle Plain of Dagorlad and bordered to the south by the ash-choked fences of Mordor, this is a harsh, wind-swept buffer territory. It is heavily influenced by the cultures of Rohan and the Wold to the west, but dominated by exceptionally brutal nomadic Easterling tribes, such as the Variags, Nuriags, and Asdriags, who frequently raid the trade caravans.

**Descripciones ambientales (rotativas):**

- Vast semi-arid steppes south of the Sea of Rhûn, swept by Easterling nomadic tribes of brutal reputation. The Dagorlad closes the south and the shadow of Mordor haunts the southwest horizon. A land without law or mercy.
- Short-grass steppe and scrub desert running south toward the shadow of Dagorlad. Easterling tribes cross it in columns that raise dust visible for a day's ride; no one lingers here who doesn't have to.
- Feathergrass and rough sedge bend low in the east wind, the only vegetation on the flat where the soil grows thin and the rock shows through. Water is the only reason anyone stops anywhere in this landscape.
- The horizon is always the same distance away. The plateau drops toward the Dagorlad in the south with no visible transition — the land simply gets harder and emptier and more hostile without explanation.
- Summers are burning and dry; winters short enough to be cruel. The Easterlings who cross this land in any season do so fast, with enough water calculated to the last skin.
- Nomadic raiders and traders who belong to no kingdom. Their allegiances shift with the wind and whoever can make the better offer. Mordor's shadow on the southwest horizon has shaped their entire politics.

**Locations (1):**

- **Burh Beorills** _(town)_ — El asiento del clan Berilas a lo largo del Men Rómen, en las colinas de Duil Rewinion, conocido en rohírrico como Berilabaurg o 'Pueblo de los Ositos'. Un asentamiento empalizado de los Hombres del Norte, de salones y casas largas de madera; sus corrales de ganado y sus depósitos quedan detrás de una palizada de madera. Los Berilas son gente ruda de las colinas; su salón está colgado de pieles de oso y de armas viejas.

---

### Dor-en-Emyl

**Tipo:** province · **Área:** ~112.796 km² · **Familia cultural:** gondorian

**Clima real análogo:** Alentejo, Portugal (Köppen: `Csa`)

Dor‑en‑Ernil, the Land of the Prince, is a princely fief in south‑central Gondor encompassing Belfalas and neighboring lowlands and highlands; ruled from the coastal city of Dol Amroth, it is famed for its White‑ships, Elven‑tinged nobility, and constant tension with Umbar and the Eredrim highlanders.

**Descripciones ambientales (rotativas):**

- Southern Gondor's princely peninsula governed from Dol Amroth, city of white towers above the sea. Silver-rich mountains, rugged cliffs, Elvish-blooded nobility and the sacred kirinki birds make this the most singular land in Gondor.
- The Dol Amroth peninsula, white towers above the sea and the silver-veined Ered Torthonion behind. The Prince of Belfalas rules from the most singular city in Gondor; the Elvish blood of the Swan Knights shows in their bearing.
- Silver-rich mountains descend to a rocky coast of sea-caves and natural harbors. The kirinki birds nest in the sea-cliffs and their calls carry at dawn for a mile or more; there is no sound more particular to this land.
- The headland juts into Belegaer with cliffs on three sides and the mountains closing the fourth. Dol Amroth sits at the exact point where the land and sea have decided they will share it equally.
- Mediterranean in character: warm and dry in summer, mild and wet in winter. The White Mountains keep the worst of the north winds off; the sea moderates everything else.
- The Swan Knights of Dol Amroth and the merchants who supply them. Elvish blood that shows in the height and the pale eyes; a dignity that is not arrogance but comes close enough to annoy the rest of Gondor.

**Locations (18):**

- **Dol Amroth** _(city · 90% Gondorian, 10% Mixed Mannish)_ — Dol Amroth — llamada así por el rey Amroth de Lórien, que se ahogó frente a esta costa en la T.E. 1981 — es la gran ciudad costera y el asiento del Príncipe de Dor-en-Ernil. Sus torres blancas se alzan desde un acantilado alto sobre la bahía; el puerto de abajo es uno de los mejores de Gondor, hogar de los navíos de guerra y de las naves mercantes de altos mástiles de la flota meridional. Los barrios más viejos de la ciudad tienen algo de élfico — piedra labrada con gracia y la influencia persistente del asentamiento élfico que hubo aquí — mientras que los muelles nuevos resuenan con el ruido de cualquier puerto activo.
- **Linhir** _(city · pop. 4100 · 95% Gondorian, 5% Mixed Mannish)_ — Fundada por Anárion en la S.E. 3421.. Puerto y centro de comercio y manufactura, situado donde el Camino de Gondor cruza el Gilrain.. Linhir es próspera y concurrida, y ha crecido en ella una población numerosa de gente de mal vivir que se aprovecha de los débiles y los incautos.
- **Bar-Lymen** _(point of interest)_ — Un municipio autónomo y Grithion de Lebennin, sobre el curso medio del Gilrain; su nombre significa 'Hogar del Camino Azul'. Casas de piedra y un mercado pequeño atienden a las tierras de labranza de alrededor. Su autonomía como Grithion le da un carácter algo más independiente que a la aldea gondoriana corriente.
- **Methrast** _(tower · pop. 87 · Gondor)_ — Methrast es el cabo más meridional de la península de Belfalas — acantilados verticales, imposibles de escalar, y bajíos peligrosos a los que solo los pilotos más diestros se atreven a acercarse por mar. El cabo marca también uno de los extremos del sistema de almenaras costeras de Belfalas; la noticia de un enemigo avistado aquí puede llegar a Dol Amroth en pocas horas. Abajo, en las orillas rocosas, las focas se asolean. En el cabo mismo no hay asentamiento, solo un pequeño puesto de vigía.
- **Andram** _(town)_ — 
- **Bar Algund** _(town)_ — Un pueblo pequeño del oeste de Belfalas, cercano a la gran sede de Dol Amroth y dentro del mismo Grithion. Las casas de piedra y el puerto pequeño de Bar Algund dan a la Bahía de Belfalas; el pueblo vive de la pesca y del comercio con la corte del Príncipe, ahí cerca.
- **Cirith Dudhrandir** _(town · pop. 450)_ — Cirith Dudhrandir era el único paso de montaña importante de la península de Belfalas y el único con camino empedrado, lo que lo volvía vital para las defensas meridionales de Gondor. A 5.800 pies de altura y con más de sesenta millas de este a oeste, lo guardaba la fortaleza de Naur Amrûn. El paso recibió su nombre en la S.E. 3400, cuando Edhelion de Eldalonde recibió Belfalas en feudo.
- **Dim Lamedon** _(town)_ — Un pueblo de Lamedon, en Gondor, en el valle del río Lamedon, al pie de colinas empinadas. El nombre 'Dim Lamedon' alude al carácter umbrío del valle; el asentamiento es un pueblo de mercado gondoriano modesto, de casas de piedra con techos de pizarra, que atiende a las granjas y los pastos dispersos de las tierras altas de alrededor.
- **Diniath** _(town)_ — Una aldea del Condado de Gilrain, en el suroeste de Lebennin, asentamiento principal de la baronía pequeña del mismo nombre. Casas de piedra y una plaza de mercado pequeña bordean el camino; las tierras de labranza de alrededor y la pesca en el afluente del Gilrain sostienen una población modesta.
- **Eregost** _(town)_ — Un pueblo portuario del sudeste de Belfalas y asentamiento principal del Condado de Eregost. Sus muelles de piedra dan a las aguas abiertas de la Bahía de Belfalas; los botes de pesca y las naves mercantes pequeñas mantienen el puerto movido. Las casas del pueblo son de piedra encalada con techos de teja, y el olor a sal y a alquitrán es constante.
- **Nargond** _(town)_ — Un municipio de Belfalas sobre el camino de la costa, más o menos a mitad de camino entre Ráma y Endil. Es el asentamiento principal del condado del mismo nombre — un pueblo gondoriano modesto de casas de piedra, botes de pesca y naves mercantes pequeñas. El camino de la costa lo mantiene conectado con la economía más amplia de Belfalas.
- **Ostara** _(town)_ — Un pueblo gondoriano pequeño del sudeste de Belfalas, considerado parte del Condado de Eregost. Sus casas de piedra miran a las colinas del interior; el pueblo funciona como centro administrativo menor y como mercado de las tierras de labranza y las haciendas pequeñas de alrededor.
- **Rama** _(town)_ — Un pueblo de Gondor, o de la región costera, cuyo carácter y cuya economía reflejan la geografía del lugar.
- **Sarlond** _(town)_ — Un pueblo gondoriano pequeño en el Cabo de Sarlond, en el nordeste de Belfalas, entre Thonfalas y Eregost. Sus casas de piedra y su puerto pequeño dan a las aguas abiertas de la bahía; la pesca y el comercio de cabotaje son las actividades principales. El cabo da buen abrigo frente a las tormentas del oeste.
- **Thonfalas** _(town)_ — Un pueblo costero pequeño en el extremo oriental de Belfalas, en la parte occidental de la bahía del Gilrain y el Serni. Sus casas de pescadores, de piedra, dan al agua; la bahía ofrece buen fondeadero y pesca abundante. El pueblo es un asentamiento callado, curtido por el viento salado, que depende del mar.
- **Tumladen** _(town)_ — Un pueblo de Gondor en la región de Lamedon o Lebennin, un asentamiento gondoriano modesto de casas de piedra que atiende a las comunidades agrícolas de alrededor.
- **Galibur** _(village · pop. 280 · 100% Dunnish)_ — Poblada durante la expansión numenóreana en Gondor, hacia la S.E. 2500.. Sitio ritual dunlendino importante en el centro de la península de Belfalas.. Justo al norte del pueblo hay ruinas que se remontan a los tiempos de los Daen Coentis.
- **Endil** _(watchtower · pop. 24 · 100% Gondorian)_ — Endil es una de las torres de vigilancia que el Príncipe de Dor-en-Ernil mantiene a lo largo de la costa de Belfalas, construida por Anárion en la Segunda Edad para dar aviso de piratas y saqueadores. Su luz se ve desde los barcos que se acercan a los bajíos rocosos; la señal se transmite por la cadena hasta Dol Amroth en minutos. La guarnición es pequeña — un puñado de hombres — pero su posición domina el tramo más expuesto de la costa de Belfalas.

---

### Druwaith Laur

**Tipo:** province · **Área:** ~75.750 km² · **Familia cultural:** gondorian

**Clima real análogo:** Pembrokeshire, SW Wales (Köppen: `Cfb`)

Drúwaith Iaur, or Old Púkel-land, is an extremely remote, isolated, and obscure territory in northwestern Gondor, bordering Andrast to the west and the Westmarch to the east. Once claimed and nominally administered by Gondor, the region fell into extreme desertion and depopulation following the Great Plague of T.A. 1636. By T.A. 1640, no Dúnedain remain, leaving the wild, rugged, and uncultivated terrain to be ruled at a clan level by scattered tribes of Dunmen (Dunir) and native Drúedain (Wild Men).

**Descripciones ambientales (rotativas):**

- Remote northwestern Gondor, abandoned by the Dúnedain after the Great Plague. Wild Drúedain and Dunir clans rule rocky hills and ravines of short violent waterfalls, invisible to and uncaring of any outside authority.
- Northwestern Gondor abandoned after the Great Plague, reclaimed by wild heath and the Drúedain and Dunir clans who were always more at home here than the Gondorians. Rocky ravines and short waterfalls; authority of no kind.
- Unmanaged coastal heathland on the exposed ground; mossy forest pockets in the ravines; rough marsh in the valley bottoms. The land is recovering from cultivation with the enthusiasm of landscape that was never fully domesticated.
- The headlands here are dramatic — short cliffs and surge channels cut into the rock. The coast is not navigable for most of the year; the ravines are not traversable without local knowledge. Both features are defensive.
- Atlantic climate that was always too wet and too exposed for comfortable Gondorian settlement. The Drúedain, who came from different expectations, find it perfectly suited.
- Drúedain who were here before Gondor came and are still here now that Gondor is gone. The land fits them in a way it never quite fit the Dúnedain; their relationship to it is comfortable in the manner of long occupancy.

**Locations (1):**

- **Hwalord** _(town · pop. 520 · Gondor)_ — Un pueblo de la región, cuyas casas de piedra y muelles atienden el comercio de la zona de alrededor. Los detalles de su carácter dependen de la economía local y de su señor.

---

### Forithilien

**Tipo:** province · **Área:** ~25.209 km² · **Familia cultural:** gondorian

**Clima real análogo:** Val d'Orcia, Tuscany, Italy (Köppen: `Csb`)

Forithilien, or North Ithilien, is the northern part of Gondor’s eastern Anduin province between the Great River and the Ephel Dúath, stretching from the Dead Marshes and Nindalf southward to the valley of the Ithilduin (later Morgulduin). It is the section of Ithilien most clearly shown in The Lord of the Rings, where Frodo, Sam and Gollum travel towards Cirith Ungol and where Faramir’s rangers maintain secret refuges like Henneth Annûn. In Gondor’s strength it is famed as a fair, fertile land of climbing woods, swift streams and rich gardens; by the late Third Age it is largely depopulated and serves as a hidden war-ground between Gondor’s rangers and the forces moving out of Mordor.

**Descripciones ambientales (rotativas):**

- Northern Ithilien at the edge of the Shadow — the Morgul Vale cuts the hills, its stream polluted and its air oppressive, and the dead city stands at its mouth.
- The land was once the garden of Gondor; now the pale luminous meadows of the vale steam with deadly vapour, and the water sounds cold and cruel in the dark.
- The wraith-road and the Harad Road meet at the Cross-roads; a broken statue of a king sits crowned with white flowers, a small defiance of green in the grey land.
- Sheer stairs climb the vale's western wall — the Straight and the Winding Stairs, cut between rock faces and riddled with the crevices of forgotten winters.
- The woods grow paler and more silent as the vale nears; beyond the eastern rim the sky is stained red, and it is hard to tell dawn from the fires of Mordor.
- Rangers still move in the northern hills, and the green things of Ithilien fight a slow war against the valley's poison — a fair land in the Shadow's hand, but not yet dead.

**Locations (3):**

- **Osgiliath** _(city · pop. 2500 · 90% Gondorian, 10% Mixed Mannish)_ — Osgiliath fue la capital fundacional de Gondor, construida por los hijos de Elendil en ambas orillas del Anduin, en su punto más ancho. Su gran cúpula albergó un palantír; el Puente de Osgiliath cruzaba el río en un solo arco grácil. La ciudad ha sufrido enormemente — buena parte se quemó durante la Lucha entre Parientes y el palantír se perdió en el río — y hacia mediados de la Tercera Edad mucho de ella está abandonado o en ruinas. Los barrios habitados de la orilla occidental conservan un fantasma de la grandeza anterior.
- **Cair Andros** _(fortress · pop. 560 · Gondor)_ — Cair Andros (S. Nave de la Espuma Larga) era una fortaleza isleña en el río Anduin, unas cuarenta millas al norte de Osgiliath. Con forma de gran navío, con una proa rocosa y alta apuntando al norte, fue fortificada por el Senescal Túrin II para proteger Anórien de los cruces enemigos. Sirvió como baluarte septentrional decisivo de Gondor frente a Mordor durante toda la última parte de la Tercera Edad.
- **Rianbar** _(town)_ — Un pueblo de Harithilien, situado al sur de las Emyn Arnen, sobre el río Dinnen. Sus casas de piedra y su plaza de mercado atienden a las tierras de labranza del sur de Ithilien; el valle del Dinnen es conocido por sus olivares y sus jardines de hierbas, y el puerto pequeño del pueblo maneja el tránsito fluvial desde y hacia Pelargir.

---

### Hairavercien

**Tipo:** province · **Área:** ~32.536 km² · **Familia cultural:** gondorian

**Clima real análogo:** Abruzzo, Italy (Köppen: `Csa-Csb`)

Southern Gondor comprises the fertile river valleys, coastal plains, highland vales and mountain flanks between the White Mountains (Ered Nimrais) and the Bay of Belfalas, encompassing the provinces of Lebennin, Belfalas/Dor-en-Ernil, Lamedon, Anfalas and the Pinnath Gelin—the heartland of Númenórean civilization in Middle-earth.

**Descripciones ambientales (rotativas):**

- Sub-region in the upper Morthond valleys, defined by its rock fords: easy summer crossings over bright water, dangerous winter traps of ice and flood. Pine and mountain birch, Gondorian miners and alpine herders in the high vales.
- Upper Morthond valleys defined by rock fords — easy enough in summer, lethal traps of ice and flood in winter. Pine and mountain birch on the valley sides, Gondorian miners at the ore-faces and alpine herders moving between the high pastures.
- Stone pines on the lower mountain slopes mix into mast-pines and then pure conifer above a certain altitude. Lebethron grows in the highest valleys — dark and dense, prized for its workability and its particular smell.
- The Morthond runs fast and clear between limestone walls; in winter the fords freeze from the edges inward and the stones below the ice are audible at night. The sound is beautiful and the crossing is not.
- Sub-Mediterranean mountain climate: warm and dry in summer when the valley traps heat between the valley-walls; cold and snow-bound in winter when the passes close. Brief dramatic springs when the snowmelt turns the fords white.
- Gondorian miners who know the ore-veins and alpine herders who know the high pastures and both of whom know the ford-timings better than any map records. The knowledge is local and doesn't travel well.

**Locations (4):**

- **Annon Wain** _(city · pop. 2500)_ — Annon Wain, en el valle alto del Lefnui, era un centro de mercado local. Al norte quedaban minas extensas cuyo mineral se embarcaba río abajo hacia Annúlond, mientras que los abetos cercanos de las Ered Nimrais abastecían a los astilleros navales de Gondor. El pueblo en sí era modesto — casas de mercaderes, viviendas sencillas y depósitos junto al río — con una población de unos 2.500 habitantes.
- **Saerthondost** _(fortress · pop. 200 · Gondor)_ — Saerthondost fue una de las dos plazas fuertes dúnedain que protegían Pinnath Gelin y Nan Lefnui de las tierras salvajes de Hairaverkien. Situada en la orilla norte del Lefnui, donde el río gira bruscamente al noroeste, recibió su nombre por los pantanos cercanos, ricos en hierbas de pastor. Una torre de fuego la unía con su fortaleza hermana de Pinnornost, al nordeste; fue fundada en la T.E. 823 y abandonada en la T.E. 2157.
- **Lindabad** _(manor · pop. 20)_ — 
- **Cum Arelaid** _(ruins · Gondor)_ — Ruinas. Un antiguo complejo funerario de túmulos prenumenóreanos y tumbas revestidas de piedra, sagrado para los primeros pueblos de la región.

---

### Harithilien

**Tipo:** province · **Área:** ~45.219 km² · **Familia cultural:** gondorian

**Clima real análogo:** Gard, Provence, France (Köppen: `Csb`)

Harithilien is South Ithilien, a distinct, fertile, and beautiful region bordering Harondor and Mordor. It is characterized by volcanic soils enriched by the Ephel Dúath, featuring ancient ruined estates of Gondor, hidden ranger outposts, and lush vegetation.

**Descripciones ambientales (rotativas):**

- Southern Ithilien — the garden of Gondor gone half-wild: hills of gorse and heath, woods of fir and cedar, and glades thick with herbs that the sun turns to incense.
- A singing land under a shadowed sky — streams thread the glades to hidden falls and green pools, and the air is fresh with a sweetness that recalls the distant North.
- Rangers' country; the paths are hidden and the lookouts are secret. The ruins of Gondor's watch-places stand among the trees, still held against the East.
- The land is fair but scarred — fire-marks in the clearings, trampled glades, and always the dark line of the Ephel Dúath closing the eastern sky.
- Warm and sweet in summer, grey and sleeping in winter; rain comes soft and fragrant off the mountains and the herbs answer it.
- Water is the music of Ithilien — singing streams, hidden waterfalls, and dark pools under the green shade; the land will not be made ugly while the water runs.

**Locations (10):**

- **Porosir** _(manor · pop. 34 · Gondor)_ — Un castillo y casa señorial gondorianos en el suroeste de Ithilien, sobre las orillas septentrionales del Poros. Es el asiento fronterizo occidental de la Casa Faron, cuyo dominio guarda este tramo de las tierras de frontera. El castillo es una casa señorial militar en servicio, de piedra labrada, con el patio siempre movido por caballos y hombres que van y vienen por el camino del Poros.
- **Sindamos** _(manor)_ — Una casa señorial del oeste de Harithilien, asentamiento principal del condado de Glorel. Conocida en sindarin como Thindamost ('Casa gris que asciende'), se asienta en una ladera suave sobre las tierras de labranza de Ithilien. La casa es un salón gondoriano de piedra con construcciones anexas y jardines cerrados; el condado de alrededor es conocido por sus olivas y sus hierbas.
- **Trenas** _(manor)_ — El asiento del guardián real de Tolfalas y el asentamiento principal de la isla (conocido también como Gobel Tolfalas). Queda en el extremo de una ría larga del sudeste, con un puerto para navíos de guerra. Las casas de piedra se apiñan al pie de una loma; el torreón pequeño del guardián se alza en la pendiente de arriba. El pueblo pasó de base militar a asentamiento civil modesto durante la Tercera Edad, aunque sigue siendo un lugar de soldados y marinos más que de mercaderes.
- **Bar-en-Dinnen** _(point of interest · pop. 432 · Gondor)_ — Bar-en-Dinnen (S. Morada sobre el Dinnen) fue una aldea de pescadores y un pueblo de comercio fluvial en el sur de Ithilien, unas sesenta millas al sur de Minas Tirith, en la unión de los ríos Tinnen y Anduin. Al ser el único asentamiento de importancia de Harithilien al norte de Hyarpende, era un nudo importante del comercio fluvial entre Ithilien y Lebennin.
- **Aludor** _(town)_ — Un pueblo pequeño del suroeste de Harithilien, a mitad de camino entre Hyarpendë y Tir Ethraid, sobre el camino que atraviesa la región. Es notable por ser el asiento de la Casa Alagdor, una de las familias nobles antiguas de Ithilien, cuyo castillo solar, Târik-Ûriyat, se alza en un espolón rocoso sobre los campos y los olivares de alrededor. Casas de piedra con techos de teja bordean el camino principal; el aire trae olor a hierbas y a terrazas cultivadas.
- **Athrad Poros** _(town · pop. 450)_ — El asentamiento del vado de Athrad Poros era una parada importante en la ruta comercial terrestre hacia el sur. Empezó como guarnición militar para proteger la frontera entre el naciente Reino en el Exilio y la esfera de influencia de Umbar. Cuando se abrió el Corredor del Harnen, Athrad Poros pasó a ser un cruce decisivo para el comercio con el Harad Cercano y Khand.
- **Bar Morvegil** _(town)_ — Un pueblo pequeño de Harithilien sobre un afluente del Poros, conocido en otro tiempo como Bar Miruvor ('Casa del Jugo Precioso') y rebautizado Bar Morvegil ('Casa de la Espada Negra') cuando la familia noble del lugar adoptó un blasón guerrero. Sus casas de piedra y su muelle fluvial pequeño atienden a los viajeros del camino del Poros; huertos y jardines de hierbas cubren las laderas suaves de alrededor.
- **Bar Nepos** _(town)_ — Un pueblo pequeño con torre de vigilancia en la desembocadura del río Nethos, en el suroeste de Harithilien, solar de la casa noble de Nethos. La torre domina la confluencia y el camino a Pelargir. Las casas del pueblo son compactas y de piedra; la torre es la estructura más alta en muchas millas.
- **Hyarpendë** _(town)_ — El pueblo comercial más importante de Harithilien, Hyarpendë ('Ladera del Sur' en quenya) se asienta en la orilla oriental del Anduin, frente a Pelargir, en el extremo norte del camino Hyarmentie. Cada dos horas cruza una balsa hasta Pelargir, casi siempre cargada de mercaderes, caballos y mercancías. El pueblo pasó de aldea perezosa a centro comercial movido: los mercaderes tratan en caballos y mulas, una línea de diligencias baja hacia el sur por el Poros, y la posada de los Cinco Halcones da de comer al cansado (a precios altos). En el centro del pueblo se alza un obelisco numenóreano de treinta pies que marca el final del camino.
- **Tir Ethraid** _(town · pop. 1030 · 85% Gondorian, 15% Haradan)_ — Poblada por gondorianos hacia la T.E. 930.. Mantener la vigilancia sobre los Cruces del Poros; sitio de comercio; defensa frente a las incursiones haradanas.. Tir Ethraid es blanco frecuente de las incursiones haradanas, pero el rey Tarondor ha comprometido bastante oro para reforzar los recursos del pueblo.

---

### Harondor

**Tipo:** province · **Área:** ~123.556 km² · **Familia cultural:** gondorian

**Clima real análogo:** Almería, Cabo de Gata, Spain (Köppen: `BSh`)

Harondor is the arid, contested plateau between the Poros river and the Vale of Harnen, bounded by the Ephel Dûath to the east and the Belfalas coast to the west; a perpetually disputed borderland between Gondor and the Haruze/Umbarean powers, drier and hotter than the Gondorian heartland. Geology consists of igneous bedrock, with basalt common near the coast and granite further inland. valuable coastal salt panning is a major industry.

**Descripciones ambientales (rotativas):**

- Arid plateau between the Poros and Harnen rivers, perpetually disputed between Gondor and Umbar. Basalt and granite, poor soil, coastal salt flats and ruins of both civilisations layered over one another in a land of volatile loyalties.
- Disputed plateau between the Poros and the Harnen, too far south for Gondor to hold easily and too valuable for Umbar to ignore. Basalt outcrops, poor thin soil and coastal salt flats on a contested border.
- Sparse thorny scrubland and the occasional desert shrub on a plateau that gets half the rain of Lebennin and twice the wind. The vegetation is honest about what it is: the minimum required to survive.
- Ruins of both Gondorian watchtowers and Umbrian encampments occupy the same ridgelines, sometimes within sight of each other. The geology doesn't take sides; the limestone and granite are simply old.
- Hot dry summers, brief mild winters; the wind off the desert in summer strips everything not anchored down. The salt flats on the coast are blindingly white in the afternoon sun.
- Soldiers and smugglers, with a few stubborn farmers who have lived in the middle of the dispute so long they have stopped expecting resolution. Their loyalties depend entirely on who controls the nearest waterhole.

**Locations (3):**

- **Barad Harn** _(town · pop. 560 · 70% Haradan, 30% Gondorian)_ — Fundada en la T.E. 1256 sobre las ruinas de un pueblo anterior destruido por un huracán.. Apoyo al comercio y a la industria pesquera del lugar; foco del poder gondoriano en Harondor.. Es el puesto más meridional de autoridad exclusivamente gondoriana. Como cabe esperar, las incursiones haradanas sobre este puesto son frecuentes y brutales. El Gobernador destina buena parte de sus finanzas a mantener seguras las murallas de Barad Harn.
- **Eithel Thurin** _(town · pop. 620 · 40% Gondorian, 60% Haradan)_ — Eithel Thurin es un pueblo-guarnición gondoriano de Harondor, fundado por el ejército en la T.E. 932 para extender el control de Gondor sobre esta disputada región costera. Funciona como centro de comercio del tránsito de cabotaje y como base principal de la autoridad gondoriana entre los ríos Poros y Harnen. El pueblo sufre incursiones frecuentes de Umbar y de los haradrim hostiles; sus murallas se han reparado muchas veces, y su población tiene algo de vigilante y de sitiada.
- **Methir** _(village · pop. 500 · 70% Gondorian, 30% Haradan)_ — Poblada por gondorianos hacia la T.E. 970.. Centro de comercio en Harondor, que abastece y atiende al tránsito costero que se acerca al Ethir Anduin.. Methir fue saqueada hace poco por haradrim en incursión, y el pueblo todavía no ha recuperado su papel de posta para el tránsito fluvial.

---

### Lamedon

**Tipo:** province · **Área:** ~70.400 km² · **Familia cultural:** gondorian

**Clima real análogo:** Cilento, Campania, Italy (Köppen: `Csa`)

Southern Gondor comprises the fertile river valleys, coastal plains, highland vales and mountain flanks between the White Mountains (Ered Nimrais) and the Bay of Belfalas, encompassing the provinces of Lebennin, Belfalas/Dor-en-Ernil, Lamedon, Anfalas and the Pinnath Gelin—the heartland of Númenórean civilization in Middle-earth.

**Descripciones ambientales (rotativas):**

- The Vale of Morthond — a broad green bay of grass beneath the southern cliffs of the White Mountains, where the Blackroot river comes down cold and loud out of the heights.
- On the mountain's root stands the Dimholt, a wood of black trees where the light does not enter; beyond its ancient stones the Dark Door waits, and the Paths of the Dead go under the mountain.
- Green upland pastures climb to long spurs and sheer cliffs; the vale is fertile and the hills are high, and the mountain's shadow fills the head of the valley through most of the day.
- A mountain vale of long light and early dusk — the sun leaves it soon, the lights come on early in the dwellings below, and the sound of the Morthond fills the evening.
- The folk are herdsmen and high-farmers, mountain-men of Gondor; they keep the stone circles of the older world and do not speak of the wood at the valley's head.
- Deep snow on the heights in winter, green water-meadows in spring; the cold comes down off the peaks before the light fails, and the river runs loud under icy banks.

**Locations (5):**

- **Calembel** _(fortified town · pop. 1100 · 100% Gondorian)_ — Poblada por numenóreanos a fines de la Segunda Edad; recibió fuero de Ostoher de Gondor en la T.E. 488.. Aprovisionamiento de las comunidades mineras de las Ered Nimrais; asiento del Señor Protector de Lamedon.. Calembel está sobre el camino que une el centro de Gondor con las comunidades mineras del sur de las Montañas Blancas.
- **Ethring** _(fortified town · pop. 1300 · 95% Gondorian, 5% Dunnish)_ — Poblada por gondorianos a fines de la Segunda Edad; recibió fuero real en la T.E. 180.. Pueblo de mercado que atiende a casi todas las comunidades agrícolas y mineras de Lamedon.. Ethring se beneficia del tránsito por el Camino de Gondor.
- **Glanhir** _(fortified town · pop. 1300 · 85% Gondorian, 15% Dunnish)_ — Recibió fuero real en la T.E. 630, posiblemente construida sobre ruinas élficas de la Segunda Edad.. Punto de acopio de los granjeros del lugar; centro económico del centro-oeste de Gondor; puerto fluvial.. Situada en la confluencia de los ríos Morthond y Ringló, Glanhir se considera la Puerta de Anfalas.
- **Ossarnen** _(fortified town · pop. 1400 · 85% Gondorian, 15% Dunnish)_ — Ossarnen es un pueblo minero gondoriano de las Montañas Blancas, establecido en la Segunda Edad y crecido desde entonces. Su población trabaja los filones minerales de las montañas vecinas; el asentamiento queda bien apartado del camino principal, unido a él por una senda tosca. Las casas de piedra y las bocaminas se apiñan en el fondo estrecho del valle; el sonido de los picos y los martillos llega lejos en el aire claro de la montaña.
- **Caborlad** _(point of interest)_ — 

---

### Lebennin

**Tipo:** province · **Área:** ~100.229 km² · **Familia cultural:** gondorian

**Clima real análogo:** Emilia-Romagna Adriatic coast, Italy (Köppen: `Csa`)

Lebennin, the Place of Five Waters, is the rich, river-laced heartland of Gondor between the White Mountains and the Anduin, a fertile province of rolling fields, busy ports and Sea-lords whose fleets fight Corsairs and smugglers across the Bay of Belfalas.

**Descripciones ambientales (rotativas):**

- Agricultural heartland of southern Gondor, laced by five rivers that fertilise its plains and wetlands. Grey-stone villages, busy river-ports and the densest population in all Gondor make this a prosperous and vital land.
- Five rivers threading a fertile plain, the most productive land in southern Gondor. Grey-stone villages on every ford, busy river-ports and a population dense enough to make a real city feel natural here.
- Silver-green meadows of niphredil and simbelmynë in the wet margins; orchards on the river-terraces; fields of grain in the flat centre. The land has been worked for so long it barely remembers being wild.
- The Gilnduin, Celos, Serni, Erui — the five rivers give the province its name and its wealth. Each has its mills, its tolls and its garrison. Each floods in spring and runs slow and green in summer.
- A mild maritime climate with rainy winters and warm summers, rarely extreme in either direction. The one thing Lebennin has never had to worry about is drought; the five rivers see to that.
- Dense settlement by Gondorian standards: farmsteads visible from each other's chimneys, roads maintained by local guilds, river traffic day and night. If Gondor has a heartland, this is it.

**Locations (18):**

- **Minas Arthor** _(city · pop. 5000 · Gondor)_ — Minas Arthor, antaño capital de Arnach, se alzaba en los vados del Erui, donde había habido un asentamiento desde las crónicas más antiguas. Fundada a comienzos de la Tercera Edad, creció hasta ser el centro de un distrito agrícola próspero.
- **Minas Brethil** _(city · pop. 3000)_ — Minas Brethil (S. Torre del Abedul Plateado), capital de Celossien, se hallaba en el valle alto del Serni y funcionaba como centro agrícola entre los ríos Glinduin y Serni. Después de la Lucha entre Parientes tenía unos 4.000 habitantes, número que la Gran Plaga redujo a la mitad y que solo se recuperó lentamente.
- **Pelargir** _(fortified city · pop. 2500 · Gondor)_ — Pelargir (S. Garth de las Naves Reales) fue fundada por los Fieles de Númenor en la S.E. 2350 y llegó a ser el puerto principal y la ciudad más antigua de Gondor, construida sobre el Anduin en la desembocadura del Sirith. Sirvió de base para la gran flota de Gondor y fue el puerto comercial principal del reino, segunda ciudad solo después de Minas Tirith.
- **Arnbad** _(town)_ — Un pueblo pequeño del este de Methed Lebennin, asiento del Grithion del mismo nombre. Su nombre — 'Senda Real' en sindarin — deja ver un camino viejo que alguna vez pasaba por su centro. Casas de piedra y una casa de mercado modesta rodean un cruce a la sombra de unos plátanos; las tierras de labranza de alrededor dan cereal y olivas.
- **Bar Annuland** _(town)_ — 
- **Bar Gilraen** _(town)_ — Un pueblo pequeño de Lebennin sobre el curso bajo del Gilrain, varias leguas al nordeste de Linhir. Es el asiento de la familia noble de Bar Gilraen, que tiene el condado de alrededor. Casas de piedra prolijas, con techos planos o de teja, dan a una plaza central; las orillas fértiles del Gilrain sostienen el cultivo de cereal y algo de comercio de lana.
- **Bar Luindol** _(town)_ — Un pueblo pequeño de Lossarnach, situado sobre un afluente del Erui, unas leguas al sur de Minas Arthoron, en el Rathon Gondor. Es el asiento ancestral de la familia noble de Bar Luindol. Sus casas de piedra y sus terrazas cultivadas se benefician del suelo rico de Lossarnach.
- **Bar Olchaldor** _(town · pop. 348)_ — 
- **Barfalas** _(town)_ — Una aldea pequeña de pescadores en Lebennin, sobre el Anduin, al suroeste de Pelargir. Casas de piedra con las redes tendidas a secar dan a una cala abrigada; la gente de aquí pesca en el río y vende lo que saca en el mercado más cercano. La aldea es pequeña y tranquila.
- **Dol Calimir** _(town)_ — Un pueblo de Lebennin sobre un afluente pequeño del Serni, a mitad de camino entre Minas Brethil y Pelargir. Su posición en esta ruta lo vuelve una parada habitual para los viajeros. Casas de piedra y una posada pequeña; en los últimos años el pueblo se fortificó con un muro exterior nuevo.
- **Echorost** _(town)_ — Una aldea fortificada del suroeste de Lossarnach, en la confluencia del Celos y el Sirith, asentamiento principal del condado de Enedhîr. Su nombre — 'Fuerte del Anillo' — refleja su trazado defensivo circular: muros de piedra y una plaza central que sirve de mercado y de campo de reunión. Las tierras de labranza de Lossarnach son ricas; la aldea exporta cereal, lana y las famosas rosas del valle.
- **Fanuilond** _(town · pop. 750 · 100% Gondorian)_ — Fanuilond es una aldea de pescadores gondoriana en el Ethir Anduin, ocupada sin interrupción desde comienzos de la Tercera Edad y blanco repetido de las incursiones de los Corsarios. Su posición inmejorable en la desembocadura del Anduin sigue trayendo gente de vuelta a pesar del peligro; los pescadores de aquí son experimentados y duros, y el puerto — pequeño como es — mueve un volumen sorprendente de comercio fluvial. Las murallas del pueblo se han reconstruido más de una vez.
- **Lalornen** _(town)_ — Un pueblo de Lebennin sobre el curso medio del Serni, a mitad de camino entre Brethil y Linhir. Es un pueblo de mercado gondoriano modesto, de casas de piedra, que atiende a las comunidades agrícolas del valle del Serni y funciona como posta en el camino entre los dos asentamientos mayores.
- **Lindon** _(town)_ — Un asentamiento élfico costero en Lindon, uno de los últimos dominios élficos del occidente de la Tierra Media. Es pequeño y tranquilo — edificios elegantes de madera y piedra medio ocultos entre los árboles cerca de la orilla, mantenidos por Elfos que prefieren la compañía del mar a la de los Hombres. Al viajero le llama la atención el orden y la belleza de todo lo que hay aquí: las herramientas guardadas con prolijidad, los jardines atendidos con cuidado evidente, y siempre, en algún lugar del fondo, el sonido de música o de voces calladas.
- **Minas Airnach** _(town)_ — Un pueblo del oeste de Lebennin, en Gondor, cuyas casas de piedra y cuyo mercado pequeño atienden a las comunidades agrícolas del valle fluvial de alrededor.
- **Pellas** _(town)_ — Un pueblo o aldea gondoriana pequeña del este de Lebennin, unas veinticinco millas al nordeste de Pelargir, en el Condado de Landor. Conocida también como Barath Tâlhir, es una hacienda libre de la Casa Tâlhir, una familia de caballeros del lugar. Casas de piedra y una casa señorial modesta; el cereal y el ganado son la producción principal de la hacienda.
- **Tir Serni** _(town)_ — Un pueblo y un castillo de Lebennin sobre el curso bajo del Serni, unas 45 millas al este de Linhir. Su posición sobre el Serni lo vuelve una posta del tránsito fluvial; el castillo domina el agua desde un promontorio bajo. Las casas de piedra del pueblo y su mercado pequeño atienden a los granjeros del valle del Serni.
- **Lorilad** _(village · pop. 89)_ — Lórilad fue una aldea fortificada de Lebennin, situada en el Ethir Anduin unas setenta y cinco millas río abajo de Pelargir, a mitad de camino entre Pelargir y el cabo occidental de Lebennin.

---

### Tolfalas

**Tipo:** province · **Área:** ~14.749 km² · **Familia cultural:** gondorian

**Clima real análogo:** Gargano Peninsula, Puglia, Italy (Köppen: `Csa`)

Lebennin, the Place of Five Waters, is the rich, river-laced heartland of Gondor between the White Mountains and the Anduin, a fertile province of rolling fields, busy ports and Sea-lords whose fleets fight Corsairs and smugglers across the Bay of Belfalas.

**Descripciones ambientales (rotativas):**

- Volcanic island in the Bay of Belfalas with peaks, fumaroles and hot springs. The sacred oiolair trees grow only here; sea turtles nest on its dark beaches. Dramatic beauty and geological instability in equal measure.
- Volcanic island in the Bay of Belfalas, with hot springs, fumaroles and the dark oiolair trees that grow nowhere else in the world. The geology is unstable; the beauty is extreme.
- The oiolair trees rise thirty feet from their own heat, flowering year-round from the warmth of the volcanic ground. Sea turtles nest on the black beaches each summer without fail; the combination makes this island unlike any other place.
- Peaks visible from the Gondorian coast on clear days, with steam rising from the flanks. The beaches are black volcanic sand that burns the foot in summer; the sea around them turns turquoise in shallow water.
- The volcanic interior keeps the island warmer than the surrounding sea; the coastal strip is almost tropical by Gondorian standards. The centre is unpredictable — fumaroles vent without warning.
- No permanent population, and Gondor has never quite decided what to do with it. Scholars visit for the oiolair trees; fishermen use the sheltered coves; the island has its own agenda.

**Locations (1):**

- **Tolfalas** _(town)_ — La isla de Tolfalas es una isla grande y remota que guarda la desembocadura del Anduin, con una geografía que va de acantilados costeros agrestes a ensenadas abrigadas. El asentamiento principal (Gobel Tolfalas) queda en el extremo de una ría larga de la costa sudoriental, alrededor de un puerto que sirve de base naval gondoriana desde la T.E. 759. Casas de piedra suben por la loma sobre la ría; el torreón pequeño del guardián domina el agua. El aislamiento y la posición estratégica de la isla la vuelven un lugar de marinos de paso y de hombres de armas más que de granjeros asentados.

---

### Westmarch

**Tipo:** province · **Área:** ~49.609 km² · **Familia cultural:** gondorian

**Clima real análogo:** Costa Brava, Girona, Spain (Köppen: `Csa`)

Rohan is a beautiful territory and one of the jewels of the Gondorian crown, a wide land of rolling pastures and coombes dominated by the towering peaks of the White Mountains, home of the semi‑nomadic Horse‑lords who became the Rohirrim after T.A. 2510.

**Descripciones ambientales (rotativas):**

- Western frontier of Gondor between the Fords of Isen and the Andrast. Heather-covered hills, swift rivers and a Gondorian presence that fades westward. Dunlendish farmers have filled the void left by the departed Dúnedain.
- The western edge of Gondor, where the kingdom's authority thins like the heather on the hills. Dunlendish farmers fill the land the Dúnedain left; the Isen to the north is the real frontier.
- Heather hills and swift rivers, the terrain of a border country that knows it is a border country. The roads are maintained but watched; the wayhouses are fortified and the innkeepers ask questions.
- Hills and upland moors carry the western spurs of the White Mountains to their end above the sea. Beneath them, in the valleys, farmland that has changed hands so many times its ownership is the oldest local argument.
- Cold winds from the Atlantic sweep up the coast and stall against the mountains; rain is reliable. The summers are never warm enough for Gondorian tastes, which is partly why the Dúnedain left.
- Dunlendish settlers who remember their own history of displacement and farm accordingly — defensively, quietly, keeping what they hold and expecting to have to hold it harder tomorrow.

**Locations (9):**

- **Beldwin** _(castle · pop. 475 · 60% Dunman, 40% Dúnadan)_ — Beldwin es un castillo dúnadan y el asentamiento que lo rodea, en el norte de la Marca del Oeste, justo al sur del río Isen y cerca de un antiguo puente de piedra. Funciona como base administrativa de este rincón de la región y mantiene una guarnición que conserva el orden entre la población mixta de dunlendinos y dúnedain. El castillo es sólido y está bien mantenido; el puente que tiene al lado soporta un tránsito considerable entre la Marca del Oeste y las tierras del norte.
- **Tilmendir** _(castle · pop. 140 · 70% Gondorian, 30% Dunnish)_ — Construido por Gondor hacia la T.E. 991.. Vigilancia del tránsito que pasa de la Marca del Oeste a Anfalas; muestra de autoridad ante las tribus dunlendinas del lugar.. Tilmendir se encuentra diez millas al sur del pueblo de Derwath.
- **Rendûl** _(fortified town · pop. 980 · 60% Gondorian, 40% Dunnish)_ — Ocupada por Gondor desde por lo menos la T.E. 954; recibió fuero real en la T.E. 1187.. Puesto comercial regional sobre el río Morthond; defensa frente a la insurrección dunlendina.. Rendûl es quizá la mejor base para explorar el interior de Anfalas.
- **Dol Faeren** _(town)_ — Un pueblo gondoriano de montaña asentado en una loma baja del Dwimorberg, con vista al Valle del Morthond. Sus casas de piedra se agarran a la pendiente; la gente de aquí son granjeros y pastores que trabajan los pastos altos. La sombra del Dwimorberg encantado le da al lugar un aire contenido; los lugareños se atienen a las costumbres viejas y no hablan a la ligera de las alturas que tienen encima.
- **Nineryn** _(town)_ — Los Nineryn ('Bosques Húmedos') son dos bosques pantanosos contiguos que se juntan alrededor del curso alto del Morthond. Caminar por ellos es difícil por lo cenagoso del terreno; los viajeros los evitan por lo general, y el Señor de Mornan los reclama como coto de caza privado. La caza furtiva se multa con dureza. Aquí no hay asentamiento alguno — los Nineryn son un mojón y una advertencia para quien deja el camino.
- **Derwath** _(village · pop. 250 · 20% Gondorian, 80% Dunman)_ — Poblada por pioneros gondorianos alrededor de la T.E. 609.. Comunidad agrícola; cumple funciones administrativas en la escasamente poblada Marca del Oeste.. La aldea sirve de cuartel general a un destacamento de montaraces.
- **Ehuir** _(village)_ — 
- **Morven** _(village)_ — 
- **Vervain** _(village)_ — 

---

## Gramuz

### Gramuz

**Tipo:** province · **Área:** ~50.900 km² · **Familia cultural:** northman

**Clima real análogo:** Prešov, Slovakia (Köppen: `Dfb`)

Gramuz is a rugged northern wilderland region of Dor Rhunen, situated north of Dorwinion and south of the Iron Hills. It is characterized by undulating lowlands, rolling hills, and scattered mixed woodlands. It is a harsh frontier territory populated by semi-nomadic Easterling clans and hardy Northmen who struggle for survival against the bitter cold winds blowing from the northeast Sea of Rhûn.

**Descripciones ambientales (rotativas):**

- Land of low hills and sparse woodland between Dorwinion and the Iron Hills. Cold northeast winds and semi-nomadic Easterling clans who survive by hunting, fishing and trading furs. A harsh frontier territory.
- Gloomy pine and spruce on rolling hills, with the freezing bite of the Sea of Rhûn carried on every northeast wind. A place where men grow taciturn and the trees grow crooked.
- Mixed woodland of larch and stubborn oak fills the valleys between Dorwinion and the Iron Hills, but the tundra crowds in from the north and wins a little more ground each century.
- Low, rounded hills that offer no shelter from the wind. The rivers run brown and fast with snowmelt in spring, then drop to cold threads between exposed stones by autumn.
- The cold arrives early and stays long. Snow on the high ground before the end of the first month of autumn; the ice on the rivers doesn't fully break until the third month of spring.
- Semi-nomadic Easterling clans who trap and fish and move on. Their fires smell of pine resin and smoked fish; they leave little and take less, and they watch strangers with the patience of people who have survived worse.

**Locations:** —

---

## Harlindon

### Ardolyalinya

**Tipo:** province · **Área:** ~16.790 km² · **Familia cultural:** sindar

**Clima real análogo:** Kerry, SW Ireland (Köppen: `Cfb-Cfc`)

Lindon is the westernmost Elvish realm of Middle-earth, the remnant of Ossiriand that survived the War of Wrath. After the breaking and flooding of Beleriand, the Great Sea breached the Blue Mountains to form the Gulf of Lhûn, dividing Lindon into Forlindon (North Lindon) and Harlindon (South Lindon), with the River Lhûn as the eastern border against Arnor. Throughout the Second and early Third Age it is the principal Elven coastal realm and home of the Grey Havens (Mithlond). Geology consists of folded sedimentary rock (slate and sandstone) with rich iron lodes and abundant coal deposits in forlindon.

**Descripciones ambientales (rotativas):**

- Inner northern hills of Harlindon where old oaks and birches reach gold in autumn and the Sindar Elves live in quiet contemplation. The sea is heard but not seen here, lending this land its gentle melancholy.
- Inner hills of northern Harlindon with old oaks turning gold in autumn. The Sindar here live in quiet contemplation of a sea heard but not seen; the rolling of the water reaches them as sound without sight.
- Oak and birch on the inner hillsides, with bracken in autumn and spring wildflowers in the clearings. The Elvish settlements are built low and integrated into the slope so that they read as landscape rather than architecture.
- Rounded hills with the Ered Luin visible to the east and the Gulf of Lhûn to the west as a line of light between the hills. The distance from the sea is the defining quality here — present but not immediate.
- Cooler and wetter than the southern Harlindon coast, with autumn arriving early enough to make the gold leaves genuinely dramatic. The Sindar who chose this location chose well.
- Noldor and Sindar Elves who came here after the War of Wrath and have been here since, which means they've had time to become the landscape rather than just inhabiting it.

**Locations (3):**

- **Harlond** _(town · pop. 500 · 100% Gondorian)_ — Poblada poco después de la fundación de Minas Anor, hacia la S.E. 3320.. El puerto de Minas Anor; supervisa el tránsito fluvial del Anduin.. Harlond es un pueblo activo, que maneja casi toda la carga del sur de Gondor destinada a las tierras de Calenardhon y Rhovanion.
- **Lond-in-Telerrim** _(town · pop. 546 · Noldor)_ — Un puerto élfico falathrin de la costa occidental, hogar de una comunidad de Elfos teleri que cría ovejas y trabaja el mar. En el Taur-in-Telerrim ('Bosque de los Teleri') cercano corren rumores persistentes sobre un dragón pequeño agazapado en lo profundo del bosque — aunque ninguna búsqueda ha dado nunca con su guarida. Los edificios de piedra encalada del puerto dan al agua; el olor a lanolina y a sal está en todas partes.
- **town** _(town)_ — 

---

### Ardquetto

**Tipo:** province · **Área:** ~16.803 km² · **Familia cultural:** sindar

**Clima real análogo:** West Cork, Ireland (Köppen: `Cfb-Cfc`)

Lindon is the westernmost Elvish realm of Middle-earth, the remnant of Ossiriand that survived the War of Wrath. After the breaking and flooding of Beleriand, the Great Sea breached the Blue Mountains to form the Gulf of Lhûn, dividing Lindon into Forlindon (North Lindon) and Harlindon (South Lindon), with the River Lhûn as the eastern border against Arnor. Throughout the Second and early Third Age it is the principal Elven coastal realm and home of the Grey Havens (Mithlond). Geology consists of folded sedimentary rock (slate and sandstone) with rich iron lodes and abundant coal deposits in forlindon.

**Descripciones ambientales (rotativas):**

- Narrow valleys in Harlindon's northern foothills where short rivers run down from the Ered Luin to the Gulf. Alders and willows along salmon-rich streams; a place tied by tradition to the Nandor women who first settled Lindon.
- Narrow valleys in northern Harlindon where short rivers run fast down from the Ered Luin to the Gulf. Alders and willows along salmon-rich streams, and the tradition that the Nandor women who first settled Lindon camped here.
- The valleys are small and the rivers loud; the water is cold even in summer and the salmon runs in autumn are dense enough to attract bears from the mountains. The Elves fish with the patience of those who have time.
- Rushing water and narrow light — the valleys orient north-south and catch the morning and evening sun but miss the midday. The effect is a landscape in which shadow and light alternate through the day.
- Cool summers in the shadow of the mountains; cold winters when the snow fills the valley-floors. The streams keep running through winter because the gradient is steep enough to prevent complete freezing.
- Nandor Elves with long roots in this specific landscape. The memory of the first settlement is alive here in a way it isn't in the more recently-built communities further south.

**Locations (4):**

- **Dodind's Tavern** _(inn)_ — 
- **Dremant Inn** _(inn)_ — 
- **The Aglahad Blade** _(inn)_ — 
- **The Zant Shield** _(inn)_ — 

---

### Ered Luin

**Tipo:** province · **Área:** ~10.521 km² · **Familia cultural:** sindar

**Clima real análogo:** Voss, Norway (Köppen: `Dfc`)

Ered Luin, also known as the Blue Mountains, is an ancient mountain range separating Lindon from Eriador. Extending 590 miles from the Ice Bay of Forochel down to Orod Elu in the south, the range is formed of grey rock with a bluish tint caused by a high concentration of copper ores. The mountains are riddled with natural caverns, marble and limestone formations, and once held precious metals, though Dwarvish mining has left them depleted of gold except for minor remote veins. Geology consists of marble and limestone with folded sandstone and shale foothills. abundant copper, iron, and tin ores are actively mined by the dwarves (naugrim).

**Descripciones ambientales (rotativas):**

- The Blue Mountains and green Lindon between them and the Sea — the last piece of drowned Beleriand, split by the Gulf of Lhûn where the water comes far inland.
- Tall pine-woods and oakwoods on the seaward slopes, older than any other living woods in the west. The range itself is old and worn, its peaks low and blue in the sea-haze.
- West of the gulf lie the Grey Havens and the white quays; the ships that leave them do not return. The road to the water is the oldest road still travelled.
- Dwarf-halls and elven havens share the land — the mountains hold the mansions of old Nogrod's kin, and the coast keeps the last ports of the Eldar.
- Sea-weather rules here — long grey rains, salt wind, snow that lies long on the high moors but rarely in the sheltered vales.
- Everything in Lindon smells of the Sea; even the mountain streams run with a salt wind behind them, and the sunsets over the water are the last sight of the world.

**Locations (4):**

- **The Éadcwén Mare** _(inn)_ — 
- **manor** _(manor)_ — 
- **manor** _(manor)_ — 
- **manor** _(manor)_ — 

---

### Ered Luin Vales

**Tipo:** province · **Área:** ~14.795 km² · **Familia cultural:** sindar

**Clima real análogo:** Connemara Highlands, Ireland (Köppen: `Cfb`)

The Ered Luin Vales encompass the central valleys, river passes, and sub-alpine basins of the Blue Mountains. This region is centered around the Nan-i-Naugrim (Dwarven Vale) and the headwaters of the River Annuduin, where the Dwarves established a complex network of fourteen holds, including Merlost, built on the ruins of ancient Belegost.

**Descripciones ambientales (rotativas):**

- Sub-alpine valleys and gorges of the Ered Luin with fourteen Dwarven hall-fortresses, including Merlost over the ruins of Belegost. Firs on rock walls, snowmelt waterfalls and the constant ring of Dwarven picks.
- Sub-alpine valleys and gorges of the Ered Luin with fourteen Dwarven hall-fortresses from Merlost southward. Firs on rock walls, snowmelt waterfalls audible from a mile and the ring of Dwarven picks carried on the wind.
- The valleys between the mountain faces are genuinely sheltered — warmer and drier than the exposed ridgelines above, cold enough for good timber and the kind of silence that sits around heavy industry.
- Merlost above the ruins of Belegost: a name that carries the weight of what was lost in the First Age. The new halls are solid and practical and the Dwarves who live in them have their own relationship with that history.
- Short summers when the snowmelt waterfalls are at full volume; long winters when the snow fills the valley-floors and the only warmth is inside the mountain. The Dwarves prefer the inside; the valleys are for moving between.
- Dwarven craftsmen and miners who have organised their entire lives around the mountain. Outsiders pass through on the east-west trade route; the Dwarves observe and occasionally engage.

**Locations (4):**

- **Nornhabar** _(dwarven mine · pop. 84 · Dwarves)_ — La población enana varió considerablemente y alcanzó su máximo en la Segunda Edad. La mina fue abandonada en buena parte antes de la Guerra de la Última Alianza y, aunque nunca quedó del todo desierta, hacia la T.E. 1643 estaba muy deteriorada.
- **Tumnogoth Iaur** _(dwarven mine · pop. 112 · Dwarves)_ — Los Enanos de Tumnogath eran pobres y reservados. Muchos de sus jóvenes habían emigrado a las lejanas Colinas de Hierro, y la comunidad se estancó en el lapso de unas pocas generaciones. La población enana que quedaba se componía en buena parte de buscadores de tesoros y de hojalateros ambulantes.
- **The Bril Forge** _(inn)_ — 
- **Luithen** _(village)_ — Una aldea de Forlindon o de la zona de las Montañas Azules, pequeña y tranquila; los detalles de sus habitantes y de su economía no están bien documentados en los registros actuales.

---

### Lairiardhon

**Tipo:** province · **Área:** ~12.526 km² · **Familia cultural:** sindar

**Clima real análogo:** Clare, W Ireland (Köppen: `Cfb`)

Lindon is the westernmost Elvish realm of Middle-earth, the remnant of Ossiriand that survived the War of Wrath. After the breaking and flooding of Beleriand, the Great Sea breached the Blue Mountains to form the Gulf of Lhûn, dividing Lindon into Forlindon (North Lindon) and Harlindon (South Lindon), with the River Lhûn as the eastern border against Arnor. Throughout the Second and early Third Age it is the principal Elven coastal realm and home of the Grey Havens (Mithlond). Geology consists of folded sedimentary rock (slate and sandstone) with rich iron lodes and abundant coal deposits in forlindon.

**Descripciones ambientales (rotativas):**

- Gentle hills in the heart of Harlindon, known for the Elvish tradition of singing at dawn from hilltops facing the sea. Ancient oaks in open meadows and river-pebble paths between the mountains and the coast.
- Gentle hills in central Harlindon with river-pebble paths between the mountains and the coast. The Elvish tradition of singing at dawn from hilltops facing the sea started here; the acoustics of the valley invite it.
- Ancient oaks in open meadows, the understorey kept clear enough to walk through. The sense of an intentional landscape — not garden exactly, but managed, tended, thought about over long centuries.
- A valley oriented directly toward the sea that catches the dawn light. In summer the mornings are quiet and mist-free enough to hear the water from the hilltops; in winter it takes longer for the light to reach the valley floor.
- Mild and damp, with the Atlantic influence keeping the temperatures even year-round. A place of pleasant weather by the standards of northern Middle-earth, which is probably why the Elves chose it.
- Sindar who live here because they chose this specific valley for specific reasons that have to do with sound and light and orientation to the sea. The choice is still visible in how they've arranged themselves in it.

**Locations (8):**

- **The Dend Haven** _(inn)_ — 
- **Falastir** _(manor)_ — 
- **manor** _(manor)_ — 
- **manor** _(manor)_ — 
- **manor** _(manor)_ — 
- **manor** _(manor)_ — 
- **Anhamar** _(point of interest)_ — La tierra alta que se extiende sobre el Valle del Anghir, donde se alza la fortaleza de Anghul — páramo desolado y roca oscura, barridos por los vientos que le dan su nombre a Anghul. No hay asentamiento de importancia, solo puestos militares y alguna patrulla de los hombres del Rey Brujo vigilando la Tierra de Nadie.
- **Talanobel** _(town)_ — Una aldea nando-sinda gobernada por los descendientes de los Elfos Huéspedes de Arthorien, el linaje de Ithilbor. Su nombre significa 'Pueblo de los Flets'; los edificios están asentados en plataformas en los árboles, por encima de los rápidos de un arroyo cercano que los aldeanos usan para sus industrias pequeñas. La luz se filtra por la bóveda de hojas y el sonido del agua es constante.

---

### Lildardhon

**Tipo:** province · **Área:** ~9.738 km² · **Familia cultural:** sindar

**Clima real análogo:** Galway Bay coast, Ireland (Köppen: `Cfb`)

Lindon is the westernmost Elvish realm of Middle-earth, the remnant of Ossiriand that survived the War of Wrath. After the breaking and flooding of Beleriand, the Great Sea breached the Blue Mountains to form the Gulf of Lhûn, dividing Lindon into Forlindon (North Lindon) and Harlindon (South Lindon), with the River Lhûn as the eastern border against Arnor. Throughout the Second and early Third Age it is the principal Elven coastal realm and home of the Grey Havens (Mithlond). Geology consists of folded sedimentary rock (slate and sandstone) with rich iron lodes and abundant coal deposits in forlindon.

**Descripciones ambientales (rotativas):**

- Open plain of Harlindon swept by the gulf wind. Grass that bends in silver waves, heather in spring bloom and Elvish bonfires dotting the dark on gathering nights. Bright and open with a gentle underlying melancholy.
- Open Harlindon plain where the gulf wind runs without obstruction. Grass that bends silver in the breeze, heather in full bloom by spring and Elvish bonfires on the headlands on gathering nights.
- The most exposed part of Lindon — flat enough that the weather arrives visibly from the west. The Elves who live here have learned to read the cloud-shapes on the horizon and they are rarely caught by surprise.
- Low ground between the Ered Luin and the coast, with no feature to break the wind or the sight-lines. In this flatness there is a particular quality of openness that some find liberating and others find lonely.
- Relentless mild Atlantic weather — rarely extreme, rarely calm. The Elves who chose this landscape chose the wind as much as they chose the grass, and their architecture acknowledges both.
- Gatherings under open sky when the season permits. A less-cloistered community than the wooded sub-regions; they chose the plain deliberately and live accordingly.

**Locations (1):**

- **Lildamar** _(town)_ — Un pueblo de la región, cuyo carácter está moldeado por la geografía del lugar y por las rutas de comercio.

---

### Ronalindon

**Tipo:** province · **Área:** ~17.544 km² · **Familia cultural:** sindar

**Clima real análogo:** Connemara, Galway, Ireland (Köppen: `Cfb`)

Ronalindon is a serene coastal subregion of Harlindon situated along the shores of the Gulf of Lhûn and Belegaer. Famed for its peaceful forest glades, quiet river estuaries, and coastal mudflats, it represents a pristine maritime-woodland environment where Elves live in harmony with both the forest and the sea. Geology consists of folded sedimentary rock (slate and sandstone) with rich iron lodes and abundant coal deposits in forlindon.

**Descripciones ambientales (rotativas):**

- Southern coast of the Gulf of Lhûn where oak and ash forests reach down to the water. Labyrinthine tidal estuaries, otters among the roots and Elves who build light boats to sail the calm gulf.
- Southern Lindon coast where oak and ash reach the water of the Gulf of Lhûn. Labyrinthine tidal inlets where otters hunt and Elves who build light boats can disappear into the estuary system for days.
- Dense coastal forest with a damp, ferny understorey; the tidal estuaries make the distinction between land and sea ambiguous the same way estuaries everywhere do. The Elves here have built with that ambiguity rather than against it.
- The southern shore of the Gulf curves gently; the water is calm enough for small boats year-round and the inlet maze provides shelter even in the worst of the Atlantic storms.
- Milder than northern Lindon, with the Gulf of Lhûn acting as a heat reservoir. Winters are damp rather than cold; summers pleasant without being warm. The prevailing mood is grey-green and quiet.
- Sindar Elves who have been here since before the First Age ended and have had time to decide exactly how they want to live. Their interaction with outsiders is courteous and minimal; the estuary system is theirs.

**Locations (1):**

- **Mithlond** _(city · pop. 2200 · 50% Silvan Elvish, 40% Sinda, 10% Noldo)_ — Mithlond — los Puertos Grises — comprende dos puertos en el extremo del Golfo de Lhûn: Mithannúnlond en la orilla occidental y Mithrónalond en la oriental. Fundado por Círdan después del hundimiento de Beleriand, es el principal asentamiento élfico del occidente de la Tierra Media, un lugar de construcción de naves y de partida para quienes navegan hacia las Tierras Imperecederas. Sus muelles de piedra son gráciles y siempre hay en ellos alguna labor élfica callada; naves altas están fondeadas en el fiordo, con las velas blancas recogidas.

---

### South Harlindon

**Tipo:** province · **Área:** ~28.219 km² · **Familia cultural:** sindar

**Clima real análogo:** West Cornwall, England (Köppen: `Cfb-Cfc`)

South Harlindon is a green, quiet coastal and forest region south of the Gulf of Lhûn. Historically a fief under Celeborn, Harlindon is characterized by lowlands cloaked in rich deciduous and coniferous forests and a long-term peaceful rural atmosphere. The eastern foothills are used by Dwarves for active coal and iron mines. Geology consists of folded sedimentary rock (slate and sandstone) with rich iron lodes and abundant coal deposits in forlindon.

**Descripciones ambientales (rotativas):**

- Southernmost fringe of Lindon, where oak and conifer forests reach a rocky shoreline of tidal inlets. Dwarven mining roads in the eastern foothills and a small Sindar Elvish community living quietly by the sea.
- Southernmost Lindon coast where oak forest reaches rocky sea-inlets and tidal pools. A small Sindar community lives quietly here at the edge of both land and Elvish presence, closest to the wider world.
- Dense temperate forest with an aromatic understorey — bay and broom and something that has no name in Westron. The Dwarven mining roads from the eastern Ered Luin reach this coast and stop at the sea.
- Tidal inlets and rock shelves along the coast, with the forest right to the edge in places. The transition from solid land to sea is abrupt here in a way it isn't further north on the Gulf.
- Sheltered from the worst of the Atlantic weather by the Ered Luin to the northeast; milder than northern Lindon and wetter than the Gulf shore. A comfortable climate that doesn't announce itself.
- Sindar who chose the end of the road — literally the last coastal settlement before Belegaer — and who have the quiet manner of people who have thought about the sea for a very long time.

**Locations (6):**

- **Bar-i-Dinuviel** _(point of interest · pop. 244 · Noldor)_ — Bar-i-Dinuviel (S. Hogar del Ruiseñor; Os. Mbar Tinduvela) era una aldea de pescadores en la costa de Dor Tinuviel.
- **Danwaith** _(town)_ — 
- **Hyarlindunt** _(town)_ — Un pueblo del norte de Forlindon, cuya posición y cuyo carácter están moldeados por los vientos fríos de la costa septentrional y por la población escasa de estas tierras.
- **Bar-i-Dinuviel** _(village)_ — Una aldea de pescadores en la costa de Dor Tinuviel; su nombre significa 'Hogar del Ruiseñor'. Casas de piedra con las redes tendidas a secar dan a una cala abrigada; la gente de aquí pesca en las aguas costeras y comercia con lo que saca. La aldea es pequeña y tranquila, conocida sobre todo por los marinos que navegan este tramo de costa.
- **Caras Denethora** _(village)_ — 
- **Caras Denethora** _(village)_ — Una aldea élfica de flets del centro de Harlindon, fundada antes de la salida del Sol por Danitharo — último rey de los Elfos Verdes. Oculta en los bosques antiguos y sin senderos, sobrevivió sin daño a las cacerías de los orcos en la Primera Edad. En la Tercera Edad se ve muy parecida a como estaba al final de la Primera: plataformas y pasarelas de madera construidas en lo alto entre árboles viejos, unidas por puentes de cuerda, visibles solo cuando encienden los faroles al anochecer.

---

### Tower Hills

**Tipo:** province · **Área:** ~25.756 km² · **Familia cultural:** sindar

**Clima real análogo:** Clare/Burren, W Ireland (Köppen: `Cfb`)

The Tower Hills, or Emyn Beraid, are a range of green, rolling hills located west of the Shire. On their highest crests stand three ancient Elven-towers built by Gil-galad, where the Elendil Stone (palantír) was guarded for millennia.

**Descripciones ambientales (rotativas):**

- The Tower Hills — green ridges west of the Shire where the white towers of Elostirion stand, the last work of the Elves on the hither shore.
- Tall woods on the hill-flanks and the towers above them; the palantír of the west kept here once looked only toward the Sea.
- The East Road ends here — it runs on to the Grey Havens and the last quay. There is no way beyond the towers but the water.
- Sea-weather rules: salt wind, grey rain off the water, and clear days when the Sea itself is rumoured visible from the high stones.
- A green and lonely borderland; the hobbits farm the eastern slopes and the Elves pass through westward, going to the ships and not returning.
- The hills are the world's last green gesture before the grey water; every path through them ends at the Sea.

**Locations (4):**

- **Cebir Luin** _(ruins)_ — Una colina rocosa y empinada al sur de las Pinnath Luin, en Forlindon, escenario de una batalla en la S.E. 1700. Sus flancos están agujereados por excavaciones enanas antiguas. Para la Tercera Edad es una ruina: terraplenes cubiertos de maleza, túneles oscuros que gotean, y viajeros que pasan abajo y miran hacia la cresta de piedra dentada con inquietud.
- **Endrist** _(ruins)_ — Endrist fue en su momento un municipio de la región de las tierras altas, pero hacia mediados de la Tercera Edad su población había desaparecido hacía tiempo. Solo quedan los cimientos y unos tramos de muro — una ruina tranquila que evitan quienes conocen su historia.
- **Elostirion** _(tower · pop. 52 · 33% Dúnadan, 66% Eriadoran)_ — Construida por Gil-galad como regalo para Elendil.. Alberga uno de los palantíri.. Elostirion es la más alta y la más occidental de las tres Torres Blancas de las Emyn Beraid.
- **town** _(town)_ — 

---

## Iron Hills

### Iron Hills

**Tipo:** province · **Área:** ~84.083 km² · **Familia cultural:** dwarven

**Clima real análogo:** Chelyabinsk Oblast, Ural, Russia (Köppen: `Dfc`)

The Grey Mountains (Ered Mithrin) form a long, cold northern range between Mirkwood and the Forodwaith, with abrupt cliffs above the Wilderland, gentler northern slopes fading into tundra and the Talath Oiohelka, and the dragon-haunted basin of the Withered Heath between the eastern forks of the range.

**Descripciones ambientales (rotativas):**

- System of low hills east of Mirkwood, worked by Dwarves for iron, coal and silver. Gallery mouths in the hillsides, smelter slag heaps and beneath it all a Dwarven city of workshops and subterranean markets of hard steel.
- Gallery mouths in dark ore-bearing hillsides, slag heaps cooling in the rain and the constant smell of hot metal. The Dwarves have worked these hills for centuries; the landscape shows it in every face of exposed stone.
- Dragon Grass grows in the hollows of the Withered Heath to the north — tall, dry and rattling in the wind, its hollow stalks eight feet high. Silver firs on the sheltered slopes; everything else is rock and ore and frost.
- The Narrows between Mirkwood and the Grey Mountains: a strip of relatively sheltered valley where the young River Running runs clear over gravel and the forest thins enough to let in light. The hills press in on both sides.
- Arctic summers and long dark winters on the northern slopes; the Narrows are milder but cold enough that the mines keep the workers alive better than the open air does in January.
- Dwarves who have been here long enough that the hills are an extension of themselves. Outsiders are tolerated to the degree that they are useful; the Dwarven markets under the hills have their own economy that the surface barely touches.

**Locations:** —

---

## Lorien

### Lorien

**Tipo:** province · **Área:** ~18.781 km² · **Familia cultural:** high_elven

**Clima real análogo:** Białowieża Forest, Poland (Köppen: `Cfb`)

Lórien, the Golden Wood, is a secluded Elven forest-realm east of the Misty Mountains, ruled by Galadriel and Celeborn and defined by its golden mallorn trees, timeless beauty, and potent yet subtle Ring-lore.

**Descripciones ambientales (rotativas):**

- The Golden Wood of Lórien — the mallorn-forest between Silverlode and Anduin, where the leaves turn gold and do not fall, and the light under the boughs is like everlasting evening.
- Cerin Amroth rises at the heart — a green mound crowned with two rings of trees, white-barked without and golden within, where elanor and niphredil star the grass.
- The city of the trees stands on a green hill; at night its lights move among the mallorn-leaves until the hill seems filled with stars, and song and the sound of a fountain fill the dark.
- Streams thread the wood — Nimrodel's cold bright water at the eaves, the Silverlode running to the Anduin where golden leaves float on the ripples.
- Time moves differently under the boughs; rain comes gentle and leaves all things fresh, and winter has no power in the heart of the wood.
- The Galadhrim keep the fences; the unwelcome do not pass. Within, the world is gold and green and a music that the memory keeps forever after.

**Locations (2):**

- **Caras Galadhon** _(city · pop. 800 · 60% Silvan, 35% Sinda, 5% Noldo)_ — Caras Galadhon es la ciudad de los Galadhrim en el corazón de Lórien, construida como una red de flets unidos entre sí sobre los troncos enormes de los mallorn. Concebida por Galadriel, se eleva nivel tras nivel a través de la bóveda dorada; los flets más altos miran sobre un mar de hojas encendido por dentro con una luz que nunca llega a coincidir con la del mundo de fuera. Los mortales que entran se sienten a la vez bien recibidos y observados; la ciudad es segura, pero su belleza inquieta.
- **Cerin Amroth** _(keep · pop. 40 · 15% Sinda, 85% Silvan)_ — Cerin Amroth es una colina cubierta de hierba en el corazón de Lórien, coronada por dos anillos concéntricos de árboles — uno de niphredil, otro de elanor — cuyas flores florecen en oro y blanco todo el año. Fue concebida como retiro real por el rey Amroth y sirvió de palacio de Lothlórien durante edades. El viajero al que se le permite entrar en Lórien encuentra la colina asombrosamente hermosa; la luz de aquí no es la del mundo de fuera, sino clara y dorada incluso en invierno.

---

## Mirkwood Wilds

### Mirkwood Wilds

**Tipo:** province · **Área:** ~123.263 km² · **Familia cultural:** silvan

**Clima real análogo:** Bieszczady, Poland/Ukraine (Köppen: `Dfb`)

Southern Mirkwood and Southern Rhovanion form a wild, embattled region stretching from the Old Forest Road down to the Dagorlad and the Emyn Muil, dominated by the dark forest around Dol Guldur, the horse-plains of Talath Harroch, and the Anduin vales and Brown Lands that lie between Mirkwood and Gondor. Geology consists of primarily sedimentary strata of limestone and shale, with significant granite projections such as the cinder cone of amon lanc and the mountains of mirkwood.

**Descripciones ambientales (rotativas):**

- Southern Mirkwood — the dark wood grown darker since the Shadow came to Dol Guldur. Trees bent together into arches, a green dimness beneath, and paths that end where the forest wills.
- The ground is carpeted in roots and fungi; the air is thick and still. Under the canopy the quiet is so deep that a footstep sounds like a drum.
- The Elf-path is the one safe way — a narrow line of beaten earth that the forest tolerates. Off it, the trails lie, the streams are black, and sleep itself is dangerous.
- About the naked hill where the Necromancer dwelt the trees grow twisted even for this wood; the forest remembers the darkness and leans toward its ruin.
- In summer the heat under the canopy is still and rank; in winter the cold seeps up from the roots. The wood has its own weather and it is never kind.
- Spiders and darker things hold the deep wood; the free folk keep to the path and the fringes, and the forest's heart belongs to no one who walks on two legs.

**Locations (1):**

- **Cor Angaladh** _(point of interest · Silvan Elves)_ — Un terreno ritual de enterramiento, en desuso desde hace mucho. Antaño uno de los sitios más sagrados de los Hombres del Norte, hoy está ensombrecido por la oscuridad del Bosque Negro. Los hombres del norte lo evitan porque lo creen maldito.

---

## Misty Mountains

### Central Misty Mountains

**Tipo:** province · **Área:** ~36.443 km² · **Familia cultural:** wild_mountain

**Clima real análogo:** Gotthard Pass, Switzerland (Köppen: `ET-mountain`)

The High Pass (Cirith Forn en Andrath, S. 'High-climbing Pass of the North') cuts through the central Misty Mountains connecting Rivendell and Eriador in the west to the upper Anduin Vales and Rhovanion in the east. It encompasses the Orcish stronghold of Goblin-gate, the eyrie of the Great Eagles, the Northman market-town of Maethelburg, the western foothills of Rhudaur, and the broad river plain of the Anduin. Geology consists of limestone and granite with massive igneous basalt intrusions. western foothills consist of red sandstone, while eastern valleys contain oily black shale; rich in copper, iron, silver, gold, and mithril.

**Descripciones ambientales (rotativas):**

- The high spine of the world — three great peaks over the Dimrill Dale, Caradhras cruel and tallest, with snow above the cloud-line and storm for a gatekeeper.
- Pine and bare rock on the lower slopes; above the tree-line are grey shoulders, hanging valleys, and ledge-paths where a storm can fill the night with thunder and falling ice.
- The passes are the gates between east and west — the Redhorn Gate and the high, deceptive ways where the paths lie and the mountain decides who may cross.
- Beneath the feet of the mountains run the deep ways of Moria; the stone is old and hollow, and the silence below is not empty.
- At sunset the ridges cast long shadows down onto the lowlands; between the trees open glimpses of green plains that seem far below and far away.
- The weather here is a will, not a climate — it closes the passes in snow, sends lightning through the hollows, and lets none pass unconsidered.

**Locations:** —

---

### North Misty Mountains

**Tipo:** province · **Área:** ~31.199 km² · **Familia cultural:** wild_mountain

**Clima real análogo:** Jotunheimen, Norway (Köppen: `ET-mountain`)

The High Pass (Cirith Forn en Andrath, S. 'High-climbing Pass of the North') cuts through the central Misty Mountains connecting Rivendell and Eriador in the west to the upper Anduin Vales and Rhovanion in the east. It encompasses the Orcish stronghold of Goblin-gate, the eyrie of the Great Eagles, the Northman market-town of Maethelburg, the western foothills of Rhudaur, and the broad river plain of the Anduin. Geology consists of limestone and granite with massive igneous basalt intrusions. western foothills consist of red sandstone, while eastern valleys contain oily black shale; rich in copper, iron, silver, gold, and mithril.

**Descripciones ambientales (rotativas):**

- The northern Misty Mountains — the high grey wall between Eriador and the vales of Anduin, where the High Pass climbs by hidden doors and the goblins hold the dark ways.
- Pine and scree below, bare rock and permanent snow above; the eagles keep their eyries on the high shoulders and see all that moves below.
- The High Pass is the way over — a path of ledges and caves where a dry shelter in a storm may be a door into the goblin-dark.
- From the heights the view is a map of the world — oak and elm woods, broad grasslands, and the River winding below around a great standing stone.
- Wolves and worse hold the passes by night; the eagles come to them by day, and the wind off the heights carries cries that are not all birds.
- A range of storms and shut winters — the passes close under snow from autumn to spring, and the caves in the rocks are never empty for long.

**Locations:** —

---

## Mordor

### Mordor

**Tipo:** province · **Área:** ~161.147 km² · **Familia cultural:** enemy

**Clima real análogo:** Doğubayazıt, Eastern Anatolia, Turkey (Köppen: `BWh`)

Mordor, the Black Land, is the volcanic plateau realm of the Dark Lord Sauron, walled in on three sides by the formidable mountain chains of Ephel Dúath and Ered Lithui. The plateau is arid, rugged, and heavily Orc-infested, serving as a fortress-kingdom of evil. Bedrock consists of black volcanic basalt giving the region its characteristic black, scorched appearance.

**Descripciones ambientales (rotativas):**

- The Black Land — a volcanic plateau walled on three sides by the Ephel Dúath and the Ered Lithui, where the mountain Orodruin burns and the sky is a roof of ash and smoke.
- Gorgoroth is barren by design — black basalt, slag-pits, and fumes; the armies that dwell here march on broad straight roads through a land that grows nothing.
- The Morgai is the inner wall — a maze of ravines, scree and jagged ridges where the last bitter growth gives way to bare stone, and every path is watched.
- Ash-clouded darkness blots the sky; time is hard to read under the gloom, and the air is bitter, drying, and thirsty as dust.
- Across the plain the Mountain of Fire burns in its depths — rivers of flame flare in it and stain the darkness red; when it wakes, the earth shakes and the sky rains fire and black water.
- Nothing here is clean — earth, air and water are all accursed; the pools are few and bitter, and the wind that blows is the breath of furnaces.

**Locations (10):**

- **Barad Wath** _(castle)_ — Gondor empezó a construir la torre después de la caída de Sauron, pero la abandonó para no gastar recursos.. Vigilancia del tránsito entre Nurn y Gorgoroth.. La torre se asienta en lo alto del Eregwath y da una vista de muchas leguas en muchas direcciones.
- **Minas Ithil** _(fortified city · pop. 30000 · 90% Gondorian, 10% Mixed Mannish)_ — Fundada por Isildur en la S.E. 3320, reconstruida en la T.E. 1.. Control de los pasos hacia Mordor; guarnición del ejército de Gondor en Ithilien; lugar de un palantír.. Minas Ithil es una ciudad gondoriana protegida por un valle profundo de las Ephel Dúath.
- **Barad Dur** _(fortress)_ — Levantada por Sauron hacia la S.E. 1000.. Dominio de la meseta de Gorgoroth.. Construida en un espolón de las Ered Lithui y labrada por el poder del Anillo Soberano de Sauron, Barad-dûr consistía en una gran torre central con nueve torres radiales unidas a ella por puentes fortificados. Nunca existió en la Tierra Media una fortaleza más fuerte. Antaño asiento del poder de Sauron, Barad-dûr cayó cuando Isildur cortó el Anillo de la mano de Sauron. Los orcos y los trolls controlan hoy la zona, y ningún Hombre ha visitado Barad-dûr desde la Plaga.
- **Cirith Ungol** _(fortress · pop. 124 · 97% Gondorian, 3% Mixed Mannish)_ — Cirith Ungol es una fortaleza gondoriana en lo alto de las Ephel Dúath, construida para vigilar el Morgai y la meseta de Gorgoroth desde una posición dominante. Sus torres se alzan en un paso angosto sobre el camino que entra en Mordor; la vista desde sus almenas abarca un paisaje vasto y oscuro de ceniza y roca partida. La guarnición es pequeña y va mermando — el rey Tarondor ha considerado abandonar el puesto — pero por ahora la bandera de Gondor sigue ondeando sobre la puerta.
- **Ostigrurth** _(fortress)_ — Construida por Sauron a mediados de la Segunda Edad.. Control del tránsito en el Den Nurn; manufactura de productos terminados; comercio en pequeña escala.. Ostigurth está situada en la cabecera de un cañón pequeño, en el borde meridional de Gorgoroth.
- **Cirith Gorgor** _(point of interest)_ — Cirith Gorgor (S. 'Paso Encantado') era un paso alto donde las cadenas de las Ered Lithui y las Ephel Dúath se juntaban en el extremo noroccidental de Mordor. El paso se abría al valle montañoso de Udûn y estuvo guardado desde el comienzo de la Tercera Edad por las Torres de los Dientes. Cuando Sauron volvió a Mordor, hacia la T.E. 2951, el Morannon fue reconstruido cerrando el Paso.
- **Barad-wath** _(ruins · Orcs (?))_ — Barad Wath es una torre gondoriana inconclusa, construida para vigilar el tránsito entre Nurn y Gorgoroth; se empezó después de la caída de Sauron y se abandonó cuando faltaron los recursos. Sus muros de piedra oscura llegan solo a mitad de la altura prevista, y todavía se ven las marcas de los andamios. La estructura queda como monumento a las ambiciones de Gondor en Mordor — imponente en su silueta pero hueca por dentro, y cada vez más descuidada.
- **Barad-wath** _(ruins · Orcs (?))_ — Gondor empezó a construir la torre después de la caída de Sauron, pero la abandonó para no gastar recursos.. Vigilancia del tránsito entre Nurn y Gorgoroth.. La torre se asienta en lo alto del Eregwath y da una vista de muchas leguas en muchas direcciones.
- **Minas Dûrlith** _(tower · Orcs (?))_ — Labrada por Sauron en algún momento de la Segunda Edad.. Control de la llanura conocida como Gaer Dûrlith.. Minas Dûrlith es una de las pocas plazas fuertes de Sauron que sobrevivieron a la invasión de Mordor por la Última Alianza de Elfos y Hombres.
- **Barad Othnir** _(town)_ — Un castillo y un asentamiento pequeño en el nordeste de Harithilien, encaramados en un espolón rocoso del oeste de las Ephel Dúath. Su torre domina el camino principal de abajo y controla la vista del tránsito entre Ithilien y Mordor. Los muros del castillo son de piedra oscura de montaña. Una guarnición pequeña y sus familias viven a la sombra del torreón.

---

## Moria

### Moria

**Tipo:** province · **Área:** ~17.438 km² · **Familia cultural:** dwarven

**Clima real análogo:** — (Köppen: `—`)

Moria, or Khazad-dûm, is the ancient and legendary underground Dwarf-city of the House of Durin, carved deep beneath the Misty Mountains. Now a vast, dark abyss occupied by Orcs, Cave-Trolls, and the shadow of the Balrog.

**Descripciones ambientales (rotativas):**

- The land about Moria's gates — barren foothills of red stone where the hollies stand last and the dry watercourse of the Sirannon runs down to a dark and watchful mere.
- Above the hidden doors the three peaks tower — Caradhras, Celebdil, Fanuidhol. The Dimrill Dale below them is silent around the still black water of Mirrormere.
- The old road climbs to cliffs and shut doors; the Stair beside the falls is worn by feet that vanished an age ago. The country is the shell of a kingdom.
- Beneath the hills the deep halls go down past light and knowledge — vast pillared dark where drums sound and the water is cold enough to freeze the heart.
- A high cold land; snow lies long in the Dale, and the peaks keep their storms like a grudge. The wind off Caradhras has malice in it.
- Nothing is here that is not stone, silence, or shadow; yet the stars in Mirrormere are the fairest sight in a land of ruins, and the Dale is holy ground to the dwarves.

**Locations (1):**

- **Moria** _(dwarven mine · pop. 60000 · 100% Naugrim)_ — Moria — Khazad-dûm para los Enanos — es la mayor ciudad enana jamás construida, cavada bajo tres picos del centro de las Montañas Nubladas. En su mejor momento albergó a decenas de miles; incluso ahora, con la población muy reducida, los salones habitados son vastos y están movidos por el sonido de los martillos y el olor de las forjas. Los viajeros que han pasado por su puerta occidental describen salones con columnatas de un tamaño asombroso, venas de mithril visibles en la roca, y una belleza a la vez severa y magnífica.

---

## Nurn

### Nurn

**Tipo:** province · **Área:** ~207.713 km² · **Familia cultural:** enemy

**Clima real análogo:** Lake Urmia basin, NW Iran (Köppen: `BSh-BSk`)

Nurn is the more fertile, semi-arid southern province of Mordor surrounding the highly saline Lake Nurnen. Enriched by volcanic soils and watered by mountain streams, Nurn serves as the slave-worked breadbasket feeding the massive armies of Sauron.

**Descripciones ambientales (rotativas):**

- The only productive farmland in Mordor, surrounding the saline Lake Nurnen. Slave-worked fields of sorghum and barley under Orc overseers; grey-green lake water, salt-white shores and a horizon that always smells of ash.
- The farming province of Mordor around saline Lake Nurnen, worked by slave labour under Orc overseers. Grey-green water, salt-white shores and the smell of ash on every wind that comes over the Ered Lithui.
- Volcanic enrichment makes the soil productive despite the aridity; slave-worked fields of grain and sorghum produce the food that the armies need. The productivity is real; the system that produces it is not.
- The lake sits in a depression below the plateau level; it has no outlet and the salt concentration rises year by year. The shore is white; the water is bitter. Fish of a particular salt-adapted kind survive in it.
- The single region of Mordor where conditions permit agriculture. It's warmer than the plateau; the lake provides moisture that the rest of Mordor lacks; the volcanic soil does the rest. The combination is almost reasonable.
- Slaves from across the south and east working the fields they don't own. Orc guards maintaining order for the armies that eat the harvest. The logistics of feeding an empire are not romantic.

**Locations (2):**

- **Núrumurl** _(town)_ — Un pueblo de las tierras de frontera de Mordor, o de la región de Nurn, cuyo carácter está moldeado por la cercanía del poder oscuro de esa tierra. La vida aquí es dura y está estrechamente controlada.
- **Rul** _(town)_ — Un pueblo de la región, cuyas casas de piedra y cuyo mercado atienden a las comunidades agrícolas del lugar.

---

## Old Forest

### Old Forest

**Tipo:** province · **Área:** ~4.994 km² · **Familia cultural:** unique_oldforest

**Clima real análogo:** New Forest, Hampshire, England (Köppen: `Cfb`)

The Old Forest is an ancient, sentient, and deeply shadowed woodland bordering the eastern Shire. Known for its hostile, moving trees and gnarled roots, it is ruled by the mysterious Old Man Willow and protected by Tom Bombadil.

**Descripciones ambientales (rotativas):**

- The Old Forest — a remnant of the woods that once covered the world, grown dark and queer with age. The trees are awake and they remember injuries.
- Oak and ash stand so close that daylight fails; the air is still, the quiet is watchful, and a shout comes back muffled without an echo.
- The paths are the Forest's and not the traveller's — they shift, they fade, they lead down to the willow-dells where the stream murmurs over wild herbs.
- Fog fills the valley at dawn like a sea; from the high edge the whole wood is a grey ocean of mist broken into billows, with the smell of rain coming in.
- After rain the wood steams under a heavy blue sky; water drips for hours from the thatch of leaves and the thatch of the whole forest.
- Nothing in the Forest is hostile by accident; the willows hate, the paths mislead, and the trees lean and watch. The way through is courtesy and patience.

**Locations (4):**

- **Brandy Hall** _(town)_ — El Gran Smial tradicional del patriarca del clan Brandigamo y Señor de Los Gamos. Construido por Gorhendad Gamoviejo hacia la T.E. 2340, después de fundar Los Gamos, y muy ampliado a lo largo de generaciones por sus descendientes — sobre todo por Gormadoc 'Cavahonda' Brandigamo, hacia la T.E. 2800. Este complejo vasto de túneles y habitaciones está cavado enteramente en la Colina de los Gamos, con tres puertas de entrada grandes, muchas puertas laterales y unas cien ventanas. Es el hogar ancestral de la familia Brandigamo y el hogar de la infancia de Frodo Bolsón.
- **Haysend** _(town)_ — Una aldea hobbit pequeña en el extremo sur de Los Gamos, donde el Seto Alto llega a la desembocadura pantanosa del Brandivino. El pantano del Tornasauce empieza justo más allá; los gamunos de Haysend, Breredon y Grindwall pescan en esas ciénagas y se los puede contratar para llevar viajeros río abajo. Los oficiales de Los Gamos se reúnen aquí dos veces por semana para patrullar y mantener el Seto Alto. El asentamiento es pequeño pero está atento, y su gente está acostumbrada a los ruidos raros que llegan desde el lado del Bosque Viejo del río.
- **Newbury** _(town)_ — Una aldea de Los Gamos, la única asentada tierra adentro desde el Brandivino. Antes de que se terminara el Seto Alto ocupaba una cima fortificada; la torre vieja se desmontó desde entonces. Hoy Newbury es un asentamiento hobbit acomodado, centrado en Gorbuck Hall, cavado en la ladera. El salón conserva algunas habitaciones casi olvidadas como Casa de los Mathoms, con reliquias de las guerras contra el Bosque Viejo — armas viejas, flechas incendiarias y tomos enmohecidos. Uno o dos Gorbuck de cada generación estudian esas cosas en silencio, por si acaso.
- **Standelf** _(town)_ — Un caserío pequeño del sur de Los Gamos, cerca del Seto Alto y del Bosque Viejo. Construido en origen para alojar a los mineros que trabajaban la cava local ('Stangedelf'), creció hasta ser una aldea hobbit pequeña de criadores de ganado. La mayoría de sus habitantes son una rama más pobre del clan Brandigamo; los Goldworthy, los Gorbuck, los Headstrong y los Puddyfoot son las otras familias del lugar. El Bosque Viejo se cierne al sur.

---

## Rast Vorn

### Rast Vorn

**Tipo:** province · **Área:** ~20.869 km² · **Familia cultural:** coastal

**Clima real análogo:** Cabo Fisterra, Galicia, Spain (Köppen: `Cfb-coastal`)

Cardolan, the Land of Red Hills, is the southern successor-kingdom of Arnor between the Baranduin and the Gwathló–Mitheithel, a windswept land of treeless plains, red downs, marshy river basins and the barrow‑haunted hills whose shattered Dúnedain realm never fully recovered from war, civil strife and plague.

**Descripciones ambientales (rotativas):**

- Cape of black rock cliffs jutting into Belegaer south of the Gwathló, with an interior of old twisted oaks sheltering primitive Gwathuirim tribes. Inhospitable and forgotten, it serves as refuge for those who flee from everything.
- Black rock cape south of the Gwathló, where cliffs drop into Belegaer and the interior is old twisted oak over groundwater springs. The Gwathuirim who live here are as hard as the rock they inhabit.
- Coastal heath and rough moorland with pockets of oak in the sheltered valleys. The trees are old and gnarled and grow along the water rather than away from it, as if they know the only reliable thing here is the rain.
- Cliffs and rocky inlets on the coast, with the sea too rough for most boats and the interior too hostile for easy travel. The capes protect the Gwathuirim from outside authority better than any wall could.
- Windy, wet and cold, but not arctic. The sea keeps the winters from being brutal; it does nothing for the grey damp that lasts from autumn through spring.
- Primitive clans who have lived here since before the Númenórean felling and intend to live here after whatever comes next. Their invisibility in the terrain is their main defensive strategy.

**Locations (3):**

- **Cithrenor** _(ruins · pop. 12)_ — Cithrenor es un pueblo en ruinas, con las calles cubiertas de maleza y los edificios derrumbados en montones de piedra labrada que llegan a la cintura. Algún viajero acampa aquí cuando no tiene otra, pero el lugar tiene un aire de abandono que no invita a quedarse.
- **Minas Thonfalon** _(ruins · N/A)_ — Minas Thonfalon es una torre de vigilancia arnoriana en ruinas, en la 'Costa del Pantano' de Rast Vorn, construida en la T.E. 503 para vigilar el tránsito a lo largo de la costa. Sus cimientos se hunden poco a poco en el terreno encharcado; las hiladas superiores ya se han derrumbado en la ciénaga. En los días de niebla la torre partida apenas se distingue por encima de los juncales, y los pescadores del lugar le pasan bien lejos.
- **Annon Baran** _(village · pop. 300 · 60% Eriadoran, 40% Cardolani (Dúnadan))_ — Poblada alrededor de la T.E. 1200.. Nudo económico del oeste de Cardolan; provee pescado a la región.. A pesar de su cercanía a la tierra élfica de Harlindon, pocos de los cardolanos se atreven a cruzar el río, por temor a los hechizos de los Eldar.

---

## Rhudaur

### Coldfells

**Tipo:** province · **Área:** ~26.866 km² · **Familia cultural:** dunadan_north

**Clima real análogo:** Yorkshire Dales, N England (Köppen: `Cfb-cold`)

The High Pass (Cirith Forn en Andrath, S. 'High-climbing Pass of the North') cuts through the central Misty Mountains connecting Rivendell and Eriador in the west to the upper Anduin Vales and Rhovanion in the east. It encompasses the Orcish stronghold of Goblin-gate, the eyrie of the Great Eagles, the Northman market-town of Maethelburg, the western foothills of Rhudaur, and the broad river plain of the Anduin. Geology consists of limestone and granite with massive igneous basalt intrusions. western foothills consist of red sandstone, while eastern valleys contain oily black shale; rich in copper, iron, silver, gold, and mithril.

**Descripciones ambientales (rotativas):**

- Northern foothills of the Misty Mountains where bare rock and north wind admit neither comfort nor shelter. Mountain Orcs, wolves and Eagles are the chief inhabitants; the trails to the High Pass begin among this bare stone.
- Northern foothills of the Misty Mountains where bare rock and north wind admit nothing gentle. Mountain Orcs, wolves and Great Eagles divide the altitude between them; the trails to the High Pass begin here.
- Sparse alpine grass on the lower slopes, bare rock above. The treeline is lower here than anywhere on the range because the north wind comes off the Ettenmoors without warming.
- The approach to the High Pass begins in these foothills, which means everything here is transitional — lower than the pass but already cold, exposed, and fundamentally unwelcoming.
- Wind-scoured and cold, with snow possible in any month and reliable from autumn to late spring. The brief summer is more of a pause than a season.
- Mountain Orcs using the cave-systems as bases; Great Eagles nesting on the highest crags; wolves that cross the pass in winter when the lower hunting is poor. No one here is particularly interested in human affairs.

**Locations (1):**

- **ruins** _(ruins)_ — 

---

### En Egladil

**Tipo:** province · **Área:** ~13.960 km² · **Familia cultural:** dunadan_north

**Clima real análogo:** Białowieża Forest, Poland (Köppen: `Cfb`)

Rhudaur is the eastern successor state of Arnor, a rugged, sparsely settled land between the Ettenmoors, the Trollshaws and the Angle. It stretches from the Ettenmoors and Ettendales in the north down through the Pinefells and Trollshaws to the rolling lowlands between the rivers Mitheithel and Bruinen, forming a harsh frontier of jagged hills, evergreen forests, boggy vales and predator-haunted woodlands.

**Descripciones ambientales (rotativas):**

- The Angle enclosed between the Mitheithel and Bruinen, once the heart of Dúnedain Rhudaur. Deep fertile soil now largely abandoned, palisaded Hillmen villages on the hilltops and Dúnedain tower-ruins rising among the trees.
- The Angle between the Mitheithel and Bruinen, once the fertile heart of Dúnedain Rhudaur. Deep soil now abandoned, Hillmen palisades on the hilltops and the old Dúnedain towers rising above their own ruins in the trees.
- The soil here is some of the best in Rhudaur — silt from two rivers, deep and workable. The Hillmen farm it efficiently; the tower-ruins above them are a kind of complaint about who owns what and since when.
- The rivers form a natural enclosure; the interior of the Angle is sheltered and relatively flat. Its agricultural value was why the Dúnedain valued it; it's why the Hillmen want it too.
- Cool and wet enough for good grass; sheltered enough from the mountain winds to grow grain. The same qualities that made it Arnor's breadbasket make it worth holding now.
- Hillmen who hold the land with Angmar's blessing and watch the fords of both rivers. The palisaded villages are defensive because they know what happened to the Dúnedain who were here before.

**Locations (2):**

- **Iant Methed** _(point of interest · pop. 5)_ — Iant Methed (El Último Puente) fue construido en piedra, con tres grandes arcos, en el momento de mayor poder de Arnor, en la T.E. 320. En las guerras menudas de Rhudaur el cruce se tuvo por lo general como terreno neutral. Cerca estaba la Última Posada, regenteada largo tiempo por la familia Grumm; justo al noroeste quedaban las ruinas de Dol Elerilde, plaza fuerte de un antiguo señor de Rhudaur.
- **Fennas Drunnin** _(town · pop. 430)_ — Un Consejo dirigía la mayor parte de los asuntos de Fennas Drúnin, un pueblo que dependía de las granjas y los viñedos del lugar para su prosperidad. Algunos hobbits vivían en las cercanías, pero por lo general evitaban el trato con los del pueblo. Lejos de los caminos principales de Cardolan, era una buena base para quien quisiera explorar el sur de Rhudaur o las ruinas élficas de Eregion.

---

### Ettenmoors

**Tipo:** province · **Área:** ~26.904 km² · **Familia cultural:** dunadan_north

**Clima real análogo:** North Pennines, England (Köppen: `Cfb-cold`)

Rhudaur is the eastern successor state of Arnor, a rugged, sparsely settled land between the Ettenmoors, the Trollshaws and the Angle. It stretches from the Ettenmoors and Ettendales in the north down through the Pinefells and Trollshaws to the rolling lowlands between the rivers Mitheithel and Bruinen, forming a harsh frontier of jagged hills, evergreen forests, boggy vales and predator-haunted woodlands.

**Descripciones ambientales (rotativas):**

- Northern moorlands of Rhudaur, windy peat-bogs and heather hills claimed by Trolls and Orcs since the fall of the Dúnedain. Brown water, grey horizons and the snow-capped Misty Mountains visible only on rare clear days.
- Windy peat-bogs and heather hills on Rhudaur's northern edge, Orc and Troll country since the Dúnedain abandoned it. Brown water, grey horizons and the snow-capped Misty Mountains on the rare days it clears.
- Heather and coarse grass on well-drained ground; blanket bog where the drainage fails, which is most places. The moors are traversable but slow, and they have the character of land that discourages lingering.
- No trees of any size — the altitude and the wind combine to prevent it. The Misty Mountains form the southern horizon; Angmar's territory begins somewhere to the north with no visible marker.
- Cold, wet and windy year-round. The altitude keeps the temperature down; the Atlantic weather keeps the moisture up. In winter the bog freezes in the night-frosts and partially thaws in the day.
- Trolls and Orcs who have found the emptiness useful. No one patrols here; nothing maintains a claim. The moors belong to whoever is walking them at any given moment, which is usually something unpleasant.

**Locations (1):**

- **Morva Tarth** _(town)_ — El pueblo de Móin Dúldachd ('Ciénaga de la Niebla') comparte su nombre con las turberas que lo rodean, en el norte de Rhudaur. Una sola senda atraviesa el pantano; quien la deja se arriesga a ciénagas ocultas que son prácticamente sin fondo. El pueblo en sí es el centro de la poca vida económica que hay en los Valles de los Trolls, y su fortificación principal — el Kaldabaurg — fue en su momento la ciudadela de mercenarios de los Hombres del Norte que sirvieron a los dúnedain. Un lugar sombrío y aislado.

---

### Lone-lands

**Tipo:** province · **Área:** ~29.622 km² · **Familia cultural:** dunadan_north

**Clima real análogo:** North Yorkshire Moors, England (Köppen: `Cfb`)

Rhudaur is the eastern successor state of Arnor, a rugged, sparsely settled land between the Ettenmoors, the Trollshaws and the Angle. It stretches from the Ettenmoors and Ettendales in the north down through the Pinefells and Trollshaws to the rolling lowlands between the rivers Mitheithel and Bruinen, forming a harsh frontier of jagged hills, evergreen forests, boggy vales and predator-haunted woodlands.

**Descripciones ambientales (rotativas):**

- The Lone-lands — a wilderness of low rolling hills, tussock and thorn between the last farms and the mountains' feet, where the East Road runs empty for a hundred miles.
- This was once ploughed country under the old kingdom; now the only walls are ruins and the only fields are heather and bog. The mounds on the ridges are the graves of forts.
- The East Road is the single thread of travel — pale and straight through empty land, with the mountains ahead and nothing behind but the wind.
- Willow and alder in the wet bottoms, bare stone on the heights; the streams run loud after rain and the land is all water or all dust by turns.
- No villages, no inns, no watch. The sky is the biggest thing here, and the weather owns it — rain and cold and the long searching wind.
- After rain the clouds break and a wandering moon shows the drowned country; the Road shines wet and the hills are black on every side.

**Locations (1):**

- **ruins** _(ruins)_ — 

---

### Trollshaws

**Tipo:** province · **Área:** ~35.598 km² · **Familia cultural:** dunadan_north

**Clima real análogo:** NE Bohemia, Czech Republic (Köppen: `Cfb-Dfb`)

Rhudaur is the eastern successor state of Arnor, a rugged, sparsely settled land between the Ettenmoors, the Trollshaws and the Angle. It stretches from the Ettenmoors and Ettendales in the north down through the Pinefells and Trollshaws to the rolling lowlands between the rivers Mitheithel and Bruinen, forming a harsh frontier of jagged hills, evergreen forests, boggy vales and predator-haunted woodlands.

**Descripciones ambientales (rotativas):**

- The Trollshaws — the woods and broken hills under the mountains' western feet, where the Road begins its climb and the trolls have their holes.
- Thick beech-woods over stony ravines; the ground folds and drops, the streams come down loud and cold, and the caves in the rock are not all empty.
- The Road through the shaws is a hard wet way — soaked camps, drowned fords, and the smell of woodsmoke that may not come from friends.
- Old and uneasy country; the ruins on the heights were Rhudaur's, and the shade of that evil kingdom has never quite left the hills.
- A land of dripping woods and sudden hollows; by night the fires that show among the trees should be passed by, not approached.
- Rain here is long and cold and fires will not light; winter fills the ravines with snow and the ways are treacherous until spring.

**Locations (2):**

- **Herubar Gûlar** _(castle · N/A)_ — Herubar Gûlar es un torreón de origen incierto — posiblemente numenóreano — sobre el Mitheithel, que controla el tránsito por el río y a través de él. Su antigüedad se nota en la calidad de la piedra, pero está claro que ha cambiado de manos muchas veces; los arreglos actuales de su interior son toscos y militares. Se dice que el torreón está encantado por los espíritus de guarniciones anteriores, y los soldados apostados aquí no están tranquilos en los niveles bajos.
- **Cameth Brin** _(citadel · pop. 630 · 60% Hillman, 37% Dunman, 3% Other)_ — Tomada y mejorada por los dúnedain, T.E. 162.. Centro estable de administración para Rhudaur; dominación de las tribus locales de hombres de las colinas.. En la actualidad, Cameth Brin es la sede del rey Broggha, de los hombres de las colinas.

---

### West Rhudaur

**Tipo:** province · **Área:** ~73.857 km² · **Familia cultural:** dunadan_north

**Clima real análogo:** NE Bohemia, Czech Republic (Köppen: `Cfb-Dfb`)

Rhudaur is the eastern successor state of Arnor, a rugged, sparsely settled land between the Ettenmoors, the Trollshaws and the Angle. It stretches from the Ettenmoors and Ettendales in the north down through the Pinefells and Trollshaws to the rolling lowlands between the rivers Mitheithel and Bruinen, forming a harsh frontier of jagged hills, evergreen forests, boggy vales and predator-haunted woodlands.

**Descripciones ambientales (rotativas):**

- Western Rhudaur, where dry-stone farms and working mills survive as remnants of Dúnedain prosperity. Now held by Hillmen allied to the Witch-king; black-pine hills, cold torrents and hollows where darkness falls quickly.
- Dark-pine hills and cold torrents where Dúnedain prosperity used to live. Hillmen allied to the Witch-king now hold the dry-stone farms; hollows where darkness falls fast and the paths lead where they are directed to lead.
- Evergreen Pinefells on the ridges — dense, dark and sinister in the way ancient conifers get when nothing has cleared them for a century. The old Dúnedain farms in the valley-bottoms are occupied now by people with different loyalties.
- Boulder-strewn fells on the high ground; better valley-floor farming below it. The geology hasn't changed; the population has changed twice, and the second change brought it into Angmar's orbit.
- Cold and wet from the east wind that comes off the Misty Mountains without much warmth. The Pinefells catch the cloud and release it as slow drizzle; the valleys are permanently damp.
- Hillmen under Angmar's direction, which means watchers on the roads and information flowing north. The valley-farms are productive; their produce feeds the Witch-king's army rather than Arnor's people.

**Locations (2):**

- **ruins** _(ruins)_ — 
- **Nothva Rhaglaw** _(town · pop. 840 · 90% Hillman, 10% Dunnish)_ — Nothva Rhaglaw es el único pueblo permanente de los hombres de las colinas al oeste del Mitheithel, fundado por Broggha de Rhudaur en la T.E. 1639 como centro de comercio y sede de la justicia local. Para lo que se acostumbra en la región es un lugar tosco y movido: un mercado donde hombres de las colinas, dúnedain y gente de todo tipo hacen negocios bajo la autoridad ruda de los hombres designados por Broggha. Los edificios son casas largas de madera y barro; la plaza del mercado no está empedrada y se vuelve un barrial con la lluvia.

---

## Rivendell

### Rivendell

**Tipo:** province · **Área:** ~4.255 km² · **Familia cultural:** high_elven

**Clima real análogo:** Engadine Valley, Switzerland (Köppen: `Cfb-mountain`)

The Vale of Imladris (Rivendell) is a deeply cloven, hidden valley at the western feet of the Misty Mountains in eastern Rhudaur, carved by the Bruinen (Loudwater). It forms a small but varied enclave of high hills, steep forested slopes and a sheltered inner valley dominated by Elrond’s house. Surrounded by the harsher lands of Rhudaur (Highlands, Trollshaws and Lowlands), Rivendell is an ‘island of refuge’ where Elves and Dúnedain hold back the darkness of Trolls, Hillmen, Wolves and Orcs in the wider region.[file:244]

**Descripciones ambientales (rotativas):**

- The Last Homely House east of the Sea — a hidden valley cleft deep between the moors and the mountains, green and sheltered where everything outside it is bare.
- The Bruinen runs loud through the valley — cold mountain water over grey stones, crossed at the ford where the flood, when the Elves will it, rises like white riders.
- Pine and heath on the high moors; birch and beech and green shade in the vale. The valley is found late and suddenly, and left with regret.
- Warm evenings on the terraces while the lower valley falls into shadow; running and falling water sounds nearby, and the air smells of trees and flowers.
- Mist lies silver on the valley at dawn; dew glimmers on yellow leaves, gossamer twinkles on the bushes, and snow whitens the eastern peaks.
- A refuge and a border-post at once — the last fair house before the wild, where the memory of elder days is kept and the way east begins at the gate.

**Locations (1):**

- **Imladris** _(manor · pop. 125 · Mixed Elvish)_ — Fundada por Elrond Medio Elfo en la S.E. 1697.. Refugio de curación, estudio y artes.. La casa de Elrond Medio Elfo se encuentra en un barranco angosto, no fácil de hallar en las tierras quebradas del caído Rhudaur.

---

## Rohan

### Rohan

**Tipo:** province · **Área:** ~139.123 km² · **Familia cultural:** northman

**Clima real análogo:** Hortobágy, Hungary (Köppen: `Dfb`)

Rohan is a beautiful territory and one of the jewels of the Gondorian crown, a wide land of rolling pastures and coombes dominated by the towering peaks of the White Mountains, home of the semi‑nomadic Horse‑lords who became the Rohirrim after T.A. 2510.

**Descripciones ambientales (rotativas):**

- The Riddermark — a sea of grass between the Entwash and the White Mountains, where the wind never rests and the horse-lords' green ways run under a huge sky.
- Green foothills climb to the white southern wall; Edoras stands on its hill in the vale of Harrowdale, and the Golden Hall shines when the sun is on it.
- The mountains behind the Mark hold the deep refuges — the gorge of Harrowdale, the high green Firienfeld, and the Dwimorberg's dark door where the Paths of the Dead begin.
- Streams thread the dales — the Snowbourn loud over its stones, the Entwash slow and green along the edge of Fangorn, and the Isen running cold out of the Gap.
- Hot summers of high grass and hard winters of sere plain; the wind comes off the northern snows without a hill to stop it, and the rain sweeps the open Mark in grey veils.
- Horse-country through and through — the mounds of the kings stand green on the road to Edoras, and the heralds' horns echo off the mountain wall at dawn.

**Locations (8):**

- **Edoras** _(city · pop. 1600 · Rohirrim)_ — Edoras (R. Las Cortes) fue la capital de Rohan, construida sobre un antiguo emplazamiento en una colina, en el borde norte de las Montañas Blancas. El gran salón de Meduseld coronaba la colina, y los reyes de la Marca eran sepultados en dos filas de túmulos frente a la puerta principal. Las llanuras sin árboles de alrededor daban a sus vigías una vista dominante de todos los accesos.
- **Calmirië** _(fortified town · pop. 1200 · 80% Gondorian, 20% Dunnish)_ — Poblada por dúnedain gondorianos a comienzos de la Tercera Edad; recibió fuero de Atanatar II de Gondor en la T.E. 1220.. Foco económico y pueblo de mercado de la provincia de Calenardhon; sede de la administración regional.. Calmirië es el pueblo más grande y más cosmopolita del territorio gondoriano de Calenardhon.
- **Hornburg** _(fortress · pop. 1600 · 100% Gondorian)_ — Construida poco después de la Guerra de la Última Alianza, al final de la Segunda Edad.. Acuartelamiento de buena parte del ejército de Gondor en Calenardhon; administración y protección de las tierras desde los Vados del Isen hasta Calmirië.. 'Cuernavilla' es un nombre en oestron; la mayoría de los gondorianos llama a la ciudadela Ostiras.
- **Ethraid Engrin** _(point of interest)_ — Los Vados del Isen eran el paso principal para quien atravesaba el Paso de Rohan, ya que ningún puente cruzaba el río caudaloso. Los rohirrim patrullaban la zona como su puerta occidental principal; los hombres de las colinas dunlendinos tomaban los vados a menudo y exigían peaje. Tres filas de piedras anchas y planas cruzaban las aguas, con vados graduados para los caballos entre una y otra.
- **Calost** _(town)_ — Una aldea de Anórien que se extiende a ambos lados del arroyo Calenen, sobre el Gran Camino del Norte, unas treinta millas de Calenhad y doce de Min-Rimmon. El antiguo puente de piedra sobre el Calenen sigue en excelente estado. Las casas de piedra de la orilla occidental se agrupan alrededor de la posada del Descanso del Viajero, una parada bien considerada por cualquiera que ande por el camino. Un molino toma agua del río; los días de mercado traen campesinos de las aldeas de alrededor.
- **Dunlostir** _(town · pop. 880 · 90% Gondorian, 10% Dunman)_ — Dunlostir es el centro del comercio de cereal del centro de Calenardhon, con un mercado registrado desde la T.E. 808. El grano de las llanuras vecinas se junta y se guarda aquí antes de embarcarse hacia el este o el sur. Los graneros del pueblo son sus edificios más prominentes — grandes estructuras de piedra que empequeñecen las casas modestas de alrededor. Los días de mercado, los caminos de entrada se llenan de carros y de arreos de ganado.
- **Onodrith** _(town · pop. 1100 · 95% Gondorian, 5% Dunnish)_ — Onodrith creció alrededor de un cruce en balsa del Entaguas en el siglo décimo de la Tercera Edad, y recibió fuero real en la T.E. 1240. Es un pueblo de mercado pequeño y centro administrativo local, que maneja casi todo el tránsito fluvial entre las provincias del norte y del oeste de Gondor. Depósitos de piedra y muelles de madera bordean la ribera; las tarifas del balsero están anotadas en un tablero junto al embarcadero.
- **Witeburg** _(town)_ — Un asentamiento rohírrico pequeño cerca de Cuernavilla, en la Hondonada del Bajo, unas cuatro millas más allá del Abismo de Helm y a más de una milla al noroeste de la Casa del Malabarista. Su nombre, 'Castillo del Tormento', viene de la colina de forma extraña sobre la que se asienta: el Witeberg. Muros de madera y casas largas de tablones; los hombres de aquí son granjeros y peleadores al estilo rohírrico, de huesos grandes y resistentes, con el salón colgado de armas y arreos de caballo.

---

### Wold

**Tipo:** province · **Área:** ~61.494 km² · **Familia cultural:** northman

**Clima real análogo:** Dobruja, Romania/Bulgaria (Köppen: `BSk`)

Rohan is a beautiful territory and one of the jewels of the Gondorian crown, a wide land of rolling pastures and coombes dominated by the towering peaks of the White Mountains, home of the semi‑nomadic Horse‑lords who became the Rohirrim after T.A. 2510.

**Descripciones ambientales (rotativas):**

- The Wold — the high empty grasslands of the north Mark, rolling uplands where the herds graze far from any hall and the sky is the largest thing in the world.
- Lonelier than the fields of the south — thorn-brakes and birch on the slopes, and the dark eaves of Fangorn closing the eastern horizon like a wall.
- No roads, only grass-tracks; the Riders' ways run north over the downs to the Entwash fords, and the going is all open sky and long wind.
- The northern herds winter here and the wolf and the winter are both hungry; the Wold is the Mark's far edge and feels it.
- Mist comes up off the Entwash valley at dusk and the forest to the east is a black line under the stars; the nights here are enormous.
- A country for riders and weather — cold, wind, and the smell of distance; there is no shelter on the Wold, only the sky.

**Locations:** —

---

## Talath Uichel

### Talath Uichel

**Tipo:** province · **Área:** ~62.555 km² · **Familia cultural:** gondorian

**Clima real análogo:** Inari, Lapland, Finland (Köppen: `ET-Dfc`)

Talath Uichel, the Plain of Everlasting Cold, is the vast tundra interior east of Forochel, structured into green belts and herding grounds, while beyond its northern edge lies the Landless Land, the polar ice-cap desert at the very end of Middle-earth.

**Descripciones ambientales (rotativas):**

- Polar tundra east of Forochel, with impossibly brief summers of flowers and caribou herds and endless brutal winters under metres of snow. Beyond its northern edge lies the Landless Land, where the known world ends.
- Polar tundra east of Forochel, where summer means six weeks of flowers and caribou and winter means darkness under metres of snow. Beyond the northern edge is the Landless Land, where the known world ends and something else begins.
- In summer: low tundra flowers of extraordinary colour compressed into their brief season, caribou herds moving across the permafrost, the occasional Arctic fox. In winter: none of this is visible.
- Permafrost below the surface layer; the ground never fully thaws. What grows here has made its accommodation with that fact. The flowers bloom in compressed urgency and the grasses dry fast.
- The most extreme climate of the inhabited world: temperatures that kill quickly, brief summer that barely compensates. The Lossoth who survive here are as hard as the conditions require.
- Lossoth who know the permafrost and the caribou migrations and the difference between the storms that can be sat out and the ones that can't. A people defined entirely by the environment they live in.

**Locations:** —

---

## Wilderness of Arnor

### Parth Celebrant

**Tipo:** province · **Área:** ~28.593 km² · **Familia cultural:** northman

**Clima real análogo:** Zlín region, Moravia, Czech Republic (Köppen: `Dfb`)

Parth Celebrant, the Field of Celebrant, is a wide, rolling grassy plain nestled between the Great River Anduin and the Limlight. It is famous as the historical battleground where Eorl the Young led the Éothéod to save the armies of Gondor, leading to the gift of Rohan.

**Descripciones ambientales (rotativas):**

- The Field of Celebrant — open grassland and groves between the River and the mountains' feet, where the North Kingdom was broken and the Eorlingas came down out of the north.
- Thick turf over old graves; the mounds under the grass mark where a battle was lost and then miraculously won. The grass is a little greener on the field of the ride.
- Oak and beech clothe the lower slopes; the high ground is bare down and sheep-walk under a wide sky, with the mountains standing close and white to the north.
- The old road-line is still legible under the turf — a pale green scar running north, where the forts of the fallen kingdom kept their last watch.
- A clean cold wind comes off the mountains and crosses the open field; the larks are up in summer and the grass lies flat under the winter rain.
- A fair field with a sad memory; the River runs at its feet and the mountains stand at its back, and the world between them is green and empty.

**Locations:** —

---

### Wilderness of Arnor

**Tipo:** province · **Área:** ~22.500 km² · **Familia cultural:** dunadan_north

**Clima real análogo:** Scottish Borders, Scotland (Köppen: `Cfb-cold`)

The High Pass (Cirith Forn en Andrath, S. 'High-climbing Pass of the North') cuts through the central Misty Mountains connecting Rivendell and Eriador in the west to the upper Anduin Vales and Rhovanion in the east. It encompasses the Orcish stronghold of Goblin-gate, the eyrie of the Great Eagles, the Northman market-town of Maethelburg, the western foothills of Rhudaur, and the broad river plain of the Anduin. Geology consists of limestone and granite with massive igneous basalt intrusions. western foothills consist of red sandstone, while eastern valleys contain oily black shale; rich in copper, iron, silver, gold, and mithril.

**Descripciones ambientales (rotativas):**

- Desolate moorland of northwestern Eriador, the combined result of Angmar's wars, the Great Plague and abandonment. Heather over old farmsteads, peat-brown rivers and wandering Dúnedain Rangers as the only witnesses.
- Desolate moorland in northwestern Eriador, the combined result of Angmar's wars and the Great Plague and the simple mathematics of abandonment. Heather over old farmsteads and Dúnedain Rangers as the only witnesses.
- Heather and bracken growing through what were farmsteads fifty years ago. The outlines of field-boundaries are still there; the buildings have mostly fallen into themselves. It's archaeology pretending to be landscape.
- A vast emptiness that was once the most populous part of the north. The roads are still there — the Dúnedain maintained them — but they connect ruins to ruins and the traffic is sparse.
- Cold, wet and grey for most of the year, with the north wind coming down from Forochel without much interruption. The moorland feels more like weather than like land.
- Dúnedain Rangers who know every barrow-mound and ruin and ford in this emptiness. They travel it in pairs and return with information about what is moving. It is their land in the sense that no one else claims it.

**Locations:** —

---

## Woodland Realm

### Woodland Realm

**Tipo:** province · **Área:** ~67.111 km² · **Familia cultural:** silvan

**Clima real análogo:** Bieszczady Forest, Poland/Ukraine (Köppen: `Dfb`)

Northern Mirkwood is the northern half of the great forest once known as Greenwood the Great, stretching between the Anduin, the Grey Mountains, the Withered Heath and the upper River Running, and including Thranduil’s woodland realm, the Long Lake, the Lonely Mountain and the Iron Hills.

**Descripciones ambientales (rotativas):**

- The Woodland Realm — the Elvenking's country in the north-eaves of Mirkwood, where the wood is greener and the dark has not so deep a hold.
- Beech-woods over halls of living stone; the king's doors stand in a steep tree-covered slope above the Forest River, and the cave-halls go down to cold springs and deep cellars.
- The Forest River is the realm's road — it runs dark and strong under the bridge, out of the wood to the Long Lake, carrying the barrels and the trade.
- Feasts are held in the glades by torchlight; the smell of roasting meat and the sound of elven laughter drift through the trees and mislead the hungry.
- Green summers and white winters; the rain on the eaves is soft, and the river runs fuller and darker for it. The wood is watched, and the deer-parks are guarded.
- The wood-elves are unfriendly to strangers in the deep forest — less cruel than the southern wood, but their doors are shut to those they do not know.

**Locations (2):**

- **Ost Galad** _(town)_ — Un asentamiento élfico de la zona de las Emyn Lûm, en el Bosque Negro, conocido como Ost Galadh ('Fortaleza de los Árboles'). A mediados de la Tercera Edad su población es de unos 1.200. El asentamiento está construido entre los grandes árboles del bosque, con plataformas y pasarelas de oficio élfico silvano que unen las viviendas por encima del suelo. Los árboles de aquí son antiguos y enormes; al viajero que llega de fuera del Bosque Negro lo golpean la calidad de la luz que se filtra por la bóveda de hojas y el silencio absoluto de la maleza.
- **Celebannon** _(village · pop. 110 · 95% Silvan Elvish, 5% Sinda)_ — Celebannon es una aldea élfica pequeña pero elegante en las orillas del Taurduin, en el Bosque Negro, fundada a comienzos de la Tercera Edad como punto de contacto entre los Elfos del Reino del Bosque y la gente de los alrededores de Rhovanion. Sus edificios están finamente hechos — madera tallada y piedra blanca entre los árboles — y los Elfos de aquí están más acostumbrados a la presencia de viajeros que la mayoría de los suyos. De tanto en tanto funciona un mercado pequeño donde se pueden conseguir productos élficos a precios justos.

---

## Woodmen

### Woodmen

**Tipo:** province · **Área:** ~31.226 km² · **Familia cultural:** northman

**Clima real análogo:** Beskydy, Moravia, Czech Republic (Köppen: `Dfb`)

Southern Mirkwood and Southern Rhovanion form a wild, embattled region stretching from the Old Forest Road down to the Dagorlad and the Emyn Muil, dominated by the dark forest around Dol Guldur, the horse-plains of Talath Harroch, and the Anduin vales and Brown Lands that lie between Mirkwood and Gondor. Geology consists of primarily sedimentary strata of limestone and shale, with significant granite projections such as the cinder cone of amon lanc and the mountains of mirkwood.

**Descripciones ambientales (rotativas):**

- The land of the Woodmen — the west-eaves of Mirkwood where free folk keep hidden halls in the oak-woods and hold the forest's shadow at bay.
- Great oaks and elms over deep mast; the clearings are meadow and bee-pasture, and the air is warm with honey in summer.
- The halls are broad wooden steads behind stockades — places of firelight, carved pillars and animal friends, hidden among the trees from the dark things of the Wood.
- Deer-paths and secret ways; the Woodmen walk where others would be lost in an hour, and the forest's edge is theirs and no other's.
- White autumn mist lies on the ground at dawn and the sun rises red to clear it; along the paths go grass, flowers, birds and red deer to the fords of Anduin.
- A border-land — green and homely within, black and watchful at the eaves; the Woodmen live in the seam between the two and keep the knowledge of both.

**Locations (1):**

- **Woodmen Village** _(town · pop. 200 · Woodmen)_ — Una pequeña aldea de los Hombres de los Bosques en los Valles del Alto Anduin, construida en parte sobre grandes plataformas en los árboles, a la manera élfica, lo que refleja las relaciones amistosas entre los Hombres de los Bosques y los Elfos Silvanos vecinos.

---

## Apéndice — locations sin geometría

Estas entries de `locations.sql` no tienen columna `geom` y no comparten nombre con ninguna location georreferenciada, así que no se pueden asignar a una región.

- **Bridge Of Mitheithel** _(bridge · N/A)_ — Construido por Arnor, T.E. 320.. Paso sobre el Mitheithel en el Gran Camino del Este. El Último Puente, llamado así porque es el más oriental del Camino, fue construido en piedra con tres grandes arcos.
- **Bridge Of Stonebows** _(bridge · N/A)_ — Construido por Arthedain, T.E. 1102.. Paso sobre el río Baranduin en el Gran Camino del Este.. El Rey de Arthedain concede a los hobbits el derecho a cobrar un peaje, que ellos mantienen en unas pocas monedas de cobre.
- **Bridge Of Stonebows** _(bridge · N/A)_ — Construido por Arthedain, T.E. 1102.. Paso sobre el río Baranduin en el Gran Camino del Este.. El Rey de Arthedain concede a los hobbits el derecho a cobrar un peaje, que ellos mantienen en unas pocas monedas de cobre.
- **Nogothiant** _(bridge · N/A)_ — Construido por los Naugrim de Moria antes de la S.E. 1693.. Paso sobre el Anduin en el Gran Camino del Este.. El Nogothiant se está desmoronando, después de aguantar muchos siglos sin mantenimiento.
- **Haudh-in-gwanur** _(burial · N/A)_ — Creado en origen en la Segunda Edad para albergar a los muertos nobles de los Hombres del Crepúsculo.. Terreno ritual de enterramiento, ya sin uso.. Unas ruinas extensas marcan el lugar de enterramiento de Bel'zordin, un príncipe muerto en tiempos anteriores a la llegada de los numenóreanos al este para fundar colonias.
- **Eldanar** _(castle · pop. 288 · 100% Angmarean (Mixed Mannish))_ — Construido por colonos numenóreanos alrededor de la S.E. 2800, tomado por Angmar en la T.E. 1325.. Puesto de vigilancia avanzado de Angmar.. Construido en origen por los dúnedain de Rhudaur, Eldanar es hoy un puesto de vigilancia seguro, bien adentrado en la llanura conocida como En Udanoriath.
- **Erädas** _(castle · pop. 200 · 50% Coastal People, 20% Haradan, 20% Corsair, 10% Black Númenórean)_ — Erädas es un castillo gondoriano en una cala abrigada de la Bahía de Umbar — construido por Eärnil I y tomado más tarde por Umbar en la T.E. 1449. Hoy sirve de retiro rural para el señor Teldûmeir y de sede de la administración local. Las almenas de piedra miran sobre un puerto azul; sus habitantes, Gente de la Costa, haradanos y Corsarios, le dan un carácter muy distinto del de cualquier fortaleza gondoriana más al norte.
- **Isigir** _(castle · pop. 210 · 60% Coastal People, 25% Corsair, 10% Haradan, 5% Black Númenórean)_ — Isigir es un castillo en la orilla norte del Nen Umbar, y sus alrededores son conocidos por las hierbas medicinales de olor penetrante que crecen en el suelo cálido de la tierra baja. Construido por los Capitanes de Umbar a comienzos de la Tercera Edad, sirve de base de poder rural del señor Adûmir y administra las tierras de labranza productivas de alrededor del lago. Sus jardines de hierbas son su rasgo más distintivo; el olor le llega al viajero mucho antes de que se vean los muros del castillo.
- **Marös** _(castle · pop. 150 · 30% Coastal People, 30% Corsair, 30% Haradan, 10% Black Númenórean)_ — Marös ocupa un promontorio que se adentra en la Bahía de Umbar — un castillo de construcción numenóreana que lleva más de dos mil años vigilando el tránsito de la bahía. Con la marea alta, el mar rompe directamente contra sus muros bajos. Su señor actual es Borathôr de Umbar; su población mezclada de Gente de la Costa, Corsarios y haradanos le da al lugar un carácter tosco y políglota.
- **Pellardur** _(castle · pop. 180 · 50% Haradan, 30% Coastal People, 15% Corsair, 5% Black Númenórean)_ — Construido por los Capitanes de Umbar hacia la T.E. 750.. Defensa de los accesos terrestres meridionales a la ciudad de Umbar; administración de las tierras de labranza de alrededor.. Pellardur está cerca de la Ciudad de Umbar y se asienta en tierras agrícolas bastante fértiles.
- **Tir Anduin** _(castle · pop. 2500 · 90% Gondorian, 10% Northman)_ — Poblado por gondorianos hacia la T.E. 1402; recibió fuero real en la T.E. 1560.. Puesto comercial gondoriano de importancia más septentrional; lugar de una balsa que cruza el Anduin.. La balsa de Tir Anduin y el vado cercano de los Bajos son los cruces más seguros del Anduin entre Osgiliath y el Viejo Vado.
- **Tir Nindor** _(castle · pop. 60 · 90% Gondorian, 10% Mixed Mannish)_ — Construido por Gondor alrededor de la T.E. 410.. Guardar el único paso seguro y seco a través de las Ciénagas de los Muertos.. Tir Nindor es un castillo estratégico que guarda el paso por las Ciénagas de los Muertos.
- **Aglarond** _(cavern · pop. 20 · 100% Gondorian (Dúnadan))_ — Una segunda entrada para Aglarond — la caverna que sirve de refugio y depósito en las Montañas Blancas para la guarnición de Ostiras. Sus yacimientos de gemas y sus salones de almacenamiento se mantienen listos para una emergencia.
- **Aglarond** _(cavern · pop. 20 · 100% Gondorian (Dúnadan))_ — Aglarond es un sistema de cavernas extensas en las laderas septentrionales de las Montañas Blancas, usado en la actualidad como refugio y depósito por la guarnición de la vecina Ostiras. Dieron cobijo por primera vez a colonos numenóreanos hace mucho, y nunca han sido exploradas por completo — las galerías más profundas brillan con yacimientos de gemas intactos que sirven de reserva financiera de emergencia para los reyes de Gondor. La entrada está bien guardada y no se anuncia.
- **Cor Angálaladh** _(cemetery · N/A)_ — Usado en origen por los edain y por los antepasados de los Hombres del Norte en la Primera Edad.. Terreno ritual de enterramiento, hoy en desuso.. El sitio, hoy ensombrecido dentro del Bosque Negro, fue en su momento uno de los lugares más sagrados de los Hombres del Norte.
- **Durthang** _(citadel · pop. 240 · 100% Gondorian)_ — Durthang se asienta en una cornisa precaria muy por encima de Udûn, lo que le da a su guarnición gondoriana una vista excelente de cualquier movimiento por la llanura de abajo. Construida por Isildur en la T.E. 1, es un destino incómodo — los vientos que bajan de las Ephel Dúath son fríos y cortantes, las vistas son espectaculares y sombrías, y el aislamiento es total. Los suministros hay que subirlos con cuerdas desde el camino de abajo.
- **Goblin-town** _(city · pop. 3100 · 70% Orcish, 5% Troll, 25% Mixed Mannish Slaves)_ — La Ciudad de los Trasgos es un laberinto vasto de cavernas naturales cerca del Paso Alto, ocupado por orcos desde por lo menos la Segunda Edad. Los túneles conectan Imladris con las tierras del este y les dan a los trasgos una capacidad inigualable de emboscar a los viajeros que cruzan las Montañas Nubladas. Quienes han entrado y escapado describen un hedor a humo y a inmundicia, galerías atestadas iluminadas por antorchas humeantes, y el ruido constante de las voces de los orcos. El Gran Trasgo gobierna aquí por el miedo y la fuerza bruta.
- **Lond Ernil** _(city · pop. 10200 · 90% Gondorian, 10% Mixed Mannish)_ — Sitio de una torre de vigilancia élfica, construida hacia la S.E. 3440; ciudad planificada y construida por los dúnedain, hacia la T.E. 830.. Asiento del Príncipe de Dor-en-Ernil; puertos y astilleros de la armada de Gondor; centro mercantil.. La ciudad guarda uno de los puertos más seguros de Gondor y alberga la flota más grande del reino fuera de Pelargir.
- **Crossroads Of The** _(crossroads · N/A)_ — Mencionado por primera vez en tiempos del rey Anárion.. Mojón para los viajeros de Ithilien.. El Cruce de Caminos es la unión del camino entre Osgiliath y Minas Ithil con el camino del Morannon a Harad.
- **Derndingle** _(cultivated glade · N/A)_ — Usado por los Ents desde la Primera Edad.. Lugar de reunión y de debate.. Derndingle es un valle con forma de fuente, con un montículo pequeño y coronado de árboles en el centro.
- **Erebor** _(dungeon · N/A)_ — Formación natural, ampliada por los Enanos en la Segunda Edad (?).. Desconocido.. Bajo la Montaña Solitaria, cerca del pueblo de Valle, en el norte de Rhovanion, hay muchos túneles y cavernas.
- **Paths Of The Dead** _(dungeon · N/A)_ — El Sendero de los Muertos son cavernas naturales bajo las Montañas Blancas, que conectan el valle del Sagrario con el valle del Morthond — usadas en su momento como cámaras funerarias reales por los Daen Coentis, con el último enterramiento en la T.E. 679. La entrada es conocida, pero ninguna persona viva pasa dentro por su voluntad. Los lugareños hablan de aire frío, de una sensación de presencias invisibles y de sonidos que no tienen explicación natural. El juramento roto de los Muertos sigue pesando aquí; las cavernas se consideran uno de los lugares más maldecidos de Gondor.
- **Azanulinbar-dûm** _(dwarven mine · pop. 480 · 100% Naugrim)_ — Azanulinbar-dûm es la mansión principal de los Enanos de las Colinas de Hierro y el asiento del señor Fulla III. Cavada por primera vez alrededor de la T.E. 1000, ha crecido hasta ser un asentamiento enano completo, de viviendas, talleres y minas bajo las Emyn Angren. A los de fuera rara vez se los admite; los pocos que han visto el interior describen salones de piedra desnuda iluminados por formaciones de cristal, y el sonido constante del trabajo resonando desde cada galería.
- **Ostigurth** _(fortified city · pop. 2560 · 40% Orc, 40% Haradan, 15% Easterling, 5% Troll)_ — Construida por Sauron a mediados de la Segunda Edad.. Control del tránsito en el Den Nurn; manufactura de productos terminados; comercio en pequeña escala.. Ostigurth está situada en la cabecera de un cañón pequeño, en el borde meridional de Gorgoroth.
- **Sudúri** _(fortified city · pop. 6000 · 95% Dunnish, 5% Cardolani)_ — Fundada por el aventurero Gordaigh en la T.E. 1503 sobre el sitio de una fortaleza dúnadan.. Centro administrativo del Reino de Saralainn; lugar de encuentro de las tribus dunlendinas.. El pueblo lo construyeron en origen los numenóreanos, pero hoy casi todos sus habitantes son de origen dunlendino.
- **Buhr Ailgra** _(fortified town · pop. 220 · 100% Northman)_ — Fundada por los Éothraim hacia la T.E. 1380.. Defensa frente a los ataques de los Hombres del Este; centro de comercio de los Eothraim.. Buhr Ailgra es uno de los pocos asentamientos permanentes de los Eothraim, que siguen las migraciones de sus rebaños por las llanuras de Rhovanion. El pueblo es un asentamiento sencillo de casas de paja y turba, rodeado por un recio terraplén de tierra.
- **Buhr Ailgra** _(fortified town · pop. 220 · 100% Northman)_ — Buhr Ailgra es uno de los pocos asentamientos permanentes de los Éothraim, un pueblo fortificado en las llanuras bajas de Rhovanion, cercado por un recio terraplén de tierra. Casi todos sus habitantes lo usan como base de temporada y siguen a sus rebaños el resto del año; el pueblo está más lleno en invierno y queda casi vacío a mediados del verano. Casas de paja y turba se apiñan dentro del terraplén; los residentes permanentes son comerciantes y artesanos que abastecen a los Éothraim cuando vuelven.
- **Buhr Mahrling** _(fortified town · pop. 490 · 50% Northman (Éothraim), 50% Easterling)_ — Buhr Mahrling es un pueblo comercial de los Hombres del Norte sobre el curso bajo del río Celduin, arrebatado a los Hombres del Este en la T.E. 1503. La mayoría de sus habitantes son Éothraim de temporada que lo usan como base entre sus migraciones de pastoreo; una comunidad considerable de Hombres del Norte de Esgaroth lo mantiene como puesto comercial avanzado cerca de Dorwinion. El resultado es un pueblo movido y políglota, donde tratantes de caballos éothraim, mercaderes del norte y algún comerciante del este regatean por encima de la barrera del idioma.
- **Buhr Waldmarh** _(fortified town · pop. 1250 · 100% Northman)_ — Fundado por Hombres del Norte hacia la T.E. 1290.. Base estable del clan Withras; foco económico de las granjas de alrededor.. Este pueblo típico de los Hombres del Norte tiene muchas casas largas de madera y un dique de tierra coronado por una palizada.
- **Buhr Widu** _(fortified town · pop. 520 · 100% Northman)_ — Fundado por Vidugavia en la T.E. 1249.. Centro de administración del clan Waildung; punto de acopio de las granjas gramuz de alrededor.. Buhr Widu, junto al lago pequeño conocido como el Lago del Bosque, conserva algo del esplendor real de los tiempos de Vidugavia.
- **Caras Gwindor** _(fortified town · pop. 120 · 75% Gondorian, 25% Mixed Mannish)_ — Poblada por gondorianos alrededor de la T.E. 1098.. Estación de abastecimiento para las caravanas de Rhovanion y para la guarnición de Tir Nindor; vigilancia de las Ciénagas de los Muertos.. Caras Gwindor controla la mayor parte del comercio entre la Dagorlad y el Anduin, pero su aislamiento limita su tamaño.
- **Eithel Celebrin** _(fortified town · pop. 140 · 70% Gondorian, 30% Mixed Mannish)_ — Poblada por una compañía comercial de Pelargir hacia la T.E. 1290.. Reaprovisionamiento de caravanas cerca del borde oriental de las Ciénagas de los Muertos.. Eithel Celebrin sufre por la tendencia creciente de los mercaderes que van a Rhovanion a embarcar sus mercancías por la ruta más segura, remontando el Anduin.
- **Fennas Drúnin** _(fortified town · pop. 430 · 50% Cardolani, 30% Dunnish, 20% Eriadoran)_ — Poblada por primera vez por numenóreanos de Tharbad alrededor de la S.E. 2910.. Foco social y económico de las granjas y las aldeas de Feotar.. Un Consejo dirige la mayor parte de los asuntos del pueblo, que depende de las granjas y los viñedos del lugar para su prosperidad.
- **Maethelburg** _(fortified town · pop. 1200 · 90% Northman, 5% Gondorian, 5% Other)_ — Construida por colonos de los Hombres del Norte hacia la T.E. 1020.. Foco de la actividad política, social y económica de los Hombres del Norte en el Nan Anduin.. Por su posición central, Maethelburg controla prácticamente todo el comercio del valle alto del Anduin.
- **Minas Anor** _(fortified town · pop. 45000 · 95% Gondorian, 5% Other)_ — Fundada por Anárion en la S.E. 3320, reconstruida por Ostoher en la T.E. 420.. Capital y residencia real de Gondor; lugar de un palantír; sitio de enterramiento de los Reyes de Gondor.. Minas Anor está situada sobre un gran espolón de roca en el extremo oriental de las Montañas Blancas.
- **Morthondost** _(fortified town · pop. 650 · 80% Gondorian, 20% Dunnish)_ — Construida por los dúnedain a fines de la Segunda Edad, recibió autonomía en la T.E. 569.. Protección y administración del Valle del Morthond; explotación de los recursos minerales.. A pesar de su cercanía al tristemente célebre Sendero de los Muertos, el Valle del Morthond sigue siendo un centro minero importante para Gondor.
- **Mount Gundabad** _(fortified town · pop. 14100 · 78% Orcish, 20% Human Slave, 2% Troll)_ — Los orcos han ocupado la Montaña desde la Ruina de Beleriand.. Capital del reino orco de Gundabad; base militar para las operaciones en Rhovanion.. El Monte Gundabad mira al pico Ügûlai al otro lado del Den Lóke, la brecha entre las Hithaeglir y las Ered Mithrin.
- **Riavod** _(fortified town · pop. 1060 · 100% Easterling)_ — Poblada por Hombres del Este hacia la T.E. 1408.. Base comercial para las expediciones que remontan el Celduin; puerto en el Mar de Rhûn.. Aunque la gobierna un príncipe sagath, los dorwinrim usan el pueblo como su base principal de comercio con las tierras del Endor Occidental.
- **Strayhold** _(fortified town · pop. 900 · 85% Northman, 15% Mixed Mannish)_ — Poblada por proscritos gramuz hacia la T.E. 1340.. Comercio con los gramuz y con Gondor; foco económico local.. Strayhold se asienta cerca del borde oriental del Bosque Negro, en una garganta profunda junto al borde del Talath Harroch.
- **Tir Limlight** _(fortified town · pop. 156 · 60% Gondorian, 40% Northman)_ — Tir Limlight marca el límite efectivo de la autoridad gondoriana en el norte del Anduin, y guarda uno de los pocos cruces de los Bajos. Fundada por mercaderes gondorianos, ha crecido hasta ser un pueblo amurallado de carácter mezclado, gondoriano y de los Hombres del Norte — casas de piedra y depósitos de madera, el olor del comercio fluvial, y la conciencia constante del yermo septentrional que hay más allá de los muros. La guarnición de aquí vigila tanto las amenazas que vienen de Rhovanion como el tránsito del río.
- **Umbar** _(fortified town · pop. 60000 · 35% Coastal People, 30% Corsair, 25% Haradan, 10% Black Númenórean)_ — Fundada por Tar-Atanamir de Númenor en la S.E. 2280, ampliada varias veces.. Capital de Umbar; centro económico y político; construcción y reparación de naves.. Un gran monumento levantado por el rey numenóreano Ar-Pharazôn para conmemorar su victoria sobre Sauron guarda la entrada del puerto.
- **Wraecaburg** _(fortified town · pop. 340 · 80% Northman, 20% Mixed Mannish)_ — Poblada por Hombres del Norte alrededor de la T.E. 1000.. Agricultura; centro de comercio en los Valles del norte del Anduin.. Aunque no está directamente bajo el dominio del Rey Brujo, Wraecaburg sufre incursiones frecuentes, desesperanza y una población numerosa de gente turbia venida de más allá de Rhovanion.
- **Amrûnaur** _(fortress · pop. 180 · 100% Gondorian)_ — Una segunda fortificación en el paso de Dor-en-Ernil con el mismo nombre que el Amrûnaur del sur — una posición dominante en una plataforma rocosa, con pararrayos en las torres y una guarnición atenta que vigila el movimiento por la ruta de la montaña.
- **Amrûnaur** _(fortress · pop. 180 · 100% Gondorian)_ — Amrûnaur es un castillo gondoriano sobre una plataforma rocosa que sobresale de la montaña que los eredrim llaman Thoredarb, y domina el paso central de Dor-en-Ernil. La fortaleza es notable por sus pararrayos — púas de hierro montadas en las torres para desviar las tormentas violentas que pasan seguido por el paso. La población dunlendina de las colinas de alrededor mira a la guarnición con recelo; el castillo, a su vez, sigue de cerca el movimiento por el paso.
- **Angsûl** _(fortress · pop. 200 · 90% Angmarean, 10% Orcish)_ — Terminada por el Rey Brujo en la T.E. 1349.. Control del tránsito de entrada y de salida de Angmar.. El Rey Brujo mantiene una guarnición numerosa apostada en Angsûl para detectar a los espías que intentan penetrar la meseta central de Angmar.
- **Angsûl** _(fortress · pop. 200 · 90% Angmarean, 10% Orcish)_ — Terminada por el Rey Brujo en la T.E. 1349.. Control del tránsito de entrada y de salida de Angmar.. El Rey Brujo mantiene una guarnición numerosa apostada en Angsûl para detectar a los espías que intentan penetrar la meseta central de Angmar.
- **Ardûmir** _(fortress · pop. 310 · 40% Coastal People, 30% Haradan, 25% Corsair, 5% Black Númenórean)_ — Construido por colonos numenóreanos hacia la S.E. 3290.. Plaza fuerte rural de un Capitán de Umbar; administración de las tierras de alrededor; guarda la entrada a la Bahía de Umbar.. El lienzo oriental de la muralla del castillo cae directamente en el lago que rodea en parte a Ardûmir.
- **Ardûmir** _(fortress · pop. 310 · 40% Coastal People, 30% Haradan, 25% Corsair, 5% Black Númenórean)_ — Construido por colonos numenóreanos hacia la S.E. 3290.. Plaza fuerte rural de un Capitán de Umbar; administración de las tierras de alrededor; guarda la entrada a la Bahía de Umbar.. El lienzo oriental de la muralla del castillo cae directamente en el lago que rodea en parte a Ardûmir.
- **Caldur** _(fortress · pop. 210 · 50% Coastal People, 20% Corsair, 20% Haradan, 10% Black Númenórean)_ — Levantada por los Capitanes de Umbar hacia la T.E. 520.. Base para las salidas contra Gondor; administración de las tierras alrededor de la entrada norte de la Bahía de Umbar.. Caldûr está en un afloramiento empinado de la península septentrional que guarda el Nen Umbar.
- **Creb Durga** _(fortress · pop. 210 · 20% Troll, 80% Mixed Mannish)_ — Creb Durga fue tallada por los trolls del Señor de la Guerra en una colina escarpada unas setenta millas al norte de Sudúri — una base oculta para las incursiones por el centro de Cardolan. Su ubicación es deliberadamente confusa; en la región han desaparecido viajeros sin explicación, tomados por las partidas del Señor de la Guerra que operan desde esta base.
- **Saarkaana** _(fortress · ?)_ — Posiblemente numenóreana (?).. Desconocido, posiblemente ceremonial.. Saarkaana es una fortaleza umbareana en el reseco Talath Naur, situada cerca de las ruinas de una estructura de la Segunda Edad.
- **Tharagrond** _(fortress · pop. 65 · 100% Black Númenórean)_ — Fundada por colonos numenóreanos hacia la S.E. 2300.. Defensa de las tierras del Principado de Tharagrond; administración local.. Tharagrond es un feudo pequeño y aislado, pero lleva su autonomía con orgullo.
- **Thorontir** _(fortress · pop. 1350 · 80% Gondorian, 20% Mixed Mannish)_ — Fundada por Gondor hacia la T.E. 500.. Centro de administración regional; guarnición del Ejército del Este de Gondor.. La fortaleza está apenas apartada del Men Romen, varias millas al este del pueblo de Thorontir.
- **The Forsaken Inn** _(inn · pop. 15 · 80% Dunnish, 20% Hillman)_ — En funcionamiento desde la T.E. 1412.. Reaprovisionamiento y alojamiento de viajeros del Gran Camino del Este, en el Puente del Mitheithel.. Regenteada por una familia de dunlendinos, la Posada Abandonada es uno de los pocos lugares seguros y neutrales donde un viajero inocente puede descansar en el camino de Rivendel a Bree.
- **Carach Angren** _(keep · pop. 50 · 100% Gondorian)_ — Carach Angren es la gran puerta de hierro que cierra el paso entre Udûn y Gorgoroth; su construcción original de la Segunda Edad, obra de Sauron, fue destruida por la Última Alianza y reconstruida por Gondor en la T.E. 42. La puerta y los muros que la flanquean bloquean el paso por completo; sin permiso para pasar, no hay manera de ir de Udûn al interior de Mordor. La guarnición gondoriana de aquí tiene uno de los destinos más insólitos del reino — rodeada por Mordor en tres de sus lados.
- **Morannon** _(keep · pop. 300 · 100% Gondorian)_ — Construido por Sauron en la Segunda Edad.. Control del paso de entrada y de salida de Mordor.. Durante la Batalla de la Dagorlad, Sauron se vio forzado a retirarse a Barad-dûr cuando las fuerzas de la Última Alianza rompieron las defensas de aquí.
- **Aradhrynd** _(manor · pop. 500 · 93% Silvan Elvish, 7% Sinda)_ — Aradhrynd es el gran palacio subterráneo del rey Thranduil, del Reino del Bosque, cavado bajo una colina cerca del linde norte del Bosque Negro después de que la Sombra creciente de Dol Guldur volviera inhabitable el sur del bosque. A diferencia de los túneles oscuros de los trasgos, los salones están claros por la luz de las antorchas y vivos de voces élficas; pilares tallados sostienen techos altos, y un río corre por los niveles bajos. Las visitas son raras y rara vez bien recibidas — los guardias están atentos, y las puertas de hierro y roble se abren pocas veces para forasteros.
- **Thalion** _(palace · pop. 45 · 60% Cardolani, 40% Eriadoran)_ — Construido por Tarcil de Arnor en la T.E. 514.. Asiento de la Casa de Dol Tinare.. Thalion está en un estado de conservación lamentable.
- **Argonath** _(point of interest · N/A)_ — Los Argonath son dos figuras colosales de Isildur y Anárion talladas en los acantilados que flanquean el desfiladero de la entrada norte del Nen Hithoel, terminadas en la T.E. 1340 por Rómendacil II para marcar la frontera septentrional de Gondor. Las figuras se alzan con las manos levantadas en un gesto de prohibición hacia el norte; sus rostros son severos y parecen antiguos incluso para estatuas de apenas unos siglos. Los viajeros que se acercan por el río se quedan callados cuando aparecen a la vista — la escala humilla.
- **Argonath** _(point of interest · N/A)_ — Terminados en la T.E. 1340 por Rómendacil II.. Señalamiento del límite septentrional de Gondor.. Rocas talladas que flanquean el desfiladero de la entrada norte del Nen Hithoel. Las figuras representan a Isildur y a Anárion. Desde los tiempos de Rómendacil II, la frontera norte de Gondor se ha corrido aún más al norte, con lo que los pilares quedaron obsoletos. Aun así, son un espectáculo magnífico.
- **Andrath** _(ruins · N/A)_ — Andrath fue fundada en la T.E. 860 por Thorondur de Cardolan y sirvió como sede administrativa del Príncipe de Dol Tinare; ha sido arruinada y reconstruida muchas veces. La última vez fue saqueada por los hombres de las colinas del rey Broggha. Las ruinas que quedan son un palimpsesto de períodos de construcción distintos — piedra arnoriana, agregados cardolanos y remiendos apurados de los hombres de las colinas — hoy abandonadas en buena parte.
- **Andrath** _(ruins · N/A)_ — Una segunda entrada de la Andrath en ruinas — el mismo sitio que el id=1161, el centro administrativo de Cardolan, saqueado y reconstruido una y otra vez. A mediados de la Tercera Edad es otra ruina más, con sus piedras reutilizadas por quien ocupe la zona en ese momento.
- **Barad-dûr** _(ruins · N/A)_ — Barad-dûr fue la gran plaza fuerte de Sauron en un espolón de las Ered Lithui, labrada por el poder del Anillo Único. Su ruina tras la Última Alianza fue total — las energías del Anillo que la sostenían se fueron con la derrota de Sauron — y sin embargo hasta los restos partidos son vastos y oscuros, mucho más grandes que cualquier otra construcción de Mordor. Nadie habita las ruinas; hasta los orcos las evitan, porque sienten la ausencia de la presencia de su amo como una herida.
- **Barad-dûr** _(ruins · N/A)_ — Levantada por Sauron hacia la S.E. 1000.. Dominio de la meseta de Gorgoroth.. Construida en un espolón de las Ered Lithui y labrada por el poder del Anillo Soberano de Sauron, Barad-dûr consistía en una gran torre central con nueve torres radiales unidas a ella por puentes fortificados. Nunca existió en la Tierra Media una fortaleza más fuerte. Antaño asiento del poder de Sauron, Barad-dûr cayó cuando Isildur cortó el Anillo de la mano de Sauron. Los orcos y los trolls controlan hoy la zona, y ningún Hombre ha visitado Barad-dûr desde la Plaga.
- **Belegost** _(ruins · N/A)_ — Belegost fue una de las dos grandes ciudades enanas de las Ered Luin, fundada antes de que se alzaran el Sol y la Luna. Fue destruida al final de la Primera Edad, cuando las montañas se quebraron en la Guerra de la Cólera. Sus ruinas yacen enterradas muy hondo, bajo la roca caída y siglos de escombros; unos pocos exploradores enanos audaces han empezado hace poco a tantear los pasadizos exteriores con la esperanza de recuperar objetos de sus antepasados, pero los salones más profundos siguen inaccesibles.
- **Belegost** _(ruins · N/A)_ — La Primera Edad, posiblemente antes de que se alzaran por primera vez el Sol y la Luna.. Explotar las riquezas de las Ered Luin; defensa frente a todos los enemigos.. Unos pocos exploradores enanos audaces han empezado hace poco a explorar las ruinas con la esperanza de encontrar los objetos de sus antepasados.
- **Caras Amarth** _(ruins · N/A)_ — Caras Amarth fue el primer palacio del Reino del Bosque, construido por el rey Oropher en lo profundo del bosque — una red de cavernas talladas en una ladera, iluminadas por dentro con faroles. Cuando Thranduil trasladó su corte al norte, al Aradhrynd, Caras Amarth quedó abandonado; hacia mediados de la Tercera Edad el bosque ha vuelto a crecer sobre las entradas viejas y solo los Elfos más ancianos recuerdan con exactitud dónde están.
- **Londaroth** _(ruins · pop. 50 · 100% Northman)_ — Poblada por Hombres del Norte alrededor de la T.E. 900.. Portear el tránsito fluvial alrededor de los saltos de Lindal.. Solo quedan una estación comercial pequeña, dos molinos y una posada para atender a los mercaderes que deben portear sus mercancías por encima de las Cataratas del Celduin.
- **Nogrod** _(ruins · N/A)_ — Cavada por primera vez a comienzos de la Primera Edad.. Extracción, fundición y trabajo de los metales preciosos que se encuentran en las Ered Luin.. Nogrod fue destruida en el cataclismo que hundió Beleriand bajo el océano.
- **Vamag** _(ruins · N/A)_ — Vamag es una ruina costera de mediados de la Segunda Edad, de la que se dice que sirvió de retiro a Adûnaphel — a quien algunos creen uno de los Nazgûl. La Gente de la Costa del lugar se niega a acercarse y declara el sitio encantado. Los muros se alzan oscuros y gastados por la sal sobre los acantilados, y el silencio de alrededor se siente más pesado de lo que debería.
- **Buhr Fram** _(town · 100% Northman)_ — Nombre dado a Wraecaburg después de que los Éothraim se asentaran allí en el siglo diecinueve de la Tercera Edad.. Asentamiento de los Éothraim.. Nombre dado a Wraecaburg después de que los Éothraim se asentaran allí en el siglo diecinueve de la Tercera Edad.
- **Dûsalan** _(town · pop. 1900 · 60% Coastal People, 35% Haradan, 5% Black Númenórean)_ — Poblada por emprendedores de Umbar hacia la T.E. 307.. Nudo mercantil del tránsito que va y viene del Sur.. Dûsalan es un pueblo costero gobernado por tres señores numenóreanos negros independientes, pero dominado por Umbar.
- **Ilanin** _(town · pop. 360 · 80% Easterling, 20% Northman)_ — Sitio tradicional de comercio desde por lo menos la T.E. 950.. Lugar de intercambio; punto de reunión de muchas tribus de los Hombres del Este.. Ilanin tiene pocos edificios permanentes. Casi todas sus estructuras son carpas sencillas que desaparecen en cuanto termina un mercado.
- **Kas Marzûk** _(town · pop. 1600 · 80% Haradan, 20% Corsair)_ — Poblada por gondorianos alrededor de la T.E. 932, ocupada por los Corsarios en la T.E. 1448.. Centro mercantil cerca de la desembocadura del Harnen; base para las incursiones haradanas contra las posesiones gondorianas de Harondor.. Kas Marzûk fue en su momento un pueblo gondoriano llamado Caras Mirilond, pero hoy está bajo la autoridad de los Sangahyandim.
- **Kas Shadoul** _(town · pop. 2700 · 85% Haradan, 15% Corsair)_ — Las murallas originales del pueblo las construyó Ar-Pharazôn alrededor del 3261 de la Segunda Edad; después quedó desierto y fue repoblado por los haradrim a comienzos de la Tercera Edad.. Centro mercantil en la orilla sur del Harnen; punto de reunión de muchas tribus de Harad.. Kas Shadoul es un puerto de embarque importante, y es también la fuente de muchas de las mercancías de contrabando que entran al sur de Gondor.
- **Kas Shafras** _(town · pop. 1900 · 40% Coastal People, 40% Haradan, 20% Corsair)_ — Poblada por los haradrim alrededor de la T.E. 800.. Puerto comercial, más o menos a mitad de camino entre el Ethir Anduin y la Ciudad de Umbar.. Kas Shafras es célebre por las hierbas medicinales raras que se cultivan en sus alrededores.
- **Larach Duhnnan** _(town · pop. 420 · 90% Dunnish, 5% Dúnadan, 5% Other Mannish)_ — Establecida como puesto avanzado en el Viejo Camino del Norte, T.E. 3; tomada por los dunlendinos, T.E. 275.. Centro urbano de las tribus dunlendinas dispersas; lugar neutral de contacto para negociar.. Larach Duhnnan está en territorio reclamado por el Clan Feargan, pero el tránsito extranjero que pasa por ella la vuelve un lugar excelente para la discusión y el comercio neutrales.
- **Sook Asni** _(town · pop. 680 · 90% Haradan, 10% Corsair)_ — Poblada por los haradrim hacia la T.E. 1400.. Pesca; construcción y reparación de naves.. La vajilla laqueada que hacen los artesanos de Sook Asni es muy solicitada entre la nobleza de Umbar.
- **Spathlin** _(town · pop. 820 · 90% Gondorian, 10% Dunnish)_ — Poblada por Gondor hacia la T.E. 410.. Centro de comercio en la confluencia de los ríos Ciril y Ringló; punto de acopio de las granjas del lugar.. Spathlin controla buena parte del tránsito fluvial hacia el norte de Lamedon, pero sufre de todos modos por su aislamiento.
- **Bar Lithyrn** _(village · pop. 1000 · 70% Donaen, 30% Gondorian)_ — Una entrada duplicada de Bar Lithyrn — una aldea gondoriana de minería de plata en el norte de las Ered Lithui, en decadencia lenta a medida que se agotan las vetas de mineral (ver id=1184).
- **Bar Lithyrn** _(village · pop. 1000 · 70% Donaen, 30% Gondorian)_ — Bar Lithyrn es una aldea minera en las laderas del norte de las Ered Lithui, fundada por intereses comerciales gondorianos para extraer mineral de plata de las montañas. La mayoría de sus habitantes son hombres donaen del lugar, atraídos por la perspectiva de un jornal; sus señores dúnedain embarcan la plata al sur, hacia los tesoros de Gondor. La aldea está aislada y en decadencia lenta — las vetas de plata se van agotando, y cada año unas cuantas familias más se van a buscar una vida más fácil en otra parte.
- **Bar-en-tinnen** _(village · pop. 240 · 100% Gondorian)_ — Una segunda entrada del asentamiento de Bar-en-tinnen (ver id=1183) — una aldea en la orilla oriental del Anduin, alrededor de un molino sobre el Sir Tinnen, que provee de pescado y de productos de granja a las comunidades del interior.
- **Bar-en-tinnen** _(village · pop. 240 · 100% Gondorian)_ — Bar-en-tinnen es una aldea pequeña en la orilla oriental del Anduin, crecida alrededor de un molino sobre el arroyo Sir Tinnen. Fundada hacia la T.E. 1512, provee de pescado a las comunidades del interior y funciona como punto modesto de comercio para los granjeros del lugar. La rueda del molino gira sin parar; el olor a grano y a barro de río es constante.
- **Barak-shathur** _(village · pop. 240 · 100% Naugrim)_ — Fundada por colonos de Azanulinbar-dûm hacia la T.E. 1490.. Explotación de los recursos minerales de las Colinas de Hierro.. Se cree que el nombre khuzdul de la plaza fuerte significa 'Montaña del Hacha' en oestron.
- **Barak-shathur** _(village · pop. 240 · 100% Naugrim)_ — Fundada por colonos de Azanulinbar-dûm hacia la T.E. 1490.. Explotación de los recursos minerales de las Colinas de Hierro.. Se cree que el nombre khuzdul de la plaza fuerte significa 'Montaña del Hacha' en oestron.
- **Bottoms Bridge** _(village · pop. 85 · 95% Northman, 5% Dúnadan)_ — Bottoms Bridge es una aldea pequeña de los Hombres del Norte en una isla baja al borde de los Campos Gladios, fundada a mediados de la Tercera Edad para abastecer a los comerciantes que usan el Anduin. Sus puentes de madera la unen con la orilla; el sonido del río es constante y el olor a pasto de ciénaga y a madera húmeda está siempre presente. Sus pocas docenas de habitantes viven de la pesca y de manejar el tránsito fluvial que pasa por ahí.
- **Bottoms Bridge** _(village · pop. 85 · 95% Northman, 5% Dúnadan)_ — Poblada hacia la T.E. 1337.. Centro de abastecimiento para los comerciantes que navegan el Anduin.. Bottoms Bridge está en una isla pequeña al borde de los Campos Gladios.
- **Caras Tolfalas** _(village · pop. 520 · 100% Gondorian)_ — Reclamada por Gondor desde la S.E. 3321; poblada por primera vez por orden real en la T.E. 934.. Subsidiada por el Rey de Gondor más para mantener el reclamo sobre la isla de Tolfalas que por razones económicas.. Un puerto malo limita el acceso a este pueblo, pero es el único amarradero seguro de Tolfalas.
- **Dundok** _(village · pop. 150 · 100% Stoor Hobbit)_ — Dundok es una aldea de hobbits Fuertes escondida en los bordes más secos de los Campos Gladios, ocupada desde por lo menos la T.E. 1360. Sus smials de techo bajo y sus casas con techo de junco son casi invisibles entre los juncos y la hierba de las ciénagas — lo que les viene perfecto a sus habitantes, que tienen pocas ganas de recibir visitas de fuera. La aldea se sostiene con agricultura en pequeña escala y con la pesca en los canales más tranquilos del Gladio.
- **Hobbiton/bywater** _(village · pop. 360 · 50% Harfoot, 40% Fallohide, 10% Stoor)_ — Poblada durante las migraciones de los hobbits a la Comarca, T.E. 1601-1610.. Comunidad agrícola y de pastoreo.. Asentada sobre el Gran Camino del Este, Hobbiton ve pasar más viajeros extraños que la mayoría de las zonas rurales de la Comarca.
- **Mulkan** _(village · pop. 100 · 100% Lossoth)_ — Mulkan es un asentamiento de los lossoth en los yermos helados de Forochel, establecido como base de temporada para la caza y la recolección. En verano consiste en carpas de cuero y refugios de madera de deriva alrededor de un fuego común; en invierno, los lossoth construyen sus notables casas de nieve y hielo, de techo bajo y sorprendentemente cálidas por dentro. De los forasteros se desconfía, pero a los que llegan con mercancías para intercambiar — hierro, tela, sal — se los puede recibir con una hospitalidad cautelosa.
- **Nansret** _(village · pop. 140 · 100% Beffraen)_ — Nansret es la única aldea conocida de los beffraen, los Hombres Salvajes del Rast Vorn. Es un asentamiento tosco de refugios de corteza y cobertizos de madera en la parte más densa del bosque, difícil de encontrar a propósito. Los beffraen no reciben bien a los de fuera; la aldea existe para sostener su caza y su recolección, y su ubicación cambia con las estaciones.
- **Romenost** _(village · pop. 95 · 100% Gondorian)_ — Romenost es una posta gondoriana en el Men Romen, construida por el Ejército del Este para defender el camino de las incursiones que vienen del este. Sus muros de piedra y sus barracas son prácticos antes que imponentes; la guarnición es pequeña y la estepa de alrededor está vacía y batida por el viento. Los viajeros del Men Romen se alegran de verla — es el único refugio en muchas millas.
- **Staddle** _(village · pop. 90 · 70% Stoor Hobbit, 30% Bree-man)_ — Poblada por granjeros de las Tierras de Bree hacia la T.E. 1250.. Agricultura.. Staddle queda a un paso de Bree y depende de su vecina más grande para casi todos los servicios que una comunidad agraria pequeña no puede darse a sí misma.
- **Tuckburrow** _(village · pop. 320 · 90% Fallohide, 10% Stoor & Harfoot)_ — Poblada por hobbits durante la migración a la Comarca, T.E. 1601-1610.. Morada de clan; agricultura.. La aldea está en el País de las Colinas Verdes, en la Cuaderna del Oeste de la Comarca.
- **Warfinger** _(village · pop. 54 · 100% Gondorian)_ — Construida por el Ejército del Este de Gondor alrededor de la T.E. 1428.. Posta a lo largo del ramal sur del Men Romen; punto defensivo contra una invasión desde el Este.. La guarnición pequeña de Warfinger está muy lejos de la autoridad del Regente en Thorontir.
- **Woodmen-town** _(village · pop. 200 · 100% Woodman (Northman))_ — Poblada de forma permanente alrededor de la T.E. 1580.. Lugar de reunión de los clanes de los Hombres de los Bosques; hogar del Althyn; sitio de una feria anual.. Woodmen-town está construida sobre grandes plataformas en los árboles, a la manera élfica, porque los Hombres de los Bosques están en buenos términos con los Elfos del Bosque.
- **Eilenach** _(watchtower · pop. 120 · 100% Gondorian)_ — La torre actual se terminó en la T.E. 522.. Eslabón de la cadena de comunicación de Gondor con el Norte.. Eilenach está en la colina más alta y más empinada del Bosque de Drúadan.
- **Erelas** _(watchtower · pop. 85 · 100% Gondorian)_ — La construcción se empezó en la T.E. 494 sobre el sitio de una plataforma de señales más antigua y sencilla.. Eslabón de la cadena septentrional de comunicación de Gondor.. Erelas es la cuarta almenara de la serie que corre al noroeste desde Minas Anor.
- **Nardol** _(watchtower · pop. 85 · 100% Gondorian)_ — Construida por Tarostar de Gondor para reemplazar una plataforma de señales de madera que había en el sitio; terminada en la T.E. 516.. Eslabón de la red de comunicaciones de Gondor a lo largo del Viejo Camino del Norte.. Nardol es la tercera almenara de la cadena.
- **Towers Of The Teeth** _(watchtower · pop. 340 · 100% Gondorian)_ — Las Torres de los Dientes — Narchost y Carchost — flanquean el Cirith Gorgor a ambos lados del Morannon, construidas por Gondor en el primer año de la Tercera Edad para observar todo el tránsito que intente entrar o salir de Mordor. Son estructuras adustas de piedra negra sobre riscos desnudos; su guarnición mira hacia abajo, a la llanura de ceniza de Udûn, e informa de cualquier movimiento. Nadie entra en Mordor sin ser visto.
