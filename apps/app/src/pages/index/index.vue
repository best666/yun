<script lang="ts" setup>
import type { IMapSearchPlaceItem, MapApiProvider } from '@/api/types/map'
import type { ISearchUserItem } from '@/api/types/search'
import type { FoodSpot } from '@/store/spot'
import { searchUsers } from '@/api/login'
import { searchMapPlaces } from '@/api/map'
import { useFavoriteStore, useSpotStore } from '@/store'

interface CoordinatePoint {
  latitude: number
  longitude: number
}

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

const spotStore = useSpotStore()
const favoriteStore = useFavoriteStore()

const currentMapProvider = getCurrentMapProvider()
const currentMapProviderLabel = currentMapProvider === 'amap' ? '高德地图' : '腾讯地图'

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

/** 地图中心 */
const mapCenter = reactive({
  latitude: DEFAULT_KUNMING_CENTER.latitude,
  longitude: DEFAULT_KUNMING_CENTER.longitude,
})

const SEARCH_PLACE_MARKER_BASE_ID = 900000

/** 当前选中地点 */
const selectedSpot = ref<FoodSpot | null>(null)
const selectedMapPlace = ref<IMapSearchPlaceItem | null>(null)
/** 底部卡片是否显示 */
const showBottomCard = ref(false)

/** 搜索相关 */
const searchKeyword = ref('')
const showSearchPanel = ref(false)
const searchSpotResults = ref<IMapSearchPlaceItem[]>([])
const searchUserResults = ref<ISearchUserItem[]>([])
const isSearchingPlaces = ref(false)
const isSearchingUsers = ref(false)

const SEARCH_DEBOUNCE_MS = 300

let searchRequestId = 0
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

function mapSpotToSearchPlace(spot: FoodSpot): IMapSearchPlaceItem {
  return {
    id: `local-${spot.id}`,
    title: spot.name,
    address: spot.address,
    category: spot.tags.join(' / '),
    district: '',
    latitude: spot.latitude,
    longitude: spot.longitude,
  }
}

function getSearchPlaceMarkerId(index: number) {
  return SEARCH_PLACE_MARKER_BASE_ID + index
}

function findSearchPlaceByMarkerId(markerId: number) {
  const markerIndex = markerId - SEARCH_PLACE_MARKER_BASE_ID
  if (markerIndex < 0 || markerIndex >= searchSpotResults.value.length) {
    return null
  }

  return searchSpotResults.value[markerIndex] || null
}

function setMapCenter(point: CoordinatePoint) {
  mapCenter.latitude = point.latitude
  mapCenter.longitude = point.longitude
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

    if (isIntersected)
      isInside = !isInside
  }

  return isInside
}

function isInYunnan(point: CoordinatePoint) {
  return isPointInPolygon(point, YUNNAN_BOUNDARY)
}

function locateOnPageOpen() {
  uni.getLocation({
    type: 'gcj02',
    success(res) {
      const currentLocation = {
        latitude: res.latitude,
        longitude: res.longitude,
      }

      if (isInYunnan(currentLocation)) {
        setMapCenter(currentLocation)
        return
      }

      setMapCenter(DEFAULT_KUNMING_CENTER)
    },
    fail() {
      setMapCenter(DEFAULT_KUNMING_CENTER)
    },
  })
}

onLoad(() => {
  locateOnPageOpen()
})

