# ============================================================================
# Thought packs — authored personality, seeded as starter beliefs
# ----------------------------------------------------------------------------
# Each thought is a belief, not prompt text: it lives by the same rules as
# everything else the mind carries. It clones with the mold (origin='seed'),
# speaks through the Episode's Lens when the day puts it at stake, and
# decays/weakens only through deliberate reflection — never by neglect.
#
# Evocation is tag contact, same as memories:
#
#   tag:form:*          how contact happened (the host's vocabulary:
#                       attacks/confronts vs brief_exchange/aid_or_trade vs
#                       sign_only/stalks/presence_felt...)
#   tag:entity_type:*   what kind of being (orcs, elves, hobbits, wolves...)
#   tag:outcome:*       how it ended (wounded, badly wounded, unscathed)
#   type:*              the kind of moment — only rest/meal/water/place:
#                       frame types (travel, terrain, climate, body, need)
#                       never reach the lens as events, so a belief tagged
#                       with them can never speak (tests/test_thought_packs
#                       audits this). Road and body thoughts are solitude.
#   context:solitude    engine-level: nobody touched the mind today — the
#                       quiet day when the thoughts a person keeps for
#                       themselves finally speak.
#
# Variety: same-category thoughts share tags, so an evocative day surfaces
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

CONFIDENCE = 0.6

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


def _t(kind, statement, tags, confidence=CONFIDENCE, boosts=None):
    return {
        'kind': kind, 'statement': statement, 'confidence': confidence,
        'tags': list(tags), 'boosts': dict(boosts or {}),
    }


