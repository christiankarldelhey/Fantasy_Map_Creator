import api from '@/shared/api/client'
import type { DirectionsResponse } from '../model/types'

export const fetchDirections = (
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number
) => {
  return api.get<DirectionsResponse>('/directions', {
    params: {
      start_lng: startLng,
      start_lat: startLat,
      end_lng: endLng,
      end_lat: endLat,
    },
  })
}
