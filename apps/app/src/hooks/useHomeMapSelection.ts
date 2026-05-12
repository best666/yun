import type { IMapSearchPlaceItem, MapApiProvider } from '@/api/types/map'
import type { ISpotDetail, ISpotDetailQuery } from '@/api/types/spot'
import { useFavoriteStore } from '@/store'
import { formatDistance } from '@/utils/formatDistance'
import { buildSpotDetailUrlFromMapPlace } from '@/utils/spotDetail'
import { fetchAndCacheSpotDetail, getCachedSpotDetail } from '@/utils/spotDetailCache'

export function useHomeMapSelection(currentMapProvider: MapApiProvider) {
  const favoriteStore = useFavoriteStore()

  const selectedMapPlace = ref<IMapSearchPlaceItem | null>(null)
  const selectedSpotDetail = ref<ISpotDetail | null>(null)
  const isLoadingSelectedSpotDetail = ref(false)
  const showBottomCard = ref(false)

  let selectedSpotDetailRequestId = 0

  function createSpotDetailQueryFromMapPlace(place: IMapSearchPlaceItem): ISpotDetailQuery {
    return {
      id: place.id,
      title: place.title,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      distance: place.distance,
      category: place.category,
      district: place.district,
      provider: currentMapProvider,
    }
  }

  function applySelectedSpotDetail(place: IMapSearchPlaceItem, detail: ISpotDetail) {
    if (!selectedMapPlace.value || selectedMapPlace.value.id !== place.id) {
      return
    }

    selectedSpotDetail.value = detail
  }

  async function preloadMapPlaceDetail(place: IMapSearchPlaceItem, force = false) {
    const detailQuery = createSpotDetailQueryFromMapPlace(place)
    const cachedDetail = getCachedSpotDetail(detailQuery)

    if (cachedDetail) {
      applySelectedSpotDetail(place, cachedDetail)
      if (!force) {
        return cachedDetail
      }
    }

    const currentRequestId = ++selectedSpotDetailRequestId
    isLoadingSelectedSpotDetail.value = true

    try {
      const detail = await fetchAndCacheSpotDetail(detailQuery, force)
      if (currentRequestId !== selectedSpotDetailRequestId) {
        return detail
      }

      applySelectedSpotDetail(place, detail)
      return detail
    }
    catch (error) {
      if (currentRequestId === selectedSpotDetailRequestId) {
        console.error('预加载地点详情失败', error)
      }
      return null
    }
    finally {
      if (currentRequestId === selectedSpotDetailRequestId) {
        isLoadingSelectedSpotDetail.value = false
      }
    }
  }

  function selectMapPlace(place: IMapSearchPlaceItem) {
    selectedMapPlace.value = place
    selectedSpotDetail.value = getCachedSpotDetail(createSpotDetailQueryFromMapPlace(place))
    showBottomCard.value = true
    void preloadMapPlaceDetail(place)
  }

  function clearSelection() {
    showBottomCard.value = false
    selectedMapPlace.value = null
    selectedSpotDetail.value = null
  }

  const selectedMapPlaceMeta = computed(() => {
    if (!selectedMapPlace.value) {
      return [] as string[]
    }

    return [
      selectedSpotDetail.value?.businessStatus || selectedMapPlace.value.category || '地图地点',
      selectedMapPlace.value.district || '',
      selectedMapPlace.value.distance ? `距离 ${formatDistance(selectedMapPlace.value.distance)}` : '',
    ].filter(Boolean)
  })

  const selectedMapPlaceSummary = computed(() => {
    if (!selectedSpotDetail.value) {
      return ''
    }

    return [
      selectedSpotDetail.value.rating ? `${selectedSpotDetail.value.rating.toFixed(1)} 分` : '',
      selectedSpotDetail.value.avgPrice ? `¥${selectedSpotDetail.value.avgPrice}/人` : '',
      selectedSpotDetail.value.reviewCount ? `${selectedSpotDetail.value.reviewCount} 条评价` : '',
    ].filter(Boolean).join(' · ')
  })

  const selectedMapPlaceDescription = computed(() => {
    if (!selectedSpotDetail.value) {
      return ''
    }

    return selectedSpotDetail.value.routeTip || selectedSpotDetail.value.description || ''
  })

  const selectedMapPlaceFavoriteId = computed(() => {
    return selectedSpotDetail.value?.id || selectedMapPlace.value?.id || ''
  })

  const selectedMapPlaceSubtitle = computed(() => {
    if (!selectedMapPlace.value) {
      return '地图地点'
    }

    return selectedSpotDetail.value?.navigationLabel || selectedMapPlace.value.category || '地图地点'
  })

  const selectedMapPlaceDistanceText = computed(() => {
    return selectedMapPlace.value?.distance ? formatDistance(selectedMapPlace.value.distance) : ''
  })

  const selectedMapPlaceAddress = computed(() => {
    if (!selectedMapPlace.value) {
      return ''
    }

    return `${selectedMapPlace.value.district || ''}${selectedMapPlace.value.address || ''}`
  })

  function openMapPlaceDetail(place: IMapSearchPlaceItem) {
    uni.navigateTo({
      url: `${buildSpotDetailUrlFromMapPlace(place, currentMapProvider)}&source=map`,
    })
  }

  function openSelectedMapPlaceDetail() {
    if (selectedMapPlace.value) {
      openMapPlaceDetail(selectedMapPlace.value)
    }
  }

  function openMapPlaceLocation() {
    if (!selectedMapPlace.value) {
      return
    }

    uni.openLocation({
      latitude: selectedMapPlace.value.latitude,
      longitude: selectedMapPlace.value.longitude,
      name: selectedMapPlace.value.title,
      address: selectedMapPlace.value.address,
    })
  }

  async function toggleSelectedMapPlaceFavorite() {
    if (!selectedMapPlace.value) {
      return
    }

    try {
      const detail = selectedSpotDetail.value || await preloadMapPlaceDetail(selectedMapPlace.value, true)
      if (!detail || !selectedMapPlace.value) {
        uni.showToast({ title: '地点详情加载失败', icon: 'none' })
        return
      }

      const result = await favoriteStore.toggleFavorite({
        id: detail.id,
        name: detail.name,
        cover: detail.cover,
        address: detail.address,
        rating: detail.rating,
        avgPrice: detail.avgPrice,
        latitude: detail.latitude,
        longitude: detail.longitude,
        distance: selectedMapPlace.value.distance,
        category: selectedMapPlace.value.category,
        district: selectedMapPlace.value.district,
        provider: currentMapProvider,
      })

      uni.showToast({
        title: result.favorited ? '已收藏' : '已取消收藏',
        icon: 'none',
      })
    }
    catch (error) {
      console.error('收藏地图地点失败', error)
    }
  }

  return {
    selectedMapPlace,
    isLoadingSelectedSpotDetail,
    showBottomCard,
    selectedMapPlaceMeta,
    selectedMapPlaceSummary,
    selectedMapPlaceDescription,
    selectedMapPlaceFavoriteId,
    selectedMapPlaceSubtitle,
    selectedMapPlaceDistanceText,
    selectedMapPlaceAddress,
    selectMapPlace,
    clearSelection,
    openSelectedMapPlaceDetail,
    openMapPlaceLocation,
    toggleSelectedMapPlaceFavorite,
  }
}
