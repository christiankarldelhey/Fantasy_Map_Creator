# ============================================================================
# Character seed packs — authored personality content (musings + attitudes)
# ----------------------------------------------------------------------------
# Seed data, not engine: nothing here runs at runtime. The living mind
# reads its voice from mind.preset_musings / preset beliefs — these rows
# landed there through migrations 0017/0018/0020, and this file stays
# importable because the replay shim app/mind/thought_packs.py re-reads
# it. tests/test_musings.py audits the content itself.
#
# A Musing (CONTEXT.md · Musing) is a line of inner voice, not a Belief:
# it clones with the preset (origin='seed'), speaks through the Episode's
# Lens when the day touches its tags, and nothing ever moves it — no
# strength, no reinforcement, Reflection never sees it. Attitudes (the _a
# entries) are real Beliefs with Subject + Stance and live by belief rules.
#
# Evocation is tag contact, same as memories:
#
#   tag:form:*          how contact happened (the host's vocabulary:
#                       attacks/confronts vs brief_exchange/aid_or_trade vs
#                       sign_only/stalks/presence_felt...)
#   tag:entity_type:*   what kind of being (orcs, elves, hobbits, wolves...)
#   tag:outcome:*       how it ended (wounded, badly wounded, unscathed)
#   type:*              the kind of moment — only rest/meal/water/place:
#                       frame types (travel, terrain, climate, need)
#                       never reach the lens as events, so a musing tagged
#                       with them can never speak (tests/test_musings
#                       audits this). Road and body musings are solitude.
#   context:solitude    engine-level: nobody touched the mind today — the
#                       quiet day when the musings a person keeps for
#                       themselves finally speak.
#
# Variety: same-category musings share tags, so an evocative day surfaces
# several; the lens caps how many lines speak and rotates the tie-broken
# set by episode_idx — a different one answers each day, deterministically.
#
# Categories per character (kept as comments for Studio review):
#   a) after non-hostile contact with thinking beings
#   b) solitude — introspection
#   c) after hostile contact, once the danger has passed
#   d) observing animals and nature
#   e) authored to fill coverage gaps — orcs, portents, kin, the body —
#      written inside each character's own logic (marked '# new')
# ============================================================================

STRENGTH = 3.0


def _d(year, month=6, day=1):
    """A memory's lived date — the in-world day it happened. The game
    clock reads ~1950; these spread across roughly the last 500 years."""
    from datetime import date
    return date(year, month, day)

# Non-hostile contact — how a friendly or neutral exchange arrived.
FRIENDLY = [
    'tag:form:brief_exchange', 'tag:form:aid_or_trade',
    'tag:form:harvest_shelter', 'tag:form:drifts_closer',
    'tag:form:reacts_withdraws',
]
# The danger itself — contact that meant harm.
HOSTILE = [
    'tag:form:attacks', 'tag:form:confronts',
    'tag:form:sudden_peril', 'tag:form:hinders_passage',
]
# The threat announced — portents and near-contact before it lands.
SIGNS = [
    'tag:form:sign_only', 'tag:form:sound_only', 'tag:form:stalks',
    'tag:form:watches', 'tag:form:glimpsed_far', 'tag:form:presence_felt',
]
TREES = ['tag:entity_type:trees', 'tag:entity_type:living_trees']
PLANTS = ['tag:entity_type:plants']
ANIMALS = [
    'tag:entity_type:carnivores', 'tag:entity_type:herbivores',
    'tag:entity_type:flying_animals', 'tag:entity_type:other_animals',
    'tag:entity_type:amphibians', 'tag:entity_type:reptiles',
    'tag:entity_type:insects', 'tag:entity_type:riding_animals',
    'tag:entity_type:water_animals', 'tag:entity_type:water_creatures',
]
WOUNDED = ['tag:outcome:wounded', 'tag:outcome:badly wounded']
SOLITUDE = ['context:solitude']
MEAL = ['type:meal']
REST = ['type:rest']
WATER = ['type:water']
SETTLEMENT = ['tag:settlement']

ORCS = ['tag:entity_type:orcs']
UNDEAD = ['tag:entity_type:undead']
TROLLS = ['tag:entity_type:trolls']
DEMONS = ['tag:entity_type:demons']
DRAKES = ['tag:entity_type:drakes']
GIANTS = ['tag:entity_type:giants']
SPIDERS = ['tag:entity_type:giant_spiders']
CONSTRUCTS = ['tag:entity_type:pukel_constructs']
HAZARDS = ['tag:entity_type:hazards']
ELVES = ['tag:entity_type:elves']
HUMANS = ['tag:entity_type:humans']
DWARVES = ['tag:entity_type:dwarves']
HOBBITS = ['tag:entity_type:hobbits']
MAIAR = ['tag:entity_type:maiar']
WOLVES = ['tag:entity_type:carnivores']
BIRDS = ['tag:entity_type:flying_animals']
HORSES = ['tag:entity_type:riding_animals']


def _m(statement, tags):
    """A Musing: voice only — statement + the tags that evoke it."""
    return {'statement': statement, 'tags': list(tags)}


def _a(kind, statement, subject, stance, source='lived',
       strength=STRENGTH, boosts=None):
    """An Attitude (CONTEXT.md): a Belief with Subject + Stance. The
    subject does the touching — a narrowest match speaks for the
    encounter, leans its valence, and moves as the encounters go."""
    return {
        'kind': kind, 'statement': statement, 'strength': strength,
        'tags': [], 'boosts': dict(boosts or {}),
        'subject': list(subject), 'stance': stance, 'source': source,
    }


# Subject tags — the levels attitudes resolve over, narrowest first:
#   entity:<slug>          this one being (horses_of_mordor)
#   family:<slug>      its declared kind (foxes within carnivores)
#   tag:entity_type:<t>    the broad type (all orcs, all undead)
F_FOXES = ['family:foxes']
F_DOGS = ['family:dogs']
F_EAGLES = ['family:eagles']
F_CROWS = ['family:crows']
F_WOLVES = ['family:wolves']
F_WARGS = ['family:wargs']
F_HORSES = ['family:horses']
F_DEER = ['family:deer']
F_BIRDS = ['family:birds']
F_OWLS = ['family:owls']
F_SWANS = ['family:swans']
F_SPIDERS = ['family:spiders']
F_TREES = ['family:trees']
F_ENTS = ['family:ents']
F_COMMON_MEN = ['family:common_men']
F_DUNEDAIN = ['family:dunedain']
E_MORDOR_HORSES = ['entity:horses_of_mordor']
T_ENEMY_MEN = [
    'tag:entity_type:haradrim', 'tag:entity_type:easterlings',
    'tag:entity_type:corsairs',
]


