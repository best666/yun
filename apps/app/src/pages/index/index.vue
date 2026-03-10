<script lang="ts" setup>
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

/** 模拟美食地点数据 */
interface FoodSpot {
  id: number
  name: string
  cover: string
  address: string
  rating: number
  latitude: number
  longitude: number
  tags: string[]
  avgPrice: number
}

const mockSpots: FoodSpot[] = [
  {
    id: 1,
    name: '老王烧烤',
    cover: 'https://placehold.co/400x300/ff6633/white?text=BBQ',
    address: '人民路88号',
    rating: 4.8,
    latitude: 39.908823,
    longitude: 116.397470,
    tags: ['烧烤', '夜宵'],
    avgPrice: 68,
  },
  {
    id: 2,
    name: '川味坊',
    cover: 'https://placehold.co/400x300/e63946/white?text=Chuan',
    address: '解放大道120号',
    rating: 4.6,
    latitude: 39.915,
    longitude: 116.404,
    tags: ['川菜', '火锅'],
    avgPrice: 88,
  },
  {
    id: 3,
    name: '日式拉面屋',
    cover: 'https://placehold.co/400x300/457b9d/white?text=Ramen',
    address: '文化街56号',
    rating: 4.5,
    latitude: 39.905,
    longitude: 116.390,
    tags: ['日料', '拉面'],
    avgPrice: 45,
  },
  {
    id: 4,
    name: '甜蜜时光',
    cover: 'https://placehold.co/400x300/f4a261/white?text=Dessert',
    address: '新华路200号',
    rating: 4.9,
    latitude: 39.912,
    longitude: 116.395,
    tags: ['甜品', '下午茶'],
    avgPrice: 35,
  },
  {
    id: 5,
    name: '粤式茶餐厅',
    cover: 'https://placehold.co/400x300/2a9d8f/white?text=Yue',
    address: '和平广场3楼',
    rating: 4.7,
    latitude: 39.920,
    longitude: 116.410,
    tags: ['粤菜', '早茶'],
    avgPrice: 78,
  },
]

/** 地图标记点 */
const markers = computed(() =>
  mockSpots.map(spot => ({
    id: spot.id,
    latitude: spot.latitude,
    longitude: spot.longitude,
    title: spot.name,
    width: 32,
    height: 32,
    callout: {
      content: spot.name,
      color: '#333333',
      fontSize: 13,
      borderRadius: 8,
      padding: 6,
      display: 'BYCLICK',
      bgColor: '#ffffff',
    },
  })),
)

/** 地图中心 */
const mapCenter = reactive({
  latitude: 39.908823,
  longitude: 116.397470,
})

/** 当前选中地点 */
const selectedSpot = ref<FoodSpot | null>(null)
/** 底部卡片是否显示 */
const showBottomCard = ref(false)

/** 点击地图标记 */
function onMarkerTap(e: any) {
  const markerId = e.detail?.markerId ?? e.markerId
  const spot = mockSpots.find(s => s.id === markerId)
  if (!spot) return

  if (selectedSpot.value?.id === spot.id && showBottomCard.value) {
    // 再次点击同一个标记 -> 跳转详情页
    goDetail(spot)
    return
  }

  selectedSpot.value = spot
  showBottomCard.value = true
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
    <map class="map-full" :latitude="mapCenter.latitude" :longitude="mapCenter.longitude" :markers="markers" :scale="14"
      :show-location="true" :enable-3D="false" :enable-overlooking="false" @markertap="onMarkerTap" @tap="onMapTap" />

    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input">
        <view class="i-carbon-search text-16px text-gray-400" />
        <text class="ml-2 text-14px text-gray-400">搜索美食地点</text>
      </view>
    </view>

    <!-- 重定位按钮 -->
    <view class="relocate-btn" @click="relocate">
      <view class="i-carbon-location-current text-20px text-gray-600" />
    </view>

    <!-- 底部弹出卡片 -->
    <view class="bottom-card" :class="{ 'bottom-card--show': showBottomCard }">
      <view v-if="selectedSpot" class="card-content" @click="goDetail(selectedSpot)">
        <!-- 拖动条 -->
        <view class="drag-bar" />

        <view class="flex gap-3">
          <!-- 封面 -->
          <image :src="selectedSpot.cover" class="h-80px w-80px flex-shrink-0 rounded-12px" mode="aspectFill" />
          <!-- 信息 -->
          <view class="min-w-0 flex-1">
            <view class="text-16px font-bold text-gray-900 truncate">
              {{ selectedSpot.name }}
            </view>
            <view class="mt-1 flex items-center gap-1">
              <view class="i-carbon-star-filled text-14px text-yellow-500" />
              <text class="text-14px text-yellow-600">{{ selectedSpot.rating }}</text>
              <text class="ml-2 text-12px text-gray-400">人均 ¥{{ selectedSpot.avgPrice }}</text>
            </view>
            <view class="mt-1 text-12px text-gray-500 truncate">
              <view class="i-carbon-location mr-1 inline-block align-middle text-12px" />
              {{ selectedSpot.address }}
            </view>
            <view class="mt-2 flex gap-1">
              <view v-for="tag in selectedSpot.tags" :key="tag"
                class="rounded-full bg-orange-50 px-2 py-0.5 text-11px text-orange-500">
                {{ tag }}
              </view>
            </view>
          </view>
          <!-- 箭头 -->
          <view class="flex items-center">
            <view class="i-carbon-chevron-right text-20px text-gray-300" />
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

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
