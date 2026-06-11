/**
 * Zoom Level Configuration
 * Defines visibility thresholds for different map elements based on zoom levels
 */

/**
 * Zoom level ranges
 */
export const ZOOM_LEVELS = {
  FAR: { min: 4, max: 4 },      // Distant view - only major elements (no labels)
  MEDIUM: { min: 5, max: 6 },   // Intermediate view - major + secondary elements + their labels
  NEAR: { min: 7, max: 18 }    // Close view - all elements + all labels
} as const

/**
 * Location types by zoom level
 */
export const LOCATION_TYPES = {
  // Major locations visible from zoom 3
  MAJOR: ['city', 'fortified city', 'fortress', 'fortified town', 'dwarven mine'] as string[],

  // Medium locations visible from zoom 6
  MEDIUM: ['town', 'keep', 'dungeon', 'castle'] as string[],

  // Minor locations visible from zoom 8 (labels appear here too)
  MINOR: ['village', 'manor', 'ruins', 'watchtower', 'tower', 'point of interest', 'inn', 'burial', 'cavern'] as string[]
}

/**
 * Road types by zoom level
 */
export const ROAD_TYPES = {
  // Major roads visible from zoom 3
  MAJOR: ['Royal Road', 'Main Road'] as string[],

  // Medium roads visible from zoom 6
  MEDIUM: ['Regular Road'] as string[],

  // Minor roads visible from zoom 8
  MINOR: ['Trail'] as string[]
}

/**
 * Helper function to create a filter expression for MapLibre
 */
export function createTypeFilter(propertyName: string, types: string[]) {
  return ['match', ['get', propertyName], types, true, false]
}