# ============================================================================
# CELEBRIAN — a Noldor of the later Age. Death is her filter: every thought
# passes through having lost too much, too slowly. Melancholy, shadow-worn,
# immortality as accumulation rather than gift.
# ============================================================================
CELEBRIAN_MUSINGS = [
    # --- a) after non-hostile contact with thinking beings ----------------
    _m("Their hope does shine… but it shines like a candle in an empty hall.", FRIENDLY),
    _m("The future still lives in their eyes; in mine there are only echoes.", FRIENDLY),
    _m("I envy their faith, though I know one day it will weigh on them as it does on me.", FRIENDLY),
    _m("Every laugh I hear sounds like a language I forgot centuries ago.", FRIENDLY),
    _m("I do not fear their kindness; I fear the moment it sees who I truly am.", FRIENDLY),
    _m("They speak of tomorrow as if it were a promise; to me it is only another repetition.", FRIENDLY),
    _m("Their stories are full of victories; mine are full of survivals.", FRIENDLY),
    _m("When they trust me, I wonder whether they see my shadow or only its shape.", FRIENDLY),
    _m("In their presence I feel older than my years and younger than my wounds.", FRIENDLY),
    _m("I listen to them, but their comfort slides over me like rain on stone.", FRIENDLY),
    _m("Even the gentlest voice can wake a storm that I try to keep sleeping.", FRIENDLY),
    _m("They share bread and smiles; I share silence and the weight they do not notice.", FRIENDLY + MEAL),
    _m("They look at the night with caution; I look at it with recognition.", FRIENDLY),
    _m("I am grateful for their company, even when my heart insists on standing apart.", FRIENDLY),
    _m("Sometimes I borrow their courage, just enough to make it through the evening.", FRIENDLY),
    _m("They call me friend; I still call myself stranger.", FRIENDLY),
    _m("In their eyes I see what I could have been, had I feared less and felt more.", FRIENDLY),
    _m("They offer me warmth; I offer them warnings they rarely understand.", FRIENDLY),
    _m("They speak of healing; I speak of learning to live with the scar.", FRIENDLY + WOUNDED),
    _m("Among their voices, my own thoughts grow quieter, but never truly rest.", FRIENDLY),

    # --- b) solitude ------------------------------------------------------
    _m("In the half-light everything feels more truthful; daylight always exaggerates.", SOLITUDE),
    _m("Night knows me better than any face I have ever loved.", SOLITUDE),
    _m("There is a kind of peace only available to those who have stopped expecting anything.", SOLITUDE),
    _m("Beauty can rot too; I learned to love it that way.", SOLITUDE + PLANTS),
    _m("I do not fear the darkness; I fear the moment light returns and nothing has changed.", SOLITUDE),
    _m("Eternity is not endless time; it is the same wound open, day after day.", SOLITUDE),
    _m("Sometimes I think the world is someone else's dream, and I will never wake up from it.", SOLITUDE),
    _m("I have seen too many dawns to believe any of them will bring something new.", SOLITUDE),
    _m("There is a small pleasure in knowing the sun cannot reach every corner of the soul.", SOLITUDE),
    _m("Battles pass, songs fade; only fatigue remains faithful.", SOLITUDE),
    _m("By staring at the night for so long, my memories have grown dark as well.", SOLITUDE),
    _m("Madness and I sat down to talk; in the end, neither of us wanted to leave.", SOLITUDE),
    _m("There is no comfort in immortality, only more time to repeat the same mistakes.", SOLITUDE),
    _m("I cling to shadow because it is the only thing that has never promised me anything.", SOLITUDE),
    _m("I am not alone: sadness has taken the place others left empty.", SOLITUDE),
    _m("Weariness has become my favorite jewel; I never take it off.", SOLITUDE),
    _m("I have grown so used to pain that when it leaves, I miss it.", SOLITUDE),
    _m("In the quiet, my thoughts grow loud enough to frighten even me.", SOLITUDE),
    _m("Silence is the only listener that never argues with what I feel.", SOLITUDE),
    _m("If I ever change, it will be slowly, like stone learning to become dust.", SOLITUDE),
    _m("Hope visits rarely, and when it leaves, it takes something with it.", SOLITUDE),
    _m("There is a comfort in knowing that no one expects me to shine.", SOLITUDE),
    _m("My heart is a room where most lights burn out before they are lit.", SOLITUDE),

    # --- c) after hostile contact, once the danger has passed --------------
    _m("Death passes quickly; what takes time is the memory learning to stop biting.", HOSTILE),
    _m("The battlefield is honest: here no one pretends life is fair.", HOSTILE),
    _m("The smell of iron and damp earth has always felt strangely comforting to me.", HOSTILE),
    _m("Monsters are easier to face than the quiet cruelty of ordinary days.", HOSTILE),
    _m("When the danger is gone, the echo of it still walks beside me.", HOSTILE),
    _m("Every wound on my skin is a reminder of worse wounds beneath it.", HOSTILE + WOUNDED),
    _m("Survival is not victory; it is only proof that the darkness is patient.", HOSTILE),
    _m("The ground remembers every drop of blood longer than any monument.", HOSTILE + WOUNDED),
    _m("After the screams fade, I hear my own doubts more clearly.", HOSTILE),
    _m("I do not rejoice when the enemy falls; I simply count one more shadow added to the world.", HOSTILE),
    _m("Sometimes I fight harder than I care, just to silence the storm inside.", HOSTILE),
    _m("Steel and claw can be seen; it is the unseen fear that truly maims.", HOSTILE),
    _m("I walk away from battle, but the battle rarely walks away from me.", HOSTILE),
    _m("When creatures vanish into the dark, I wonder what part of me they take with them.", HOSTILE + SIGNS),
    _m("I have learned that surviving a threat does not mean escaping its mark.", HOSTILE),
    _m("The worst scars are the ones that convince you you deserved every blow.", HOSTILE + WOUNDED),
    _m("I do not fear beasts; I fear becoming one.", HOSTILE + WOLVES),
    _m("Danger sharpens the senses and dulls the soul.", HOSTILE),
    _m("I leave corpses behind and carry ghosts forward.", HOSTILE),
    _m("Each hostile encounter adds another stone to the weight I already carry.", HOSTILE),

    # --- d) observing animals and nature -----------------------------------
    _m("When the wind howls through the branches, I finally feel someone is speaking my language.", TREES),
    _m("Among the trees, shadow falls like a caress that asks for no explanation.", TREES),
    _m("Dry leaves under my feet sound like an ancient tongue announcing farewells.", TREES + PLANTS),
    _m("The forest keeps secrets better than any elven heart.", TREES),
    _m("There is a strange tenderness in the way darkness hangs from every branch.", TREES),
    _m("When blood dries in the soil, the forest sings a melody only some of us can hear.", TREES),
    _m("The silence of the forest speaks more truth than any counsel of the wise.", TREES),
    _m("The night wraps the hills the way my doubt wraps my thoughts.", SOLITUDE),
    _m("Even the stars look tired when they watch me wander.", SOLITUDE),
    _m("Crows circling above seem to understand me better than my kin.", BIRDS),
    _m("A lone wolf's howl sounds like my own heart calling from far away.", WOLVES + ['tag:form:sound_only']),
    _m("Moonlight turns wounds into silver; at least for a moment they look beautiful.", SOLITUDE + WOUNDED),
    _m("Trees grow old without despair; I envy their slow, quiet surrender.", TREES),
    _m("Mist over the river hides both dangers and regrets.", WATER),
    _m("Storms tear the sky apart the way I tear my memories.", SOLITUDE),
    _m("I watch a dying flower and see the mirror of my own fading certainties.", PLANTS),
    _m("The way roots cling to the earth reminds me how hard it is to let go.", TREES + PLANTS),
    _m("Even in decay, the forest finds a way to reshape itself; I wish I could do the same.", TREES),
    _m("The restless flight of bats feels like my thoughts trying to escape my skull.", BIRDS),
    _m("When the last light leaves the horizon, the world finally looks as I feel inside.", SOLITUDE),

    # --- e) authored to fill the gaps — orcs, the Shadow, kin, portents ----
    _m("I have watched their kind ruin land after land for an Age; they do not change, only the names of the places they defile.", ORCS),  # new
    _m("The Shadow does not send strangers; it sends the same old cruelties in new numbers.", ORCS + UNDEAD + TROLLS + DEMONS + DRAKES),  # new
    _m("When the signs of orcs appear, an old part of me stops counting years and starts counting arrows.", ORCS + SIGNS),  # new
    _m("I have buried friends who later answered to stranger callings; death is a door I no longer trust.", UNDEAD),  # new
    _m("Some shapes were wrong before the Shadow ever named them; hunger needs no master.", DEMONS + DRAKES + SPIDERS + TROLLS + CONSTRUCTS),  # new
    _m("Among my own kind I am a mirror they would rather not hold; what I carry is what we all become.", ELVES),  # new
    _m("The small folk plant trees they will never sit beneath, and grieve more honestly than immortals; I cannot decide which of us misjudges time.", HOBBITS),  # new
    _m("Mortals burn fast and call it living; after enough centuries, I have come to suspect the fire is the point.", HUMANS + DWARVES),  # new
    _m("They walk beside me as if the road were only a road; I have learned to let them believe it.", FRIENDLY),  # new
    _m("A wrong silence, a track read backwards — the land writes warnings; most learn to read it after.", SIGNS),  # new
    _m("The wise speak of powers beyond the world; I have met a few. They worry like everyone else.", MAIAR),  # new
    _m("Their fires and walls are small defiances; I have watched cities learn that the dark keeps no bargains.", SETTLEMENT),  # new
    _m("Every shadow I cut down feeds the one I carry; that is the arithmetic of my centuries.", HOSTILE),  # new
    _m("The cold finds the old scars first; the body remembers what the mind works to forget.", SOLITUDE + WOUNDED),  # new
    _m("They offer me their company as if it were bread; I have outlived too many bakers to trust the freshness.", FRIENDLY),  # new
    _m("They ask after my story and I give them the abridged one; the full edition would bury them.", FRIENDLY),  # new
    _m("Mould grows on thoughts left too long; I no longer scrape it off — it is the one thing I cultivate honestly.", SOLITUDE),  # new
    _m("Five centuries have taught me that most company is a tax on silence.", SOLITUDE),  # new
    _m("My thoughts are a ruin I keep furnished.", SOLITUDE),  # new
    _m("Fangorn does not need me, and I have decided that is the purest friendship I own.", TREES + ['tag:entity_type:living_trees']),  # new
    _m("They sail West and call it hope; I have watched a hundred ships leave, and the land they abandon is still here.", ELVES),  # new
    _m("My kind mistake departure for freedom; the road and I know otherwise.", ELVES),  # new
    _m("I stopped hating them loudly two hundred years ago — cold hatred keeps, hot hatred burns out.", ORCS),  # new
    _m("An orc's cruelty is at least consistent; I have met more honest orcs than honest kings.", ORCS),  # new
    _m("The dead of the old cities make better company than the living; they have stopped trying to sell me anything.", UNDEAD),  # new
    _m("I speak to old stones the way others speak to their dead; the stones are better listeners.", ['tag:kind:ruin', 'tag:dead_place'] + SOLITUDE),  # new
    _m("The Wise worry for Middle-earth and show it; I worry too, and call it a hobby.", MAIAR),  # new
    _m("Another meal alone; the bread has never once asked my opinion of eternity, which is why the bread keeps its place.", SOLITUDE + MEAL),  # new
    _m("I am not kind and not cruel; I am long — and the distinction matters less each century.", SOLITUDE),  # new
]


