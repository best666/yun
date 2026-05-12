<script lang="ts" setup>
import type { IMapSearchPlaceItem, MapApiProvider } from '@/api/types/map'
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

const {
  mapCenter,
  mapScale,
  nearbySpotResults,
  isLoadingNearbyPlaces,
  hasPendingNearbyRefresh,
  focusMapCenter,
  setMapCenter,
  locateOnPageOpen,
  handleRegionChange,
  refreshNearbyPlacesAtCenter,
  relocate,
} = useHomeMapViewport({
  currentMapProvider,
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

onLoad(() => {
  locateOnPageOpen()
  void favoriteStore.ensureServerFavoritesLoaded()
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

function handleOpenSearch() {
  if (showBottomCard.value) {
    clearSelection()
  }

  openSearch()
}

function handleSpotSelected(place: IMapSearchPlaceItem) {
  closeSearch()
  selectPlaceAndCenter(place)
  void refreshNearbyPlacesAtCenter(place)
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
    clearSelection()
  }
}

function onMapRegionChange(event: any) {
  handleRegionChange(event)

  if (hasPendingNearbyRefresh.value && showBottomCard.value) {
    clearSelection()
  }
}

function refreshNearbyAroundCenter() {
  if (showBottomCard.value) {
    clearSelection()
  }

  void refreshNearbyPlacesAtCenter()
}
</script>

<template>
  <view class="page-map">
    <map
      class="map-full"
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

    <view class="search-bar">
      <view class="search-input" @click="handleOpenSearch">
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

    <view class="relocate-btn" @click="relocate">
      <view class="i-carbon-location-current text-20px text-gray-600" />
    </view>

    <view v-if="shouldShowNearbyRefresh" class="nearby-refresh-btn" @click="refreshNearbyAroundCenter">
      搜索此区域
    </view>

    <view v-if="isLoadingNearbyPlaces && !showSearchPanel" class="nearby-loading-tip">
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
      @open-detail="openSelectedMapPlaceDetail"
      @toggle-favorite="toggleSelectedMapPlaceFavorite"
      @open-location="openMapPlaceLocation"
      @close="clearSelection"
    />
  </view>
</template>

<style lang="scss" scoped>
.page-map {
  position: relative;
  width: 100vw;
  height: 100vh;
}

.map-full {
  width: 100%;
  height: 100%;
}

.search-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: calc(env(safe-area-inset-top) + 10px) 16px 10px;
  z-index: 100;
}

.search-input {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.relocate-btn {
  position: fixed;
  right: 16px;
  bottom: calc(160px + env(safe-area-inset-bottom));
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  transition: transform 0.2s;

  &:active {
    transform: scale(0.9);
  }
}

.nearby-refresh-btn {
  position: fixed;
  left: 50%;
  bottom: calc(220px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  padding: 10px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  color: #ea580c;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
  z-index: 110;
}

.nearby-loading-tip {
  position: fixed;
  left: 50%;
  bottom: calc(222px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.74);
  color: #fff;
  font-size: 12px;
  z-index: 110;
}
</style>
