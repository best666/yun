<script lang="ts" setup>
import type { SpotDetail } from '@/store/spot'
import { useFavoriteStore, useFootprintStore, useMapSettingStore, useSpotStore, useUserContentStore } from '@/store'
import { openNavigationWithPreference } from '@/utils/mapNavigation'

definePage({
  style: {
    navigationBarTitleText: '地点详情',
  },
})

const spotStore = useSpotStore()
const favoriteStore = useFavoriteStore()
const footprintStore = useFootprintStore()
const userContentStore = useUserContentStore()
const mapSettingStore = useMapSettingStore()

const spotId = ref(0)

onLoad((query) => {
  if (query?.id) {
    spotId.value = Number(query.id)
    footprintStore.addFootprint(spotId.value)
  }
})

/** 地点详情 - 从 store 获取 */
const spotDetail = computed<SpotDetail | undefined>(() => {
  return spotStore.getSpotById(spotId.value)
})

/** 评价数据 - 合并系统数据和用户数据 */
const reviews = computed(() => {
  const system = spotDetail.value?.reviews ?? []
  const user = userContentStore.getReviewsBySpot(spotId.value)
  return [...user, ...system]
})

/** 问答数据 - 合并系统数据和用户数据 */
const qaList = computed(() => {
  const system = spotDetail.value?.qaList ?? []
  const user = userContentStore.getQuestionsBySpot(spotId.value)
  return [...user, ...system]
})

/** 笔记数据 - 合并系统数据和用户数据 */
const notes = computed(() => {
  const system = spotDetail.value?.notes ?? []
  const user = userContentStore.getNotesBySpot(spotId.value)
  return [...user, ...system]
})

/** 收藏状态 - 从收藏 store 获取 */
const isFavorited = computed(() => favoriteStore.isFavorited(spotId.value))

/** 当前 Tab */
const currentTab = ref(0)
const tabs = ['评价', '问答', '笔记']

/** tab 数量统计 */
const tabCounts = computed(() => [
  reviews.value.length,
  qaList.value.length,
  notes.value.length,
])

function switchTab(index: number) {
  currentTab.value = index
}

/** 拨打电话 */
function callPhone() {
  if (!spotDetail.value)
    return
  uni.makePhoneCall({ phoneNumber: spotDetail.value.phone })
}

/** 导航 */
async function openNavigation() {
  if (!spotDetail.value)
    return
  await openNavigationWithPreference({
    latitude: spotDetail.value.latitude,
    longitude: spotDetail.value.longitude,
    name: spotDetail.value.name,
    address: spotDetail.value.address,
  }, mapSettingStore.navigationMapApp)
}

/** 渲染星星 */
function renderStars(rating: number): string {
  return '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '☆' : '')
}

/** 收藏切换 */
function toggleFavorite() {
  const result = favoriteStore.toggleFavorite(spotId.value)
  uni.showToast({
    title: result ? '已收藏' : '已取消收藏',
    icon: 'none',
  })
}

/** 分享 */
function onShare() {
  // #ifdef MP-WEIXIN
  // 微信小程序可直接触发分享
  // #endif
  uni.showToast({ title: '分享功能开发中', icon: 'none' })
}

/** ---- 写评价 ---- */
const showReviewModal = ref(false)
const reviewForm = reactive({
  rating: 5,
  content: '',
})

function openReviewModal() {
  reviewForm.rating = 5
  reviewForm.content = ''
  showReviewModal.value = true
}

function setReviewRating(star: number) {
  reviewForm.rating = star
}

function submitReview() {
  if (!reviewForm.content.trim()) {
    uni.showToast({ title: '请输入评价内容', icon: 'none' })
    return
  }
  if (!spotDetail.value)
    return
  userContentStore.addReview({
    id: Date.now(),
    spotId: spotId.value,
    spotName: spotDetail.value.name,
    userName: '美食探索者',
    avatar: 'https://placehold.co/80/ff6633/white?text=Me',
    rating: reviewForm.rating,
    content: reviewForm.content.trim(),
    images: [],
    time: new Date().toISOString().split('T')[0],
  })
  showReviewModal.value = false
  uni.showToast({ title: '评价成功', icon: 'success' })
}

