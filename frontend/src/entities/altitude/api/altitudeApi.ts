import api from '@/shared/api/client'
import type { AltitudeCollection, ElevationResponse } from '../model/types'

export const getAltitudeLayers = () => api.get<AltitudeCollection>('/altitude')

export const getElevation = (lon: number, lat: number) => 
  api.get<ElevationResponse>(`/dem/elevation?lon=${lon}&lat=${lat}`)