# ============================================================================
# CELEBRIAN — a Noldor of the later Age. Death is her filter: every thought
# passes through having lost too much, too slowly. Melancholy, shadow-worn,
# immortality as accumulation rather than gift.
# ============================================================================
CELEBRIAN_THOUGHTS = [
    # --- a) after non-hostile contact with thinking beings ----------------
    _t('other', "Their hope does shine… but it shines like a candle in an empty hall.", FRIENDLY),
    _t('other', "The future still lives in their eyes; in mine there are only echoes.", FRIENDLY),
    _t('other', "I envy their faith, though I know one day it will weigh on them as it does on me.", FRIENDLY),
    _t('self', "Every laugh I hear sounds like a language I forgot centuries ago.", FRIENDLY),
    _t('self', "I do not fear their kindness; I fear the moment it sees who I truly am.", FRIENDLY),
    _t('other', "They speak of tomorrow as if it were a promise; to me it is only another repetition.", FRIENDLY),
    _t('other', "Their stories are full of victories; mine are full of survivals.", FRIENDLY),
    _t('self', "When they trust me, I wonder whether they see my shadow or only its shape.", FRIENDLY),
    _t('self', "In their presence I feel older than my years and younger than my wounds.", FRIENDLY),
    _t('self', "I listen to them, but their comfort slides over me like rain on stone.", FRIENDLY),
    _t('self', "Even the gentlest voice can wake a storm that I try to keep sleeping.", FRIENDLY),
    _t('other', "They share bread and smiles; I share silence and the weight they do not notice.", FRIENDLY + MEAL),
    _t('other', "They look at the night with caution; I look at it with recognition.", FRIENDLY),
    _t('self', "I am grateful for their company, even when my heart insists on standing apart.", FRIENDLY),
    _t('self', "Sometimes I borrow their courage, just enough to make it through the evening.", FRIENDLY),
    _t('self', "They call me friend; I still call myself stranger.", FRIENDLY),
    _t('self', "In their eyes I see what I could have been, had I feared less and felt more.", FRIENDLY),
    _t('other', "They offer me warmth; I offer them warnings they rarely understand.", FRIENDLY),
    _t('other', "They speak of healing; I speak of learning to live with the scar.", FRIENDLY + WOUNDED),
    _t('self', "Among their voices, my own thoughts grow quieter, but never truly rest.", FRIENDLY),

    # --- b) solitude ------------------------------------------------------
    _t('self', "In the half-light everything feels more truthful; daylight always exaggerates.", SOLITUDE),
    _t('self', "Night knows me better than any face I have ever loved.", SOLITUDE),
    _t('self', "There is a kind of peace only available to those who have stopped expecting anything.", SOLITUDE),
    _t('world', "Beauty can rot too; I learned to love it that way.", SOLITUDE + PLANTS),
    _t('self', "I do not fear the darkness; I fear the moment light returns and nothing has changed.", SOLITUDE),
    _t('world', "Eternity is not endless time; it is the same wound open, day after day.", SOLITUDE),
    _t('world', "Sometimes I think the world is someone else's dream, and I will never wake up from it.", SOLITUDE),
    _t('self', "I have seen too many dawns to believe any of them will bring something new.", SOLITUDE),
    _t('self', "There is a small pleasure in knowing the sun cannot reach every corner of the soul.", SOLITUDE),
    _t('world', "Battles pass, songs fade; only fatigue remains faithful.", SOLITUDE),
    _t('self', "By staring at the night for so long, my memories have grown dark as well.", SOLITUDE),
    _t('self', "Madness and I sat down to talk; in the end, neither of us wanted to leave.", SOLITUDE),
    _t('self', "There is no comfort in immortality, only more time to repeat the same mistakes.", SOLITUDE),
    _t('self', "I cling to shadow because it is the only thing that has never promised me anything.", SOLITUDE),
    _t('self', "I am not alone: sadness has taken the place others left empty.", SOLITUDE),
    _t('self', "Weariness has become my favorite jewel; I never take it off.", SOLITUDE),
    _t('self', "I have grown so used to pain that when it leaves, I miss it.", SOLITUDE),
    _t('self', "In the quiet, my thoughts grow loud enough to frighten even me.", SOLITUDE),
    _t('self', "Silence is the only listener that never argues with what I feel.", SOLITUDE),
    _t('self', "If I ever change, it will be slowly, like stone learning to become dust.", SOLITUDE),
    _t('self', "Hope visits rarely, and when it leaves, it takes something with it.", SOLITUDE),
    _t('self', "There is a comfort in knowing that no one expects me to shine.", SOLITUDE),
    _t('self', "My heart is a room where most lights burn out before they are lit.", SOLITUDE),

    # --- c) after hostile contact, once the danger has passed --------------
    _t('self', "Death passes quickly; what takes time is the memory learning to stop biting.", HOSTILE),
    _t('world', "The battlefield is honest: here no one pretends life is fair.", HOSTILE),
    _t('self', "The smell of iron and damp earth has always felt strangely comforting to me.", HOSTILE),
    _t('self', "Monsters are easier to face than the quiet cruelty of ordinary days.", HOSTILE),
    _t('self', "When the danger is gone, the echo of it still walks beside me.", HOSTILE),
    _t('self', "Every wound on my skin is a reminder of worse wounds beneath it.", HOSTILE + WOUNDED),
    _t('self', "Survival is not victory; it is only proof that the darkness is patient.", HOSTILE),
    _t('world', "The ground remembers every drop of blood longer than any monument.", HOSTILE + WOUNDED),
    _t('self', "After the screams fade, I hear my own doubts more clearly.", HOSTILE),
    _t('self', "I do not rejoice when the enemy falls; I simply count one more shadow added to the world.", HOSTILE),
    _t('self', "Sometimes I fight harder than I care, just to silence the storm inside.", HOSTILE),
    _t('self', "Steel and claw can be seen; it is the unseen fear that truly maims.", HOSTILE),
    _t('self', "I walk away from battle, but the battle rarely walks away from me.", HOSTILE),
    _t('self', "When creatures vanish into the dark, I wonder what part of me they take with them.", HOSTILE + SIGNS),
    _t('self', "I have learned that surviving a threat does not mean escaping its mark.", HOSTILE),
    _t('self', "The worst scars are the ones that convince you you deserved every blow.", HOSTILE + WOUNDED),
    _t('self', "I do not fear beasts; I fear becoming one.", HOSTILE + WOLVES),
    _t('self', "Danger sharpens the senses and dulls the soul.", HOSTILE),
    _t('self', "I leave corpses behind and carry ghosts forward.", HOSTILE),
    _t('self', "Each hostile encounter adds another stone to the weight I already carry.", HOSTILE),

    # --- d) observing animals and nature -----------------------------------
    _t('world', "When the wind howls through the branches, I finally feel someone is speaking my language.", TREES),
    _t('world', "Among the trees, shadow falls like a caress that asks for no explanation.", TREES),
    _t('world', "Dry leaves under my feet sound like an ancient tongue announcing farewells.", TREES + PLANTS),
    _t('world', "The forest keeps secrets better than any elven heart.", TREES),
    _t('world', "There is a strange tenderness in the way darkness hangs from every branch.", TREES),
    _t('world', "When blood dries in the soil, the forest sings a melody only some of us can hear.", TREES),
    _t('world', "The silence of the forest speaks more truth than any counsel of the wise.", TREES),
    _t('self', "The night wraps the hills the way my doubt wraps my thoughts.", SOLITUDE),
    _t('self', "Even the stars look tired when they watch me wander.", SOLITUDE),
    _t('world', "Crows circling above seem to understand me better than my kin.", BIRDS),
    _t('self', "A lone wolf's howl sounds like my own heart calling from far away.", WOLVES + ['tag:form:sound_only']),
    _t('self', "Moonlight turns wounds into silver; at least for a moment they look beautiful.", SOLITUDE + WOUNDED),
    _t('world', "Trees grow old without despair; I envy their slow, quiet surrender.", TREES),
    _t('world', "Mist over the river hides both dangers and regrets.", WATER),
    _t('self', "Storms tear the sky apart the way I tear my memories.", SOLITUDE),
    _t('self', "I watch a dying flower and see the mirror of my own fading certainties.", PLANTS),
    _t('world', "The way roots cling to the earth reminds me how hard it is to let go.", TREES + PLANTS),
    _t('world', "Even in decay, the forest finds a way to reshape itself; I wish I could do the same.", TREES),
    _t('self', "The restless flight of bats feels like my thoughts trying to escape my skull.", BIRDS),
    _t('self', "When the last light leaves the horizon, the world finally looks as I feel inside.", SOLITUDE),

    # --- e) authored to fill the gaps — orcs, the Shadow, kin, portents ----
    _t('other', "I have watched their kind ruin land after land for an Age; they do not change, only the names of the places they defile.", ORCS),  # new
    _t('world', "The Shadow does not send strangers; it sends the same old cruelties in new numbers.", ORCS + UNDEAD + TROLLS + DEMONS + DRAKES),  # new
    _t('self', "When the signs of orcs appear, an old part of me stops counting years and starts counting arrows.", ORCS + SIGNS, boosts={'tag:entity_type:orcs': 0.3}),  # new
    _t('self', "I have buried friends who later answered to stranger callings; death is a door I no longer trust.", UNDEAD),  # new
    _t('world', "Some shapes were wrong before the Shadow ever named them; hunger needs no master.", DEMONS + DRAKES + SPIDERS + TROLLS + CONSTRUCTS),  # new
    _t('self', "Among my own kind I am a mirror they would rather not hold; what I carry is what we all become.", ELVES),  # new
    _t('other', "The small folk plant trees they will never sit beneath, and grieve more honestly than immortals; I cannot decide which of us misjudges time.", HOBBITS),  # new
    _t('other', "Mortals burn fast and call it living; after enough centuries, I have come to suspect the fire is the point.", HUMANS + DWARVES),  # new
    _t('self', "They walk beside me as if the road were only a road; I have learned to let them believe it.", FRIENDLY),  # new
    _t('world', "A wrong silence, a track read backwards — the land writes warnings; most learn to read it after.", SIGNS),  # new
    _t('other', "The wise speak of powers beyond the world; I have met a few. They worry like everyone else.", MAIAR),  # new
    _t('world', "Their fires and walls are small defiances; I have watched cities learn that the dark keeps no bargains.", SETTLEMENT),  # new
    _t('self', "Every shadow I cut down feeds the one I carry; that is the arithmetic of my centuries.", HOSTILE),  # new
    _t('self', "The cold finds the old scars first; the body remembers what the mind works to forget.", SOLITUDE + WOUNDED),  # new
]


