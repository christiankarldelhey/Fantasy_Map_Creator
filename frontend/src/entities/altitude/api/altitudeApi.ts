import api from '@/shared/api/client'
import type { AltitudeCollection } from '../model/types'

export const getAltitudeLayers = () => api.get<AltitudeCollection>('/altitude')

export const getElevation = (lon: number, lat: number) => 
  api.get<{ lon: number; lat: number; elevation: number; unit: string }>(`/dem/elevation?lon=${lon}&lat=${lat}`)
