export interface DirectionsSummary {
  total_distance_m: number
  total_distance_km: number
  on_road_distance_km: number
  off_road_distance_km: number
  total_time_seconds: number
  total_time_hours: number
}

export interface DirectionsFeature {
  type: 'Feature'
  geometry: GeoJSON.Geometry
  properties: {
    type: 'off_road' | 'on_road'
    distance_m?: number
    seq?: number
    name?: string
    terrain_type?: string
    difficulty?: number
    cost_factor?: number
    segment_length?: number
  }
}

export interface DirectionsResponse {
  summary: DirectionsSummary
  geometry: {
    off_road_start: DirectionsFeature | null
    on_road: GeoJSON.FeatureCollection | null
    off_road_end: DirectionsFeature | null
  }
}