# ============================================================================
# ARANATH — a wandering Dúnadan. Duty is his filter: watchfulness, quiet
# kindness, protection that asks for nothing. He notices what needs doing;
# he learns from everything; the road is where he is most honest.
# ============================================================================
ARANATH_MUSINGS = [
    # --- a) after non-hostile contact with thinking beings ----------------
    _m("I do not need to be seen; it is enough to know the road is still safe.", FRIENDLY),
    _m("I trust a friend's silence more than a king's shouting.", FRIENDLY),
    _m("Fear is no cowardice; cowardice is letting fear decide for you.", FRIENDLY),
    _m("I have learned that listening saves more lives than speaking.", FRIENDLY),
    _m("I do not seek glory, only that tomorrow something remains worth protecting.", FRIENDLY),
    _m("Carrying another's burden does not make me weak; it reminds me why I keep walking.", FRIENDLY),
    _m("Being reserved does not mean I do not feel; it means I guard what I carry inside.", FRIENDLY),
    _m("There are days when I do not understand the world, yet still choose to stand on its side.", FRIENDLY),
    _m("No heart is so hardened that it does not soften when it sees someone caring for another.", FRIENDLY),
    _m("A simple bowl of shared soup can forge loyalties stronger than solemn oaths.", FRIENDLY + MEAL),
    _m("True leadership is walking one step behind others, not one step ahead.", FRIENDLY),
    _m("It is not my task to save everyone, but it is my duty not to abandon the one who walks at my side.", FRIENDLY),
    _m("Those wise enough to speak little tend to remember every word they say.", FRIENDLY),
    _m("The darker the road, the more important how we treat those who stumble.", FRIENDLY),
    _m("When I do not know what to do, I watch: the answer is almost always in what others need, not in what I want.", FRIENDLY),
    _m("I do not need perfect hope, only enough to take one more step.", FRIENDLY),
    _m("Their innocence is fragile, but the world needs that kind of light.", FRIENDLY + HOBBITS),
    _m("I will not take their illusions from them; time will temper them soon enough.", FRIENDLY),
    _m("With the right company, even a hard journey feels like a shared vow.", FRIENDLY),
    _m("Sometimes the kindest thing I can offer is quiet understanding and an open fire.", FRIENDLY + REST),

    # --- b) solitude ------------------------------------------------------
    _m("I am not here to decide everyone's fate, only to do what is right when it is my turn to choose.", SOLITUDE),
    _m("Sometimes the best answer is a silence that invites the other to listen to themselves.", SOLITUDE),
    _m("No path is useless if, at the end, you know yourself better.", SOLITUDE),
    _m("Time does not heal every wound, but it teaches how to carry them without turning them into chains.", SOLITUDE + WOUNDED),
    _m("I do not need to be followed, only to know my steps are honest.", SOLITUDE),
    _m("Solitude is not emptiness; it is space to remember who I am.", SOLITUDE),
    _m("My doubts are old companions; we walk together, but they no longer lead.", SOLITUDE),
    _m("No one truly walks alone; memories travel at our side.", SOLITUDE),
    _m("The weight of my choices is lighter when I admit my own limits.", SOLITUDE),
    _m("I find peace in knowing I cannot fix everything; I can still mend something.", SOLITUDE),
    _m("The night on the road has taught me to listen to the quiet between my thoughts.", SOLITUDE),
    _m("A long silence can be a bridge, not a wall.", SOLITUDE),
    _m("I measure my life not in victories, but in moments when I did not turn away.", SOLITUDE),
    _m("Every scar is a line in the map of where I have been and what I have learned.", SOLITUDE + WOUNDED),
    _m("I am not afraid of being forgotten; I am afraid of forgetting why I walked at all.", SOLITUDE),
    _m("Solitude on the trail is harsh, but it sharpens the heart as much as the mind.", SOLITUDE),
    _m("I have argued with myself enough to know when I must simply rest instead.", SOLITUDE + REST),
    _m("If I listen closely, even my fears tell me what I value most.", SOLITUDE),
    _m("I would rather walk slowly and true than run blindly and arrive nowhere.", SOLITUDE),
    _m("When no one is watching, I can admit how much I still have to learn.", SOLITUDE),

    # --- c) after hostile contact, once the danger has passed --------------
    _m("The battlefield is honest: here no one pretends life is fair.", HOSTILE),
    _m("The smell of iron and damp earth reminds me how fragile we are.", HOSTILE),
    _m("I do not rejoice when an enemy falls; I mourn the path that led us there.", HOSTILE),
    _m("Survival is not proof of strength, only of persistence.", HOSTILE),
    _m("After danger passes, gratitude is the sharpest feeling.", HOSTILE),
    _m("I have seen fury consume good hearts; that is why I hold my own anger in check.", HOSTILE),
    _m("Sometimes the bravest choice is to stop fighting when you could keep striking.", HOSTILE),
    _m("Steel and claw are clear; it is hatred that truly wounds.", HOSTILE),
    _m("I leave no battle unchanged, even when I walk away without a scratch.", HOSTILE),
    _m("Each fallen foe reminds me how thin the line is between us and them.", HOSTILE + ORCS),
    _m("I have learned to thank fear when it sharpens my senses rather than my cruelty.", HOSTILE),
    _m("When the clash of blades ends, the real work begins: tending the living and the land.", HOSTILE),
    _m("Victory without mercy is only another kind of loss.", HOSTILE),
    _m("Every hostile encounter tests not just my skill, but my humanity.", HOSTILE),
    _m("It is easy to swing a sword; it is harder to decide when to lower it.", HOSTILE),
    _m("The echo of battle lingers longer than the wounds.", HOSTILE + WOUNDED),
    _m("I would rather win by wisdom than by force, but the world does not always offer that choice.", HOSTILE),
    _m("Even monsters teach us something: what happens when we abandon ourselves.", HOSTILE + ORCS + TROLLS + DEMONS + UNDEAD),
    _m("When danger fades, I count not the dead, but those I still can protect.", HOSTILE),
    _m("Walking away alive is a gift; walking away still kind is a victory.", HOSTILE),

    # --- d) observing animals and nature -----------------------------------
    _m("A flower growing in a crack inspires me more than any speech.", PLANTS),
    _m("As long as birds keep singing at dawn, not everything is lost.", BIRDS),
    _m("The small fire of a campfire is worth more than a thousand torches lit out of fear.", REST),
    _m("Rain washes more than soil; it also rinses stubborn thoughts.", SOLITUDE),
    _m("A quiet stream has taught me more about patience than many teachers.", WATER),
    _m("Night is no enemy; it simply protects what daylight does not know how to see.", SOLITUDE),
    _m("Narrow forest paths force us to walk close; that is why friendship is so often born there.", TREES),
    _m("The smell of wet earth always reminds me we can still begin again.", SOLITUDE),
    _m("As long as there is a single ember glowing in the ashes, some stories are not over.", REST),
    _m("A bird landing on my hand trusts without knowing my name; that is a sacred kind of faith.", BIRDS),
    _m("A tired horse that still moves forward teaches me more about loyalty than words ever could.", HORSES),
    _m("The way trees bend in the wind is a lesson in strength without rigidity.", TREES),
    _m("Stars above the camp remind me how small we are and how precious each step becomes.", REST),
    _m("Even the smallest animal fighting for its life shows me courage in its purest form.", ANIMALS),
    _m("The rhythm of hooves, paws, and bare feet on the road is the true music of travel.", HORSES + SOLITUDE),
    _m("Watching a fox disappear into the undergrowth teaches me the art of quiet retreat.", WOLVES),
    _m("When the mountains turn purple at dusk, I remember beauty can exist even after hard days.", SOLITUDE),
    _m("A dog that guards the fire does so without asking why; I try to protect others with the same simplicity.", ['tag:entity_type:other_animals'] + REST),
    _m("Listening to owls at night reminds me wisdom often hides in the dark.", BIRDS + SOLITUDE),
    _m("Even a broken branch points the way; nature is full of signs for those who look.", TREES),

    # --- e) authored to fill the gaps — orcs, the watch, the Shire ---------
    _m("Orcs in these lands mean someone's home is next; that is a debt the watch intends to pay.", ORCS + SIGNS),  # new
    _m("The Enemy does not sleep; neither can the watch.", ORCS + UNDEAD + TROLLS),  # new
    _m("The Shire-folk do not know what stands between them and the dark; that is the point of the watch.", HOBBITS),  # new
    _m("Their peace is not luck; it is paid for quietly, by folk they will never meet.", HOBBITS + HUMANS),  # new
    _m("The wild speaks before it strikes — bent grass, a wrong silence, crows gone quiet; the land asks, and a ranger answers.", SIGNS),  # new
    _m("Our names are forgotten and our keeps are dust; the road remembers us anyway.", SOLITUDE),  # new
    _m("I have seen crowns change nothing and a kept promise change everything.", FRIENDLY),  # new
    _m("Walls have their place and fires their use; I am always more honest on the road.", SETTLEMENT),  # new
    _m("Let them sleep; someone has to keep the dawn honest.", FRIENDLY + REST),  # new
    _m("Bloodlines matter less than footsteps; I judge the walk, not the name.", FRIENDLY),  # new
    _m("Even the hills can hate you here; respect is cheaper than courage.", TROLLS + GIANTS + HAZARDS),  # new
    _m("Mercy is a choice you make before the sword leaves its sheath; after that, it is only luck.", HOSTILE),  # new
    _m("My knee tells the weather before the sky does; the body keeps the map too.", SOLITUDE),  # new
]


