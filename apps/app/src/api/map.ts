import type { IMapSearchPlaceItem, MapApiProvider } from './types/map'
import { http } from '@/http/http'

export function searchMapPlaces(params: {
  keyword: string
  latitude?: number
  longitude?: number
  pageSize?: number
  provider?: MapApiProvider
}) {
  return http.get<IMapSearchPlaceItem[]>('/api/map/search', params)
}
