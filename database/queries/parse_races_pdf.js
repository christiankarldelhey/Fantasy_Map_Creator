import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Function to create slug from name
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim();
}

// Function to extract biomes from description
function extractBiomes(description) {
  if (!description) return null;
  
  const biomeKeywords = {
    'forest': ['forest', 'wood', 'tree', 'mirkwood', 'fangorn'],
    'mountains': ['mountain', 'mount', 'peak', 'highland', 'hill'],
    'desert': ['desert', 'arid', 'sand'],
    'marsh': ['marsh', 'swamp', 'wetland', 'wetwang'],
    'river': ['river', 'water', 'lake', 'sea', 'ocean'],
    'plains': ['plain', 'grassland', 'field', 'meadow'],
    'tundra': ['tundra', 'cold', 'ice', 'snow', 'forodwaith'],
    'cave': ['cave', 'underground', 'mine'],
    'wasteland': ['wasteland', 'ruin', 'destroyed']
  };
  
  const foundBiomes = new Set();
  const lowerDesc = description.toLowerCase();
  
  for (const [biome, keywords] of Object.entries(biomeKeywords)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword)) {
        foundBiomes.add(biome);
        break;
      }
    }
  }
  
  return foundBiomes.size > 0 ? Array.from(foundBiomes) : null;
}