/** ---- 写笔记 ---- */
const showNoteModal = ref(false)
const noteForm = reactive({
  title: '',
  content: '',
})

function openNoteModal() {
  noteForm.title = ''
  noteForm.content = ''
  showNoteModal.value = true
}

function submitNote() {
  if (!noteForm.title.trim()) {
    uni.showToast({ title: '请输入笔记标题', icon: 'none' })
    return
  }
  if (!noteForm.content.trim()) {
    uni.showToast({ title: '请输入笔记内容', icon: 'none' })
    return
  }
  if (!spotDetail.value)
    return
  userContentStore.addNote({
    id: Date.now(),
    spotId: spotId.value,
    spotName: spotDetail.value.name,
    title: noteForm.title.trim(),
    content: noteForm.content.trim(),
    cover: spotDetail.value.cover,
    userName: '美食探索者',
    avatar: 'https://placehold.co/80/ff6633/white?text=Me',
    likeCount: 0,
    time: new Date().toISOString().split('T')[0],
  })
  showNoteModal.value = false
  uni.showToast({ title: '笔记发布成功', icon: 'success' })
}

/** ---- 提问 ---- */
const showQuestionModal = ref(false)
const questionContent = ref('')

function openQuestionModal() {
  questionContent.value = ''
  showQuestionModal.value = true
}

function submitQuestion() {
  if (!questionContent.value.trim()) {
    uni.showToast({ title: '请输入问题内容', icon: 'none' })
    return
  }
  if (!spotDetail.value)
    return
  userContentStore.addQuestion({
    id: Date.now(),
    spotId: spotId.value,
    spotName: spotDetail.value.name,
    question: questionContent.value.trim(),
    asker: '美食探索者',
    askerAvatar: 'https://placehold.co/80/ff6633/white?text=Me',
    time: new Date().toISOString().split('T')[0],
    answers: [],
  })
  showQuestionModal.value = false
  uni.showToast({ title: '提问成功', icon: 'success' })
}

/** ---- 回复问答 ---- */
const showAnswerModal = ref(false)
const answerContent = ref('')
const answerTargetQaId = ref(0)
const answerTargetQuestion = ref('')

function openAnswerModal(qaId: number, question: string) {
  answerTargetQaId.value = qaId
  answerTargetQuestion.value = question
  answerContent.value = ''
  showAnswerModal.value = true
}

function submitAnswer() {
  if (!answerContent.value.trim()) {
    uni.showToast({ title: '请输入回复内容', icon: 'none' })
    return
  }
  userContentStore.addAnswer(answerTargetQaId.value, {
    id: Date.now(),
    content: answerContent.value.trim(),
    userName: '美食探索者',
    avatar: 'https://placehold.co/80/ff6633/white?text=Me',
    time: new Date().toISOString().split('T')[0],
  })
  showAnswerModal.value = false
  uni.showToast({ title: '回复成功', icon: 'success' })
}

/** 底部面板动画控制 */
const sheetVisible = ref(false)
const activeSheet = ref<'review' | 'note' | 'question' | 'answer' | ''>('')

function openSheet(type: typeof activeSheet.value) {
  activeSheet.value = type
  // 先渲染 DOM，下一 tick 加动画 class
  nextTick(() => {
    sheetVisible.value = true
  })
}

function closeSheet() {
  sheetVisible.value = false
  setTimeout(() => {
    activeSheet.value = ''
  }, 300)
}

watch(showReviewModal, (v) => {
  if (v) {
    openSheet('review')
    showReviewModal.value = false
  }
})
watch(showNoteModal, (v) => {
  if (v) {
    openSheet('note')
    showNoteModal.value = false
  }
})
watch(showQuestionModal, (v) => {
  if (v) {
    openSheet('question')
    showQuestionModal.value = false
  }
})
watch(showAnswerModal, (v) => {
  if (v) {
    openSheet('answer')
    showAnswerModal.value = false
  }
})
</script>

