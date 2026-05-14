<script lang="ts" setup>
import type { IMapSearchPlaceItem, IMapViewportBounds, MapApiProvider } from '@/api/types/map'
import type { ISearchUserItem } from '@/api/types/search'
import HomeMapSpotCard from '@/components/home/HomeMapSpotCard.vue'
import HomeSearchPanel from '@/components/home/HomeSearchPanel.vue'
import { useHomeMapSearch } from '@/hooks/useHomeMapSearch'
import { useHomeMapSelection } from '@/hooks/useHomeMapSelection'
import { useHomeMapViewport } from '@/hooks/useHomeMapViewport'
import { useFavoriteStore } from '@/store'

defineOptions({
  name: 'Home',
})
definePage({
  type: 'home',
  style: {
    'navigationStyle': 'custom',
    'navigationBarTitleText': '首页',
    'mp-alipay': {
      defaultTitle: '首页',
      transparentTitle: 'always',
      titlePenetrate: 'YES',
      titleBarColor: '#ffffff',
    },
  },
})

const favoriteStore = useFavoriteStore()

const currentMapProvider = getCurrentMapProvider()
const currentMapProviderLabel = currentMapProvider === 'amap' ? '高德地图' : '腾讯地图'
const DEFAULT_NEARBY_KEYWORD = '美食'
const SEARCH_PLACE_MARKER_BASE_ID = 900000
const CARD_INTERACTION_GUARD_MS = 400

const {
  mapCenter,
  mapScale,
  nearbySpotResults,
  isLoadingNearbyPlaces,
  hasPendingNearbyRefresh,
  focusMapCenter,
  locateOnPageOpen,
  handleRegionChange,
  refreshNearbyPlacesInBounds,
  relocate,
} = useHomeMapViewport({
  nearbyKeyword: DEFAULT_NEARBY_KEYWORD,
})

const {
  searchKeyword,
  showSearchPanel,
  searchSpotResults,
  searchUserResults,
  isSearchingPlaces,
  isSearchingUsers,
  setSearchKeyword,
  confirmSearch,
  openSearch,
  closeSearch,
} = useHomeMapSearch({
  currentMapProvider,
  currentMapProviderLabel,
  mapCenter,
})

const {
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
} = useHomeMapSelection(currentMapProvider)

const displayedMapPlaces = computed(() => {
  return searchKeyword.value.trim() ? searchSpotResults.value : nearbySpotResults.value
})
const shouldShowNearbyRefresh = computed(() => {
  return hasPendingNearbyRefresh.value && !showSearchPanel.value && !searchKeyword.value.trim()
})

const markers = computed(() => {
  return displayedMapPlaces.value.map((place, index) => {
    const isSelected = selectedMapPlace.value?.id === place.id

    return {
      id: SEARCH_PLACE_MARKER_BASE_ID + index,
      latitude: place.latitude,
      longitude: place.longitude,
      title: place.title,
      iconPath: '/static/marker.png',
      width: isSelected ? 36 : 32,
      height: isSelected ? 36 : 32,
      callout: {
        content: `${place.title}\n${place.address || place.category || '地图地点'}`,
        color: '#333333',
        fontSize: 12,
        textAlign: 'center' as const,
        borderRadius: 10,
        padding: 8,
        display: 'BYCLICK' as const,
        bgColor: '#ffffff',
        borderWidth: 1,
        borderColor: isSelected ? '#2f7cf6' : '#ff9b73',
      },
    }
  })
})

const mapCardInteractionUntil = ref(0)
const mapContext = shallowRef<UniApp.MapContext | null>(null)

onLoad(() => {
  void favoriteStore.ensureServerFavoritesLoaded()
})

onReady(() => {
  mapContext.value = uni.createMapContext('home-map')
  void initializeHomeMap()
})

onShow(() => {
  void favoriteStore.ensureServerFavoritesLoaded()
})

function getCurrentMapProvider(): MapApiProvider {
  // #ifdef H5
  return 'amap'
  // #endif

  // #ifdef MP-WEIXIN
  return 'tencent'
  // #endif

  return 'tencent'
}

