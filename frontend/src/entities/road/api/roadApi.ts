import api from '@/shared/api/client'
import type { RoadCollection } from '../model/types'

export const getRoads = () => {
  return api.get<RoadCollection>('/roads')
}