<template>
  <view class="detail-page">
    <!-- 空状态 -->
    <view v-if="!spotDetail" class="min-h-80vh flex items-center justify-center">
      <text class="text-14px text-gray-400">地点不存在</text>
    </view>

    <template v-else>
      <!-- 顶部图片轮播 -->
      <swiper
        class="banner" indicator-dots indicator-color="rgba(255,255,255,0.4)" indicator-active-color="#fff"
        autoplay circular
      >
        <swiper-item v-for="(img, idx) in spotDetail.images" :key="idx">
          <image :src="img" class="banner-img" mode="aspectFill" />
        </swiper-item>
      </swiper>

      <!-- 基本信息卡片 -->
      <view class="info-card">
        <view class="flex items-start justify-between">
          <view class="flex-1">
            <view class="text-20px text-gray-900 font-bold">
              {{ spotDetail.name }}
            </view>
            <view class="mt-1 flex items-center gap-1">
              <text class="text-16px text-orange-500">{{ renderStars(spotDetail.rating) }}</text>
              <text class="text-16px text-orange-500 font-bold">{{ spotDetail.rating }}</text>
              <text class="ml-2 text-13px text-gray-400">人均 ¥{{ spotDetail.avgPrice }}</text>
            </view>
          </view>
          <view class="flex flex-shrink-0 items-center gap-3">
            <view class="action-btn" @click="toggleFavorite">
              <view
                :class="isFavorited ? 'i-carbon-favorite-filled text-red-500' : 'i-carbon-favorite text-gray-400'"
                class="text-22px"
              />
            </view>
            <view class="action-btn" @click="onShare">
              <view class="i-carbon-share text-22px text-blue-500" />
            </view>
            <view class="action-btn" @click="callPhone">
              <view class="i-carbon-phone text-22px text-green-500" />
            </view>
          </view>
        </view>

        <!-- 标签 -->
        <view class="mt-3 flex flex-wrap gap-2">
          <view
            v-for="tag in spotDetail.tags" :key="tag"
            class="rounded-full bg-orange-50 px-3 py-1 text-12px text-orange-500"
          >
            {{ tag }}
          </view>
        </view>

        <!-- 地址和营业时间 -->
        <view class="mt-3 flex flex-col gap-2">
          <view class="flex items-center text-13px text-gray-600" @click="openNavigation">
            <view class="i-carbon-location mr-2 text-16px text-orange-400" />
            <text class="flex-1">{{ spotDetail.address }}</text>
            <text class="text-12px text-orange-500">导航</text>
            <view class="i-carbon-arrow-right ml-1 text-14px text-orange-400" />
          </view>
          <view class="flex items-center text-13px text-gray-600">
            <view class="i-carbon-time mr-2 text-16px text-orange-400" />
            <text>营业时间：{{ spotDetail.openTime }}</text>
          </view>
        </view>

        <!-- 简介 -->
        <view class="mt-3 text-13px text-gray-500 leading-relaxed">
          {{ spotDetail.description }}
        </view>
      </view>

      <!-- Tab 切换 -->
      <view class="tab-bar-section">
        <view class="tab-bar-inner">
          <view
            v-for="(tab, index) in tabs" :key="tab" class="tab-item"
            :class="{ 'tab-item--active': currentTab === index }" @click="switchTab(index)"
          >
            <text>{{ tab }}{{ tabCounts[index] > 0 ? ` ${tabCounts[index]}` : '' }}</text>
            <view v-if="currentTab === index" class="tab-indicator" />
          </view>
        </view>
      </view>

      <!-- Tab 内容 -->
      <view class="tab-content">
        <!-- 评价 -->
        <view v-if="currentTab === 0" class="review-list">
          <view class="write-btn" @click="openReviewModal">
            <view class="i-carbon-edit text-16px text-orange-500" />
            <text class="ml-2 text-14px text-orange-500">写评价</text>
          </view>
          <view v-for="review in reviews" :key="review.id" class="review-item">
            <view class="flex items-center gap-2">
              <image :src="review.avatar" class="h-36px w-36px rounded-full" mode="aspectFill" />
              <view class="flex-1">
                <view class="text-14px text-gray-800 font-medium">
                  {{ review.userName }}
                </view>
                <view class="text-11px text-gray-400">
                  {{ review.time }}
                </view>
              </view>
              <text class="text-14px text-orange-500">{{ renderStars(review.rating) }}</text>
            </view>
            <view class="mt-2 text-13px text-gray-600 leading-relaxed">
              {{ review.content }}
            </view>
            <view v-if="review.images.length" class="mt-2 flex gap-2">
              <image
                v-for="(img, idx) in review.images" :key="idx" :src="img" class="h-80px w-80px rounded-8px"
                mode="aspectFill"
              />
            </view>
          </view>
          <view v-if="reviews.length === 0" class="empty-tip">
            暂无评价
          </view>
        </view>

        <!-- 问答 -->
        <view v-if="currentTab === 1" class="qa-list">
          <view class="write-btn" @click="openQuestionModal">
            <view class="i-carbon-help text-16px text-orange-500" />
            <text class="ml-2 text-14px text-orange-500">我要提问</text>
          </view>
          <view v-for="qa in qaList" :key="qa.id" class="qa-item">
            <view class="question-section">
              <view class="q-badge">
                问
              </view>
              <view class="flex-1">
                <view class="text-14px text-gray-800 font-medium">
                  {{ qa.question }}
                </view>
                <view class="mt-1 flex items-center gap-1 text-11px text-gray-400">
                  <image :src="qa.askerAvatar" class="h-16px w-16px rounded-full" mode="aspectFill" />
                  <text>{{ qa.asker }}</text>
                  <text class="ml-1">{{ qa.time }}</text>
                </view>
              </view>
            </view>
            <view v-for="answer in qa.answers" :key="answer.id" class="answer-section">
              <view class="a-badge">
                答
              </view>
              <view class="flex-1">
                <view class="text-13px text-gray-600 leading-relaxed">
                  {{ answer.content }}
                </view>
                <view class="mt-1 flex items-center gap-1 text-11px text-gray-400">
                  <image :src="answer.avatar" class="h-16px w-16px rounded-full" mode="aspectFill" />
                  <text>{{ answer.userName }}</text>
                  <text class="ml-1">{{ answer.time }}</text>
                </view>
              </view>
            </view>
            <!-- 回复按钮 -->
            <view class="reply-btn" @click="openAnswerModal(qa.id, qa.question)">
              <view class="i-carbon-reply text-13px text-orange-500" />
              <text class="ml-1 text-12px text-orange-500">回复</text>
            </view>
          </view>
          <view v-if="qaList.length === 0" class="empty-tip">
            暂无问答
          </view>
        </view>

        <!-- 笔记 -->
        <view v-if="currentTab === 2" class="note-list">
          <view class="write-btn" @click="openNoteModal">
            <view class="i-carbon-edit text-16px text-orange-500" />
            <text class="ml-2 text-14px text-orange-500">写笔记</text>
          </view>
          <view v-for="note in notes" :key="note.id" class="note-item">
            <image :src="note.cover" class="note-cover" mode="aspectFill" />
            <view class="note-info">
              <view class="line-clamp-1 text-14px text-gray-800 font-medium">
                {{ note.title }}
              </view>
              <view class="line-clamp-2 mt-1 text-12px text-gray-500">
                {{ note.content }}
              </view>
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
          <view v-if="notes.length === 0" class="empty-tip">
            暂无笔记
          </view>
        </view>
      </view>
    </template>

    <!-- 底部浮层遮罩 -->
    <view
      v-if="activeSheet" class="sheet-overlay" :class="{ 'sheet-overlay--show': sheetVisible }"
      @click="closeSheet"
    />

    <!-- 写评价浮层 -->
    <view v-if="activeSheet === 'review'" class="sheet" :class="{ 'sheet--show': sheetVisible }">
      <view class="sheet-header">
        <view class="sheet-drag-bar" />
        <view class="flex items-center justify-between">
          <view class="text-16px text-gray-800 font-bold">
            写评价
          </view>
          <view class="i-carbon-close text-20px text-gray-400" @click="closeSheet" />
        </view>
      </view>
      <view class="sheet-body">
        <view class="flex items-center gap-1">
          <text class="mr-2 text-14px text-gray-600">评分</text>
          <view
            v-for="star in 5" :key="star" class="text-24px"
            :class="star <= reviewForm.rating ? 'text-orange-400' : 'text-gray-300'" @click="setReviewRating(star)"
          >
            ★
          </view>
        </view>
        <textarea v-model="reviewForm.content" class="sheet-textarea" placeholder="分享你的用餐体验..." :maxlength="500" />
        <view class="sheet-btn" @click="submitReview">
          发布评价
        </view>
      </view>
    </view>

    <!-- 写笔记浮层 -->
    <view v-if="activeSheet === 'note'" class="sheet" :class="{ 'sheet--show': sheetVisible }">
      <view class="sheet-header">
        <view class="sheet-drag-bar" />
        <view class="flex items-center justify-between">
          <view class="text-16px text-gray-800 font-bold">
            写笔记
          </view>
          <view class="i-carbon-close text-20px text-gray-400" @click="closeSheet" />
        </view>
      </view>
      <view class="sheet-body">
        <input v-model="noteForm.title" class="sheet-input" placeholder="笔记标题" :maxlength="50">
        <textarea v-model="noteForm.content" class="sheet-textarea" placeholder="分享你的美食发现..." :maxlength="1000" />
        <view class="sheet-btn" @click="submitNote">
          发布笔记
        </view>
      </view>
    </view>

    <!-- 提问浮层 -->
    <view v-if="activeSheet === 'question'" class="sheet" :class="{ 'sheet--show': sheetVisible }">
      <view class="sheet-header">
        <view class="sheet-drag-bar" />
        <view class="flex items-center justify-between">
          <view class="text-16px text-gray-800 font-bold">
            我要提问
          </view>
          <view class="i-carbon-close text-20px text-gray-400" @click="closeSheet" />
        </view>
      </view>
      <view class="sheet-body">
        <textarea v-model="questionContent" class="sheet-textarea" placeholder="输入你想问的问题..." :maxlength="300" />
        <view class="sheet-btn" @click="submitQuestion">
          发布提问
        </view>
      </view>
    </view>

    <!-- 回复问答浮层 -->
    <view v-if="activeSheet === 'answer'" class="sheet" :class="{ 'sheet--show': sheetVisible }">
      <view class="sheet-header">
        <view class="sheet-drag-bar" />
        <view class="flex items-center justify-between">
          <view class="text-16px text-gray-800 font-bold">
            回复问题
          </view>
          <view class="i-carbon-close text-20px text-gray-400" @click="closeSheet" />
        </view>
        <view class="mt-2 rounded-8px bg-gray-50 px-3 py-2">
          <text class="text-13px text-gray-500">{{ answerTargetQuestion }}</text>
        </view>
      </view>
      <view class="sheet-body">
        <textarea v-model="answerContent" class="sheet-textarea" placeholder="输入你的回复..." :maxlength="500" />
        <view class="sheet-btn" @click="submitAnswer">
          发布回复
        </view>
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