function findSearchPlaceByMarkerId(markerId: number) {
  const markerIndex = markerId - SEARCH_PLACE_MARKER_BASE_ID
  if (markerIndex < 0 || markerIndex >= displayedMapPlaces.value.length) {
    return null
  }

  return displayedMapPlaces.value[markerIndex] || null
}

function selectPlaceAndCenter(place: IMapSearchPlaceItem) {
  selectMapPlace(place)
  focusMapCenter(place)
}

async function initializeHomeMap() {
  await locateOnPageOpen()
  await nextTick()
  await refreshNearbyAroundCenter(false)
}

function estimateBoundsFromCenter(): IMapViewportBounds {
  const latitudeSpan = 0.045 * 2 ** (14 - mapScale.value)
  const longitudeSpan = latitudeSpan / Math.max(Math.cos((mapCenter.latitude * Math.PI) / 180), 0.3)

  return {
    southwest: {
      latitude: mapCenter.latitude - latitudeSpan / 2,
      longitude: mapCenter.longitude - longitudeSpan / 2,
    },
    northeast: {
      latitude: mapCenter.latitude + latitudeSpan / 2,
      longitude: mapCenter.longitude + longitudeSpan / 2,
    },
  }
}

function getCurrentMapBounds() {
  return new Promise<IMapViewportBounds | null>((resolve) => {
    if (!mapContext.value) {
      resolve(null)
      return
    }

    mapContext.value.getRegion({
      success(region) {
        const southwest = region.southwest
        const northeast = region.northeast

        if (!southwest || !northeast) {
          resolve(null)
          return
        }

        resolve({
          southwest: {
            latitude: Number(southwest.latitude),
            longitude: Number(southwest.longitude),
          },
          northeast: {
            latitude: Number(northeast.latitude),
            longitude: Number(northeast.longitude),
          },
        })
      },
      fail() {
        resolve(null)
      },
    })
  })
}

function handleOpenSearch() {
  if (showBottomCard.value) {
    clearSelection()
  }

  openSearch()
}

function handleSpotSelected(place: IMapSearchPlaceItem) {
  closeSearch()
  selectPlaceAndCenter(place)
  void refreshNearbyAroundCenter(false)
}

function onUserSearchResultTap(user: ISearchUserItem) {
  uni.showModal({
    title: user.nickname,
    content: `账号：${user.username}\n手机号：${user.phoneMasked || '未绑定'}`,
    showCancel: false,
  })
}

function onMarkerTap(event: any) {
  const markerId = event.detail?.markerId ?? event.markerId
  const searchPlace = findSearchPlaceByMarkerId(markerId)

  if (searchPlace) {
    selectPlaceAndCenter(searchPlace)
  }
}

function onCalloutTap(event: any) {
  const markerId = event.detail?.markerId ?? event.markerId
  const searchPlace = findSearchPlaceByMarkerId(markerId)

  if (searchPlace) {
    selectPlaceAndCenter(searchPlace)
  }
}

function onMapTap() {
  if (showBottomCard.value) {
    return
  }

  if (Date.now() < mapCardInteractionUntil.value) {
    return
  }
}

function guardMapTapFromCardInteraction() {
  mapCardInteractionUntil.value = Date.now() + CARD_INTERACTION_GUARD_MS
}

function handleCardOpenDetail() {
  guardMapTapFromCardInteraction()
  openSelectedMapPlaceDetail()
}

function handleCardToggleFavorite() {
  guardMapTapFromCardInteraction()
  void toggleSelectedMapPlaceFavorite()
}

function handleCardOpenLocation() {
  guardMapTapFromCardInteraction()
  openMapPlaceLocation()
}

function onMapRegionChange(event: any) {
  handleRegionChange(event)

  if (hasPendingNearbyRefresh.value && showBottomCard.value) {
    clearSelection()
  }
}

