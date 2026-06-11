export interface SearchResult {
  id: number
  name: string
  type: 'location' | 'region'
  geometry: GeoJSON.Geometry
  location_type?: string
  region_type?: string
}

export interface SearchResponse {
  results: SearchResult[]
}
