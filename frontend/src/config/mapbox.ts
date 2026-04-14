/**
 * Mapbox Configuration
 * Loads configuration from environment variables
 */

export const MAPBOX_CONFIG = {
  accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
  styleId: import.meta.env.VITE_MAPBOX_STYLE_ID,
  
  /**
   * Generates the tile URL template for Mapbox
   */
  getTileUrl(): string {
    // ArcGIS WebTileLayer usa {level}/{col}/{row} en lugar de {z}/{x}/{y}
    return `https://api.mapbox.com/styles/v1/${this.styleId}/tiles/256/{level}/{col}/{row}@2x?access_token=${this.accessToken}`
  },
  
  /**
   * Default map center (Middle Earth coordinates)
   */
  defaultCenter: [6.432063, 47.021704] as [number, number],
  
  /**
   * Default zoom level
   */
  defaultZoom: 4.5,
  
  /**
   * Copyright attribution
   */
  copyright: 'Mapbox, OpenStreetMap'
} as const

export default MAPBOX_CONFIG
