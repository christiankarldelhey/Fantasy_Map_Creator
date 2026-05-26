import api from '@/shared/api/client'
import type { PathCollection } from '../model/types'

export const getPaths = (type?: string) => {
  const url = type ? `/paths?type=${type}` : '/paths'
  return api.get<PathCollection>(url)
}
