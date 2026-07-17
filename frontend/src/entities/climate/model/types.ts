export interface CurrentClimateResponse {
  region_id: number
  region_name: string
  koppen: string | null
  analog_location: string | null
  analog_lat: number | null
  analog_lon: number | null
  climate_description: string | null
  temperature_pattern: string | null
  precipitation_pattern: string | null
  time: string | null
  temperature_2m: number | null
  relative_humidity_2m: number | null
  precipitation: number | null
  snowfall: number | null
  cloud_cover: number | null
  wind_speed_10m: number | null
  wind_direction_10m: number | null
  surface_pressure: number | null
  soil_moisture_0_to_7cm: number | null
  et0_fao_evapotranspiration: number | null
  shortwave_radiation: number | null
  moon_phase: string | null
  moon_illumination: number | null
}

export interface ClimateStats {
  avg_temp: number | null
  max_temp: number | null
  min_temp: number | null
  total_precipitation: number | null
  avg_humidity: number | null
}

export interface RegionClimateSummaryResponse {
  region_id: number
  region_name: string
  koppen: string | null
  analog_location: string | null
  analog_lat: number | null
  analog_lon: number | null
  climate_description: string | null
  temperature_pattern: string | null
  precipitation_pattern: string | null
  stats: ClimateStats
}

export interface NeighboringRegion {
  region_id: number
  region_name: string
  distance_km: number
  weight: number
}

export interface PointClimateData {
  time: string
  temperature_2m: number
  precipitation: number
  wind_speed_10m: number
  wind_direction_10m: number
  relative_humidity_2m: number
  cloud_cover: number
  moon_phase: string | null
  moon_illumination: number | null
}

export interface PointClimateResponse {
  region_id: number
  region_name: string
  is_transition_zone: boolean
  transition_distance_km: number
  neighboring_regions?: NeighboringRegion[]
  climate: PointClimateData
  error?: string
}

export interface RegionClimateData {
  region_id: number
  region_name: string
  time: string
  temperature_2m: number | null
  relative_humidity_2m: number | null
  precipitation: number | null
  wind_speed_10m: number | null
  cloud_cover: number | null
  moon_phase: string | null
  moon_illumination: number | null
}

export type AllRegionsClimateResponse = RegionClimateData[]