// Race data extracted from the PDF
const racesData = [
  // Dwarves
  {
    name: 'Dwarves',
    type: 'dwarves',
    description: 'The Dwarves are descendants of the Seven Fathers, the original lords crafted from the earth by the Vala Aulë. They were created first, but Eru forced his servant Aulë to delay their awakening until after the coming of Elves. Following their birth the Seven Kings formed tribes based on their lines and separated. Although these Seven Tribes have since spread across Middle-earth, they have remained close and have spawned a universal reputation for ruggedness, practicality, and unwavering loyalty. Most groups favor the rocky highlands and deep caverns of the mountains, for the Dwarves, perhaps more than any race, remember their origin and heritage. Physical Character: Short, stocky, strong, with exceptionally strong limbs. Black, red, or dark brown hair. Fair to ruddy complexion. Tremendous endurance. 4 to 5 feet tall. Lifespan: 200-400 years. Resistance against flame and ice: +30 bonus versus heat and cold attacks. See well in extreme darkness. In the dimmest light, they can see 50\' perfectly, and fairly well up to 100\'. They can see 10\' in total darkness (nonmagical).'
  },
  {
    name: 'Umli',
    type: 'dwarves',
    description: 'The Umli live in the Far North of north-central Middle-earth, east of the Lossoth. They are a race of short folk who apparently came from an ancient union of Men and Dwarves. Legends call them Half-dwarves. Physical Character: Strong and compact, with large features and considerable facial hair. Males average 150 pounds; females 135 pounds. Ruddy skin and red hair, with penetrating pale blue eyes. Exceptional endurance in cold climes; average in temperate areas; poor in warm or hot climates. 4-5 feet. Lifespan: 100-200 years. +30 bonus versus cold/ice attacks and a -15 bonus versus heat/fire attacks. Need sleep but three hours a day. In the cold (below 35°) they halve any encumbrance penalties; above 90° they suffer double encumbrance penalties. Hunters, gatherers, and fisherman, they move from site to site depending on the season. Most reside in caves or underground settlements. Many mine, and the Umli are accomplished smiths and artisans.'
  },
  // Elves
  {
    name: 'Half-elves',
    type: 'elves',
    description: 'Half-elves are a rare breed, the offspring of Men and Elves. While the Dúnedain, Corsairs, and Black Númenoreans have Elvish (and even Maia) blood, their connection to Elves lies in the remote past and they are not called Half-elves. True Half-elves have one Elven parent and one Mannish parent. Upon reaching adulthood, a Half-elf must decide whether to live as a mortal Man or an immortal Elf. Elrond of Rivendell chose the latter course, while his brother Elros - first King of Númenor - opted for mortality. Physical Character: Strong and slender, thinner than Men but stouter than Elves. They have thin, angular features. Males average 200 pounds, females 140 pounds. Fair, generally with brown or black hair and grey eyes. Considerable endurance. Half-elves need but 4 hours rest a day: sleep for mortals or meditation for the immortals. Males average 6\'3", females 5\'11". Mortal Half-elves live 250-500 years. Virtually immune to disease and natural illness. +5 bonus against cold attacks. Can see extremely well in the dark. Under moonlight or starlight they can see perfectly for 500\'.'
  },
  {
    name: 'Noldor',
    type: 'elves',
    description: 'The Noldor are often called "High Elves" or "Deep Elves", ostensibly because they are considered to be the most noble of the Quendi in Middle-earth. In reality, they are so named because they are the only Elves living in Endor who have ever resided in the Blessed Realm of Aman across the sea. This exalted status is accentuated by their close ties with the Valar, a relationship which accounts for their unique cultural and linguistic roots. Other names for the Noldor include Deep-elves, Golodhrim or Gelydh (Sindarin labels), and Nómin (Edain label). Physical Character: Of all the Elves, the Noldor are the strongest and sturdiest of build, although they are still slimmer than Men. Most are dark haired and have greyish eyes which betray a proud looking manner. Descendants of the Fingolfin and Finarfin are often fair haired and blue eyed, for their blood contains Vanyar influences. They do not carry great burdens, but they are capable of traveling 16-20 hours a day. The Noldor do not sleep; instead they rest in a trance for 1-3 hours a day. Males average 6\'7", females 6\'3". Immortal and will only die due to violence or if they weary of life and lose the will to live. Cannot become sick or scarred and are virtually immune to disease. +20 bonus versus cold attacks. Unparalleled at understanding and working with crafts. +20 for Item Use rolls.'
  },
  {
    name: 'Sindar',
    type: 'elves',
    description: 'The Sindar or "Grey-elves" are Eldar and were originally part of the great kindred called the Teleri. Unlike the Noldor, Vanyar, and bulk of the Teleri, the Sindar chose not to cross over the sea to Aman; instead they stayed in Middle-earth. They, like the Silvan Elves, are part of the Moriquendi, those Elves who never saw the Light of Valinor. Physical Character: Thin when compared to Men, the Sindar are nearly as tall as the Noldor but are generally slighter of build. They are more muscular than the Silvan folk. Most have fair hair and pale blue or grey eyes. Like the Noldor, they have light skin. Same endurance as Noldor Elves. Males average 6\'5", females 6\'1". Same lifespan as Noldor Elves. Cannot become sick or scarred and are virtually immune to disease. +15 bonus versus cold attacks. Vision same as that of Noldor Elves. Less musical than the Vanyar or Silvan Elves, and are less skilled in forging or crafts than the Noldor. Nonetheless, they are adept at all the arts and excel in their special provinces. No race builds better boats or ships. The Sindar are the most open and cooperative of Middle-earth\'s Elves. They are great teachers and borrowers and have an interest in the works of all races.'
  },
  {
    name: 'Silvan Elves',
    type: 'elves',
    description: 'When the Eldar departed from the original Elven homeland during the Elder Days, a number of their brethren remained behind. They decided not to seek the light of the Aman and were labeled as the Avari (Q. "Unwilling, Refusers"). These kindreds were left to fend for themselves during the days when Morgoth\'s Shadow swept over the East. During these dark times they were forced into the secluded safety of the forests of eastern Middle-earth, where they wandered and hid from the wild Men who dominated most of the lands. They became known as the Silvan or Wood-elves. Physical Character: Most are slight of build, and all are thin by mannish standards. Ruddy of complexion, with sandy hair and blue or green eyes. Generalizations are difficult, however, since there are many kindreds and there is wide variation among them. Same endurance as for Noldor Elves. Males average 6\'0", females 5\'9". Same lifespan as for Noldor Elves. Cannot become sick or scarred and are virtually immune to disease. -10 bonus versus cold attacks. Their vision is the same as that of Noldor Elves. The Silvan folk are superb musicians and have tremendous hearing, even for Elves. +10 to Bardic spell attacks. They are also elusive. +10 for trickery and Stalking/Hiding maneuvers. The culture of the Silvan Elves is best characterized as unstructured and rustic by Elven standards, but rich and relatively advanced when compared to the ways of Men. They have always been independent, but as of late many have settled in kingdoms ruled by the Noldor or Sindar.'
  },
  // Hobbits
  {
    name: 'Harfoots',
    type: 'hobbits',
    description: 'The most common Hobbits are Harfoots. They are the smallest in size and the darkest in color, rarely exceeding 3 feet in height and having brown skin and hair. Neat and uniformly beardless, they are in many ways the picture of the average Hobbit. Harfoots favor hillsides and highlands. They have traditional sites for their traditional smials or Hobbit-hole houses. They prefer to interact with the grim Dwarves. All Hobbits share in hating Wargs and Orcs.'
  },
  {
    name: 'Stoors',
    type: 'hobbits',
    description: 'The Stoors are the stockiest Hobbit folk and often appear shorter than some of the Harfoots because of their wide profile. Generally, however, they are taller than Harfoots and shorter than Fallohides. Their coloration is also somewhat of a compromise, although they have curly brown hair which resembles that of their shorter cousins. Nonetheless, the most distinguishing features of Stoors are their huge hands and feet (large even by Hobbit standards) and frequent beard growth. Stoors prefer riversides and flatlands. Some have begun relying on surface dwellings of wood, brick, or stone. Stoors trace their lines through the female.'
  },
  {
    name: 'Fallohides',
    type: 'hobbits',
    description: 'The Fallohides are the tallest and average between 3 and 4 feet in height. They have fair skin and, of all the groups, resemble Men the most. Their numbers are small, however, and some observers have confused them with nearby mannish groups. Fallohides enjoy the woodlands found in cool northern climes. Some have begun relying on surface dwellings of wood, brick, or stone. Fallohides are the most prone to mingle with Big People. Harfoots and Fallohides trace their lines through either the male or female. Those Hobbits who dare venture away from home are assumed to be extraordinary, and therefore get five background points.'
  },
  // Humans
  {
    name: 'Beornings',
    type: 'humans',
    description: 'Also called Beijabar or Bajaegahar, this dispersed group of large men has a confused origin. They are a Northmen branch related to the Woodmen, Lake-men, and Dale-men of Rhovanion, although they apparently became distinct in elder times, probably before the Northman migrations out of Eriador. Physical Character: Physically, the Beornings are the largest of the Northmen, and all are strong of build and bone structure. Men are exceedingly hairy; they average 220 pounds. Women average 145 pounds. Their complexions are fair, but unlike most Northmen (who are usually blond), the majority have reddish hair. Beornings need sleep only twice every three days. Men average 6\'4", women 5\'7". Lifespan: 80-100 years. Wild animals will not attack a Beorning unless actively provoked. They are extremely hairy, and their tendency to wear furs gives them an "animal-like" appearance. Beornings have traditionally lived in small groups or single families on well-tended "manors". Some, like Beorn\'s line, have favored relative lowlands, while the majority reside in the passes and foothills of the Misty Mountains or Grey Mountains. Beornings hate Orcs, Wargs, Trolls, Giants, and Dragons.'
  },
  {
    name: 'Black Númenoreans',
    type: 'humans',
    description: 'The term "Black Númenorean" (S. "Mornúmenedain") is used to describe Men of Dúnedain stock who are descended from the "Unfaithful" Númenorean colonists and conquerers who came to Middle-earth during the middle and late Second Age. These Unfaithful had broken with the Valar and Elves who had bequeathed them the island kingdom of Númenor at the beginning of the Second Age, and many worshipped their own idols or paid homage to the Dark Lord Sauron. Physical Character: Strong and imposing, with angular features. Men average 225 pounds, women 150 pounds. After long years in the hot South, the Black Númenoreans have tanned, grey-brown skin, and black hair. Their piercing eyes are various shades of grey. Considerable endurance. Men average 6\'4", women 5\'10". Lifespan: 90-175 years. +25 to Sailing maneuvers. +10 to melee Offensive Bonuses, -10 to Defensive Bonus. Black and gold are their favored colors. They wear rich clothing made of dyed silk and cotton. Their societies are well-ordered and ruled by force of personality, backed by harsh law. Dictators and oligarchs hold sway over the people.'
  },
  {
    name: 'Corsairs',
    type: 'humans',
    description: 'The Corsairs are descendants of the Dúnedain rebels who fled from Gondor in the wake of the Kin-strife of T.A. 1432-47. Most settled in Umbar in T.A. 1447 and began a long struggle for control with the stronger Haradan and Black Númenorean elements. Since that time modest inbreeding with the locals has created a somewhat distinct group, although their Dúnedain roots remain strong. They long to reclaim Gondor as their own. Physical Character: Strong of build; males average 220 pounds, women 145 pounds. Corsairs are generally fair skinned and have grey or bluish eyes and black or dark brown hair. Considerable endurance. They do not get seasick. Men average 6\'3", women 5\'9". Lifespan: 95-190 years. +25 bonus for Weather-watching or Star-gazing activity. Corsairs favor purple, red, and gold clothing made from silk or fine cotton. They wear tunics and only rarely don leggings. Men wear gold collars, while women are well-adorned with jewelry. Corsair culture reflects the conservative elements found among Gondor\'s aristocracy, only it is carried to an extreme.'
  },
  {
    name: 'Dorwinrim',
    type: 'humans',
    description: 'The Dorwinrim occupy the lower Carnen valley and the region running south from the river to the northwest shore of the Sea of Rhûn - the land called Dorwinion. They are a mixture of Northman and Easterling stock. Physical Character: Dorwinrim are slightly larger than most groups labeled as "Common Men": males average 160 pounds, females 110 pounds. Overall, they are somewhat stocky and have wide features; narrow noses and eye slits are the only exception. Their fair, slightly yellowish complexion is unique. They have subdued eyes which are usually brown (like their straight hair), although some are blue or green. Average endurance. Men average 5\'9", women 5\'2". Lifespan: 60-80 years. +30 bonus to RR versus poisons. +15 for Acting or Public Speaking situations. +10 for Rowing maneuvers. They are traders and river-men who abandoned their nomadic past in favor of an urban, albeit rustic life. Dorwinion is known for its fine wines and strong oils. Vines cover the land and provide the principal sources of income: grapes, olives, wine, olive oil, etc.'
  },
  {
    name: 'Dúnedain',
    type: 'humans',
    description: 'The Dúnedain are descendants of the Edain who settled on the island kingdom of Númenor during the Second Age. It was their Númenorean forefathers who colonized and conquered much of Middle-earth. When the Isle of the West sank into the sea during the Downfall of S.A. 3319, two groups survived: the Black Númenoreans and the Faithful Dúnedain. The latter settled Arnor and Gondor, the Realms in Exile. Like all their brethren, they have traces of Elven and Maia blood. Physical Character: Tall and strong. Men average 225 pounds, women 150 pounds. Fair skin and black or dark brown hair. They have grey, hazel, blue, or green eyes. Considerable endurance. Men average 6\'5", women 5\'10". Lifespan: 100-300 years. Rich and well made, with elaborate collars. The Dúnedain of lowland Gondor wear light tunics and often go without leggings. Those of colder areas wear more. They favor feathers and white symbols on dark fields. Comfortable and centered around cosmopolitan cities and towns. The Dúnedain hate the Corsairs, for they blame them for the Kin-strife, Gondor\'s civil war. They also despise the Black Númenoreans.'
  },
  {
    name: 'Dunlendings',
    type: 'humans',
    description: 'Also called "Hillmen", this group of Common Men traditionally lives in the hills and highlands west of the Anduin valley. Most have become settled farmers and herders and make up majority populations in Eriador. Others remain pure and live in the foothills and mountain vales. Physical Character: They are of medium to stocky build and rugged, with little body hair. Men average 175 pounds, women 135 pounds. They have a tanned or ruddy complexion and brown hair. They are superb mountaineers and handle tough terrain with little additional effort. Men average 5\'10", women 5\'6". Lifespan: Short; about 50-80 years. +20 for Climbing and Acrobatic maneuvers. +20 for Public Speaking and Acting activity. Crude wool and hide tunics with leggings. They also wear rough over-coats, short cloaks, and fur hats. Dunlendings are herders, hunters, and gatherers who live in extended families and reside in villages. Dunlendings generally hate the Rohirrim and Woses above all, although many also despise the Dúnedain, Dwarves, and Orcs.'
  },
  {
    name: 'Easterlings',
    type: 'humans',
    description: 'This term refers to a collection of peoples who live in north-central Middle-earth, the area to the east of the western shore of the Sea of Rhûn. These nomadic confederations are ever in search of territory and wealth and periodically invade the lands of their neighbors. The Balchoth and Wainriders are two such peoples. Each group has its own subculture and language, although most are related. Physical Character: Compact and agile. Men average 140 pounds, women 100 pounds. Swarthy, with a tan or yellowish/tan quality. Normal endurance, although they can ride horses, wagons, or chariots for long periods without exhaustion. Short to medium. Men average 5\'6", women 5\'1". Lifespan: Short, about 40-65 years. They are superb with riding animals and produce fabulous horsemen. +10 bonus to Offensive Bonuses when fighting from a horse or chariot. +20 to any attempt to train, befriend, or subdue a horse. They are nomads who live in mobile camps and move their camps using great wagons (wains). Warriors all, they also herd horses and cattle. Easterlings have little regard for anyone except their own people. They hate the Dúnedain.'
  },
  {
    name: 'Haradrim',
    type: 'humans',
    description: 'This is a collective name for the peoples who occupy the great arid and semi-arid lands south of Harondor and Mordor, the land called Harad. Since this is rough and unblessed territory, their greatest populations lie beside the seacoast, rivers, and bays; however, Harad contains little true desert and sparse groups settle or roam the whole region. Haradrim (S. "Southmen") are also called "Southrons" or "Haradwaith" (a term also referring to the land). Physical Character: North and central desert - Most groups are small and wiry, particularly those of the open country: males average 130 pounds, women 100 pounds. Coastal areas and Far Harad- Most are related to the Men of Mûmakan, and are tall and wiry: males average 180 pounds, women 140 pounds. Northern groups have light/medium grey or brown skin, straight black hair, and dark brown eyes. Southern groups have dark grey, brown, or black skin; straight or curly black hair; and dark brown or black eyes. +10 bonus versus heat/fire attacks; -10 bonus versus cold/ice attacks. Their eyes are attuned to extremely bright light and they are unaffected by brilliant displays which might blind others.'
  },
  {
    name: 'Lossoth',
    type: 'humans',
    description: 'The Lossoth live in the Far North of western Middle-earth and are often called "Snowmen" or "Forodwaith" (the latter is also a name for their land). They are a sparsely settled, nomadic folk who move with the seasonal migrations of big game and rarely interact with other Men. Physical Character: Stocky and hard, with pronounced muscles. They have wide features and large, pudgy hands and feet. Men average 175 pounds, women 140 pounds. Fair, with reddish highlights. They have pale blue eyes and fair hair. They are extremely rugged and can travel great distances with little or no rest. Short; men average 5\'5", women 5\'3". Lifespan: Medium, about 75-90 years. +20 bonus versus cold/ice attacks. -20 bonus versus heat/fire attacks. They have an acute sense of smell and perception. They can pick up a Man\'s scent a mile downwind and 100 feet upwind (1000 feet otherwise). +10 bonus to Perception. The Lossoth are poor, nomadic hunters and gatherers. They use stonework, bone, and limited amounts of wood and metal (mostly copper). Some herd reindeer and all make use of hunting dogs. They hate Wargs, Dragons, Giants, and Trolls above all things.'
  },
  {
    name: 'Rohirrim',
    type: 'humans',
    description: 'The Rohirrim (S. "Masters of Horses") are the Northmen of Rohan and have a complex ancestry. They settled in Rohan (then Calenardhon) about T.A. 2510 at the request of Cirion, the Steward of Gondor. The grant was a reward for the Northmen\'s aid in the defeat of the Easterling Balchoth. The Rohirrim call Rohan the Riddermark. Physical Character: Average to stocky and strong. Men average 190 pounds, women 130 pounds. They have considerable amounts of facial hair. Blond, with fair skin and blue eyes. Average endurance, although they can ride as long as their mounts can endure, and as long as they can stay awake. Men average 6\'1", women 5\'5". Lifespan: 60-85 years. +20 bonus to melee Offensive Bonus when fighting from horseback. Herders and horse-masters, they spend much of their year living in various semi-permanent camps set out on a circuit of pastures. They return to their permanent homes for the winter. Some garden or farm. Most Rohirrim are also accomplished hunters and fishermen. The Rohirrim hate the Dunlendings and consider the Woses as lesser beings. They also have an age-old hatred of Orcs, Wargs, Easterlings, and Dragons.'
  },
  {
    name: 'Rural Men',
    type: 'humans',
    description: 'This is a generalized label for the rural folk of Eriador and Gondor, the Common Men of northwestern Middle-earth. These folk contain varying degrees of Harnadan, Dunlending, Northman, and Dúnadan blood. Physical Character: All types, but normally medium. Males average 160 pounds, women 125 pounds. Variations of fair to tan or olive skin. All colors of hair and eyes. Average endurance. Males average 5\'10", women 5\'4". Lifespan: Moderate, averaging 60-80 years. Practical wool and linen garb, including cloaks, boots, etc. Tunics are worn in warmer areas; shirts and pants or leggings are worn in cooler locales. Rural folk are mostly farmers and herders, with little contact with areas outside their village or region. Rural folk are suspicious of most outsiders, and might be in awe of some. They hate no race, aside from the Orcs and Wargs.'
  },
  {
    name: 'Urban Men',
    type: 'humans',
    description: 'This is a generalized label for the town and city folk of Eriador and Gondor, the Common Men of northwestern Middle-earth. It includes common folk from Annúminas, Fornost, Bree, Tharbad, Calembel, Dol Amroth, Linhir, Pelargir, Osgiliath, Minas Tirith, etc. These folk contain varying degrees of Harnadan, Dunlending, Northman, and Dúnadan blood. Physical Character: All types, but normally medium. Males average 160 pounds, women 125 pounds. Variations of fair to tan or olive skin. All colors of hair and eyes. Average endurance. Males average 5\'10", women 5\'4". Lifespan: Moderate, averaging 65-85 years. Various types of elaborate or practical wool and linen garb, including cloaks, boots, etc. Tunics are worn in warmer areas; shirts and pants or leggings are worn in cooler locales. Some imported silks and fine cottons are in evidence. Urban folk are a varied, rather cosmopolitan lot. Many are from mercantile or guild backgrounds and some have dealt with enchantments. Urban folk are worldly enough to deal with most outsiders. They hate no race, aside from the Orcs and Wargs.'
  },
  {
    name: 'Variags',
    type: 'humans',
    description: 'The Variags live in the region of Khand, a semi-arid plateau which lies southeast of Mordor. They are a distinct race, but are occasionally confused with the Haradrim of Far Harad. In reality, they have as many ties to the Easterlings. Brutal and semi-nomadic, they have long been influenced by Mordor and the constant wars with their neighbors. Physical Character: Medium; men average 160 pounds, women 125 pounds. Extremely dark grey or black skin, straight black hair, and red or reddish brown eyes. Variags can travel for extreme periods on horseback with little or no rest. Medium; men average 5\'9", women 5\'3". Lifespan: Short, about 50-70 years. Variags are superb riders and handle both horses and camels well. +10 bonus to Offensive Bonuses when fighting from horseback (+5 bonus when fighting from camelback). Variags favor black and red clothing and wear richly adorned garb. Their armor is designed around hideous, frightening beast designs. They carry gold or gilded weapons. Always at war, Variags live a brutal and exciting life. Most are herders and raid the stocks of their enemies.'
  },
  {
    name: 'Woodmen',
    type: 'humans',
    description: 'The Woodmen are Northmen who have long lived in Mirkwood, the great forest in Rhovanion. They are a loose tribe of hunter/gatherers who live in or below the trees as extended families, bands, or clans. Physical Character: Average to stocky, with strong but angular features and large amounts of facial hair. Fair skin with reddish highlights. They have blond hair and blue or green eyes. Average endurance. Men average 6\'1", women 5\'5". Lifespan: 45-85 years. They can climb and move along tree limbs exceedingly well: +20 to Climbing and Acrobatics maneuvers. +10 to Foraging maneuvers. They wear crude woolen tunics and short pants with leggings. Most favor coats, cloaks, and fur hats. They are an independent lot who have no formal political structure. Living off the gifts of the forest, they reside in small, close groups secluded from other races. They interact with few other than the Beornings and Silvan Elves. Woodmen hate Orcs, Wargs, Trolls, and Giant Spiders.'
  },
  {
    name: 'Woses',
    type: 'humans',
    description: 'Of all Men, none surpass the Woses in the arts of wood-lore and wood-craft. This very ancient and diminutive race has long been tied to the forests and has remained the greatest lot of woodland warriors ever produced by the Second-born. Their skills have in fact guarded their narrow survival, for they are considered ugly by Men and Elves alike and have been hunted and persecuted since the days of the First Age. The Woses have many names. What they call themselves is not altogether clear, although the name Drûgs is taken from their own tongue. Drúedain (sing. Drúadan) is the label given them by the Elves, while Men call them by various labels: Rógin (sing. "Róg"), Púkelmen, Wild Men, or Woses, the latter a Westron term. Orcs fear the Woses, and have named them Oghor-hai. Physical Character: Woses generally have a broad, stumpy profile marked by wide faces, flat features, and deep-set eyes. Short, thick legs, heavy lower bodies, and pronounced brows help give them an eerie character. Ruddy skin, black hair, and black eyes. 4 to 5 feet. Lifespan: 30-50 years. The wide noses of the Woses are the most sensitive found in Man. Even in an open field, they can smell an Orc before another Man can see him. +25 bonus to Tracking maneuvers; +15 bonus for Foraging. They have the ability to sit for days on end without movement. Woses are blessed with superb night-vision. Even in the dark forest of the night they can see 1000 feet as if it were daylight.'
  },
  // Orcs
  {
    name: 'Uruk-hai',
    type: 'orcs',
    description: 'Following Sauron\'s resurrection in T.A. 1000 he began breeding a new race of Orcs, one capable of independent and intelligent action. After centuries of work, he produced the first Greater Orcs, and he called them the Uruk-hai (BS "Orc-race") because they were more suited to the formation of societies. Initially, the Uruk-hai remained close to Sauron and served as lieutenants and elite guards, but gradually their numbers grew and their strain strengthened. Their existence remained guarded until Sauron was willing to show his hand. Nonetheless, in T.A. 2475 they were unleashed in full scale battle formations. They are the Dark Lord\'s finest goblin troops. The Uruk-hai differ from normal or Lesser Orcs in many ways: (1) they stand 5-6 feet tall; (2) they have a more "human" appearance, despite cat-like eyes, fang-teeth, and black/grey hides; (3) they have longer, stronger, and straighter legs; (4) they are intelligent and cunning; and (5) despite their preference for darkness, they operate freely in daylight. They speak Black Speech (Rank 5), Orkish (Rank 4), and good Westron (Rank 4).'
  },
  {
    name: 'Half-orcs',
    type: 'orcs',
    description: 'Half-orcs are a hideous creation, born of Man and Orc. They are often confused with Uruk-hai, but are a distinct race, small in number but capable and deadly. Their origin is also unclear, although it appears that they were first used by the tainted Wizard Saruman. He still employs them as agents, spies, lieutenants, and special guards. They are particularly effective in Eriador, for Saruman\'s Half-orcs have Dunlending blood in them and are capable of blending into their societies. Half-orcs are akin to Uruk-hai, but look more like dark Men. They speak Westron quite well (Rank 5), and most know both Orkish (Rank 3) and a little Black Speech (Rank 2). Half-orcs have no restrictions on professions, and get three background points.'
  },
  {
    name: 'Common Orcs',
    type: 'orcs',
    description: 'These hideous creatures are members of a race descended from Elves who were twisted and perverted by Morgoth during the First Age. Although they are not inherently evil, they are culturally and mentally predisposed toward Darkness. Physical Character: Heavy, with thick hides, short legs, and long, thin arms. They have grotesque, fanged faces and random hair growth. Black or grey hair, black or reddish-brown eyes, and deep grey or black hides. Tremendous endurance. Ores can travel for 2 days without rest. Alternatively, they can run for up to 12 hours without stopping. 3-5 feet. Indefinite lifespan; certainly hundreds of years, but the nature of their warlike life permits few to live past the age of 50. +30 bonus versus heat/fire attacks. Orcs sleep during daylight hours, although they need rest only once every 3 days. In most darkness Orcs can see like Elves, and in absolute darkness they can see 10\'. Bred as laborers and warriors, Orcs respect power and terror above all things. They join and cooperate in substantial groups only when led by a "focused will", some overwhelmingly strong individual.'
  },
  // Trolls
  {
    name: 'Olog-hai',
    type: 'trolls',
    description: 'The Olog-hai have been bred by Sauron from lesser Troll stock, and have until late been a rare breed. Cunning and organized - yet as big and strong as their lesser brethren - the Olog-hai are superb Warriors. They know no fear, and thirst for blood and victory. Olog-hai are also called Black Trolls, for they have black scaly hides and black blood. Most carry blank shields and war hammers, although they are adept at using almost any weapon. They differ from older Troll varieties in other ways as well: (1) they ignore bleeding or stun results when given a critical strike from a normal weapon, since they are more resistant to unenchanted weapons; (2) they can operate freely in daylight; (3) they are relatively quick; and (4) they are capable of using normal language properly, and speak Black Speech (Rank 5) and Westron (Rank 3).'
  },
  {
    name: 'Half-trolls',
    type: 'trolls',
    description: 'Half-trolls are the product of a union of Olog-hai and Variag Men. For this reason, they are sometimes confused with Black Trolls, but they are smaller and quicker and vaguely resemble Men. Their 7\' height, jet-black skin, long sharp red tongues, and glowing red eyes should also serve notice of their uniqueness. Half-trolls differ from Olog-hai in other ways: (1) they wear crude black clothing and considerable amounts of armor; (2) they are kept away from other Trolls; (3) they are as intelligent as Men; and (4) they are more agile. Given their increased minds, they get two background points.'
  },
  {
    name: 'Normal Trolls',
    type: 'trolls',
    description: 'Bred by Morgoth in mockery of Ents, Trolls are as tough and stupid as the stone from which they were made. Some feel they are related to Giants. In any case, Trolls hate all other creatures, a legacy of Morgoth\'s dark touch. Normal Trolls are divided into several types (based on their location): Hill, Cave, Snow, and Stone-trolls. The latter is the most common group. These types all revert to the stone of their substance when exposed to the light of day, for they were created in Darkness and the Sun can unmake them. Physical Character: They are huge and immensely strong, with thick bodies and limbs. Their tough hides have an inconsistent quality; many have overlapping scales and some have body hair. Various shades of brown, green, or grey hide, with black or brown eyes. They have black blood. Average endurance. 9 to 11 feet. Variable lifespan; hundreds of years. Trolls do not understand fear. Their vision is the same as that of Orcs. Sunlight. When exposed to the natural light of day they turn to stone. Trolls live in order to play and eat. To them play means killing and pillaging, and eating means fresh meat - raw or cooked - or jelly made from innards.'
  }
];

