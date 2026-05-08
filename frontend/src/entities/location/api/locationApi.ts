import api from '@/shared/api/client'
import type { LocationCollection } from '../model/types'

export const getLocations = () => api.get<LocationCollection>('/locations')
export const getLocation = (id: number) => api.get<LocationCollection>(`/locations/${id}`)
