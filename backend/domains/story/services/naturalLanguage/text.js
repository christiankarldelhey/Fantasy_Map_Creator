// ============================================================================
// Text helpers shared by every natural-language module
// ----------------------------------------------------------------------------
// Deliberately tiny and dependency-free: these are the only primitives the
// phrase modules are allowed to share, so a change here is easy to reason about.
// ============================================================================

/** Pick one element from an array using the supplied rng (seedable for tests). */
export function pick(arr, rng = Math.random) {
  return arr[Math.floor(rng() * arr.length)];
}

/** Join a list in prose: "a", "a and b", "a, b and c". Blanks are dropped. */
export function joinList(arr) {
  const xs = (arr || []).filter(Boolean);
  if (xs.length === 0) return '';
  if (xs.length === 1) return xs[0];
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

/** Uppercase the first character, leaving the rest untouched. */
export function capitalize(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Trimmed " — description" suffix, or '' when there is nothing to append. */
export function descriptionSuffix(description) {
  return description && description.trim() ? ` — ${description.trim()}` : '';
}

/** Turn a snake_case type into a readable label ("fortified_town" -> "fortified town"). */
export function readableType(type) {
  return type ? String(type).replace(/_/g, ' ') : '';
}

/** Region objects or bare strings -> plain region names. */
export function regionNamesOf(regions) {
  return (regions || []).map((r) => (typeof r === 'string' ? r : r.name));
}
