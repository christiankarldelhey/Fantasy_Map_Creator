import api from '@/shared/api/client'
import type { CurrentClimateResponse, RegionClimateSummaryResponse } from '../model/types'

export const getCurrentClimate = (regionId: number) => {
  return api.get<CurrentClimateResponse>('/climate/current', {
    params: { region_id: regionId }
  })
}

export const getRegionClimateSummary = (regionId: number) => {
  return api.get<RegionClimateSummaryResponse>(`/climate/region/${regionId}`)
}
