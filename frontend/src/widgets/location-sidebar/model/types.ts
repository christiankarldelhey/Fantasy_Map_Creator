export interface LocationDetails {
  name: string
  type: string
  description?: string
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
  }
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
}
