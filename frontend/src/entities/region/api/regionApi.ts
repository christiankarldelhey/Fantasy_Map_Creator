import api from '@/shared/api/client'
import type { RegionCollection } from '../model/types'

export const getRegions = () => api.get<RegionCollection>('/regions')
