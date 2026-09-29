# ============================================================================
# Default NL pack — verbatim transcription of app/natural_language/* constants
# ----------------------------------------------------------------------------
# Serves two purposes: (1) the resolver's fallback when the DB has no pack or
# is unreachable, (2) the seed payload for game_id='middle_earth'. Keys are
# namespaced by domain ('climate.windy_speed_min'); dict-style constants are
# stored as one phrase-list key per entry. Water crossing variants keep
# {subject}/{river}/{stream}/{when} placeholders — the renderer formats them.
# ============================================================================

DEFAULT_GAME_ID = 'middle_earth'

# Ordered bands: 'below' bands match value < below (None = catch-all);
# 'above' bands (altitude) match value >= above_m, evaluated in listed order.
DEFAULT_BANDS = {
    'temperature': [
        {'below': 2, 'phrase': 'bitter cold'},
        {'below': 8, 'phrase': 'cold'},
        {'below': 15, 'phrase': 'cool'},
        {'below': 22, 'phrase': 'mild'},
        {'below': 29, 'phrase': 'warm'},
        {'below': None, 'phrase': 'hot'},
    ],
    'cloud_cover': [
        {'below': 25, 'phrase': 'clear skies'},
        {'below': 60, 'phrase': 'partly cloudy'},
        {'below': 90, 'phrase': 'mostly overcast'},
        {'below': None, 'phrase': 'heavy cloud cover'},
    ],
    'mood': [
        {'below': -0.6, 'phrase': 'despairing'},
        {'below': -0.25, 'phrase': 'troubled'},
        {'below': 0.25, 'phrase': 'steady'},
        {'below': 0.6, 'phrase': 'heartened'},
        {'below': None, 'phrase': 'exultant'},
    ],
    'altitude': [
        {
            'above_m': 2000,
            'phrases': [
                'Two thousand metres above the lowlands — a height where few roads run and fewer travellers pass. The cold is punishing and the air thin enough to slow thought as well as foot.',
                'At this altitude the world below is lost in haze; the cold here is not weather but a permanent condition of the stone.',
                'Above two thousand metres: the peaks are no longer above but around. Survival demands attention to every step.',
            ],
        },
        {
            'above_m': 1500,
            'phrases': [
                'Fifteen hundred metres and more: the lungs work harder, the cold bites deeper, and the sky feels closer than the earth.',
                'At this height clouds pass at eye level; the body labours for air it cannot quite find.',
                'The road climbs into the realm of snow and bare rock, where breath comes short and the cold is constant.',
            ],
        },
        {
            'above_m': 1000,
            'phrases': [
                'The road at its highest runs above a thousand metres of open sky — the air noticeably thinner and the cold sharper.',
                'Above a thousand metres, the world opens wide below; the wind carries no warmth up here.',
                'The highest point of the day sits well above the tree-line; the air is clear and thin.',
            ],
        },
    ],
}

DEFAULT_THRESHOLDS = {
    'climate.windy_speed_min': 18,
    'climate.wet_precipitation_min': 0.2,
    'climate.snow_temp_max': 1.0,
    'climate.heavy_rain_min': 0.4,
    'climate.storm_wind_min': 25,
    # precipitation reaches the mind as a per-phase SUM (C2) — the storm
    # floor sits well above a merely wet phase.
    'climate.storm_precip_min': 8.0,
    'climate.deep_cold_max': -10,
    'climate.scorching_min': 32,
    'climate.consecutive_days': 2,
    'climate.heavy_cloud_cover': 70,
    'elevation.heavy_change_m': 300,
    'night.storm_precipitation_min': 1,
    'night.storm_wind_min': 25,
    'night.hard_wind_min': 30,
    'night.restless_wind_min': 18,
    'night.soaking_dawn_rain_min': 0.5,
    'night.dawn_hour_start': 5,
    'night.dawn_hour_end': 7,
    'terrain.small_patch_km2': 10,
    'place.distant_sighting_km': 1,
    'water.plank_bridge_chance': 0.3,
    # Traveller's condition + equipage bands (C10) — the host ships raw
    # state; these bands decide which phrase speaks. Same numbers as the
    # game's old TUNING constants.
    'condition.energy_worn_max': 50,
    'condition.energy_spent_max': 25,
    'condition.shadow_unease_min': 20,
    'condition.shadow_shadowed_min': 45,
    'condition.shadow_burdened_min': 70,
    'equipage.cold_temp_max': 15,
    'equipage.cold_shift_min': 3,
    'equipage.low_rations_max': 2,
    'equipage.low_water_max': 0.25,
    'equipage.low_coins_max': 5,
}

