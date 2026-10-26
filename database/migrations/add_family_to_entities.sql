-- Migration: Add family to entities
-- Date: 2026-08-01
-- Description: entity.type is too coarse for a mind to hold an opinion
--   ('carnivores' mixes foxes with wargs; 'flying_animals' eagles with
--   crebain). `family` is the kind-of-being level between type and the
--   entity itself — it travels to the mind as tag:family:<slug>, where
--   attitudes match at entity > family > type specificity.
--
--   1. Races inherit family from their parent (noldor, common_orcs,
--      dunedain, ents...) — the hierarchy already exists.
--   2. Flat groups (animals, monsters — no parent) get a declared family.

ALTER TABLE entities
  ADD COLUMN IF NOT EXISTS family TEXT;

COMMENT ON COLUMN entities.family IS 'Kind-of-being between type and entity (foxes within carnivores); NULL until declared';

-- Races: the parent IS the family (elves_of_rivendell -> noldor,
-- huorn -> ents, orc_patrol -> common_orcs). COALESCE in the query
-- keeps this working for rows added later; this backfills today's.
UPDATE entities child
SET family = parent.slug
FROM entities parent
WHERE child.parent_id = parent.id
  AND child.family IS NULL;

-- Flat groups: declared by slug. (flying_foxes is a bat — goes to bats,
-- not foxes; warg-kind kept apart from plain wolves: they answer to
-- Sauron, not to the wild.)
UPDATE entities SET family = CASE slug
  WHEN 'foxes'                       THEN 'foxes'
  WHEN 'red_foxes_of_calenardhon'    THEN 'foxes'
  WHEN 'white_foxes'                 THEN 'foxes'
  WHEN 'wolves'                      THEN 'wolves'
  WHEN 'grey_wolves'                 THEN 'wolves'
  WHEN 'red_wolves'                  THEN 'wolves'
  WHEN 'white_wolves'                THEN 'wolves'
  WHEN 'dire_wolves'                 THEN 'wolves'
  WHEN 'warg_pack'                   THEN 'wargs'
  WHEN 'war_wolves'                  THEN 'wargs'
  WHEN 'werewolves'                  THEN 'wargs'
  WHEN 'hounds'                      THEN 'dogs'
  WHEN 'sheep_hounds'                THEN 'dogs'
  WHEN 'wild_dogs'                   THEN 'dogs'
  WHEN 'dunmen_s_dogs'               THEN 'dogs'
  WHEN 'eagle'                       THEN 'eagles'
  WHEN 'great_eagles'                THEN 'eagles'
  WHEN 'golden_eagle'                THEN 'eagles'
  WHEN 'sea_eagles'                  THEN 'eagles'
  WHEN 'red_eagles'                  THEN 'eagles'
  WHEN 'vereut_eagles'               THEN 'eagles'
  WHEN 'crows'                       THEN 'crows'
  WHEN 'crebain'                     THEN 'crows'
  WHEN 'gorcrows'                    THEN 'crows'
  WHEN 'green_winged_crows'          THEN 'crows'
  WHEN 'owls'                        THEN 'owls'
  WHEN 'barrow_owls'                 THEN 'owls'
  WHEN 'short_eared_owls'            THEN 'owls'
  WHEN 'bats'                        THEN 'bats'
  WHEN 'great_bats'                  THEN 'bats'
  WHEN 'giant_vampire_bat'           THEN 'bats'
  WHEN 'hunting_bats'                THEN 'bats'
  WHEN 'pond_bats'                   THEN 'bats'
  WHEN 'flying_foxes'                THEN 'bats'
  WHEN 'black_swans'                 THEN 'swans'
  WHEN 'pied_swans'                  THEN 'swans'
  WHEN 'birds'                       THEN 'birds'
  WHEN 'chamber_birds'               THEN 'birds'
  WHEN 'waterfowl'                   THEN 'birds'
  WHEN 'woodland_birds_of_rhosgobel' THEN 'birds'
  WHEN 'deer'                        THEN 'deer'
  WHEN 'dappled_deer'                THEN 'deer'
  WHEN 'elk'                         THEN 'deer'
  WHEN 'great_elk'                   THEN 'deer'
  WHEN 'elven_horses'                THEN 'horses'
  WHEN 'horses_of_mordor'            THEN 'horses'
  WHEN 'horses_of_rohan'             THEN 'horses'
  WHEN 'wild_horses'                 THEN 'horses'
  WHEN 'horse_herds'                 THEN 'horses'
  WHEN 'goats'                       THEN 'goats'
  WHEN 'wild_goats'                  THEN 'goats'
  WHEN 'mountain_goat'               THEN 'goats'
  WHEN 'sheep'                       THEN 'sheep'
  WHEN 'sheep_pastures'              THEN 'sheep'
  WHEN 'cattle_herds'                THEN 'cattle'
  WHEN 'mordor_cattle'               THEN 'cattle'
  WHEN 'boars'                       THEN 'boars'
  WHEN 'fen_boars'                   THEN 'boars'
  WHEN 'bears'                       THEN 'bears'
  WHEN 'black_bears'                 THEN 'bears'
  WHEN 'blue_bears'                  THEN 'bears'
  WHEN 'cave_bears'                  THEN 'bears'
  WHEN 'north_bears'                 THEN 'bears'
  WHEN 'sloth_bear'                  THEN 'bears'
  WHEN 'cats'                        THEN 'cats'
  WHEN 'fishing_cats'                THEN 'cats'
  WHEN 'grass_cats'                  THEN 'cats'
  WHEN 'cathfiar'                    THEN 'cats'
  WHEN 'mammals_otters_minks_rodents' THEN 'small_mammals'
  WHEN 'spiders'                     THEN 'spiders'
  WHEN 'giant_spiders'               THEN 'spiders'
  WHEN 'king_spiders'                THEN 'spiders'
  WHEN 'trolls'                      THEN 'trolls'
  WHEN 'cave-trolls'                 THEN 'trolls'
  WHEN 'forest_trolls'               THEN 'trolls'
  WHEN 'half-trolls'                 THEN 'trolls'
  WHEN 'hill_troll'                  THEN 'trolls'
  WHEN 'snow_troll'                  THEN 'trolls'
  WHEN 'stone-trolls'                THEN 'trolls'
  WHEN 'tereg_trolls_of_dol_guldur'  THEN 'trolls'
  WHEN 'young_trolls'                THEN 'trolls'
  WHEN 'dragons'                     THEN 'dragons'
  WHEN 'greater_dragon'              THEN 'dragons'
  WHEN 'lesser_dragon'               THEN 'dragons'
  WHEN 'balrogs'                     THEN 'demons'
  WHEN 'undead'                      THEN 'undead'
  WHEN 'barrow_wights'               THEN 'undead'
  WHEN 'ghosts'                      THEN 'undead'
  WHEN 'great_serpent'               THEN 'serpents'
  WHEN 'ancient_mountain_pines_of_rhudaur' THEN 'trees'
