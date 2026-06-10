import api from '@/shared/api/client'
import type { CurrentClimateResponse, RegionClimateSummaryResponse, PointClimateResponse } from '../model/types'

export const getCurrentClimate = (regionId: number) => {
  return api.get<CurrentClimateResponse>('/climate/current', {
    params: { region_id: regionId }
  })
}

export const getRegionClimateSummary = (regionId: number) => {
  return api.get<RegionClimateSummaryResponse>(`/climate/region/${regionId}`)
}

export const getClimateAtPoint = (lon: number, lat: number, timestamp?: string) => {
  const params: Record<string, string | number> = { lon, lat }
  if (timestamp) {
    params.timestamp = timestamp
  }
  return api.get<PointClimateResponse>('/climate/point', { params })
}
