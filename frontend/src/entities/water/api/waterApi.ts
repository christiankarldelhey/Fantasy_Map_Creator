import api from '@/shared/api/client'
import type { WaterCollection } from '../model/types'

export const getWater = () => {
  return api.get<WaterCollection>('/water')
}