END
WHERE slug IN (
  'foxes','red_foxes_of_calenardhon','white_foxes',
  'wolves','grey_wolves','red_wolves','white_wolves','dire_wolves',
  'warg_pack','war_wolves','werewolves',
  'hounds','sheep_hounds','wild_dogs','dunmen_s_dogs',
  'eagle','great_eagles','golden_eagle','sea_eagles','red_eagles','vereut_eagles',
  'crows','crebain','gorcrows','green_winged_crows',
  'owls','barrow_owls','short_eared_owls',
  'bats','great_bats','giant_vampire_bat','hunting_bats','pond_bats','flying_foxes',
  'black_swans','pied_swans',
  'birds','chamber_birds','waterfowl','woodland_birds_of_rhosgobel',
  'deer','dappled_deer','elk','great_elk',
  'elven_horses','horses_of_mordor','horses_of_rohan','wild_horses','horse_herds',
  'goats','wild_goats','mountain_goat',
  'sheep','sheep_pastures','cattle_herds','mordor_cattle',
  'boars','fen_boars','bears','black_bears','blue_bears','cave_bears',
  'north_bears','sloth_bear','cats','fishing_cats','grass_cats','cathfiar',
  'mammals_otters_minks_rodents',
  'spiders','giant_spiders','king_spiders',
  'trolls','cave-trolls','forest_trolls','half-trolls','hill_troll',
  'snow_troll','stone-trolls','tereg_trolls_of_dol_guldur','young_trolls',
  'dragons','greater_dragon','lesser_dragon','balrogs',
  'undead','barrow_wights','ghosts','great_serpent',
  'ancient_mountain_pines_of_rhudaur'
);
