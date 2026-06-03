export interface CurrentClimateResponse {
  region_id: number
  region_name: string
  koppen: string | null
  analog_location: string | null
  analog_lat: number | null
  analog_lon: number | null
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
  stats: ClimateStats
}
