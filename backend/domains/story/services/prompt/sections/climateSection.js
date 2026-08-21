// ============================================================================
// Climate state prompt section
// ----------------------------------------------------------------------------
// Includes multi-day and unusual weather descriptions in the narrator prompt
// only when a persistent state has formed. If no state is active, the section
// is empty and the prompt falls back to the usual per-phase weather notes.
// ============================================================================

export function climateStateSection(climateStateText = '') {
  if (!climateStateText) return '';
  return `${climateStateText}\n`;
}
