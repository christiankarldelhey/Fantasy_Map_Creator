export interface LocationDetails {
  name: string
  type: string
  slug?: string
  url_path?: string
  description?: string
  description_es?: string
  population?: string
  inhabitants?: string
  biome?: {
    name: string
    type: string
  }
  road?: {
    name: string
    terrain_type?: string
  }
  water?: {
    name: string
    water_type: string
  }
  elevation?: {
    meters: number
    terrain_type?: string
  }
  region?: {
    name: string
    kingdom?: string
    slug?: string
    url_path?: string
  }
  // Admin ghost point (`visible_in_map` off): the sidebar shows the
  // region's picture in place of location art.
  hidden?: boolean
  climate?: {
    temperature: number
    humidity: number
    precipitation: number
    wind: number
    cloudCover?: number
    time?: string
    isTransitionZone?: boolean
    transitionDistanceKm?: number
    neighboringRegions?: Array<{
      region_name: string
      weight: number
    }>
  }
  // Region-specific fields
  region_type?: string
  people?: {
    symbol?: string
    military?: string
    population?: string
  }
  land?: any
  fauna?: any
  flora?: any
  notes?: string
  source?: any
  products?: string
  regionId?: number
}
