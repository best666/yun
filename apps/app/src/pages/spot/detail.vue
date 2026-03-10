<script lang="ts" setup>
definePage({
  style: {
    navigationBarTitleText: '地点详情',
  },
})

/** 模拟美食地点数据 */
interface FoodSpot {
  id: number
  name: string
  cover: string
  images: string[]
  address: string
  rating: number
  latitude: number
  longitude: number
  tags: string[]
  avgPrice: number
  description: string
  phone: string
  openTime: string
}

interface ReviewItem {
  id: number
  userName: string
  avatar: string
  rating: number
  content: string
  images: string[]
  time: string
}

interface QAItem {
  id: number
  question: string
  asker: string
  askerAvatar: string
  time: string
  answers: {
    id: number
    content: string
    userName: string
    avatar: string
    time: string
  }[]
}

interface NoteItem {
  id: number
  title: string
  content: string
  cover: string
  userName: string
  avatar: string
  likeCount: number
  time: string
}

const spotId = ref(0)

onLoad((query) => {
  if (query?.id) {
    spotId.value = Number(query.id)
  }
})

/** 模拟地点详情 */
const spotDetail = computed<FoodSpot>(() => ({
  id: spotId.value,
  name: '老王烧烤',
  cover: 'https://placehold.co/750x400/ff6633/white?text=BBQ',
  images: [
    'https://placehold.co/750x400/ff6633/white?text=1',
    'https://placehold.co/750x400/e63946/white?text=2',
    'https://placehold.co/750x400/457b9d/white?text=3',
  ],
  address: '人民路88号',
  rating: 4.8,
  latitude: 39.908823,
  longitude: 116.397470,
  tags: ['烧烤', '夜宵', '聚餐'],
  avgPrice: 68,
  description: '正宗炭火烧烤，选用上等食材，独家秘制酱料，十年老店口碑之选。环境宽敞舒适，适合朋友聚餐、家庭聚会。',
  phone: '010-12345678',
  openTime: '17:00 - 02:00',
}))

/** 模拟评价数据 */
const reviews: ReviewItem[] = [
  {
    id: 1,
    userName: '美食达人小李',
    avatar: 'https://placehold.co/80/ff6633/white?text=Li',
    rating: 5,
    content: '环境很好，烤串特别好吃，尤其是羊肉串和烤鱼，强烈推荐！服务态度也非常好，下次还会再来。',
    images: ['https://placehold.co/200x200/ff6633/white?text=R1'],
    time: '2026-03-08',
  },
  {
    id: 2,
    userName: '吃货王大明',
    avatar: 'https://placehold.co/80/457b9d/white?text=W',
    rating: 4,
    content: '味道不错，就是等位时间有点长，建议提前预约。烤茄子和五花肉是必点菜品。',
    images: [],
    time: '2026-03-05',
  },
  {
    id: 3,
    userName: '周末探店',
    avatar: 'https://placehold.co/80/2a9d8f/white?text=Z',
    rating: 5,
    content: '朋友推荐来的，果然没有失望！价格也很合理，分量十足。',
    images: [
      'https://placehold.co/200x200/e63946/white?text=R2',
      'https://placehold.co/200x200/f4a261/white?text=R3',
    ],
    time: '2026-03-01',
  },
]

/** 模拟问答数据 */
const qaList: QAItem[] = [
  {
    id: 1,
    question: '有包间吗？大概能坐多少人？',
    asker: '小红',
    askerAvatar: 'https://placehold.co/80/e63946/white?text=X',
    time: '2026-03-06',
    answers: [
      {
        id: 1,
        content: '有的，大包间能坐12人，小包间6人，建议提前电话预约。',
        userName: '店主回复',
        avatar: 'https://placehold.co/80/ff6633/white?text=Boss',
        time: '2026-03-06',
      },
    ],
  },
  {
    id: 2,
    question: '可以带宠物吗？',
    asker: '爱猫人士',
    askerAvatar: 'https://placehold.co/80/f4a261/white?text=M',
    time: '2026-03-03',
    answers: [
      {
        id: 2,
        content: '户外区域可以，室内暂时不行哦~',
        userName: '店主回复',
        avatar: 'https://placehold.co/80/ff6633/white?text=Boss',
        time: '2026-03-04',
      },
    ],
  },
]

