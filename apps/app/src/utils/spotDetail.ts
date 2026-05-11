import type { IMapSearchPlaceItem, MapApiProvider } from '@/api/types/map'
import type { FavoriteSpotSummary } from '@/api/types/spot'
import type { FoodSpot } from '@/store/spot'

function appendQueryValue(params: URLSearchParams, key: string, value?: string | number) {
  if (value === undefined || value === null || value === '') {
    return
  }

  params.append(key, String(value))
}

export function buildSpotDetailUrl(params: {
  id?: string | number
  title?: string
  address?: string
  latitude?: number
  longitude?: number
  distance?: number
  category?: string
  district?: string
  provider?: string
}) {
  const query = new URLSearchParams()

  appendQueryValue(query, 'id', params.id)
  appendQueryValue(query, 'title', params.title)
  appendQueryValue(query, 'address', params.address)
  appendQueryValue(query, 'latitude', params.latitude)
  appendQueryValue(query, 'longitude', params.longitude)
  appendQueryValue(query, 'distance', params.distance)
  appendQueryValue(query, 'category', params.category)
  appendQueryValue(query, 'district', params.district)
  appendQueryValue(query, 'provider', params.provider)

  return `/pages/spot/detail?${query.toString()}`
}

export function createFavoriteSummaryFromSpot(spot: FoodSpot): FavoriteSpotSummary {
  return {
    id: String(spot.id),
    name: spot.name,
    cover: spot.cover,
    address: spot.address,
    rating: spot.rating,
    avgPrice: spot.avgPrice,
    latitude: spot.latitude,
    longitude: spot.longitude,
    category: spot.tags.join(' / '),
  }
}

export function createFavoriteSummaryFromMapPlace(place: IMapSearchPlaceItem, provider?: MapApiProvider): FavoriteSpotSummary {
  return {
    id: place.id,
    name: place.title,
    cover: 'https://placehold.co/400x300/4f46e5/white?text=MAP',
    address: `${place.district || ''}${place.address || ''}`,
    rating: 4.6,
    avgPrice: 58,
    latitude: place.latitude,
    longitude: place.longitude,
    distance: place.distance,
    category: place.category,
    district: place.district,
    provider,
  }
}

export function buildSpotDetailUrlFromSpot(spot: FoodSpot) {
  return buildSpotDetailUrl({ id: spot.id })
}

export function buildSpotDetailUrlFromMapPlace(place: IMapSearchPlaceItem, provider?: MapApiProvider) {
  return buildSpotDetailUrl({
    id: place.id,
    title: place.title,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    distance: place.distance,
    category: place.category,
    district: place.district,
    provider,
  })
}

export function buildSpotDetailUrlFromFavorite(summary: FavoriteSpotSummary) {
  return buildSpotDetailUrl({
    id: summary.id,
    title: summary.name,
    address: summary.address,
    latitude: summary.latitude,
    longitude: summary.longitude,
    distance: summary.distance,
    category: summary.category,
    district: summary.district,
    provider: summary.provider,
  })
}
