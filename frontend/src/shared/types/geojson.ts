export interface GeoJSONFeature {
  type: 'Feature'
  id: number
  geometry:
    | { type: 'Point'; coordinates: number[] }
    | { type: 'LineString'; coordinates: number[][] }
    | { type: 'Polygon'; coordinates: number[][][] }
    | { type: 'MultiPolygon'; coordinates: number[][][][] }
  properties: {
    id: number
    name: string
    type?: string
    region?: string
    description?: string
  }
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}

export interface HealthCheckResponse {
  status: string
  database: string
  timestamp: string
  locations: string
}
