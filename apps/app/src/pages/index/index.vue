<script lang="ts" setup>
import type { IMapSearchPlaceItem, MapApiProvider } from '@/api/types/map'
import type { ISearchUserItem } from '@/api/types/search'
import { searchUsers } from '@/api/login'
import { searchMapPlaces } from '@/api/map'
import { getSpotDetail } from '@/api/spot'
import { useFavoriteStore } from '@/store'
import { buildSpotDetailUrlFromMapPlace } from '@/utils/spotDetail'

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

const favoriteStore = useFavoriteStore()

const currentMapProvider = getCurrentMapProvider()
const currentMapProviderLabel = currentMapProvider === 'amap' ? '高德地图' : '腾讯地图'
/** 首页默认附近检索关键词，用真实 POI 填充地图点位。 */
const DEFAULT_NEARBY_KEYWORD = '美食'

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

/** 当前选中的地图地点。 */
const selectedMapPlace = ref<IMapSearchPlaceItem | null>(null)
/** 底部卡片是否显示 */
const showBottomCard = ref(false)

/** 搜索相关 */
const searchKeyword = ref('')
const showSearchPanel = ref(false)
/** 主动搜索的地点结果，仅用于搜索态列表和搜索态 marker。 */
const searchSpotResults = ref<IMapSearchPlaceItem[]>([])
/** 首页默认附近地点结果，用于无关键词时的地图打点。 */
const nearbySpotResults = ref<IMapSearchPlaceItem[]>([])
const searchUserResults = ref<ISearchUserItem[]>([])
const isSearchingPlaces = ref(false)
const isSearchingUsers = ref(false)
/** 附近地点加载态，用于控制首页首次进入时的反馈。 */
const isLoadingNearbyPlaces = ref(false)

const SEARCH_DEBOUNCE_MS = 300

/** 卡片上下滑判定阈值，避免轻触误触发展开或收起。 */
const CARD_SWIPE_THRESHOLD = 36

let searchRequestId = 0
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
/** 手势起点 Y 坐标。 */
const cardTouchStartY = ref(0)
/** 手势终点 Y 坐标。 */
const cardTouchEndY = ref(0)

/** 当前地图上实际展示的地点结果：搜索态优先，默认态退回附近地点。 */
const displayedMapPlaces = computed(() => {
  return searchKeyword.value.trim() ? searchSpotResults.value : nearbySpotResults.value
})

function getSearchPlaceMarkerId(index: number) {
  return SEARCH_PLACE_MARKER_BASE_ID + index
}

function findSearchPlaceByMarkerId(markerId: number) {
  const markerIndex = markerId - SEARCH_PLACE_MARKER_BASE_ID
  if (markerIndex < 0 || markerIndex >= displayedMapPlaces.value.length) {
    return null
  }

  return displayedMapPlaces.value[markerIndex] || null
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

/** 页面打开时定位并拉取附近真实地点。 */
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
        void fetchNearbyPlaces(currentLocation)
        return
      }

      setMapCenter(DEFAULT_KUNMING_CENTER)
      void fetchNearbyPlaces(DEFAULT_KUNMING_CENTER)
    },
    fail() {
      setMapCenter(DEFAULT_KUNMING_CENTER)
      void fetchNearbyPlaces(DEFAULT_KUNMING_CENTER)
    },
  })
}

/** 拉取当前中心点附近真实地点，供首页默认打点使用。 */
async function fetchNearbyPlaces(center: CoordinatePoint) {
  isLoadingNearbyPlaces.value = true

  try {
    nearbySpotResults.value = await searchMapPlaces({
      keyword: DEFAULT_NEARBY_KEYWORD,
      latitude: center.latitude,
      longitude: center.longitude,
      pageSize: 12,
      provider: currentMapProvider,
    })
  }
  catch (error) {
    nearbySpotResults.value = []
    console.error('加载附近地点失败', error)
  }
  finally {
    isLoadingNearbyPlaces.value = false
  }
}

onLoad(() => {
  locateOnPageOpen()
  void favoriteStore.ensureServerFavoritesLoaded()
})

