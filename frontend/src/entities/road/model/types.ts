export interface RoadCollection {
  type: 'FeatureCollection'
  features: RoadFeature[]
}

export interface RoadFeature {
  type: 'Feature'
  id: number
  geometry: {
    type: 'LineString'
    coordinates: number[][]
  }
  properties: {
    id: number
    name: string
    terrain_type?: string
    difficulty?: number
  }
}