async function insertRaces() {
  try {
    console.log('Inserting races into entities table...\n');
    
    let insertedCount = 0;
    let skippedCount = 0;
    
    // Check for existing entities
    const existingResult = await pool.query('SELECT name, slug FROM entities');
    const existingNames = new Set(existingResult.rows.map(e => e.name.toLowerCase()));
    const existingSlugs = new Set(existingResult.rows.map(e => e.slug.toLowerCase()));
    
    for (const race of racesData) {
      const slug = createSlug(race.name);
      
      // Check if already exists
      if (existingNames.has(race.name.toLowerCase()) || existingSlugs.has(slug.toLowerCase())) {
        console.log(`⏭️  Skipped (already exists): ${race.name}`);
        skippedCount++;
        continue;
      }
      
      const biomes = extractBiomes(race.description);
      
      try {
        await pool.query(
          `INSERT INTO entities (id, name, slug, type, description, url_path, region_id, biomes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            randomUUID(),
            race.name,
            slug,
            race.type,
            race.description.substring(0, 4000),
            null,
            null,
            biomes
          ]
        );
        insertedCount++;
        console.log(`✅ Inserted: ${race.name} (${race.type})`);
      } catch (error) {
        console.error(`❌ Failed to insert ${race.name}:`, error.message);
      }
    }
    
    console.log(`\n✅ Successfully inserted ${insertedCount} races`);
    console.log(`⏭️  Skipped ${skippedCount} existing races`);
    
    // Verify
    const countResult = await pool.query('SELECT COUNT(*) as count FROM entities');
    console.log(`\nTotal entities in database: ${countResult.rows[0].count}`);
    
    // Show distribution by type
    const typeResult = await pool.query(`
      SELECT type, COUNT(*) as count 
      FROM entities 
      WHERE type IN ('dwarves', 'elves', 'hobbits', 'humans', 'orcs', 'trolls')
      GROUP BY type 
      ORDER BY count DESC
    `);
    console.log('\nRaces by type:');
    typeResult.rows.forEach(row => {
      console.log(`  ${row.type}: ${row.count}`);
    });
    
  } catch (error) {
    console.error('Error inserting races:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

insertRaces();