async function refreshNearbyAroundCenter(clearCard = true) {
  if (clearCard && showBottomCard.value) {
    clearSelection()
  }

  const bounds = await getCurrentMapBounds() || estimateBoundsFromCenter()
  await refreshNearbyPlacesInBounds(bounds)
}

async function handleRelocate() {
  const nextLocation = await relocate()
  if (!nextLocation) {
    return
  }

  await nextTick()
  await refreshNearbyAroundCenter(false)
}
</script>

<template>
  <view class="relative h-screen w-screen">
    <map
      id="home-map"
      class="h-full w-full"
      :latitude="mapCenter.latitude"
      :longitude="mapCenter.longitude"
      :markers="markers"
      :scale="mapScale"
      :show-location="true"
      :enable-zoom="true"
      :enable-scroll="true"
      :enable-3D="false"
      :enable-overlooking="false"
      @markertap="onMarkerTap"
      @callouttap="onCalloutTap"
      @tap="onMapTap"
      @regionchange="onMapRegionChange"
    />

    <view v-if="showBottomCard" class="fixed inset-0 z-90" @tap="clearSelection" @click="clearSelection" />

    <view class="fixed left-0 right-0 top-0 z-100 px-16px pb-10px pt-[calc(env(safe-area-inset-top)+10px)]">
      <view class="flex items-center rounded-24px bg-[rgba(255,255,255,0.95)] px-16px py-10px shadow-[0_2px_12px_rgba(0,0,0,0.08)]" @click="handleOpenSearch">
        <view class="i-carbon-search text-16px text-gray-400" />
        <text class="ml-2 text-14px text-gray-400">搜索美食地点</text>
      </view>
    </view>

    <HomeSearchPanel
      :visible="showSearchPanel"
      :keyword="searchKeyword"
      :search-spot-results="searchSpotResults"
      :search-user-results="searchUserResults"
      :is-searching-places="isSearchingPlaces"
      :is-searching-users="isSearchingUsers"
      @close="closeSearch"
      @keyword-change="setSearchKeyword"
      @confirm="confirmSearch"
      @select-spot="handleSpotSelected"
      @select-user="onUserSearchResultTap"
    />

    <view class="fixed bottom-[calc(160px+env(safe-area-inset-bottom))] right-16px z-100 h-44px w-44px center rounded-full bg-white shadow-[0_2px_12px_rgba(0,0,0,0.1)] active:scale-90" @click="handleRelocate">
      <view class="i-carbon-location-current text-20px text-gray-600" />
    </view>

    <view v-if="shouldShowNearbyRefresh" class="fixed bottom-[calc(220px+env(safe-area-inset-bottom))] left-1/2 z-110 rounded-full bg-[rgba(255,255,255,0.96)] px-16px py-10px text-13px text-#ea580c font-600 shadow-[0_10px_24px_rgba(15,23,42,0.12)] -translate-x-1/2" @click="refreshNearbyAroundCenter">
      搜索此区域
    </view>

    <view v-if="isLoadingNearbyPlaces && !showSearchPanel" class="fixed bottom-[calc(222px+env(safe-area-inset-bottom))] left-1/2 z-110 rounded-full bg-[rgba(17,24,39,0.74)] px-14px py-8px text-12px text-white -translate-x-1/2">
      正在加载附近地点...
    </view>

    <HomeMapSpotCard
      :visible="showBottomCard"
      :place="selectedMapPlace"
      :subtitle="selectedMapPlaceSubtitle"
      :distance-text="selectedMapPlaceDistanceText"
      :address-text="selectedMapPlaceAddress"
      :meta-list="selectedMapPlaceMeta"
      :summary-text="selectedMapPlaceSummary"
      :description-text="selectedMapPlaceDescription"
      :is-loading-detail="isLoadingSelectedSpotDetail"
      :is-favorited="favoriteStore.isFavorited(selectedMapPlaceFavoriteId)"
      @card-interact="guardMapTapFromCardInteraction"
      @open-detail="handleCardOpenDetail"
      @toggle-favorite="handleCardToggleFavorite"
      @open-location="handleCardOpenLocation"
      @close="clearSelection"
    />
  </view>
</template>
