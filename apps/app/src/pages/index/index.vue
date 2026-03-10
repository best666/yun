<script lang="ts" setup>
import type { FoodSpot } from '@/store/spot'
import { useFavoriteStore, useSpotStore } from '@/store'

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

/** 地图中心 */
const mapCenter = reactive({
  latitude: 39.908823,
  longitude: 116.397470,
})

/** 当前选中地点 */
const selectedSpot = ref<FoodSpot | null>(null)
/** 底部卡片是否显示 */
const showBottomCard = ref(false)

/** 搜索相关 */
const searchKeyword = ref('')
const showSearchPanel = ref(false)
const searchResults = ref<FoodSpot[]>([])

function onSearchInput(e: any) {
  searchKeyword.value = e.detail?.value ?? e.target?.value ?? ''
  if (searchKeyword.value.trim()) {
    searchResults.value = spotStore.searchSpots(searchKeyword.value)
  }
  else {
    searchResults.value = []
  }
}

function onSearchConfirm() {
  if (searchKeyword.value.trim()) {
    searchResults.value = spotStore.searchSpots(searchKeyword.value)
  }
}

function onSearchResultTap(spot: FoodSpot) {
  showSearchPanel.value = false
  searchKeyword.value = ''
  searchResults.value = []
  // 移动地图中心到该地点并展示卡片
  mapCenter.latitude = spot.latitude
  mapCenter.longitude = spot.longitude
  selectedSpot.value = spot
  showBottomCard.value = true
}

function closeSearch() {
  showSearchPanel.value = false
  searchKeyword.value = ''
  searchResults.value = []
}

/** 显示的地点列表 */
const displaySpots = computed(() => spotStore.allSpots)

/** 地图标记点 - 使用自定义 callout 展示更多信息 */
const markers = computed(() =>
  displaySpots.value.map((spot) => {
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
        borderRadius: 10,
        padding: 8,
        display: 'BYCLICK',
        bgColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#ff6633',
      },
    }
  }),
)

/** 点击地图标记 */
function onMarkerTap(e: any) {
  const markerId = e.detail?.markerId ?? e.markerId
  const spot = displaySpots.value.find(s => s.id === markerId)
  if (!spot)
    return

  if (selectedSpot.value?.id === spot.id && showBottomCard.value) {
    // 再次点击同一个标记 -> 跳转详情页
    goDetail(spot)
    return
  }

  selectedSpot.value = spot
  showBottomCard.value = true
  // 移动地图中心到选中地点
  mapCenter.latitude = spot.latitude
  mapCenter.longitude = spot.longitude
}

/** 点击 callout 也跳转详情 */
function onCalloutTap(e: any) {
  const markerId = e.detail?.markerId ?? e.markerId
  const spot = displaySpots.value.find(s => s.id === markerId)
  if (spot)
    goDetail(spot)
}

/** 点击地图空白处关闭卡片 */
function onMapTap() {
  if (showBottomCard.value) {
    showBottomCard.value = false
    selectedSpot.value = null
  }
}

/** 跳转详情页 */
function goDetail(spot: FoodSpot) {
  uni.navigateTo({
    url: `/pages/spot/detail?id=${spot.id}`,
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
      mapCenter.latitude = res.latitude
      mapCenter.longitude = res.longitude
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
            class="search-panel-input" :value="searchKeyword" placeholder="搜索店名、分类、地址" focus confirm-type="search"
            @input="onSearchInput" @confirm="onSearchConfirm"
          >
        </view>
        <text class="text-14px text-orange-500" @click="closeSearch">取消</text>
      </view>
      <!-- 搜索结果 -->
      <scroll-view scroll-y class="search-results">
        <view v-for="item in searchResults" :key="item.id" class="search-result-item" @click="onSearchResultTap(item)">
          <image :src="item.cover" class="h-50px w-50px flex-shrink-0 rounded-8px" mode="aspectFill" />
          <view class="ml-3 min-w-0 flex-1">
            <view class="truncate text-14px text-gray-800 font-medium">
              {{ item.name }}
            </view>
            <view class="mt-1 flex items-center gap-2 text-12px text-gray-400">
              <text>★{{ item.rating }}</text>
              <text>¥{{ item.avgPrice }}/人</text>
            </view>
            <view class="mt-0.5 truncate text-12px text-gray-400">
              {{ item.address }}
            </view>
          </view>
        </view>
        <view v-if="searchKeyword && searchResults.length === 0" class="py-10 text-center text-13px text-gray-400">
          未找到相关地点
        </view>
        <view v-if="!searchKeyword" class="py-10 text-center text-13px text-gray-300">
          输入关键词搜索美食地点
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

.search-result-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f8f8f8;

  &:active {
    background: #f8f8f8;
  }
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