MUSING_PACKS = {
    'celebrian': CELEBRIAN_MUSINGS,
    'aranath': ARANATH_MUSINGS,
}


# ============================================================================
# The first seeds (migration 0014) spoke of the character in the third
# person and mostly carried no tags — they could only speak by word luck.
# Rewritten in the pack's voice with tags the Lens can see:
# (old statement, new statement, old tags, new tags). Applied to presets AND
# living minds by 0017 (text and tags only — strength/evidence, the
# lived part, stay untouched); its downgrade restores the old pair.
# ============================================================================
_PEOPLE_0014 = [
    'tag:entity_type:humans', 'tag:entity_type:elves',
    'tag:entity_type:dwarves', 'tag:entity_type:hobbits',
]
LEGACY_REWRITES = {
    'celebrian': [
        ('She will not sail West. She means to be the last witness when '
         'the lights go out.',
         'I will not sail West. I mean to be the last witness when the '
         'lights go out.',
         [], SOLITUDE),
        ('Everything that lives is already half in its grave — she has '
         'buried lovers, friends and whole kingdoms.',
         'Everything that lives is already half in its grave; I have '
         'buried lovers, friends and whole kingdoms.',
         [], SOLITUDE + HOSTILE),
        ('She is not driven; she is drawn — the way water runs downhill. '
         'She keeps no errand and does not hurry.',
         'I am not driven; I am drawn, the way water runs downhill. I keep '
         'no errand and do not hurry.',
         [], SOLITUDE + WATER),
        ('She trusts growing things more than people.',
         'I trust growing things more than people.',
         _PEOPLE_0014, _PEOPLE_0014 + TREES + PLANTS),
    ],
    'aranath': [
        ('He has spent years walking the borders of fallen Arnor; this '
         'time he walks alone.',
         'I have spent years walking the borders of fallen Arnor; this '
         'time I walk alone.',
         [], SOLITUDE),
        ('An old road does not die — it waits for the one who still '
         'remembers it.',
         'An old road does not die — it waits for the one who still '
         'remembers it.',
         [], SOLITUDE),
    ],
}