onShow(() => {
  void favoriteStore.ensureServerFavoritesLoaded()
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
      searchSpotResults.value = []
      uni.showToast({
        title: `${currentMapProviderLabel}搜索暂不可用，请稍后重试`,
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
  searchSpotResults.value = []
  searchUserResults.value = []
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

/** 地图标记点 - 使用自定义 callout 展示更多信息 */
const markers = computed(() => {
  const searchPlaceMarkers = displayedMapPlaces.value.map((place, index) => {
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

  return searchPlaceMarkers
})

/** 点击地图标记 */
function onMarkerTap(e: any) {
  const markerId = e.detail?.markerId ?? e.markerId

  const searchPlace = findSearchPlaceByMarkerId(markerId)
  if (searchPlace) {
    selectedMapPlace.value = searchPlace
    setMapCenter(searchPlace)
    showBottomCard.value = true
    return
  }
}

/** 点击 callout 也跳转详情 */
function onCalloutTap(e: any) {
  const markerId = e.detail?.markerId ?? e.markerId

  const searchPlace = findSearchPlaceByMarkerId(markerId)
  if (searchPlace) {
    selectedMapPlace.value = searchPlace
    setMapCenter(searchPlace)
    showBottomCard.value = true
    return
  }
}

/** 点击地图空白处关闭卡片 */
function onMapTap() {
  if (showBottomCard.value) {
    showBottomCard.value = false
    selectedMapPlace.value = null
  }
}

/** 触摸开始时记录起点，为后续判断上划进详情使用。 */
function onBottomCardTouchStart(e: any) {
  cardTouchStartY.value = e.touches?.[0]?.clientY ?? 0
  cardTouchEndY.value = cardTouchStartY.value
}

/** 触摸移动时持续更新终点，仅记录坐标，减少中途不必要的状态变更。 */
function onBottomCardTouchMove(e: any) {
  cardTouchEndY.value = e.touches?.[0]?.clientY ?? cardTouchEndY.value
}

/** 触摸结束后，上划直接进入详情页，下划则关闭卡片。 */
function onBottomCardTouchEnd() {
  const swipeDistance = cardTouchStartY.value - cardTouchEndY.value

  if (swipeDistance > CARD_SWIPE_THRESHOLD) {
    openActiveDetailFromCard()
    return
  }

  if (swipeDistance < -CARD_SWIPE_THRESHOLD) {
    showBottomCard.value = false
    selectedMapPlace.value = null
  }
}

/** 地图地点展开后的补充信息，用来统一渲染卡片扩展区。 */
const selectedMapPlaceMeta = computed(() => {
  if (!selectedMapPlace.value) {
    return [] as string[]
  }

  return [
    selectedMapPlace.value.category || '地图地点',
    selectedMapPlace.value.district || '',
    selectedMapPlace.value.distance ? `距离 ${formatDistance(selectedMapPlace.value.distance)}` : '',
  ].filter(Boolean)
})

function goMapPlaceDetail(place: IMapSearchPlaceItem) {
  uni.navigateTo({
    url: `${buildSpotDetailUrlFromMapPlace(place, currentMapProvider)}&source=map`,
  })
}

/** 根据当前卡片内容跳转详情页，让上划和按钮点击走同一条链路。 */
function openActiveDetailFromCard() {
  if (selectedMapPlace.value) {
    goMapPlaceDetail(selectedMapPlace.value)
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
    const detail = await getSpotDetail({
      id: selectedMapPlace.value.id,
      title: selectedMapPlace.value.title,
      address: selectedMapPlace.value.address,
      latitude: selectedMapPlace.value.latitude,
      longitude: selectedMapPlace.value.longitude,
      distance: selectedMapPlace.value.distance,
      category: selectedMapPlace.value.category,
      district: selectedMapPlace.value.district,
      provider: currentMapProvider,
    })

    selectedMapPlace.value = {
      ...selectedMapPlace.value,
      id: detail.id,
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

/** 重定位到当前位置 */
function relocate() {
  uni.getLocation({
    type: 'gcj02',
    success(res) {
      const currentLocation = {
        latitude: res.latitude,
        longitude: res.longitude,
      }

      setMapCenter(currentLocation)
      void fetchNearbyPlaces(currentLocation)
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

    <view v-if="isLoadingNearbyPlaces && !showSearchPanel" class="nearby-loading-tip">
      正在加载附近地点...
    </view>

    <!-- 底部弹出卡片 -->
    <view class="bottom-card" :class="{ 'bottom-card--show': showBottomCard }">
      <view
        v-if="selectedMapPlace"
        class="card-content"
        @touchstart="onBottomCardTouchStart"
        @touchmove="onBottomCardTouchMove"
        @touchend="onBottomCardTouchEnd"
      >
        <view class="drag-bar" />

        <view class="flex gap-3" @click="goMapPlaceDetail(selectedMapPlace)">
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

        <view class="card-expanded-meta card-expanded-meta--inline">
          <text v-for="meta in selectedMapPlaceMeta" :key="meta" class="card-expanded-meta__item">
            {{ meta }}
          </text>
        </view>

        <view class="card-actions">
          <view class="card-action-btn" @click.stop="toggleSelectedMapPlaceFavorite">
            <view
              :class="favoriteStore.isFavorited(selectedMapPlace.id) ? 'i-carbon-favorite-filled text-red-500' : 'i-carbon-favorite text-gray-400'"
              class="text-18px"
            />
            <text
              class="text-11px"
              :class="favoriteStore.isFavorited(selectedMapPlace.id) ? 'text-red-500' : 'text-gray-400'"
            >
              {{ favoriteStore.isFavorited(selectedMapPlace.id) ? '已收藏' : '收藏' }}
            </text>
          </view>
          <view class="card-action-btn" @click.stop="goMapPlaceDetail(selectedMapPlace)">
            <view class="i-carbon-view text-18px text-orange-500" />
            <text class="text-11px text-orange-500">查看详情</text>
          </view>
          <view class="card-action-btn" @click.stop="openMapPlaceLocation">
            <view class="i-carbon-navigation text-18px text-blue-500" />
            <text class="text-11px text-blue-500">路线</text>
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
  overflow: hidden;
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

.card-expanded-tags,
.card-expanded-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.card-expanded-meta--inline {
  margin-top: 12px;
}

.card-expanded-tag,
.card-expanded-meta__item {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: #fff7ed;
  font-size: 11px;
  color: #ea580c;
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
