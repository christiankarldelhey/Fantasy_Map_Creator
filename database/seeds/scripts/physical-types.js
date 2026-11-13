// ---------------------------------------------------------------------------
// Canonical physical-type vocabulary (ADR-0014, #103)
// Shared by load-seeds (normalization) and validate-seeds (membership check).
// Applies to gazetteer type columns (locations.location_type, water.water_type,
// biomes.type) and to scope types on narration records. Ficha narrative types
// are a separate, richer vocabulary and are NOT governed here.
// ---------------------------------------------------------------------------

export const PHYSICAL_TYPES = new Set([
  // water
  'lake', 'river', 'stream', 'sea',
  // biome
  'forest', 'marsh', 'desert',
  // roads
  'trail', 'road', 'main_road', 'royal_road',
  // settlements
  'city', 'fortified_city', 'town', 'fortified_town',
  'village', 'fortified_village', 'hamlet', 'manor', 'camp', 'inn', 'palace',
  // fortifications
  'fortress', 'castle', 'citadel', 'keep', 'watchtower', 'tower',
  // ruins & underground
  'ruins', 'major_ruin', 'dungeon', 'cavern', 'burial', 'cemetery',
  // landmarks & works
  'bridge', 'crossroads', 'mine', 'mill', 'quarry', 'landmark', 'point_of_interest',
]);

// Legacy/multiword values → canonical form. Applied to locations.location_type
// on every seed and to ficha types when testing inheritance eligibility.
export const TYPE_ALIASES = {
  'fortified town': 'fortified_town',
  'fortified city': 'fortified_city',
  'fortified village': 'fortified_village',
  'point of interest': 'point_of_interest',
  'dwarven mine': 'mine',
  'major ruin': 'major_ruin',
  'ruin': 'ruins',
  'main road': 'main_road',
  'royal road': 'royal_road',
  'cultivated glade': 'landmark',
  'hills': 'landmark',
  'nature': 'landmark',
};

export function canonicalType(type) {
  if (type == null) return null;
  const t = TYPE_ALIASES[type] || type;
  return PHYSICAL_TYPES.has(t) ? t : null;
}

// Ordered name → type patterns for georef anchors. First match wins;
// deliberately conservative — ambiguous names fall through to
// point_of_interest rather than being guessed.
export const NAME_TYPE_PATTERNS = [
  [/watchtower/i, 'watchtower'],
  [/windmill|watermill|\bmill\b/i, 'mill'],
  [/quarr/i, 'quarry'],
  [/crossroad|\bford\b/i, 'crossroads'],
  [/\bbridge\b/i, 'bridge'],
  [/fortress|\bfort\b|citadel/i, 'fortress'],
  [/\bcastle\b/i, 'castle'],
  [/\bkeep\b/i, 'keep'],
  [/\btower\b/i, 'tower'],
  [/ruin|ruined|abandoned/i, 'ruins'],
  [/dungeon/i, 'dungeon'],
  [/cave|cavern|grotto/i, 'cavern'],
  [/tomb|barrow|grave|crypt|burial|cemetery|cairn/i, 'burial'],
  [/inn|tavern|lodge|hostel/i, 'inn'],
  [/camp|encampment/i, 'camp'],
  [/manor|\bhall\b/i, 'manor'],
  [/palace/i, 'palace'],
  [/city|cities/i, 'city'],
  [/\btown\b/i, 'town'],
  [/village|hamlet|thorpe|settlement/i, 'village'],
  [/lake|mere|tarn|\bpool\b|pond/i, 'lake'],
  [/river/i, 'river'],
  [/stream|brook|creek|\brill\b/i, 'stream'],
  [/\bsea\b|ocean|coast|shore|bay/i, 'sea'],
  [/forest|wood|grove|copse|glade/i, 'forest'],
  [/marsh|swamp|\bfen\b|mire|bog/i, 'marsh'],
  [/desert|wasteland|wastes/i, 'desert'],
  [/\broad\b/i, 'road'],
  [/trail|\bpath\b|track/i, 'trail'],
];

export function typeFromName(name) {
  if (!name) return null;
  for (const [re, type] of NAME_TYPE_PATTERNS) {
    if (re.test(name)) return type;
  }
  return null;
}