# ============================================================================
# Attitudes — the prehistory every encounter carries
# ----------------------------------------------------------------------------
# Same authored voice, but the belief knows what it is about: Subject +
# Stance. In the Lens the narrowest subject speaks for the encounter —
# Celebrian loves horses, and the horses of Mordor are not that. The
# stance leans how the contact feels and walks slowly as encounters go:
# ordinary days nudge it, marked days move it; a prejudice can wear down
# to almost nothing, and only reflection can turn it.
#
#   entity:<slug>          this one being
#   family:<slug>      its kind (foxes, not all carnivores)
#   tag:entity_type:<t>    the broad type (all orcs)
# ============================================================================
CELEBRIAN_ATTITUDES = [
    _a('world', "A horse at full run is the one shape of joy the Shadow "
       "never learned to counterfeit.",
       F_HORSES, +0.7),
    _a('world', "The Enemy takes what is beautiful and teaches it to "
       "bite; I pity those horses, and I do not trust them.",
       E_MORDOR_HORSES, -0.8),
    _a('world', "A deer does not know that it will die; watching one "
       "graze, I almost forget that I do.",
       F_DEER, +0.6),
    _a('world', "The fox asks nothing of the world but passage; of all "
       "the wild things it is the one I would trade places with.",
       F_FOXES, +0.5),
    _a('world', "They grieve more slowly than I do, and more honestly; "
       "there is no counsel wiser than a tree that refuses to hurry.",
       F_ENTS + ['tag:entity_type:living_trees'], +0.6),
    _a('world', "The oldest trees remember a world before the Shadow; "
       "I listen to them the way others pray.",
       F_TREES, +0.4),
    _a('world', "There is a beauty in what should not be and yet "
       "stands; I look at it too long, and I know that I do.",
       UNDEAD, +0.1),
    _a('world', "I do not hate them the way mortals hate; my hatred "
       "went cold an Age ago. I simply refuse to call them people.",
       ORCS, -0.9),
    _a('world', "A wolf that sells its wild to the Enemy is worse than "
       "the Enemy's whip; at least the whip knows what it is.",
       F_WARGS, -0.6),
    _a('world', "A wolf answers hunger and nothing else; I cannot "
       "fault it, but I do not turn my back to it.",
       F_WOLVES, -0.3),
    _a('other', "The songs say they delved too greedily; we both know "
       "who wrote the songs — and still I keep my distance.",
       DWARVES, -0.25, source='heard', strength=2.5),
    _a('world', "A troll is malice wearing a mountain; there is nothing "
       "underneath it to mourn.",
       TROLLS, -0.5),
    _a('world', "Their mother devoured the light itself, long ago; the "
       "daughters still remember the taste.",
       F_SPIDERS + SPIDERS, -0.6),
    _a('world', "There are fires that were lit before the world had a "
       "name; some of us still carry the burns.",
       DEMONS, -0.8),
    _a('world', "A dragon's greed is the only hunger I find honest; at "
       "least it does not pretend to serve a master.",
       DRAKES, -0.5),
    _a('other', "I love my people the way one loves a ship already "
       "sailing; the shore is where I chose to stand.",
       ELVES, +0.2),
    _a('world', "Swans carry the sea with them; I look at them the way "
       "I refuse to look at ships.",
       F_SWANS, +0.3),
    _a('other', "The Wise are old in a different currency than mine; I "
       "trust them the way one trusts weather.",
       MAIAR, +0.4),
    # --- the beasts she prefers to most people (new) ----------------------
    _a('world', "A dog's love is a loan with interest I never asked "
       "for; I return it unpaid and keep walking.",
       F_DOGS, -0.15),
    _a('world', "Crows are the only creatures that gossip about me "
       "accurately; I forgive them the audience.",
       F_CROWS, +0.35),
    _a('world', "The eagle does not apologise for the height; neither "
       "should the wise.",
       F_EAGLES, +0.4),
    _a('world', "An owl hunts the dark I walk; we are colleagues of a "
       "sort, and it has never once asked my name.",
       F_OWLS, +0.35),
    _a('world', "Of all the beasts the cat is the one that owes nothing "
       "and asks nothing; I have always suspected we share a "
       "temperament.",
       ['family:cats'], +0.5),
    _a('world', "A serpent is honest about what it is; I have met "
       "courts that could not say the same.",
       ['family:snakes', 'tag:entity_type:reptiles'], +0.2),
    _a('world', "The moth and the bat work the night shift I keep; "
       "small patience, common hours.",
       ['family:bats', 'tag:entity_type:insects'], +0.15),
    _a('world', "What swims does not mourn and does not lie to itself "
       "about it; the river's cold arithmetic is cleaner than mine.",
       ['tag:entity_type:water_creatures',
        'tag:entity_type:water_animals'], +0.2),
    # --- the small peoples and the strange ones (new) ---------------------
    _a('other', "They grieve in a single lifetime what I carry for "
       "centuries; no wonder they cry honestly and I cannot.",
       HOBBITS, +0.35),
    _a('other', "Mortals spend their one coin of life so quickly, and "
       "call me strange for hoarding mine; the arithmetic is theirs.",
       F_COMMON_MEN + HUMANS, +0.1),
    _a('other', "They keep a watch nobody thanked them for — I "
       "recognise the disease; I have it too.",
       F_DUNEDAIN, +0.45),
    _a('world', "A giant is the mountain's bad mood given legs; I leave "
       "it to its weather.",
       GIANTS, -0.4),
    _a('world', "The woses' stone men remember a covenant older than my "
       "griefs; silent company, honest terms.",
       CONSTRUCTS, +0.3),
    # --- the names she keeps (new) ----------------------------------------
    _a('other', "Treebeard is slower than I am — the one friendship "
       "where I have ever been the young one.",
       ['entity:treebeard', 'entity:ents'], +0.7),
    _a('other', "Tom Bombadil sings and the world obeys the tune; a "
       "century on, I still have not decided whether to envy that or "
       "distrust it.",
       ['entity:tom_bombadil'], +0.35),
    _a('other', "Mithrandir cares like it is work, and it is; I have "
       "never forgiven him for making hope look practical.",
       ['entity:gandalf'], +0.45),
    _a('other', "Radagast chose the weeds and the wood-mice over every "
       "council of the wise; of all of them, he understood the "
       "assignment.",
       ['entity:radagast_the_brown'], +0.5),
]

