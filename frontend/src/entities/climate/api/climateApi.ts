import api from '@/shared/api/client'
import type { CurrentClimateResponse, RegionClimateSummaryResponse, PointClimateResponse, AllRegionsClimateResponse } from '../model/types'

export const getCurrentClimate = (regionId: number, timestamp?: string) => {
  const params: Record<string, string | number> = { region_id: regionId }
  if (timestamp) {
    params.timestamp = timestamp
  }
  return api.get<CurrentClimateResponse>('/climate/current', { params })
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

export const getAllRegionsClimate = (timestamp?: string) => {
  const params: Record<string, string> = {}
  if (timestamp) {
    params.timestamp = timestamp
  }
  return api.get<AllRegionsClimateResponse>('/climate/all-regions', { params })
}