onUnload(() => {
  clearPendingSearch()
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

async function performSearch(keyword: string) {
  const trimmedKeyword = keyword.trim()

  if (!trimmedKeyword) {
    searchSpotResults.value = []
    searchUserResults.value = []
    isSearchingPlaces.value = false
    isSearchingUsers.value = false
    searchRequestId += 1
    return
  }

  const currentRequestId = ++searchRequestId
  isSearchingPlaces.value = true
  isSearchingUsers.value = true

  try {
    const [placeResult, userResult] = await Promise.allSettled([
      searchMapPlaces({
        keyword: trimmedKeyword,
        latitude: mapCenter.latitude,
        longitude: mapCenter.longitude,
        pageSize: 10,
        provider: currentMapProvider,
      }),
      searchUsers(trimmedKeyword),
    ])

    if (currentRequestId !== searchRequestId)
      return

    if (placeResult.status === 'fulfilled') {
      searchSpotResults.value = placeResult.value
    }
    else {
      searchSpotResults.value = spotStore.searchSpots(trimmedKeyword).map(mapSpotToSearchPlace)
      uni.showToast({
        title: `${currentMapProviderLabel}搜索暂不可用，已切换本地地点结果`,
        icon: 'none',
      })
      console.error(`${currentMapProviderLabel}地点搜索失败`, placeResult.reason)
    }

    if (userResult.status === 'fulfilled') {
      searchUserResults.value = userResult.value
    }
    else {
      searchUserResults.value = []
      console.error('搜索用户失败', userResult.reason)
    }
  }
  catch (error) {
    if (currentRequestId !== searchRequestId)
      return

    searchSpotResults.value = []
    searchUserResults.value = []
    console.error('搜索失败', error)
  }
  finally {
    if (currentRequestId === searchRequestId) {
      isSearchingPlaces.value = false
      isSearchingUsers.value = false
    }
  }
}

function clearPendingSearch() {
  if (searchDebounceTimer !== null) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
}

function triggerDebouncedSearch(keyword: string) {
  clearPendingSearch()

  if (!keyword.trim()) {
    void performSearch(keyword)
    return
  }

  searchDebounceTimer = setTimeout(() => {
    searchDebounceTimer = null
    void performSearch(keyword)
  }, SEARCH_DEBOUNCE_MS)
}

function formatDistance(distance?: number) {
  if (typeof distance !== 'number' || Number.isNaN(distance)) {
    return ''
  }

  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(1)}km`
  }

  return `${Math.round(distance)}m`
}

function onSearchInput(e: any) {
  searchKeyword.value = e.detail?.value ?? e.target?.value ?? ''
  triggerDebouncedSearch(searchKeyword.value)
}

function onSearchConfirm() {
  clearPendingSearch()
  void performSearch(searchKeyword.value)
}

function onSpotSearchResultTap(place: IMapSearchPlaceItem) {
  showSearchPanel.value = false
  searchKeyword.value = ''
  searchUserResults.value = []
  selectedSpot.value = null
  selectedMapPlace.value = place
  setMapCenter(place)
  showBottomCard.value = true
}

function onUserSearchResultTap(user: ISearchUserItem) {
  uni.showModal({
    title: user.nickname,
    content: `账号：${user.username}\n手机号：${user.phoneMasked || '未绑定'}`,
    showCancel: false,
  })
}

function closeSearch() {
  clearPendingSearch()
  showSearchPanel.value = false
  searchKeyword.value = ''
  searchSpotResults.value = []
  searchUserResults.value = []
  isSearchingPlaces.value = false
  isSearchingUsers.value = false
  selectedMapPlace.value = null
  searchRequestId += 1
}

/** 显示的地点列表 */
const displaySpots = computed(() => spotStore.allSpots)

/** 地图标记点 - 使用自定义 callout 展示更多信息 */
const markers = computed(() => {
  const localMarkers = displaySpots.value.map((spot) => {
    const isFav = favoriteStore.isFavorited(spot.id)
    return {
      id: spot.id,
      latitude: spot.latitude,
      longitude: spot.longitude,
      title: spot.name,
      iconPath: '/static/marker.png',
      width: 32,
      height: 32,
      callout: {
        content: `${spot.name}\n★${spot.rating} | ¥${spot.avgPrice}/人${isFav ? ' ❤' : ''}`,
        color: '#333333',
        fontSize: 12,
        textAlign: 'center' as const,
        borderRadius: 10,
        padding: 8,
        display: 'BYCLICK' as const,
        bgColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#ff6633',
      },
    }
  })

  const searchPlaceMarkers = searchSpotResults.value.map((place, index) => {
    const isSelected = selectedMapPlace.value?.id === place.id
    return {
      id: getSearchPlaceMarkerId(index),
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

  return [...localMarkers, ...searchPlaceMarkers]
})

/** 点击地图标记 */
function onMarkerTap(e: any) {
  const markerId = e.detail?.markerId ?? e.markerId

  const searchPlace = findSearchPlaceByMarkerId(markerId)
  if (searchPlace) {
    selectedSpot.value = null
    selectedMapPlace.value = searchPlace
    setMapCenter(searchPlace)
    showBottomCard.value = true
    return
  }

  const spot = displaySpots.value.find(s => s.id === markerId)
  if (!spot)
    return

  if (selectedSpot.value?.id === spot.id && showBottomCard.value) {
    // 再次点击同一个标记 -> 跳转详情页
    goDetail(spot)
    return
  }

  selectedMapPlace.value = null
  selectedSpot.value = spot
  showBottomCard.value = true
  // 移动地图中心到选中地点
  setMapCenter(spot)
}

/** 点击 callout 也跳转详情 */
function onCalloutTap(e: any) {
  const markerId = e.detail?.markerId ?? e.markerId

  const searchPlace = findSearchPlaceByMarkerId(markerId)
  if (searchPlace) {
    selectedSpot.value = null
    selectedMapPlace.value = searchPlace
    setMapCenter(searchPlace)
    showBottomCard.value = true
    return
  }

  const spot = displaySpots.value.find(s => s.id === markerId)
  if (spot)
    goDetail(spot)
}

/** 点击地图空白处关闭卡片 */
function onMapTap() {
  if (showBottomCard.value) {
    showBottomCard.value = false
    selectedSpot.value = null
    selectedMapPlace.value = null
  }
}

/** 跳转详情页 */
function goDetail(spot: FoodSpot) {
  uni.navigateTo({
    url: `/pages/spot/detail?id=${spot.id}`,
  })
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

/** 卡片内收藏切换 */
function onCardFavorite(spotId: number) {
  const result = favoriteStore.toggleFavorite(spotId)
  uni.showToast({
    title: result ? '已收藏' : '已取消收藏',
    icon: 'none',
  })
}

/** 重定位到当前位置 */
function relocate() {
  uni.getLocation({
    type: 'gcj02',
    success(res) {
      setMapCenter({
        latitude: res.latitude,
        longitude: res.longitude,
      })
    },
    fail() {
      uni.showToast({ title: '定位失败', icon: 'none' })
    },
  })
}
</script>

<template>
  <view class="page-map">
    <!-- 全屏地图 -->
    <map
      class="map-full" :latitude="mapCenter.latitude" :longitude="mapCenter.longitude" :markers="markers" :scale="14"
      :show-location="true" :enable-3D="false" :enable-overlooking="false" @markertap="onMarkerTap"
      @callouttap="onCalloutTap" @tap="onMapTap"
    />

    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input" @click="showSearchPanel = true">
        <view class="i-carbon-search text-16px text-gray-400" />
        <text class="ml-2 text-14px text-gray-400">搜索美食地点</text>
      </view>
    </view>

    <!-- 搜索面板 -->
    <view v-if="showSearchPanel" class="search-panel">
      <view class="search-panel-header">
        <view class="search-panel-input-wrap">
          <view class="i-carbon-search text-16px text-gray-400" />
          <input
            class="search-panel-input" :value="searchKeyword" placeholder="搜索地点、地址、用户昵称或手机号" focus confirm-type="search"
            @input="onSearchInput" @confirm="onSearchConfirm"
          >
        </view>
        <text class="text-14px text-orange-500" @click="closeSearch">取消</text>
      </view>
      <!-- 搜索结果 -->
      <scroll-view scroll-y class="search-results">
        <view v-if="searchKeyword" class="search-section">
          <view class="search-section-title">
            地点
            <text class="search-section-count">{{ searchSpotResults.length }}</text>
          </view>
          <view v-if="isSearchingPlaces" class="search-empty-tip">
            正在搜索地点...
          </view>
          <view v-for="item in searchSpotResults" v-else :key="`spot-${item.id}`" class="search-result-item" @click="onSpotSearchResultTap(item)">
            <view class="search-place-avatar">
              <view class="i-carbon-location-filled text-18px text-orange-500" />
            </view>
            <view class="ml-3 min-w-0 flex-1">
              <view class="truncate text-14px text-gray-800 font-medium">
                {{ item.title }}
              </view>
              <view class="mt-1 flex items-center gap-2 text-12px text-gray-400">
                <text>{{ item.category || '地图地点' }}</text>
                <text v-if="item.distance">{{ formatDistance(item.distance) }}</text>
              </view>
              <view class="mt-0.5 truncate text-12px text-gray-400">
                {{ item.district }}{{ item.address }}
              </view>
            </view>
          </view>
          <view v-if="!isSearchingPlaces && searchSpotResults.length === 0" class="search-empty-tip">
            未找到相关地点
          </view>
        </view>

        <view v-if="searchKeyword" class="search-section">
          <view class="search-section-title">
            用户
            <text class="search-section-count">{{ searchUserResults.length }}</text>
          </view>
          <view v-if="isSearchingUsers" class="search-empty-tip">
            正在搜索用户...
          </view>
          <view v-for="user in searchUserResults" v-else :key="`user-${user.userId}`" class="search-result-item" @click="onUserSearchResultTap(user)">
            <image :src="user.avatar || '/static/images/default-avatar.png'" class="h-50px w-50px flex-shrink-0 rounded-full" mode="aspectFill" />
            <view class="ml-3 min-w-0 flex-1">
              <view class="flex items-center gap-2">
                <view class="truncate text-14px text-gray-800 font-medium">
                  {{ user.nickname }}
                </view>
                <view class="search-user-badge">
                  用户
                </view>
              </view>
              <view class="mt-1 truncate text-12px text-gray-500">
                账号：{{ user.username }}
              </view>
              <view class="mt-0.5 truncate text-12px text-gray-400">
                手机号：{{ user.phoneMasked || '未绑定手机号' }}
              </view>
            </view>
          </view>
          <view v-if="!isSearchingUsers && searchUserResults.length === 0" class="search-empty-tip">
            未找到相关用户
          </view>
        </view>

        <view
          v-if="searchKeyword && !isSearchingPlaces && !isSearchingUsers && searchSpotResults.length === 0 && searchUserResults.length === 0"
          class="py-10 text-center text-13px text-gray-400"
        >
          未找到相关地点或用户
        </view>
        <view v-if="!searchKeyword" class="py-10 text-center text-13px text-gray-300">
          输入关键词搜索地图上的地点或用户
        </view>
      </scroll-view>
    </view>

    <!-- 重定位按钮 -->
    <view class="relocate-btn" @click="relocate">
      <view class="i-carbon-location-current text-20px text-gray-600" />
    </view>

    <!-- 底部弹出卡片 -->
    <view class="bottom-card" :class="{ 'bottom-card--show': showBottomCard }">
      <view v-if="selectedSpot" class="card-content">
        <!-- 拖动条 -->
        <view class="drag-bar" />

        <view class="flex gap-3" @click="goDetail(selectedSpot)">
          <!-- 封面 -->
          <image :src="selectedSpot.cover" class="h-80px w-80px flex-shrink-0 rounded-12px" mode="aspectFill" />
          <!-- 信息 -->
          <view class="min-w-0 flex-1">
            <view class="truncate text-16px text-gray-900 font-bold">
              {{ selectedSpot.name }}
            </view>
            <view class="mt-1 flex items-center gap-1">
              <view class="i-carbon-star-filled text-14px text-yellow-500" />
              <text class="text-14px text-yellow-600">{{ selectedSpot.rating }}</text>
              <text class="ml-2 text-12px text-gray-400">人均 ¥{{ selectedSpot.avgPrice }}</text>
            </view>
            <view class="mt-1 truncate text-12px text-gray-500">
              <view class="i-carbon-location mr-1 inline-block align-middle text-12px" />
              {{ selectedSpot.address }}
            </view>
            <view class="mt-2 flex gap-1">
              <view
                v-for="tag in selectedSpot.tags" :key="tag"
                class="rounded-full bg-orange-50 px-2 py-0.5 text-11px text-orange-500"
              >
                {{ tag }}
              </view>
            </view>
          </view>
        </view>

        <!-- 卡片底部操作栏 -->
        <view class="card-actions">
          <view class="card-action-btn" @click.stop="onCardFavorite(selectedSpot.id)">
            <view
              :class="favoriteStore.isFavorited(selectedSpot.id) ? 'i-carbon-favorite-filled text-red-500' : 'i-carbon-favorite text-gray-400'"
              class="text-18px"
            />
            <text
              class="text-11px"
              :class="favoriteStore.isFavorited(selectedSpot.id) ? 'text-red-500' : 'text-gray-400'"
            >
              {{ favoriteStore.isFavorited(selectedSpot.id) ? '已收藏' : '收藏' }}
            </text>
          </view>
          <view class="card-action-btn" @click="goDetail(selectedSpot)">
            <view class="i-carbon-view text-18px text-orange-500" />
            <text class="text-11px text-orange-500">查看详情</text>
          </view>
          <view class="card-action-btn" @click.stop="goDetail(selectedSpot)">
            <view class="i-carbon-navigation text-18px text-blue-500" />
            <text class="text-11px text-blue-500">导航</text>
          </view>
        </view>
      </view>

      <view v-else-if="selectedMapPlace" class="card-content">
        <view class="drag-bar" />

        <view class="flex gap-3">
          <view class="search-place-card-avatar">
            <view class="i-carbon-location-filled text-24px text-blue-500" />
          </view>
          <view class="min-w-0 flex-1">
            <view class="truncate text-16px text-gray-900 font-bold">
              {{ selectedMapPlace.title }}
            </view>
            <view class="mt-1 flex items-center gap-2 text-12px text-gray-500">
              <text>{{ selectedMapPlace.category || '地图地点' }}</text>
              <text v-if="selectedMapPlace.distance">距离 {{ formatDistance(selectedMapPlace.distance) }}</text>
            </view>
            <view class="mt-1 text-12px text-gray-500">
              {{ selectedMapPlace.district }}{{ selectedMapPlace.address }}
            </view>
          </view>
        </view>

        <view class="card-actions">
          <view class="card-action-btn" @click.stop="openMapPlaceLocation">
            <view class="i-carbon-navigation text-18px text-blue-500" />
            <text class="text-11px text-blue-500">打开位置</text>
          </view>
          <view class="card-action-btn" @click.stop="closeSearch">
            <view class="i-carbon-close text-18px text-gray-500" />
            <text class="text-11px text-gray-500">关闭搜索</text>
          </view>
        </view>
      </view>
    </view>
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

/* 搜索面板 */
.search-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  z-index: 500;
}

.search-panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: calc(env(safe-area-inset-top) + 10px) 16px 10px;
  border-bottom: 1px solid #f0f0f0;
}

.search-panel-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 8px 14px;
  background: #f5f5f5;
  border-radius: 20px;
}

.search-panel-input {
  flex: 1;
  margin-left: 8px;
  font-size: 14px;
  color: #333;
}

.search-results {
  height: calc(100vh - 120px);
}

.search-section {
  padding: 8px 0 4px;
}

.search-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #8a5a3b;
}

.search-section-count {
  font-size: 12px;
  color: #b0b0b0;
}

.search-result-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f8f8f8;

  &:active {
    background: #f8f8f8;
  }
}

.search-place-avatar,
.search-place-card-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, #fff1e8 0%, #ffe4d4 100%);
}

.search-place-avatar {
  width: 50px;
  height: 50px;
}

.search-place-card-avatar {
  width: 80px;
  height: 80px;
}

.search-empty-tip {
  padding: 8px 16px 14px;
  font-size: 12px;
  color: #b0b0b0;
}

.search-user-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: #fff1e8;
  font-size: 11px;
  color: #ff7b4a;
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

.bottom-card {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 200;
  transform: translateY(100%);
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);

  &--show {
    transform: translateY(0);
  }
}

.card-content {
  margin: 0 12px;
  margin-bottom: calc(60px + env(safe-area-inset-bottom));
  padding: 16px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 -2px 20px rgba(0, 0, 0, 0.1);
}

.drag-bar {
  width: 36px;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  margin: 0 auto 12px;
}

.card-actions {
  display: flex;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  justify-content: space-around;
}

.card-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px 16px;

  &:active {
    opacity: 0.6;
  }
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  white-space: nowrap;
}
</style>