DEFAULT_PHRASE_LISTS = {
    'climate.snowbound': [
        'The snow has followed the road for days now; the way grows harder to read with each white mile.',
        'Snow lies deep and unbroken; every step costs more breath, more warmth, more will.',
        'Drifts are closing the lower paths. The world has narrowed to what the traveller can still break through.',
    ],
    'climate.drenched': [
        'Rain has not let up for days; cloak, boots and spirit are all sodden through.',
        'The sky has wept without rest; the road runs with mud and the camp is a swamp.',
        'Water finds every seam: the traveller has forgotten what it is to be dry.',
    ],
    'climate.storm_lashed': [
        "Storm after storm has harried the journey; the wind seems to know the traveller's name.",
        'The days have been loud with thunder and the nights uneasy with flying rain.',
        'It is as if the weather has turned deliberately hostile; each dawn brings a new assault from the sky.',
    ],
    'climate.frozen': [
        'A killing cold has settled in and will not lift; fingers stiffen, breath smokes, metal bites the skin.',
        'The frost has lasted so long that even the fires at night feel thin.',
        'Every water skin is slush by morning; the cold has become a companion no one asked for.',
    ],
    'climate.scorched': [
        'The heat has beaten down for days; the land is pale, the throat parched, the shadows the only mercy.',
        'Sun and dust have ruled the road; the traveller moves in the stunned hours of early and late day.',
        'The air shimmers and does not cool; rest is shallow and the nights offer little relief.',
    ],
    'climate.moon.new_moon': ['no moon rises; the dark is absolute away from the fire'],
    'climate.moon.waxing_crescent': ['a thin waxing crescent follows the sunset'],
    'climate.moon.first_quarter': ['the moon stands at first quarter, half-lit in the south'],
    'climate.moon.waxing_gibbous': ['a waxing gibbous moon brightens the east'],
    'climate.moon.full_moon': ['the full moon is bright; the land lies pale and open'],
    'climate.moon.waning_gibbous': ['a waning gibbous moon lights the camp early, then dims'],
    'climate.moon.last_quarter': ['the last-quarter moon rises late and cold'],
    'climate.moon.waning_crescent': ['a waning crescent fades before dawn'],
    'elevation.rolling': [
        'The road rises and falls hard through the day — a gruelling march of ascent and descent that leaves the legs heavy by evening.',
        'Climb follows descent follows climb; the legs are never given peace.',
        'The way offers no level ground. Every hour is either up or down, and the body pays for it.',
    ],
    'elevation.hard_ascent': [
        'The way climbs hard for much of the day — a long, taxing ascent that tests the lungs and legs.',
        'A relentless uphill march; the ground rises and does not level.',
        'The ascent is long and unforgiving — lungs labouring, pace reduced to a grind.',
    ],
    'elevation.hard_descent': [
        'The road descends steeply and at length — knees and balance are tested on rough, falling ground.',
        'A long downhill that punishes the joints as surely as any climb.',
        'The descent is steep and relentless; loose stone and the angle of the slope demand constant care.',
    ],
    'elevation.steady_ascent': [
        'The way rises through the day, a steady climb that makes the miles feel longer than they are.',
        'A gradual but persistent ascent runs through most of the day.',
        'The road trends upward all morning; by afternoon the altitude is felt in the step.',
    ],
    'elevation.steady_descent': [
        'The road loses height through the day, a long descent that eases the pace but tires the joints.',
        'A steady descent through most of the march — easier on the lungs, harder on the knees.',
        'The way falls away gradually; the valley below grows closer with every hour.',
    ],
    'meal.midday_leads': [
        'A short halt at midday',
        'The midday halt, taken standing',
        'A pause at the height of the day',
        'The road gives way to a brief midday rest',
    ],
    'meal.evening_leads': [
        'The evening meal at camp',
        'Supper by the fire',
        'The last meal of the day, taken at camp',
        'Food at camp, once the packs are down',
    ],
    'meal.hungry_midday': [
        'no midday meal — the satchel offers nothing and the walking goes on unfed',
        'nothing to eat at the midday halt; the belt is drawn a notch tighter',
    ],
    'meal.hungry_evening': [
        'no supper at camp — the fire is lit over an empty pot',
        'camp is made without a meal; there is nothing left to cook',
    ],
    'meal.dry': [
        'nothing to drink; the waterskin is empty',
        'no water to wash it down',
    ],
    'night.storm': [
        'A storm bursts after dark; the traveller must find what shelter they can.',
        'Thunder and wind force the camp to huddle behind rocks or trees.',
        'The night turns violent — rain and gusts make sleep impossible until the storm passes.',
    ],
    'night.soaking_dawn_rain': [
        'Toward dawn a steady rain soaks the camp, waking the traveller with cold drops.',
        'A grey rain moves in before first light, pattering against cloak and canvas.',
        'The traveller wakes to the sound of rain in the small hours, the ground turning soft.',
    ],
    'night.light_dawn_rain': [
        'A faint drizzle brushes the camp near dawn.',
        'A light, passing shower stirs the sleeper once before morning.',
    ],
    'night.hard_wind': [
        'In the depth of night the wind rises, tearing at the camp and making sleep fitful.',
        'Gusts slam across the sleeping place, rattling gear and demanding attention.',
    ],
    'night.restless_wind': [
        'A restless wind keeps the traveller half-awake through the watches of the night.',
        'The night air moves constantly, carrying the smell of rain or pine through the camp.',
    ],
    'night.freezing': [
        'The cold sinks deep; sleep comes in shivers until the fire dies entirely.',
        'Frost forms on cloak and grass, and the traveller wakes stiff and slow.',
    ],
    'night.chilly': [
        'The night is cold enough that the traveller curls closer to the embers.',
        'A chill settles after sunset and never truly leaves.',
    ],
    'night.calm': [
        'The night passes quietly, the stars clear and untroubled.',
        'A calm, uneventful night leaves the traveller rested by morning.',
    ],
    'terrain.biome.forest': ['woodland'],
    'terrain.biome.marsh': ['marshes and wet ground'],
    'terrain.biome.desert': ['barren, arid waste'],
    'terrain.biome.plain': ['open grasslands'],
    'terrain.altitude.hills': ['rolling hills'],
    'terrain.altitude.mountains_low': ['the lower mountain slopes'],
    'terrain.altitude.mountains_med': ['high mountain country'],
    'terrain.altitude.mountains_high': ['the high peaks'],
    'road.road_major': ['well-kept royal roads'],
    'road.road': ['made roads'],
    'road.trail': ['rough trails and paths'],
    'road.off_road': ['open country, cross-country'],
    'place.proximity.through': ['passes through'],
    'place.proximity.close': ['passed close by'],
    'place.proximity.distant': ['passed at some distance'],
    'water.generic_names': ['river', 'stream'],
    'water.bridge': [
        '{subject} is crossed by a stone bridge {when}.',
        'A bridge carries the road over {river} {when}.',
        '{river_cap} runs swift beneath a wooden bridge, crossed {when}.',
    ],
    'water.plank': [
        'A rough plank bridge spans {stream} {when}.',
        'A low timber crossing takes the road over {stream} {when}.',
    ],
    'water.ford': [
        '{subject} is forded {when} — the water cold and quick underfoot.',
        'A shallow crossing of {stream} {when}; the stones slippery beneath.',
        '{stream_cap} must be waded {when}, the current pulling at the ankles.',
    ],
    'opening.foci': [
        'the sound of the place — what the traveller hears, not what he sees',
        'the light — how the day opens, turns, and closes',
        'the body of the traveller — weariness, breath, the weight of the pack',
        'a small object or detail on the road',
        'the silence or absence — what is not there, what the land withholds',
        'how the traveller wakes up, or what it takes for breakfast',
    ],
    # Gates & rolls (B1): wrong readings for `misread` ({subject} = entity or
    # true reading when present), the condition names that count as an
    # altered state (fear/shadow), and the vague desc an unnoticed event
    # leaves in memory — the "malestar difuso" of the spec.
    'mind.misread': [
        'read the signs of {subject} as an omen',
        'was certain {subject} meant them harm',
        'mistook {subject} for eyes watching from the dark',
        'saw {subject} and felt sure it was a warning',
        '{subject} — or what the fear made of it',
        'the mind twisted what passed into something watching',
        'a shape misread, menace where there was none',
    ],
    'mind.altered_states': [
        'afraid', 'terrified', 'panicked', 'maddened',
        'shadow-sick', 'delirious', 'haunted',
    ],
    'mind.unnoticed': [
        'a vague unease, its source already forgotten',
        'something passed unnoticed, leaving only restlessness',
        'a dull disquiet with no name to put to it',
    ],
    # Needs (B2): one entry per detector key; 'mind.need.thread' is the
    # generic fallback for narrative threads ({subject} = entity/region).
    'mind.need.hunger': [
        'the hunger has gone from ache to companion — food is owed',
    ],
    'mind.need.thirst': [
        'the throat is dry as bone — water cannot wait much longer',
    ],
    'mind.need.exhaustion': [
        'the body is spent past caution — rest is no longer optional',
    ],
    'mind.need.unrest': [
        'the shadow on the heart wants answering — solace, or an end to fear',
    ],
    'mind.need.wound': [
        'a wound still unhealed — it wants tending before the road asks more',
    ],
    # Traveller's condition / equipage / end (C10): the host ships raw
    # state and these lists own every word it becomes. {name} is the
    # character, {notes} the causal log notes. The mind path renders
    # equipage + endstate the same way; the condition lines are spoken by
    # the lens instead when a brain is driving.
    'condition.energy.worn': [
        '{name} is worn down; let a heavier step, a shorter temper and a longing for shelter show in how {name} moves.',
    ],
    'condition.energy.spent': [
        "{name} is at the very limit of {name}'s strength — stumbling, the body failing, choices driven by exhaustion.",
    ],
    'condition.shadow.unease': [
        'A faint unease has settled on {name}: grimmer now, more watchful than before.',
    ],
    'condition.shadow.shadowed': [
        'A shadow has gathered on {name}, mile by mile: quick to suspect, seeing threat where once {name} saw beauty, slow to trust the quiet.',
    ],
    'condition.shadow.burdened': [
        '{name} is heavily burdened in spirit: the land itself feels malevolent, bleak, and what trust {name} had is all but gone.',
    ],
    'condition.wounded.wounded': [
        '{name} nurses a wound that has not yet healed.',
    ],
    'condition.wounded.badly_wounded': [
        '{name} is badly wounded, moving as one who is not far from falling.',
    ],
    'condition.owes_to': [
        'This owes to {notes}.',
    ],
    'condition.tail': [
        'Let this colour the telling — how {name} moves, what {name} notices and longs for — but never name it as a fact or a number.',
    ],
    'equipage.turned_away': [
        'turned away from the door for want of coin, the traveller slept against the wall of the very town that would not have him',
    ],
    'equipage.poorly_clad': [
        'poorly clad for this cold; the cloak is thin and the wind finds every gap',
    ],
    'equipage.low_rations': [
        'the satchel is nearly empty',
    ],
    'equipage.flask_frozen': [
        'the waterskin is rimed with ice and no stream can refill it today',
    ],
    'equipage.empty_waterskin': [
        'the waterskin is empty; the tongue is parched and every swallow is remembered',
    ],
    'equipage.low_water': [
        'the waterskin is nearly dry; only a mouthful or two remain',
    ],
    'equipage.no_food_water_deep': [
        'neither food nor water in days; the body is doubly tried and the step unsteady',
    ],
    'equipage.no_food_water': [
        'neither food nor water has passed the lips; the body is doubly tried',
    ],
    'equipage.hungry_deep': [
        'no decent meal in days; hunger gnaws and weakens the arm',
    ],
    'equipage.hungry': [
        'no decent meal since yesterday; the belly is hollow',
    ],
    'equipage.thirsty_deep': [
        'no water in far too long; the tongue swells and the mind grows slow',
    ],
    'equipage.thirsty': [
        'no water since yesterday; the throat is dust and the lips are cracked',
    ],
    'equipage.low_coins': [
        'few coins left in the purse, counted twice before asking for a bed',
    ],
    'equipage.no_coins': [
        'the purse is empty',
    ],
    'equipage.tail': [
        'Never list objects or quantities; the equipage appears only when it hinders, is lacking, or brings comfort.',
    ],
    'endstate.slain': [
        "=== THE END ===\nThis is the FINAL CHAPTER. {name} dies here. Narrate the moment of death explicitly in the final movement. Do not end the chapter with {name} still alive. The journey ends here.\n\n=== MANDATORY ENDING ===\nYou must describe {name}'s actual death. Do not transition to a night at camp; the story stops at the moment {name} falls.",
    ],
    'endstate.dead_exhaustion': [
        "=== THE END ===\nThis is the FINAL CHAPTER. Exhaustion finally claims {name}, who dies here. Narrate the collapse and final moments explicitly in the final movement. Do not end the chapter with {name} still alive. The journey ends here.\n\n=== MANDATORY ENDING ===\nYou must describe {name}'s death from exhaustion. Do not transition to a night at camp; the story stops at {name}'s final collapse.",
    ],
    'endstate.dead_shadow': [
        '=== THE END ===\nThis is the FINAL CHAPTER. The shadow finally consumes {name}; {name} dies or is fully corrupted. Narrate the corruption taking hold and the final end explicitly in the final movement. Do not end the chapter with {name} merely threatened or alive. The journey ends in darkness.\n\n=== MANDATORY ENDING ===\nYou must describe the exact moment the shadow consumes {name}. Do not transition to a night at camp; the story stops at that moment.',
    ],
    'mind.need.exposure': [
        'day upon day of hostile weather has worn the spirit thin — shelter is needed',
    ],
    'mind.need.thread': [
        'unfinished business with {subject} — the matter will not stay quiet',
    ],
    # Pattern memories (B3): {subject} is the human end of the recurring
    # tag ('lembas', 'wolves', 'eriador'), {count} the episodes it hit.
    'mind.pattern': [
        '{subject} again — it is becoming the shape of these days',
        'another day of {subject}; the pattern is unmistakable now',
    ],
    # Recurrence channel (C5): repetition pressure is the wear of
    # sameness itself ({subject} = the human end of the tag, {count} =
    # consecutive episodes); a pattern break is the first day the
    # streak dies.
    'mind.repetition': [
        '{subject} again — the sameness is starting to wear',
        'another day of {subject}; it grates a little more',
    ],
    'mind.pattern_break': [
        'no {subject} today — the first break in the stretch',
        'the {subject} let up at last; the change itself is noticed',
    ],
    # Decisions (B5): resolution line returned by /decide. {choice} is
    # the option label, {name} the character.
    'mind.decision': [
        'The choice is made: {choice}.',
        '{name} takes {choice}.',
    ],
    'opening.strategies': [
        'the first sentence has the land, the weather or an object as its grammatical subject — the traveller enters the paragraph late, almost incidentally',
        'open with a sensation in the body — heat, an ache, thirst, cold stone underhand — before saying who feels it or where',
        'open with something already half-finished: an action caught at its end, its beginning left untold',
        'open with a short, concrete sentence of five words or fewer; let the second sentence widen the view',
        'open with what the traveller hears or smells before anything is seen',
        "open with a thought, a memory or a doubt in the traveller's head, and only then place the body on the road",
        'open with a change: something is different from yesterday, and the first line names that difference',
    ],
}

# Bandable fields per event type — admin autocomplete + NL tester registry.
DEFAULT_FACETS = [
    ('climate', 'temperature_2m', '°C', 'Air temperature at 2 m'),
    ('climate', 'cloud_cover', '%', 'Cloud cover percentage'),
    ('climate', 'wind_speed_10m', 'km/h', 'Wind speed at 10 m'),
    ('climate', 'precipitation', 'mm', 'Precipitation amount'),
    ('body', 'energy', '0-1', 'Energy level'),
    ('body', 'fatigue', '0-1', 'Accumulated fatigue'),
    ('body', 'days_without_food', 'days', 'Days since the last meal'),
    ('body', 'days_without_water', 'days', 'Days since the last drink'),
    ('travel', 'distance_km', 'km', "Distance covered in the day's march"),
    ('elevation', 'total_gain_m', 'm', 'Total ascent of the day'),
    ('elevation', 'total_loss_m', 'm', 'Total descent of the day'),
    ('elevation', 'peak_m', 'm', 'Highest elevation sampled'),
    ('place', 'distance_km', 'km', 'Distance from the road to the place'),
]
