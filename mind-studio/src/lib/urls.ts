// ============================================================================
// urls — resolving Host-owned asset paths
// ----------------------------------------------------------------------------
// Portrait URLs live in the Host's character_state as '/portraits/X.png'.
// The mind-engine serves that same folder (app/main.py mounts
// backend/public/characters), so relative paths resolve on the Studio's
// own origin. VITE_GAME_ORIGIN only overrides the base when the Host
// serves them elsewhere.
// ============================================================================
const GAME_ORIGIN = import.meta.env.VITE_GAME_ORIGIN ?? ''

export function assetSrc(url: string | null | undefined): string | null {
  if (!url) return null
  return /^https?:\/\//i.test(url) ? url : `${GAME_ORIGIN}${url}`
}

// The card's portrait_url, else the host convention the game frontend
// uses ('/portraits/<Name>.png') — cards adopted before the wire carried
// the field still resolve while their next /open fills it in.
export function portraitSrc(
  url: string | null | undefined,
  name: string | null | undefined,
): string | null {
  return assetSrc(url ?? (name ? `/portraits/${name}.png` : null))
}