.write-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 0;
  margin-bottom: 12px;
  background: #fff7f4;
  border: 1px dashed #ffbfa0;
  border-radius: 10px;

  &:active {
    opacity: 0.7;
  }
}

.reply-btn {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 8px;
  padding: 4px 0;

  &:active {
    opacity: 0.6;
  }
}

/* 底部浮层 */
.sheet-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0);
  z-index: 999;
  transition: background 0.3s ease;

  &--show {
    background: rgba(0, 0, 0, 0.5);
  }
}

.sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: #fff;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  max-height: 80vh;
  padding-bottom: env(safe-area-inset-bottom);

  &--show {
    transform: translateY(0);
  }
}

.sheet-header {
  padding: 12px 20px 0;
}

.sheet-drag-bar {
  width: 36px;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  margin: 0 auto 12px;
}

.sheet-body {
  padding: 16px 20px 20px;
}

.sheet-input {
  width: 100%;
  padding: 12px 14px;
  background: #f5f5f5;
  border-radius: 12px;
  font-size: 14px;
  color: #333;
  box-sizing: border-box;
  margin-bottom: 12px;
}

.sheet-textarea {
  width: 100%;
  height: 130px;
  padding: 12px 14px;
  background: #f5f5f5;
  border-radius: 12px;
  font-size: 14px;
  color: #333;
  box-sizing: border-box;
}

.sheet-btn {
  margin-top: 16px;
  text-align: center;
  padding: 14px 0;
  border-radius: 12px;
  font-size: 16px;
  background: #ff6633;
  color: #fff;
  font-weight: 500;

  &:active {
    opacity: 0.85;
  }
}
</style>