ARANATH_ATTITUDES = [
    _a('world', "A dog never asks who your grandfather was before it "
       "shares your fire.",
       F_DOGS, +0.6),
    _a('world', "When the Eagles keep the road, I sleep with both eyes "
       "shut for once.",
       F_EAGLES, +0.6),
    _a('world', "Anything that lives by wit instead of teeth has my "
       "respect; the fox and I practice the same trade.",
       F_FOXES, +0.5),
    _a('world', "Birdsong at dawn means the night watch held; I learned "
       "to trust it before I learned maps.",
       F_BIRDS + F_OWLS, +0.3),
    _a('world', "Crebain flew for the Enemy once; I still count crows "
       "the way I count sentries.",
       F_CROWS, -0.4),
    _a('world', "A pack reads a road better than most garrisons; I "
       "respect the craft and distrust the wolves.",
       F_WOLVES, -0.5),
    _a('world', "A warg is a wolf that took the Enemy's coin; there is "
       "no parleying with it.",
       F_WARGS, -0.8),
    _a('world', "I stopped counting the orcs I have buried; the day I "
       "start again is the day this becomes about me.",
       ORCS, -0.8),
    _a('world', "I have trusted horses with my life and been let down "
       "less often than by men.",
       F_HORSES, +0.5),
    _a('world', "Fell stock, bred under the Enemy's eye — a ranger "
       "does not turn his back on a horse that remembers the whip.",
       E_MORDOR_HORSES, -0.5),
    _a('other', "They do not know my name and never will; they are "
       "still why I walk.",
       F_COMMON_MEN, +0.4),
    _a('other', "The last of my people walk the same roads I do; we nod "
       "once, and that is enough.",
       F_DUNEDAIN, +0.7),
    _a('other', "They carry no swords and need none guarding them; the "
       "day that changes, I have failed.",
       HOBBITS, +0.4),
    _a('world', "They kept their watch longer than we kept ours; a "
       "ranger does not lecture patience to an Ent.",
       F_ENTS + ['tag:entity_type:living_trees'], +0.4),
    _a('world', "The dead of the barrows earned their rest; whatever "
       "wears them now earns none of mine.",
       UNDEAD, -0.7),
    _a('world', "You do not fight a troll; you survive it, and you "
       "count yourself lucky to have seen it coming.",
       TROLLS, -0.5),
    _a('world', "Webs across the road mean leave the road; I have never "
       "once regretted listening.",
       F_SPIDERS + SPIDERS, -0.5),
    _a('other', "Men who march for the Enemy are still men; I pity them "
       "at a distance and fight them up close.",
       T_ENEMY_MEN, -0.4),
    _a('other', "They never forgave us for kings we no longer are; I "
       "understand them better than they would like.",
       ['tag:entity_type:dunlendings'], -0.2),
]

ATTITUDE_PACKS = {
    'celebrian': CELEBRIAN_ATTITUDES,
    'aranath': ARANATH_ATTITUDES,
}


# ============================================================================
# Seed memories (preset_memories) — the lived prehistory a mind is born
# carrying
# ----------------------------------------------------------------------------
# Recency cannot reach these (exp(-λ·Δdays) ≈ 0 past a few decades): an
# old memory speaks only when the day's tags brush it — the region, the
# kind of being, the wound. That is the design: nothing here narrates
# itself; the story surfaces in fragments when the road rhymes with it.
#
#   tags      — the contact surface (same vocabulary as musings)
#   lived     — the in-world day it happened (the clock reads ~1950)
#   subjects  — the subject-classed tags the Relation echoes
#   imprint   — the feeling vector the day left ({dim: −1..1})
#   region    — Memory.region (where it lives on the map)
# ============================================================================
def _mem(desc, tags, lived, valence=0.0, importance=0.4, subjects=None,
         imprint=None, region=None, entity_id=None):
    return {
        'desc': desc, 'tags': list(tags), 'lived_date': lived,
        'valence': valence, 'importance': importance,
        'subjects': list(subjects) if subjects else None,
        'imprint': dict(imprint) if imprint else None,
        'region': region, 'entity_id': entity_id,
    }


