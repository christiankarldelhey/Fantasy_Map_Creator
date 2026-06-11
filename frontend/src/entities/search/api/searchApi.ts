import api from '@/shared/api/client'
import type { SearchResponse } from '../model/types'

export const searchLocationsAndRegions = (query: string) => 
  api.get<SearchResponse>('/search', { params: { q: query } })
