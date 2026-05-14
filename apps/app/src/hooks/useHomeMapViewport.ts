import type { IMapSearchPlaceItem, IMapViewportBounds } from '@/api/types/map'
import { getMapViewportSpots } from '@/api/map'

interface CoordinatePoint {
  latitude: number
  longitude: number
}

interface UseHomeMapViewportOptions {
  nearbyKeyword: string
}

const NEARBY_REFRESH_DISTANCE_METERS = 600
const DEFAULT_KUNMING_CENTER: CoordinatePoint = {
  latitude: 25.03889,
  longitude: 102.71833,
}

const YUNNAN_BOUNDARY: CoordinatePoint[] = [
  { latitude: 28.48, longitude: 98.67 },
  { latitude: 28.08, longitude: 98.05 },
  { latitude: 27.38, longitude: 97.55 },
  { latitude: 26.2, longitude: 98.72 },
  { latitude: 24.7, longitude: 97.53 },
  { latitude: 23.1, longitude: 98.92 },
  { latitude: 21.14, longitude: 101.56 },
  { latitude: 21.17, longitude: 103.4 },
  { latitude: 22.82, longitude: 104.98 },
  { latitude: 24.2, longitude: 105.89 },
  { latitude: 25.96, longitude: 104.67 },
  { latitude: 27.3, longitude: 104.48 },
  { latitude: 28.15, longitude: 102.92 },
  { latitude: 29.25, longitude: 100.12 },
]

export function useHomeMapViewport(options: UseHomeMapViewportOptions) {
  const mapCenter = reactive({
    latitude: DEFAULT_KUNMING_CENTER.latitude,
    longitude: DEFAULT_KUNMING_CENTER.longitude,
  })
  const mapScale = ref(14)
  const nearbySpotResults = ref<IMapSearchPlaceItem[]>([])
  const isLoadingNearbyPlaces = ref(false)
  const hasPendingNearbyRefresh = ref(false)

  let ignoreNextRegionChangeEnd = false
  let lastFetchedCenter: CoordinatePoint | null = null

  function setMapCenter(point: CoordinatePoint) {
    mapCenter.latitude = point.latitude
    mapCenter.longitude = point.longitude
  }

  function focusMapCenter(point: CoordinatePoint) {
    ignoreNextRegionChangeEnd = true
    setMapCenter(point)
  }

  function updateMapScale(scale: unknown) {
    const nextScale = Number(scale)
    if (!Number.isFinite(nextScale)) {
      return
    }

    mapScale.value = nextScale
  }

  function isPointInPolygon(point: CoordinatePoint, polygon: CoordinatePoint[]) {
    let isInside = false

    for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index++) {
      const current = polygon[index]
      const previous = polygon[previousIndex]
      const latitudeDelta = previous.latitude - current.latitude
      const intersectionLongitude = ((previous.longitude - current.longitude) * (point.latitude - current.latitude)) / latitudeDelta + current.longitude

      const isIntersected
        = ((current.latitude > point.latitude) !== (previous.latitude > point.latitude))
          && point.longitude < intersectionLongitude

      if (isIntersected) {
        isInside = !isInside
      }
    }

    return isInside
  }

  function isInYunnan(point: CoordinatePoint) {
    return isPointInPolygon(point, YUNNAN_BOUNDARY)
  }

  function calculateDistanceMeters(start: CoordinatePoint, end: CoordinatePoint) {
    const toRadians = (value: number) => (value * Math.PI) / 180
    const earthRadius = 6371000
    const latitudeDelta = toRadians(end.latitude - start.latitude)
    const longitudeDelta = toRadians(end.longitude - start.longitude)
    const startLatitude = toRadians(start.latitude)
    const endLatitude = toRadians(end.latitude)

    const haversine
      = Math.sin(latitudeDelta / 2) ** 2
        + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2

    return 2 * earthRadius * Math.asin(Math.sqrt(haversine))
  }

  function updatePendingNearbyRefresh(center: CoordinatePoint) {
    if (!lastFetchedCenter) {
      hasPendingNearbyRefresh.value = false
      return
    }

    hasPendingNearbyRefresh.value = calculateDistanceMeters(lastFetchedCenter, center) >= NEARBY_REFRESH_DISTANCE_METERS
  }

  async function fetchNearbyPlaces(bounds: IMapViewportBounds) {
    isLoadingNearbyPlaces.value = true

    try {
      nearbySpotResults.value = await getMapViewportSpots({
        keyword: options.nearbyKeyword,
        minLatitude: bounds.southwest.latitude,
        maxLatitude: bounds.northeast.latitude,
        minLongitude: bounds.southwest.longitude,
        maxLongitude: bounds.northeast.longitude,
      })
    }
    catch (error) {
      nearbySpotResults.value = []
      console.error('加载附近地点失败', error)
    }
    finally {
      lastFetchedCenter = {
        latitude: (bounds.southwest.latitude + bounds.northeast.latitude) / 2,
        longitude: (bounds.southwest.longitude + bounds.northeast.longitude) / 2,
      }
      hasPendingNearbyRefresh.value = false
      isLoadingNearbyPlaces.value = false
    }
  }

  async function refreshNearbyPlacesInBounds(bounds: IMapViewportBounds) {
    await fetchNearbyPlaces(bounds)
  }

  function applyInitialLocation(point: CoordinatePoint) {
    const nextCenter = isInYunnan(point) ? point : DEFAULT_KUNMING_CENTER
    setMapCenter(nextCenter)
    return nextCenter
  }

  function locateOnPageOpen() {
    return new Promise<CoordinatePoint>((resolve) => {
      uni.getLocation({
        type: 'gcj02',
        success(res) {
          resolve(applyInitialLocation({
            latitude: res.latitude,
            longitude: res.longitude,
          }))
        },
        fail() {
          resolve(applyInitialLocation(DEFAULT_KUNMING_CENTER))
        },
      })
    })
  }

  function handleRegionChange(event: any) {
    const changeType = event?.type ?? event?.detail?.type
    if (changeType && changeType !== 'end') {
      return
    }

    if (ignoreNextRegionChangeEnd) {
      ignoreNextRegionChangeEnd = false
      updateMapScale(event?.detail?.scale ?? event?.scale)
      return
    }

    const detail = event?.detail ?? event
    const centerLocation = detail?.centerLocation
    const latitude = Number(centerLocation?.latitude ?? detail?.latitude)
    const longitude = Number(centerLocation?.longitude ?? detail?.longitude)

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      const nextCenter = { latitude, longitude }
      setMapCenter(nextCenter)
      updatePendingNearbyRefresh(nextCenter)
    }

    updateMapScale(detail?.scale)
  }

  function relocate() {
    return new Promise<CoordinatePoint | null>((resolve) => {
      uni.getLocation({
        type: 'gcj02',
        success(res) {
          const currentLocation = {
            latitude: res.latitude,
            longitude: res.longitude,
          }

          setMapCenter(currentLocation)
          resolve(currentLocation)
        },
        fail() {
          uni.showToast({ title: '定位失败', icon: 'none' })
          resolve(null)
        },
      })
    })
  }

  return {
    mapCenter,
    mapScale,
    nearbySpotResults,
    isLoadingNearbyPlaces,
    hasPendingNearbyRefresh,
    focusMapCenter,
    setMapCenter,
    locateOnPageOpen,
    handleRegionChange,
    refreshNearbyPlacesInBounds,
    relocate,
  }
}
