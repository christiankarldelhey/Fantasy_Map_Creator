import api from '@/shared/api/client'
import type { BiomeCollection } from '../model/types'

export const getBiomes = () => api.get<BiomeCollection>('/biomes')