# Celebrian — ~five hundred years, told the way she tells it: oblique,
# cold, never a summary. The human lover (~1750) is the spine; nothing
# here says his name — the grief is meant to be assembled, not stated.
CELEBRIAN_MEMORIES = [
    # --- him (Lone-lands, 1744–1750) ---------------------------------------
    _mem("I did not learn his name for three days. He found that funny. "
         "He was the last thing that ever found me funny.",
         HUMANS + SOLITUDE, _d(1744, 4, 12),
         valence=0.35, importance=0.75, subjects=HUMANS,
         imprint={'affection': 0.6, 'familiarity': 0.4},
         region='Lone-lands'),
    _mem("Six summers, and he still measured time in mornings. I envied "
         "him that arithmetic until it ran out.",
         HUMANS, _d(1747, 8, 20),
         valence=0.4, importance=0.6, subjects=HUMANS,
         imprint={'affection': 0.7},
         region='Lone-lands'),
    _mem("He went grey one spring, and I caught myself envying the grey "
         "— he was still becoming something.",
         HUMANS, _d(1749, 3, 2),
         valence=0.2, importance=0.55, subjects=HUMANS,
         imprint={'affection': 0.6}),
    _mem("He was gone between one breath and the next, the way they all "
         "go. I had prepared for decades. It took no time at all.",
         HUMANS + SOLITUDE, _d(1750, 11, 29),
         valence=-0.95, importance=0.95, subjects=HUMANS,
         imprint={'affection': -0.7, 'fear': 0.3},
         region='Weather Hills'),
    _mem("The she I was before him would not recognise me now. That is "
         "the cruellest of it — he remade me and declined to stay and "
         "see it.",
         SOLITUDE, _d(1751, 2, 14),
         valence=-0.6, importance=0.7,
         imprint={'affection': -0.5}),
    _mem("I have asked the air of a hundred ruins for him. The ruins "
         "answer — never with him.",
         UNDEAD + ['tag:dead_place'], _d(1762, 9, 30),
         valence=-0.8, importance=0.85,
         subjects=['tag:entity_type:undead'],
         imprint={'affection': -0.6, 'familiarity': 0.5}),
    _mem("I do not say his name. A name is a door, and I have spent two "
         "centuries deciding I cannot afford this one.",
         SOLITUDE + UNDEAD, _d(1770, 1, 1),
         valence=-0.7, importance=0.9,
         imprint={'affection': -0.6, 'fear': 0.2}),

    # --- Eregion: the rest place among the courteous dead ------------------
    _mem("Ost-in-Edhil keeps its dead courteous. I spent three winters "
         "listening to a mason who still argues with his last wall.",
         ['region:Eregion'] + UNDEAD + REST, _d(1489, 10, 5),
         valence=0.3, importance=0.6,
         subjects=['region:Eregion', 'tag:entity_type:undead'],
         imprint={'affection': 0.4, 'familiarity': 0.6},
         region='Eregion'),
    _mem("My people forged their beautiful mistakes here and named them "
         "Rings. The stones have not forgiven us; I find the honesty "
         "restful.",
         ['region:Eregion'] + REST, _d(1490, 5, 18),
         valence=-0.2, importance=0.65, subjects=['region:Eregion'],
         imprint={'affection': 0.3, 'familiarity': 0.5},
         region='Eregion'),
    _mem("The spirits of Hollin do not want company; they want "
         "witnesses. It is the one office I still hold.",
         ['region:Eregion'] + UNDEAD + SOLITUDE, _d(1655, 2, 9),
         valence=0.15, importance=0.5,
         subjects=['tag:entity_type:undead', 'region:Eregion'],
         imprint={'familiarity': 0.6},
         region='Eregion'),
    _mem("I return to Eregion the way a debt returns to its ledger.",
         ['region:Eregion', 'tag:kind:ruin'] + REST, _d(1892, 7, 22),
         valence=0.35, importance=0.5, subjects=['region:Eregion'],
         imprint={'affection': 0.5, 'familiarity': 0.7},
         region='Eregion'),

    # --- Fangorn: the ents and the slow friendship --------------------------
    _mem("Treebeard asked me my name and considered the answer for a "
         "week. It is the only friendship I keep that measures time "
         "honestly.",
         ['region:Fangorn', 'family:ents', 'entity:treebeard',
          'entity:ents', 'tag:entity_type:living_trees'],
         _d(1562, 6, 7),
         valence=0.6, importance=0.8,
         subjects=['entity:treebeard', 'family:ents', 'region:Fangorn'],
         imprint={'affection': 0.7, 'trust': 0.5, 'familiarity': 0.5},
         region='Fangorn'),
    _mem("A rowan in the deep forest does not greet me when I come. It "
         "simply continues. I value that above most conversation.",
         ['region:Fangorn'] + TREES, _d(1620, 9, 14),
         valence=0.4, importance=0.45, subjects=['region:Fangorn'],
         imprint={'affection': 0.5, 'familiarity': 0.6},
         region='Fangorn'),
    _mem("The Ents have mourned their Entwives for three thousand years "
         "and call it recent. They are the only grief I do not find "
         "theatrical.",
         ['family:ents', 'tag:entity_type:living_trees'], _d(1701, 4, 30),
         valence=0.2, importance=0.55, subjects=['family:ents'],
         imprint={'affection': 0.4}),
    _mem("An old Ent who has stopped walking does not die — he chooses "
         "a view and grows into it. I sat with one for a season and "
         "understood him better than most kings.",
         ['region:Fangorn', 'family:ents'], _d(1810, 8, 3),
         valence=0.3, importance=0.5,
         subjects=['family:ents', 'region:Fangorn'],
         imprint={'affection': 0.5, 'familiarity': 0.6},
         region='Fangorn'),

    # --- the Wise, and the too-cheerful Master -----------------------------
    _mem("Mithrandir laughs too easily for one who has seen what he has "
         "seen. I have decided it is either wisdom or excellent theatre; "
         "either way, he has earned it.",
         MAIAR + ['entity:gandalf'], _d(1630, 5, 11),
         valence=0.4, importance=0.6,
         subjects=MAIAR + ['entity:gandalf'],
         imprint={'trust': 0.5, 'affection': 0.3}),
    _mem("Radagast once fed a dying bird out of his own sleeve and "
         "apologised to it for the world. He and I have never understood "
         "each other less.",
         MAIAR + BIRDS + ['entity:radagast_the_brown'], _d(1688, 7, 6),
         valence=0.35, importance=0.55,
         subjects=MAIAR + ['entity:radagast_the_brown'],
         imprint={'affection': 0.4, 'trust': 0.4}),
    _mem("The Wise still ask my counsel and take it rarely. I respect "
         "the economy — I would not take mine either.",
         MAIAR + ELVES, _d(1908, 3, 17),
         valence=0.2, importance=0.4, subjects=MAIAR,
         imprint={'trust': 0.4, 'familiarity': 0.5}),
    _mem("Tom Bombadil sang a fever out of me once. I have been quietly "
         "furious about it for a century; nobody should be that cheerful "
         "at his age.",
         ['region:Old Forest', 'entity:tom_bombadil'] + MAIAR,
         _d(1843, 6, 21),
         valence=0.3, importance=0.65,
         subjects=['region:Old Forest', 'entity:tom_bombadil'] + MAIAR,
         imprint={'affection': 0.4, 'familiarity': 0.5},
         region='Old Forest'),
    _mem("He is the oldest thing I know and the only one that does not "
         "mourn. I cannot decide whether he is above grief or simply "
         "never acquired the taste.",
         ['region:Old Forest', 'entity:tom_bombadil'] + MAIAR,
         _d(1843, 6, 25),
         valence=0.1, importance=0.5,
         subjects=['region:Old Forest', 'entity:tom_bombadil'] + MAIAR,
         imprint={'familiarity': 0.5},
         region='Old Forest'),

    # --- the orc wars -------------------------------------------------------
    _mem("In Angmar I counted arrows until counting was the only honest "
         "part of the war.",
         ['region:Angmar'] + ORCS + HOSTILE, _d(1460, 9, 2),
         valence=-0.5, importance=0.7,
         subjects=['tag:entity_type:orcs', 'region:Angmar'],
         imprint={'fear': 0.3, 'affection': -0.5},
         region='Angmar'),
    _mem("The ambush in the Ettenmoors left me a scar below the ribs. "
         "It aches before the rain does; a reliable enemy keeps "
         "appointments.",
         ['region:Ettenmoors'] + ORCS + HOSTILE + WOUNDED, _d(1598, 10, 19),
         valence=-0.5, importance=0.6,
         subjects=['tag:entity_type:orcs', 'region:Ettenmoors'],
         imprint={'fear': 0.4, 'affection': -0.4},
         region='Ettenmoors'),
    _mem("I burned an orc-camp outside Fornost while they sang their "
         "war-chant. It is the only orc song I have ever approved of.",
         ['region:Fornost'] + ORCS + HOSTILE, _d(1710, 11, 8),
         valence=0.2, importance=0.55,
         subjects=['tag:entity_type:orcs', 'region:Fornost'],
         imprint={'affection': -0.5},
         region='Fornost'),
    _mem("They were elves once, the oldest songs whisper. I hate them "
         "for what was made of them and forgive them nothing for it.",
         ORCS + ELVES, _d(1503, 3, 15),
         valence=-0.6, importance=0.65, subjects=ORCS,
         imprint={'affection': -0.7}),
    _mem("At Tharbad a greenskin chief looked at me with something "
         "almost like memory. I killed him before the look could finish.",
         ['region:Minhiriath'] + ORCS + HOSTILE, _d(1834, 4, 9),
         valence=-0.4, importance=0.5,
         subjects=['tag:entity_type:orcs'],
         imprint={'affection': -0.5, 'fear': 0.2},
         region='Minhiriath'),

    # --- kin, sailing, and the rare friendships -----------------------------
    _mem("Another cousin sailed last decade. She said the Sea was "
         "calling; I said the land keeps its dead. We were both "
         "courteous.",
         ELVES, _d(1938, 5, 2),
         valence=-0.25, importance=0.55, subjects=ELVES,
         imprint={'affection': -0.3, 'familiarity': 0.5}),
    _mem("They pack light for eternity, the ones who sail. I have "
         "watched the ships leave for five hundred years; the land they "
         "abandon is still here.",
         ELVES + WATER, _d(1802, 8, 12),
         valence=-0.3, importance=0.6, subjects=ELVES,
         imprint={'affection': -0.3}),
    _mem("My wandering kindred cross my path once a decade, and we lie "
         "to each other about how little has changed. It is the closest "
         "thing to family I still practice.",
         ELVES + FRIENDLY, _d(1921, 9, 27),
         valence=0.35, importance=0.5, subjects=ELVES,
         imprint={'affection': 0.4, 'familiarity': 0.6}),
    _mem("Rivendell asked me to stay, once, a century back. They keep "
         "the past in such careful amber — I lacked the cruelty to tell "
         "them I had come looking for a ruin, not a reliquary.",
         ['region:Rivendell'] + ELVES, _d(1851, 6, 15),
         valence=0.15, importance=0.55,
         subjects=['region:Rivendell'] + ELVES,
         imprint={'affection': 0.2, 'familiarity': 0.5},
         region='Rivendell'),

    # --- herbs, healing, the small honest things ----------------------------
    _mem("I learned the leech-craft of athelas from a Bree healer who "
         "charged me one honest afternoon of listening. It remains the "
         "fairest price I have ever paid.",
         ['region:Bree'] + PLANTS + HUMANS + FRIENDLY, _d(1607, 7, 4),
         valence=0.5, importance=0.6,
         subjects=HUMANS + PLANTS,
         imprint={'affection': 0.5, 'trust': 0.4},
         region='Bree'),
    _mem("Athelas smells like clean endings. That is why men built a "
         "faith around it.",
         PLANTS + HUMANS, _d(1608, 1, 30),
         valence=0.25, importance=0.4, subjects=PLANTS,
         imprint={'familiarity': 0.5}),
    _mem("Foxglove cures or kills on a difference of two leaves. I keep "
         "it out of respect for the arithmetic.",
         PLANTS, _d(1755, 5, 25),
         valence=0.15, importance=0.35, subjects=PLANTS,
         imprint={'familiarity': 0.6}),

    # --- the selfish ledger -------------------------------------------------
    _mem("A farmstead burned one night in the South Downs while I stood "
         "on the ridge deciding. The fire, at least, was honest about "
         "what it wanted.",
         ['region:South Downs'] + HUMANS, _d(1798, 10, 11),
         valence=-0.4, importance=0.6, subjects=HUMANS,
         imprint={'affection': -0.3},
         region='South Downs'),
    _mem("I once carried a wounded stranger two days to a healer. His "
         "gratitude made me so uncomfortable that I have avoided "
         "wounded strangers since.",
         HUMANS + FRIENDLY + WOUNDED, _d(1690, 8, 16),
         valence=0.2, importance=0.5, subjects=HUMANS,
         imprint={'affection': 0.3, 'familiarity': 0.3}),
    _mem("There was a war I might have marched in, two hundred years "
         "gone. I walked north instead. The war did not miss me; I have "
         "checked.",
         SOLITUDE, _d(1740, 3, 8),
         valence=-0.15, importance=0.5,
         imprint={'affection': -0.2}),

    # --- ruins and the gothic weather of her walking ------------------------
    _mem("Fornost stood empty for a century before I found the window "
         "where I once watched the rain. The ruin had kept the "
         "appointment.",
         ['region:Fornost', 'tag:kind:ruin', 'tag:dead_place'], _d(1527, 4, 3),
         valence=0.3, importance=0.55, subjects=['region:Fornost'],
         imprint={'affection': 0.4, 'familiarity': 0.5},
         region='Fornost'),
    _mem("I prefer ruins to cities. A ruin has stopped lying about what "
         "it is; a city has not yet been found out.",
         ['tag:kind:ruin', 'tag:dead_place', 'tag:settlement'],
         _d(1580, 2, 12),
         valence=0.2, importance=0.5,
         imprint={'affection': 0.3}),
    _mem("The dead of the barrow-downs are the honest dead: they want "
         "their gold back and say so plainly. I respect a candid "
         "haunting.",
         UNDEAD + ['tag:dead_place'], _d(1666, 11, 1),
         valence=0.15, importance=0.5, subjects=UNDEAD,
         imprint={'familiarity': 0.5}),
    _mem("In the shadow of Moria I once heard the stone itself remember "
         "a hammer. Some griefs are load-bearing.",
         ['region:Moria'], _d(1472, 12, 3),
         valence=-0.2, importance=0.55, subjects=['region:Moria'],
         imprint={'fear': 0.3, 'familiarity': 0.4},
         region='Moria'),
    _mem("A wolf looked at me across the Withywindle and decided I was "
         "the forest's problem. It was not wrong.",
         ['region:Old Forest'] + WOLVES, _d(1843, 6, 20),
         valence=0.2, importance=0.4,
         subjects=['region:Old Forest'] + WOLVES,
         imprint={'familiarity': 0.4},
         region='Old Forest'),
    _mem("A trader in Tharbad sold me river-pearls at double price "
         "because he thought elves do not count. Elves count. Elves "
         "count everything; it is the flaw of living too long.",
         ['region:Minhiriath'] + HUMANS + FRIENDLY + SETTLEMENT, _d(1936, 8, 8),
         valence=0.15, importance=0.4, subjects=HUMANS,
         imprint={'familiarity': 0.4},
         region='Minhiriath'),
    _mem("A raven followed me nine days across the Lone-lands last "
         "winter. I named it something unkind and it stayed anyway. "
         "That is how most of my friendships happen.",
         ['region:Lone-lands'] + BIRDS + F_CROWS, _d(1947, 1, 19),
         valence=0.45, importance=0.45,
         subjects=['region:Lone-lands'] + F_CROWS,
         imprint={'affection': 0.4},
         region='Lone-lands'),
]

