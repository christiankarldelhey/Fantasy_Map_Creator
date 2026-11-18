// ============================================================================
// urls — resolving Host-owned asset paths
// ----------------------------------------------------------------------------
// Portrait URLs live in the Host's character_state as '/portraits/X.png',
// served by the game backend (server.js → public/characters/). The Studio
// is a different origin, so relative paths must resolve against the game
// host — VITE_GAME_ORIGIN overrides it (default: the dev backend).
// ============================================================================
const GAME_ORIGIN = import.meta.env.VITE_GAME_ORIGIN ?? 'http://localhost:5000'

export function assetSrc(url: string | null | undefined): string | null {
  if (!url) return null
  return /^https?:\/\//i.test(url) ? url : `${GAME_ORIGIN}${url}`
}
