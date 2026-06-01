export interface AltitudeProperties {
  id: number
  altitude_type: 'hills' | 'mountains_low' | 'mountains_med' | 'mountains_high'
  priority: number
  area_km2?: number
}

export interface AltitudeFeature {
  type: 'Feature'
  id: number
  geometry: GeoJSON.Geometry
  properties: AltitudeProperties
}

export interface AltitudeCollection {
  type: 'FeatureCollection'
  features: AltitudeFeature[]
}

export interface ElevationResponse {
  lon: number
  lat: number
  elevation: number
  unit: string
  terrain_type?: string
}