/** 模拟笔记数据 */
const notes: NoteItem[] = [
  {
    id: 1,
    title: '深夜烧烤攻略！这家必须安排',
    content: '上周和朋友误打误撞进了这家店，没想到是隐藏宝藏！必点：秘制羊肉串、蒜蓉烤生蚝、烤鱼...',
    cover: 'https://placehold.co/400x300/ff6633/white?text=Note1',
    userName: '探店小能手',
    avatar: 'https://placehold.co/80/ff6633/white?text=T',
    likeCount: 128,
    time: '2026-03-07',
  },
  {
    id: 2,
    title: '带爸妈来吃烧烤，老人家也说好',
    content: '周末带爸妈过来聚餐，环境干净整洁，食材新鲜，老人家都吃得很开心...',
    cover: 'https://placehold.co/400x300/2a9d8f/white?text=Note2',
    userName: '孝顺的小明',
    avatar: 'https://placehold.co/80/2a9d8f/white?text=M',
    likeCount: 56,
    time: '2026-03-02',
  },
]

/** 当前 Tab */
const currentTab = ref(0)
const tabs = ['评价', '问答', '笔记']

function switchTab(index: number) {
  currentTab.value = index
}

/** 拨打电话 */
function callPhone() {
  uni.makePhoneCall({ phoneNumber: spotDetail.value.phone })
}

/** 导航 */
function openNavigation() {
  uni.openLocation({
    latitude: spotDetail.value.latitude,
    longitude: spotDetail.value.longitude,
    name: spotDetail.value.name,
    address: spotDetail.value.address,
  })
}

/** 渲染星星 */
function renderStars(rating: number): string {
  return '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '☆' : '')
}

/** 收藏 */
const isFavorited = ref(false)
function toggleFavorite() {
  isFavorited.value = !isFavorited.value
  uni.showToast({
    title: isFavorited.value ? '已收藏' : '已取消收藏',
    icon: 'none',
  })
}
</script>

<template>
  <view class="detail-page">
    <!-- 顶部图片轮播 -->
    <swiper class="banner" indicator-dots indicator-color="rgba(255,255,255,0.4)" indicator-active-color="#fff" autoplay
      circular>
      <swiper-item v-for="(img, idx) in spotDetail.images" :key="idx">
        <image :src="img" class="banner-img" mode="aspectFill" />
      </swiper-item>
    </swiper>

    <!-- 基本信息卡片 -->
    <view class="info-card">
      <view class="flex items-start justify-between">
        <view class="flex-1">
          <view class="text-20px font-bold text-gray-900">{{ spotDetail.name }}</view>
          <view class="mt-1 flex items-center gap-1">
            <text class="text-16px text-orange-500">{{ renderStars(spotDetail.rating) }}</text>
            <text class="text-16px font-bold text-orange-500">{{ spotDetail.rating }}</text>
            <text class="ml-2 text-13px text-gray-400">人均 ¥{{ spotDetail.avgPrice }}</text>
          </view>
        </view>
        <view class="flex-shrink-0 flex items-center gap-3">
          <view class="action-btn" @click="toggleFavorite">
            <view :class="isFavorited ? 'i-carbon-favorite-filled text-red-500' : 'i-carbon-favorite text-gray-400'"
              class="text-22px" />
          </view>
          <view class="action-btn" @click="callPhone">
            <view class="i-carbon-phone text-22px text-green-500" />
          </view>
        </view>
      </view>

      <!-- 标签 -->
      <view class="mt-3 flex flex-wrap gap-2">
        <view v-for="tag in spotDetail.tags" :key="tag"
          class="rounded-full bg-orange-50 px-3 py-1 text-12px text-orange-500">
          {{ tag }}
        </view>
      </view>

      <!-- 地址和营业时间 -->
      <view class="mt-3 flex flex-col gap-2">
        <view class="flex items-center text-13px text-gray-600" @click="openNavigation">
          <view class="i-carbon-location mr-2 text-16px text-orange-400" />
          <text class="flex-1">{{ spotDetail.address }}</text>
          <view class="i-carbon-arrow-right text-14px text-gray-300" />
        </view>
        <view class="flex items-center text-13px text-gray-600">
          <view class="i-carbon-time mr-2 text-16px text-orange-400" />
          <text>营业时间：{{ spotDetail.openTime }}</text>
        </view>
      </view>

      <!-- 简介 -->
      <view class="mt-3 text-13px leading-relaxed text-gray-500">
        {{ spotDetail.description }}
      </view>
    </view>

    <!-- Tab 切换 -->
    <view class="tab-bar-section">
      <view class="tab-bar-inner">
        <view v-for="(tab, index) in tabs" :key="tab" class="tab-item"
          :class="{ 'tab-item--active': currentTab === index }" @click="switchTab(index)">
          <text>{{ tab }}</text>
          <view v-if="currentTab === index" class="tab-indicator" />
        </view>
      </view>
    </view>

    <!-- Tab 内容 -->
    <view class="tab-content">
      <!-- 评价 -->
      <view v-if="currentTab === 0" class="review-list">
        <view v-for="review in reviews" :key="review.id" class="review-item">
          <view class="flex items-center gap-2">
            <image :src="review.avatar" class="h-36px w-36px rounded-full" mode="aspectFill" />
            <view class="flex-1">
              <view class="text-14px font-medium text-gray-800">{{ review.userName }}</view>
              <view class="text-11px text-gray-400">{{ review.time }}</view>
            </view>
            <text class="text-14px text-orange-500">{{ renderStars(review.rating) }}</text>
          </view>
          <view class="mt-2 text-13px leading-relaxed text-gray-600">
            {{ review.content }}
          </view>
          <view v-if="review.images.length" class="mt-2 flex gap-2">
            <image v-for="(img, idx) in review.images" :key="idx" :src="img" class="h-80px w-80px rounded-8px"
              mode="aspectFill" />
          </view>
        </view>
        <view v-if="reviews.length === 0" class="empty-tip">暂无评价</view>
      </view>

      <!-- 问答 -->
      <view v-if="currentTab === 1" class="qa-list">
        <view v-for="qa in qaList" :key="qa.id" class="qa-item">
          <view class="question-section">
            <view class="q-badge">问</view>
            <view class="flex-1">
              <view class="text-14px font-medium text-gray-800">{{ qa.question }}</view>
              <view class="mt-1 flex items-center gap-1 text-11px text-gray-400">
                <image :src="qa.askerAvatar" class="h-16px w-16px rounded-full" mode="aspectFill" />
                <text>{{ qa.asker }}</text>
                <text class="ml-1">{{ qa.time }}</text>
              </view>
            </view>
          </view>
          <view v-for="answer in qa.answers" :key="answer.id" class="answer-section">
            <view class="a-badge">答</view>
            <view class="flex-1">
              <view class="text-13px leading-relaxed text-gray-600">{{ answer.content }}</view>
              <view class="mt-1 flex items-center gap-1 text-11px text-gray-400">
                <image :src="answer.avatar" class="h-16px w-16px rounded-full" mode="aspectFill" />
                <text>{{ answer.userName }}</text>
                <text class="ml-1">{{ answer.time }}</text>
              </view>
            </view>
          </view>
        </view>
        <view v-if="qaList.length === 0" class="empty-tip">暂无问答</view>
      </view>

      <!-- 笔记 -->
      <view v-if="currentTab === 2" class="note-list">
        <view v-for="note in notes" :key="note.id" class="note-item">
          <image :src="note.cover" class="note-cover" mode="aspectFill" />
          <view class="note-info">
            <view class="text-14px font-medium text-gray-800 line-clamp-1">{{ note.title }}</view>
            <view class="mt-1 text-12px text-gray-500 line-clamp-2">{{ note.content }}</view>
            <view class="mt-2 flex items-center justify-between">
              <view class="flex items-center gap-1">
                <image :src="note.avatar" class="h-18px w-18px rounded-full" mode="aspectFill" />
                <text class="text-11px text-gray-400">{{ note.userName }}</text>
              </view>
              <view class="flex items-center gap-1">
                <view class="i-carbon-favorite text-12px text-gray-400" />
                <text class="text-11px text-gray-400">{{ note.likeCount }}</text>
              </view>
            </view>
          </view>
        </view>
        <view v-if="notes.length === 0" class="empty-tip">暂无笔记</view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
}

