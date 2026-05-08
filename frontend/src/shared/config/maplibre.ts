/**
 * MapLibre GL Configuration
 * Configuration for the Middle Earth fantasy map
 */

import type { LngLatBoundsLike, MapOptions } from 'maplibre-gl'

/**
 * Mapbox tile configuration
 */
export const MAPBOX_CONFIG = {
  accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
  styleId: import.meta.env.VITE_MAPBOX_STYLE_ID,
  
  /**
   * Generates the tile URL template for raster tiles
   */
  getTileUrl(): string {
    return `https://api.mapbox.com/styles/v1/${this.styleId}/tiles/256/{z}/{x}/{y}@2x?access_token=${this.accessToken}`
  },
  
  /**
   * Creates a MapLibre-compatible style object
   */
  getStyle() {
    return {
      version: 8,
      sources: {
        'mapbox-tiles': {
          type: 'raster',
          tiles: [this.getTileUrl()],
          tileSize: 256,
          attribution: '© Mapbox © OpenStreetMap'
        }
      },
      layers: [
        {
          id: 'mapbox-tiles-layer',
          type: 'raster',
          source: 'mapbox-tiles',
          minzoom: 0,
          maxzoom: 22
        }
      ]
    }
  }
} as const

/**
 * Map bounds configuration
 * These bounds restrict the viewable area to Middle Earth (overlaid on Europe)
 * Adjust these coordinates based on your GeoTIFF extent
 */
export const MAP_BOUNDS: LngLatBoundsLike = [
  [-15, 35],  // Southwest coordinates [lng, lat]
  [45, 72]    // Northeast coordinates [lng, lat]
]

/**
 * Default map center (Middle Earth coordinates)
 */
export const DEFAULT_CENTER: [number, number] = [6.432063, 47.021704]

/**
 * Default zoom level
 */
export const DEFAULT_ZOOM = 5

/**
 * Map constraints
 */
export const MAP_CONSTRAINTS = {
  minZoom: 4,
  maxZoom: 18,
  maxBounds: MAP_BOUNDS,
  renderWorldCopies: false
}

/**
 * Complete MapLibre configuration
 */
export const MAPLIBRE_CONFIG: Partial<MapOptions> = {
  style: MAPBOX_CONFIG.getStyle() as any,
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
  minZoom: MAP_CONSTRAINTS.minZoom,
  maxZoom: MAP_CONSTRAINTS.maxZoom,
  maxBounds: MAP_CONSTRAINTS.maxBounds,
  renderWorldCopies: MAP_CONSTRAINTS.renderWorldCopies,
  dragRotate: false,
  touchPitch: false
}

export default MAPLIBRE_CONFIG
