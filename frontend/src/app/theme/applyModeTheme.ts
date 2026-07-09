import { cssVariables, exploreCssVariables } from './colors'

export type MapMode = 'explore' | 'wander'

/**
 * Build a CSS style string with the theme variables for a given mode.
 * The same CSS variable names are used in both modes, but their values change.
 */
export function getModeThemeVariables(mode: MapMode): Record<string, string> {
  const variables = mode === 'explore' ? exploreCssVariables : cssVariables
  return { ...variables }
}

/**
 * Apply the theme variables to a CSSStyleDeclaration (e.g. element.style).
 */
export function applyModeTheme(element: HTMLElement | null, mode: MapMode): void {
  if (!element) return

  const variables = getModeThemeVariables(mode)
  Object.entries(variables).forEach(([key, value]) => {
    element.style.setProperty(key, value)
  })
}

/**
 * Clear theme variables from an element, falling back to the wander palette.
 */
export function clearModeTheme(element: HTMLElement | null): void {
  if (!element) return

  const variables = { ...cssVariables, ...exploreCssVariables }
  Object.keys(variables).forEach((key) => {
    element.style.removeProperty(key)
  })
}