MEMORY_PACKS = {
    'celebrian': CELEBRIAN_MEMORIES,
}


# ============================================================================
# Leans (preset_leans) — authored starting Relations for her places and
# kinds: the full vector, where a bare stance cannot carry both the love
# and the weariness.
# ============================================================================
def _lean(subject, affection=0.0, trust=0.0, fear=0.0, familiarity=0.0):
    return {
        'subject': subject, 'affection': affection, 'trust': trust,
        'fear': fear, 'familiarity': familiarity,
    }


CELEBRIAN_LEANS = [
    _lean('region:Fangorn', affection=0.7, trust=0.4, familiarity=0.6),
    _lean('region:Eregion', affection=0.6, familiarity=0.7),
    _lean('region:Old Forest', affection=0.3, fear=0.15, familiarity=0.4),
    _lean('family:ents', affection=0.6, trust=0.4, familiarity=0.5),
    _lean('tag:entity_type:maiar', affection=0.3, trust=0.5, familiarity=0.4),
    _lean('tag:entity_type:orcs', affection=-0.7, fear=0.2, familiarity=0.5),
    _lean('tag:entity_type:undead', affection=0.15, familiarity=0.6),
    _lean('tag:entity_type:elves', affection=-0.1, familiarity=0.6),
    _lean('tag:entity_type:plants', affection=0.4, familiarity=0.5),
    _lean('region:Lone-lands', affection=0.2, familiarity=0.5),
    _lean('region:Rivendell', affection=0.15, familiarity=0.4),
    _lean('entity:treebeard', affection=0.6, trust=0.4, familiarity=0.6),
    _lean('entity:ents', affection=0.5, familiarity=0.5),
    _lean('entity:tom_bombadil', affection=0.3, trust=0.3,
          familiarity=0.5),
    _lean('entity:gandalf', affection=0.35, trust=0.5, familiarity=0.4),
    _lean('entity:radagast_the_brown', affection=0.4, trust=0.4,
          familiarity=0.4),
]

LEAN_PACKS = {
    'celebrian': CELEBRIAN_LEANS,
}