# ============================================================================
# ARANATH — a wandering Dúnadan. Duty is his filter: watchfulness, quiet
# kindness, protection that asks for nothing. He notices what needs doing;
# he learns from everything; the road is where he is most honest.
# ============================================================================
ARANATH_THOUGHTS = [
    # --- a) after non-hostile contact with thinking beings ----------------
    _t('self', "I do not need to be seen; it is enough to know the road is still safe.", FRIENDLY),
    _t('other', "I trust a friend's silence more than a king's shouting.", FRIENDLY),
    _t('self', "Fear is no cowardice; cowardice is letting fear decide for you.", FRIENDLY),
    _t('self', "I have learned that listening saves more lives than speaking.", FRIENDLY),
    _t('self', "I do not seek glory, only that tomorrow something remains worth protecting.", FRIENDLY),
    _t('self', "Carrying another's burden does not make me weak; it reminds me why I keep walking.", FRIENDLY),
    _t('self', "Being reserved does not mean I do not feel; it means I guard what I carry inside.", FRIENDLY),
    _t('self', "There are days when I do not understand the world, yet still choose to stand on its side.", FRIENDLY),
    _t('other', "No heart is so hardened that it does not soften when it sees someone caring for another.", FRIENDLY),
    _t('other', "A simple bowl of shared soup can forge loyalties stronger than solemn oaths.", FRIENDLY + MEAL),
    _t('self', "True leadership is walking one step behind others, not one step ahead.", FRIENDLY),
    _t('self', "It is not my task to save everyone, but it is my duty not to abandon the one who walks at my side.", FRIENDLY),
    _t('other', "Those wise enough to speak little tend to remember every word they say.", FRIENDLY),
    _t('self', "The darker the road, the more important how we treat those who stumble.", FRIENDLY),
    _t('self', "When I do not know what to do, I watch: the answer is almost always in what others need, not in what I want.", FRIENDLY),
    _t('self', "I do not need perfect hope, only enough to take one more step.", FRIENDLY),
    _t('other', "Their innocence is fragile, but the world needs that kind of light.", FRIENDLY + HOBBITS),
    _t('other', "I will not take their illusions from them; time will temper them soon enough.", FRIENDLY),
    _t('self', "With the right company, even a hard journey feels like a shared vow.", FRIENDLY),
    _t('self', "Sometimes the kindest thing I can offer is quiet understanding and an open fire.", FRIENDLY + REST),

    # --- b) solitude ------------------------------------------------------
    _t('self', "I am not here to decide everyone's fate, only to do what is right when it is my turn to choose.", SOLITUDE),
    _t('self', "Sometimes the best answer is a silence that invites the other to listen to themselves.", SOLITUDE),
    _t('self', "No path is useless if, at the end, you know yourself better.", SOLITUDE),
    _t('world', "Time does not heal every wound, but it teaches how to carry them without turning them into chains.", SOLITUDE + WOUNDED),
    _t('self', "I do not need to be followed, only to know my steps are honest.", SOLITUDE),
    _t('self', "Solitude is not emptiness; it is space to remember who I am.", SOLITUDE),
    _t('self', "My doubts are old companions; we walk together, but they no longer lead.", SOLITUDE),
    _t('self', "No one truly walks alone; memories travel at our side.", SOLITUDE),
    _t('self', "The weight of my choices is lighter when I admit my own limits.", SOLITUDE),
    _t('self', "I find peace in knowing I cannot fix everything; I can still mend something.", SOLITUDE),
    _t('self', "The night on the road has taught me to listen to the quiet between my thoughts.", SOLITUDE),
    _t('self', "A long silence can be a bridge, not a wall.", SOLITUDE),
    _t('self', "I measure my life not in victories, but in moments when I did not turn away.", SOLITUDE),
    _t('self', "Every scar is a line in the map of where I have been and what I have learned.", SOLITUDE + WOUNDED),
    _t('self', "I am not afraid of being forgotten; I am afraid of forgetting why I walked at all.", SOLITUDE),
    _t('self', "Solitude on the trail is harsh, but it sharpens the heart as much as the mind.", SOLITUDE),
    _t('self', "I have argued with myself enough to know when I must simply rest instead.", SOLITUDE + REST),
    _t('self', "If I listen closely, even my fears tell me what I value most.", SOLITUDE),
    _t('self', "I would rather walk slowly and true than run blindly and arrive nowhere.", SOLITUDE),
    _t('self', "When no one is watching, I can admit how much I still have to learn.", SOLITUDE),

    # --- c) after hostile contact, once the danger has passed --------------
    _t('world', "The battlefield is honest: here no one pretends life is fair.", HOSTILE),
    _t('self', "The smell of iron and damp earth reminds me how fragile we are.", HOSTILE),
    _t('self', "I do not rejoice when an enemy falls; I mourn the path that led us there.", HOSTILE),
    _t('self', "Survival is not proof of strength, only of persistence.", HOSTILE),
    _t('self', "After danger passes, gratitude is the sharpest feeling.", HOSTILE),
    _t('self', "I have seen fury consume good hearts; that is why I hold my own anger in check.", HOSTILE),
    _t('self', "Sometimes the bravest choice is to stop fighting when you could keep striking.", HOSTILE),
    _t('self', "Steel and claw are clear; it is hatred that truly wounds.", HOSTILE),
    _t('self', "I leave no battle unchanged, even when I walk away without a scratch.", HOSTILE),
    _t('self', "Each fallen foe reminds me how thin the line is between us and them.", HOSTILE + ORCS),
    _t('self', "I have learned to thank fear when it sharpens my senses rather than my cruelty.", HOSTILE),
    _t('self', "When the clash of blades ends, the real work begins: tending the living and the land.", HOSTILE),
    _t('self', "Victory without mercy is only another kind of loss.", HOSTILE),
    _t('self', "Every hostile encounter tests not just my skill, but my humanity.", HOSTILE),
    _t('self', "It is easy to swing a sword; it is harder to decide when to lower it.", HOSTILE),
    _t('self', "The echo of battle lingers longer than the wounds.", HOSTILE + WOUNDED),
    _t('self', "I would rather win by wisdom than by force, but the world does not always offer that choice.", HOSTILE),
    _t('other', "Even monsters teach us something: what happens when we abandon ourselves.", HOSTILE + ORCS + TROLLS + DEMONS + UNDEAD),
    _t('self', "When danger fades, I count not the dead, but those I still can protect.", HOSTILE),
    _t('self', "Walking away alive is a gift; walking away still kind is a victory.", HOSTILE),

    # --- d) observing animals and nature -----------------------------------
    _t('world', "A flower growing in a crack inspires me more than any speech.", PLANTS),
    _t('world', "As long as birds keep singing at dawn, not everything is lost.", BIRDS),
    _t('self', "The small fire of a campfire is worth more than a thousand torches lit out of fear.", REST),
    _t('self', "Rain washes more than soil; it also rinses stubborn thoughts.", SOLITUDE),
    _t('world', "A quiet stream has taught me more about patience than many teachers.", WATER),
    _t('world', "Night is no enemy; it simply protects what daylight does not know how to see.", SOLITUDE),
    _t('world', "Narrow forest paths force us to walk close; that is why friendship is so often born there.", TREES),
    _t('world', "The smell of wet earth always reminds me we can still begin again.", SOLITUDE),
    _t('world', "As long as there is a single ember glowing in the ashes, some stories are not over.", REST),
    _t('world', "A bird landing on my hand trusts without knowing my name; that is a sacred kind of faith.", BIRDS),
    _t('world', "A tired horse that still moves forward teaches me more about loyalty than words ever could.", HORSES),
    _t('world', "The way trees bend in the wind is a lesson in strength without rigidity.", TREES),
    _t('world', "Stars above the camp remind me how small we are and how precious each step becomes.", REST),
    _t('world', "Even the smallest animal fighting for its life shows me courage in its purest form.", ANIMALS),
    _t('world', "The rhythm of hooves, paws, and bare feet on the road is the true music of travel.", HORSES + SOLITUDE),
    _t('world', "Watching a fox disappear into the undergrowth teaches me the art of quiet retreat.", WOLVES),
    _t('world', "When the mountains turn purple at dusk, I remember beauty can exist even after hard days.", SOLITUDE),
    _t('world', "A dog that guards the fire does so without asking why; I try to protect others with the same simplicity.", ['tag:entity_type:other_animals'] + REST),
    _t('world', "Listening to owls at night reminds me wisdom often hides in the dark.", BIRDS + SOLITUDE),
    _t('world', "Even a broken branch points the way; nature is full of signs for those who look.", TREES),

    # --- e) authored to fill the gaps — orcs, the watch, the Shire ---------
    _t('self', "Orcs in these lands mean someone's home is next; that is a debt the watch intends to pay.", ORCS, boosts={'tag:entity_type:orcs': 0.25}),  # new
    _t('self', "The Enemy does not sleep; neither can the watch.", ORCS + UNDEAD + TROLLS),  # new
    _t('other', "The Shire-folk do not know what stands between them and the dark; that is the point of the watch.", HOBBITS, boosts={'tag:entity_type:hobbits': 0.2}),  # new
    _t('other', "Their peace is not luck; it is paid for quietly, by folk they will never meet.", HOBBITS + HUMANS),  # new
    _t('self', "The wild speaks before it strikes — bent grass, a wrong silence, crows gone quiet; the land asks, and a ranger answers.", SIGNS),  # new
    _t('self', "Our names are forgotten and our keeps are dust; the road remembers us anyway.", SOLITUDE),  # new
    _t('world', "I have seen crowns change nothing and a kept promise change everything.", FRIENDLY),  # new
    _t('self', "Walls have their place and fires their use; I am always more honest on the road.", SETTLEMENT),  # new
    _t('self', "Let them sleep; someone has to keep the dawn honest.", FRIENDLY + REST),  # new
    _t('other', "Bloodlines matter less than footsteps; I judge the walk, not the name.", FRIENDLY),  # new
    _t('world', "Even the hills can hate you here; respect is cheaper than courage.", TROLLS + GIANTS + HAZARDS),  # new
    _t('self', "Mercy is a choice you make before the sword leaves its sheath; after that, it is only luck.", HOSTILE),  # new
    _t('self', "My knee tells the weather before the sky does; the body keeps the map too.", SOLITUDE),  # new
]


PACKS = {
    'celebrian': CELEBRIAN_THOUGHTS,
    'aranath': ARANATH_THOUGHTS,
}