.banner {
  width: 100%;
  height: 440rpx;
}

.banner-img {
  width: 100%;
  height: 100%;
}

.info-card {
  margin: -20px 12px 0;
  padding: 16px;
  background: #fff;
  border-radius: 16px;
  position: relative;
  z-index: 10;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.action-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f8f8f8;

  &:active {
    background: #eee;
  }
}

.tab-bar-section {
  margin: 12px 12px 0;
  background: #fff;
  border-radius: 12px 12px 0 0;
  padding: 0 4px;
}

.tab-bar-inner {
  display: flex;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 14px 0 10px;
  font-size: 15px;
  color: #999;
  position: relative;
  transition: color 0.2s;

  &--active {
    color: #ff6633;
    font-weight: 600;
  }
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  background: #ff6633;
  border-radius: 2px;
}

.tab-content {
  margin: 0 12px;
  background: #fff;
  border-radius: 0 0 12px 12px;
  padding: 12px 16px;
  min-height: 300px;
}

// 评价
.review-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.review-item {
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
}

// 问答
.qa-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.qa-item {
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
}

.question-section {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.answer-section {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-top: 10px;
  padding-left: 4px;
}

.q-badge {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #ff6633;
  color: #fff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.a-badge {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #2a9d8f;
  color: #fff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

// 笔记
.note-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.note-item {
  display: flex;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
}

.note-cover {
  width: 120px;
  height: 90px;
  border-radius: 8px;
  flex-shrink: 0;
}

.note-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.line-clamp-1 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.line-clamp-2 {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.empty-tip {
  text-align: center;
  padding: 40px 0;
  color: #ccc;
  font-size: 14px;
}
</style>
