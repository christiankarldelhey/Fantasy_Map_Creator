export interface WaterCollection {
  type: 'FeatureCollection'
  features: WaterFeature[]
}

export interface WaterFeature {
  type: 'Feature'
  id: number
  geometry: {
    type: 'LineString' | 'Polygon'
    coordinates: number[][] | number[][][]
  }
  properties: {
    id: number
    name: string
    water_type: 'river' | 'stream' | 'lake'
    description?: string
  }
}
