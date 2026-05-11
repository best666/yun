<script lang="ts" setup>
import type { ISpotDetail, ISpotDetailQuery } from '@/api/types/spot'
import { createSpotDiscussion, createSpotNote, createSpotQuestion, createSpotQuestionAnswer, createSpotReview, getSpotDetail, toggleSpotDiscussionLike, toggleSpotNoteLike } from '@/api/spot'
import { useFavoriteStore, useFootprintStore, useMapSettingStore, useTokenStore, useUserContentStore, useUserStore } from '@/store'
import { openNavigationWithPreference } from '@/utils/mapNavigation'
import { toLoginPage } from '@/utils/toLoginPage'

definePage({
  style: {
    navigationBarTitleText: '地点详情',
  },
})

const favoriteStore = useFavoriteStore()
const footprintStore = useFootprintStore()
const tokenStore = useTokenStore()
const userContentStore = useUserContentStore()
const userStore = useUserStore()
const mapSettingStore = useMapSettingStore()

const spotIdentity = ref('')
const loading = ref(true)
const loadError = ref('')
const showReviewSheet = ref(false)
const sheetVisible = ref(false)
const showDiscussionSheet = ref(false)
const discussionSheetVisible = ref(false)
const showNoteSheet = ref(false)
const noteSheetVisible = ref(false)
const showQuestionSheet = ref(false)
const questionSheetVisible = ref(false)
const showAnswerSheet = ref(false)
const answerSheetVisible = ref(false)
/** 当前准备回复的问题 ID，用来把回复提交到正确的问题下 */
const answerTargetQuestionId = ref('')

const reviewForm = reactive({
  rating: 5,
  content: '',
})

const discussionForm = reactive({
  content: '',
})

const noteForm = reactive({
  title: '',
  content: '',
})

/** 提问表单，独立维护是为了避免和评价、讨论输入互相污染 */
const questionForm = reactive({
  question: '',
})

/** 回复表单，和提问分离后可以同时维护输入状态和回复目标 */
const answerForm = reactive({
  content: '',
})

const detailQuery = reactive<ISpotDetailQuery>({})
const spotDetail = ref<ISpotDetail | null>(null)

const isPersistedSpot = computed(() => /^\d+$/.test(spotIdentity.value))

const reviews = computed(() => spotDetail.value?.reviews ?? [])

const discussions = computed(() => spotDetail.value?.discussions ?? [])
const notes = computed(() => spotDetail.value?.notes ?? [])
const questions = computed(() => spotDetail.value?.questions ?? [])

const isFavorited = computed(() => {
  if (!spotDetail.value) {
    return false
  }

  return tokenStore.hasLogin ? spotDetail.value.isFavorited : favoriteStore.isFavorited(spotDetail.value.id)
})

const favoriteDisplayCount = computed(() => {
  if (!spotDetail.value) {
    return 0
  }

  if (tokenStore.hasLogin) {
    return spotDetail.value.favoriteCount
  }

  return spotDetail.value.favoriteCount + (isFavorited.value ? 1 : 0)
})

const reviewDisplayCount = computed(() => {
  return reviews.value.length || spotDetail.value?.reviewCount || 0
})

onLoad((query) => {
  spotIdentity.value = String(query?.id || '')
  detailQuery.id = spotIdentity.value
  detailQuery.title = typeof query?.title === 'string' ? query.title : undefined
  detailQuery.address = typeof query?.address === 'string' ? query.address : undefined
  detailQuery.latitude = parseNumberValue(query?.latitude)
  detailQuery.longitude = parseNumberValue(query?.longitude)
  detailQuery.distance = parseNumberValue(query?.distance)
  detailQuery.category = typeof query?.category === 'string' ? query.category : undefined
  detailQuery.district = typeof query?.district === 'string' ? query.district : undefined
  detailQuery.provider = typeof query?.provider === 'string' ? query.provider : undefined

  void fetchSpotDetail()
})

function parseNumberValue(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : undefined
}

async function fetchSpotDetail() {
  loading.value = true
  loadError.value = ''

  try {
    spotDetail.value = await getSpotDetail({ ...detailQuery })
    spotIdentity.value = spotDetail.value.id

    if (tokenStore.hasLogin) {
      await favoriteStore.ensureServerFavoritesLoaded()
    }

    if (isPersistedSpot.value) {
      footprintStore.addFootprint(Number(spotIdentity.value))
    }
  }
  catch (error) {
    spotDetail.value = null
    loadError.value = '地点详情加载失败，请稍后重试'
    console.error('加载地点详情失败', error)
  }
  finally {
    loading.value = false
  }
}

function renderStars(rating: number) {
  return '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '☆' : '')
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

async function toggleFavorite() {
  if (!spotDetail.value) {
    return
  }

  try {
    const result = await favoriteStore.toggleFavorite({
      id: spotDetail.value.id,
      name: spotDetail.value.name,
      cover: spotDetail.value.cover,
      address: spotDetail.value.address,
      rating: spotDetail.value.rating,
      avgPrice: spotDetail.value.avgPrice,
      latitude: spotDetail.value.latitude,
      longitude: spotDetail.value.longitude,
      provider: detailQuery.provider,
    })

    spotDetail.value.isFavorited = result.favorited
    if (typeof result.favoriteCount === 'number') {
      spotDetail.value.favoriteCount = result.favoriteCount
    }

    uni.showToast({
      title: result.favorited ? '已收藏' : '已取消收藏',
      icon: 'none',
    })
  }
  catch (error) {
    console.error('切换收藏失败', error)
  }
}

async function openNavigation() {
  if (!spotDetail.value) {
    return
  }

  await openNavigationWithPreference({
    latitude: spotDetail.value.latitude,
    longitude: spotDetail.value.longitude,
    name: spotDetail.value.name,
    address: spotDetail.value.address,
  }, mapSettingStore.navigationMapApp)
}

function callPhone() {
  if (!spotDetail.value?.phone) {
    uni.showToast({ title: '暂无联系电话', icon: 'none' })
    return
  }

  uni.makePhoneCall({ phoneNumber: spotDetail.value.phone })
}

function openReviewPanel() {
  if (!tokenStore.updateNowTime().hasLogin) {
    toLoginPage()
    return
  }

  if (!isPersistedSpot.value) {
    uni.showToast({ title: '地点信息尚未准备好，请稍后重试', icon: 'none' })
    return
  }

  reviewForm.rating = 5
  reviewForm.content = ''
  showReviewSheet.value = true

  nextTick(() => {
    sheetVisible.value = true
  })
}

function closeReviewPanel() {
  sheetVisible.value = false
  setTimeout(() => {
    showReviewSheet.value = false
  }, 260)
}

function openDiscussionPanel() {
  if (!tokenStore.updateNowTime().hasLogin) {
    toLoginPage()
    return
  }

  if (!isPersistedSpot.value) {
    uni.showToast({ title: '地点信息尚未准备好，请稍后重试', icon: 'none' })
    return
  }

  discussionForm.content = ''
  showDiscussionSheet.value = true

  nextTick(() => {
    discussionSheetVisible.value = true
  })
}

function closeDiscussionPanel() {
  discussionSheetVisible.value = false
  setTimeout(() => {
    showDiscussionSheet.value = false
  }, 260)
}

function openNotePanel() {
  if (!tokenStore.updateNowTime().hasLogin) {
    toLoginPage()
    return
  }

  if (!isPersistedSpot.value) {
    uni.showToast({ title: '地点信息尚未准备好，请稍后重试', icon: 'none' })
    return
  }

  noteForm.title = ''
  noteForm.content = ''
  showNoteSheet.value = true

  nextTick(() => {
    noteSheetVisible.value = true
  })
}

function closeNotePanel() {
  noteSheetVisible.value = false
  setTimeout(() => {
    showNoteSheet.value = false
  }, 260)
}

function openQuestionPanel() {
  if (!tokenStore.updateNowTime().hasLogin) {
    toLoginPage()
    return
  }

  if (!isPersistedSpot.value) {
    uni.showToast({ title: '地点信息尚未准备好，请稍后重试', icon: 'none' })
    return
  }

  questionForm.question = ''
  showQuestionSheet.value = true

  nextTick(() => {
    questionSheetVisible.value = true
  })
}

function closeQuestionPanel() {
  questionSheetVisible.value = false
  setTimeout(() => {
    showQuestionSheet.value = false
  }, 260)
}

function openAnswerPanel(questionId: string) {
  if (!tokenStore.updateNowTime().hasLogin) {
    toLoginPage()
    return
  }

  answerTargetQuestionId.value = questionId
  answerForm.content = ''
  showAnswerSheet.value = true

  nextTick(() => {
    answerSheetVisible.value = true
  })
}

function closeAnswerPanel() {
  answerSheetVisible.value = false
  setTimeout(() => {
    showAnswerSheet.value = false
    answerTargetQuestionId.value = ''
  }, 260)
}

function setReviewRating(star: number) {
  reviewForm.rating = star
}

async function submitReview() {
  if (!spotDetail.value || !isPersistedSpot.value) {
    return
  }

  if (!reviewForm.content.trim()) {
    uni.showToast({ title: '请输入评价内容', icon: 'none' })
    return
  }

  try {
    const createdReview = await createSpotReview({
      spotId: Number(spotIdentity.value),
      rating: reviewForm.rating,
      content: reviewForm.content.trim(),
    })

    userContentStore.addReview({
      id: createdReview.id,
      spotId: Number(spotIdentity.value),
      spotName: spotDetail.value.name,
      userName: createdReview.userName || userStore.userInfo.nickname || '美食探索者',
      avatar: createdReview.avatar || userStore.userInfo.avatar,
      rating: createdReview.rating,
      content: createdReview.content,
      images: createdReview.images,
      time: createdReview.time,
      likeCount: createdReview.likeCount,
      isMine: true,
    })

    await fetchSpotDetail()
    closeReviewPanel()
    uni.showToast({ title: '评价成功', icon: 'success' })
  }
  catch (error) {
    console.error('提交评价失败', error)
  }
}

async function submitDiscussion() {
  if (!spotDetail.value || !isPersistedSpot.value) {
    return
  }
  if (!discussionForm.content.trim()) {
    uni.showToast({ title: '请输入讨论内容', icon: 'none' })
    return
  }

  try {
    const createdDiscussion = await createSpotDiscussion({
      spotId: Number(spotIdentity.value),
      content: discussionForm.content.trim(),
    })

    spotDetail.value.discussions.unshift(createdDiscussion)
    userContentStore.addDiscussion({
      ...createdDiscussion,
      spotId: Number(spotIdentity.value),
      spotName: spotDetail.value.name,
    })
    closeDiscussionPanel()
    uni.showToast({ title: '讨论已发布', icon: 'success' })
  }
  catch (error) {
    console.error('发布讨论失败', error)
  }
}

async function submitNote() {
  if (!spotDetail.value || !isPersistedSpot.value) {
    return
  }

  if (!noteForm.title.trim()) {
    uni.showToast({ title: '请输入笔记标题', icon: 'none' })
    return
  }

  if (!noteForm.content.trim()) {
    uni.showToast({ title: '请输入笔记内容', icon: 'none' })
    return
  }

  try {
    const createdNote = await createSpotNote({
      spotId: Number(spotIdentity.value),
      title: noteForm.title.trim(),
      content: noteForm.content.trim(),
    })

    spotDetail.value.notes.unshift(createdNote)
    userContentStore.addNote({
      ...createdNote,
      spotId: Number(spotIdentity.value),
      spotName: spotDetail.value.name,
    })
    closeNotePanel()
    uni.showToast({ title: '笔记已发布', icon: 'success' })
  }
  catch (error) {
    console.error('发布笔记失败', error)
  }
}

async function submitQuestion() {
  if (!spotDetail.value || !isPersistedSpot.value) {
    return
  }

  if (!questionForm.question.trim()) {
    uni.showToast({ title: '请输入问题内容', icon: 'none' })
    return
  }

  try {
    const createdQuestion = await createSpotQuestion({
      spotId: Number(spotIdentity.value),
      question: questionForm.question.trim(),
    })

    spotDetail.value.questions.unshift(createdQuestion)
    userContentStore.addQuestion({
      ...createdQuestion,
      spotId: Number(spotIdentity.value),
      spotName: spotDetail.value.name,
    })
    closeQuestionPanel()
    uni.showToast({ title: '提问已发布', icon: 'success' })
  }
  catch (error) {
    console.error('发布提问失败', error)
  }
}

async function submitAnswer() {
  if (!spotDetail.value || !answerTargetQuestionId.value) {
    return
  }

  if (!answerForm.content.trim()) {
    uni.showToast({ title: '请输入回复内容', icon: 'none' })
    return
  }

  const question = spotDetail.value.questions.find(item => item.id === answerTargetQuestionId.value)
  if (!question) {
    return
  }

  try {
    const createdAnswer = await createSpotQuestionAnswer({
      questionId: Number(answerTargetQuestionId.value),
      content: answerForm.content.trim(),
    })

    question.answers.push(createdAnswer)
    userContentStore.addAnswer(answerTargetQuestionId.value, createdAnswer)
    closeAnswerPanel()
    uni.showToast({ title: '回复已发布', icon: 'success' })
  }
  catch (error) {
    console.error('发布回复失败', error)
  }
}

async function removeReview(reviewId: string) {
  if (!spotDetail.value) {
    return
  }

  uni.showModal({
    title: '提示',
    content: '确定要删除这条评价吗？',
    success: async (res) => {
      if (!res.confirm) {
        return
      }

      try {
        await userContentStore.removeReview(Number(reviewId))
        spotDetail.value!.reviews = spotDetail.value!.reviews.filter(item => item.id !== reviewId)
        uni.showToast({ title: '已删除', icon: 'none' })
      }
      catch (error) {
        console.error('删除评价失败', error)
      }
    },
  })
}

async function likeDiscussion(discussionId: string) {
  if (!tokenStore.updateNowTime().hasLogin) {
    toLoginPage()
    return
  }

  if (!spotDetail.value) {
    return
  }

  const discussion = spotDetail.value.discussions.find(item => item.id === discussionId)
  if (!discussion) {
    return
  }

  try {
    const result = await toggleSpotDiscussionLike({
      discussionId: Number(discussionId),
    })

    discussion.likedByCurrentUser = result.liked
    discussion.likeCount = result.likeCount
  }
  catch (error) {
    console.error('讨论点赞失败', error)
  }
}

async function removeDiscussion(discussionId: string) {
  if (!spotDetail.value) {
    return
  }

  uni.showModal({
    title: '提示',
    content: '确定要删除这条讨论吗？',
    success: async (res) => {
      if (!res.confirm) {
        return
      }

      try {
        await userContentStore.removeDiscussion(Number(discussionId))
        spotDetail.value!.discussions = spotDetail.value!.discussions.filter(item => item.id !== discussionId)
        uni.showToast({ title: '已删除', icon: 'none' })
      }
      catch (error) {
        console.error('删除讨论失败', error)
      }
    },
  })
}

async function likeNote(noteId: string) {
  if (!tokenStore.updateNowTime().hasLogin) {
    toLoginPage()
    return
  }

  if (!spotDetail.value) {
    return
  }

  const note = spotDetail.value.notes.find(item => item.id === noteId)
  if (!note) {
    return
  }

  try {
    const result = await toggleSpotNoteLike({
      noteId: Number(noteId),
    })

    note.likedByCurrentUser = result.liked
    note.likeCount = result.likeCount
  }
  catch (error) {
    console.error('笔记点赞失败', error)
  }
}
</script>

<template>
  <view class="detail-page">
    <view v-if="loading" class="status-wrap">
      <text class="status-text">正在加载地点详情...</text>
    </view>

    <view v-else-if="loadError" class="status-wrap">
      <text class="status-text">{{ loadError }}</text>
      <view class="retry-btn" @click="fetchSpotDetail">
        重新加载
      </view>
    </view>

    <template v-else-if="spotDetail">
      <swiper class="hero-swiper" circular autoplay indicator-dots indicator-color="rgba(255,255,255,0.4)" indicator-active-color="#fff">
        <swiper-item v-for="image in spotDetail.images" :key="image">
          <image :src="image" class="hero-image" mode="aspectFill" />
        </swiper-item>
      </swiper>

      <view class="detail-sheet">
        <view class="sheet-handle" />

        <view class="hero-card">
          <view class="hero-main">
            <view class="hero-title-wrap">
              <view class="hero-title">
                {{ spotDetail.name }}
              </view>
              <view class="hero-subtitle">
                {{ spotDetail.businessStatus }} · {{ spotDetail.businessHours }}
              </view>
            </view>
            <view class="favorite-chip" @click="toggleFavorite">
              <view :class="isFavorited ? 'i-carbon-favorite-filled text-red-500' : 'i-carbon-favorite text-gray-400'" class="text-18px" />
              <text :class="isFavorited ? 'text-red-500' : 'text-gray-500'" class="text-12px">
                {{ favoriteDisplayCount }} 收藏
              </text>
            </view>
          </view>

          <view class="hero-metrics">
            <view class="metric-card">
              <text class="metric-value">{{ spotDetail.rating.toFixed(1) }}</text>
              <text class="metric-label">评分</text>
            </view>
            <view class="metric-card metric-card--wide">
              <text class="metric-value">{{ reviewDisplayCount }}</text>
              <text class="metric-label">评价数</text>
            </view>
            <view class="metric-card metric-card--wide">
              <text class="metric-value">¥{{ spotDetail.avgPrice }}</text>
              <text class="metric-label">人均</text>
            </view>
          </view>

          <view class="rating-row">
            <text class="rating-stars">{{ renderStars(spotDetail.rating) }}</text>
            <text class="rating-note">{{ spotDetail.navigationLabel }}</text>
          </view>

          <view class="tag-row">
            <view v-for="tag in spotDetail.tags" :key="tag" class="tag-chip">
              {{ tag }}
            </view>
          </view>

          <view class="info-list">
            <view class="info-item">
              <view class="i-carbon-location text-18px text-orange-500" />
              <view class="info-content">
                <view class="info-title">
                  地址详细信息
                </view>
                <view class="info-text">
                  {{ spotDetail.address }}
                </view>
              </view>
            </view>
            <view class="info-item">
              <view class="i-carbon-road text-18px text-blue-500" />
              <view class="info-content">
                <view class="info-title">
                  导航基本信息
                </view>
                <view class="info-text">
                  {{ spotDetail.routeTip }}
                </view>
              </view>
            </view>
            <view v-if="detailQuery.distance" class="info-item info-item--compact">
              <view class="i-carbon-direction-right-01 text-18px text-teal-500" />
              <view class="info-content">
                <view class="info-title">
                  距离
                </view>
                <view class="info-text">
                  {{ formatDistance(detailQuery.distance) }}
                </view>
              </view>
            </view>
          </view>

          <view class="action-row">
            <view class="action-btn action-btn--primary" @click="openNavigation">
              <view class="i-carbon-navigation text-18px" />
              <text>导航</text>
            </view>
            <view class="action-btn action-btn--secondary" @click="callPhone">
              <view class="i-carbon-phone text-18px" />
              <text>{{ spotDetail.phone ? '电话' : '暂无电话' }}</text>
            </view>
          </view>

          <view class="description-block">
            {{ spotDetail.description }}
          </view>
        </view>

        <view class="content-section">
          <view class="section-header">
            <view>
              <view class="section-title">
                用户评价
              </view>
              <view class="section-subtitle">
                看看大家对这家店的真实反馈
              </view>
            </view>
            <view class="section-action" @click="openReviewPanel">
              写评价
            </view>
          </view>

          <view v-if="reviews.length === 0" class="empty-card">
            还没有评价，来留下第一条印象吧
          </view>

          <view v-for="review in reviews" :key="review.id" class="content-card">
            <view class="content-card__header">
              <view class="review-user">
                <image :src="review.avatar" class="review-avatar" mode="aspectFill" />
                <view>
                  <view class="review-name">
                    {{ review.userName }}
                  </view>
                  <view class="review-time">
                    {{ review.time }}
                  </view>
                </view>
              </view>
              <view class="discussion-actions">
                <view class="review-rating">
                  {{ renderStars(review.rating) }}
                </view>
                <view v-if="review.isMine" class="review-footer review-footer--inline review-footer--action" @click="removeReview(review.id)">
                  <view class="i-carbon-trash-can text-14px text-gray-400" />
                  <text>删除</text>
                </view>
              </view>
            </view>

            <view class="review-content">
              {{ review.content }}
            </view>

            <view v-if="review.images.length" class="review-images">
              <image v-for="image in review.images" :key="image" :src="image" class="review-image" mode="aspectFill" />
            </view>

            <view class="review-footer">
              <view class="i-carbon-thumbs-up text-14px text-gray-400" />
              <text>{{ review.likeCount }}</text>
            </view>
          </view>
        </view>

        <view class="content-section">
          <view class="section-header">
            <view>
              <view class="section-title">
                热门讨论
              </view>
              <view class="section-subtitle">
                周边食客分享的路线和体验信息
              </view>
            </view>
            <view class="section-action" @click="openDiscussionPanel">
              发讨论
            </view>
          </view>

          <view v-if="discussions.length === 0" class="empty-card">
            暂无讨论内容
          </view>

          <view v-for="discussion in discussions" :key="discussion.id" class="content-card content-card--discussion">
            <view class="content-card__header">
              <view class="review-user">
                <image :src="discussion.avatar" class="review-avatar" mode="aspectFill" />
                <view>
                  <view class="review-name">
                    {{ discussion.userName }}
                  </view>
                  <view class="review-time">
                    {{ discussion.time }}
                  </view>
                </view>
              </view>
              <view class="discussion-actions">
                <view v-if="discussion.isMine" class="review-footer review-footer--inline review-footer--action" @click="removeDiscussion(discussion.id)">
                  <view class="i-carbon-trash-can text-14px text-gray-400" />
                  <text>删除</text>
                </view>
                <view class="review-footer review-footer--inline review-footer--action" @click="likeDiscussion(discussion.id)">
                  <view :class="discussion.likedByCurrentUser ? 'i-carbon-thumbs-up-filled text-orange-500' : 'i-carbon-thumbs-up text-gray-400'" class="text-14px" />
                  <text>{{ discussion.likeCount }}</text>
                </view>
              </view>
            </view>

            <view class="review-content">
              {{ discussion.content }}
            </view>
          </view>
        </view>

        <view class="content-section content-section--last">
          <view class="section-header">
            <view>
              <view class="section-title">
                用户笔记
              </view>
              <view class="section-subtitle">
                看看大家整理的探店记录和路线总结
              </view>
            </view>
            <view class="section-action" @click="openNotePanel">
              写笔记
            </view>
          </view>

          <view v-if="notes.length === 0" class="empty-card">
            暂无笔记内容，来整理第一篇探店记录吧
          </view>

          <view v-for="note in notes" :key="note.id" class="content-card content-card--discussion">
            <image :src="note.cover" class="note-cover" mode="aspectFill" />
            <view class="content-card__header mt-12px">
              <view class="review-user">
                <image :src="note.avatar" class="review-avatar" mode="aspectFill" />
                <view>
                  <view class="review-name">
                    {{ note.userName }}
                  </view>
                  <view class="review-time">
                    {{ note.time }}
                  </view>
                </view>
              </view>
            </view>

            <view class="note-title">
              {{ note.title }}
            </view>
            <view class="review-content">
              {{ note.content }}
            </view>
            <view class="review-footer review-footer--action" @click="likeNote(note.id)">
              <view :class="note.likedByCurrentUser ? 'i-carbon-thumbs-up-filled text-orange-500' : 'i-carbon-thumbs-up text-gray-400'" class="text-14px" />
              <text>{{ note.likeCount }}</text>
            </view>
          </view>
        </view>

        <view class="content-section content-section--last">
          <view class="section-header">
            <view>
              <view class="section-title">
                热门问答
              </view>
              <view class="section-subtitle">
                常见排队、点单和路线问题都可以在这里交流
              </view>
            </view>
            <view class="section-action" @click="openQuestionPanel">
              去提问
            </view>
          </view>

          <view v-if="questions.length === 0" class="empty-card">
            暂无问答内容，来提第一个问题吧
          </view>

          <view v-for="question in questions" :key="question.id" class="content-card content-card--discussion">
            <view class="content-card__header">
              <view class="review-user">
                <image :src="question.askerAvatar" class="review-avatar" mode="aspectFill" />
                <view>
                  <view class="review-name">
                    {{ question.asker }}
                  </view>
                  <view class="review-time">
                    {{ question.time }}
                  </view>
                </view>
              </view>
              <view class="section-action section-action--ghost" @click="openAnswerPanel(question.id)">
                回复
              </view>
            </view>

            <view class="question-title">
              {{ question.question }}
            </view>

            <view v-if="question.answers.length === 0" class="question-empty">
              还没有人回复，欢迎分享你的经验
            </view>

            <view v-for="answer in question.answers" :key="answer.id" class="question-answer">
              <image :src="answer.avatar" class="question-answer__avatar" mode="aspectFill" />
              <view class="question-answer__content">
                <view class="question-answer__header">
                  <text class="review-name">{{ answer.userName }}</text>
                  <text class="review-time">{{ answer.time }}</text>
                </view>
                <view class="question-answer__text">
                  {{ answer.content }}
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </template>

    <view v-if="showReviewSheet" class="sheet-overlay" :class="{ 'sheet-overlay--show': sheetVisible }" @click="closeReviewPanel" />
    <view v-if="showReviewSheet" class="review-sheet" :class="{ 'review-sheet--show': sheetVisible }">
      <view class="sheet-handle" />
      <view class="review-sheet__title">
        写评价
      </view>
      <view class="review-star-row">
        <view v-for="star in 5" :key="star" class="review-star" :class="star <= reviewForm.rating ? 'review-star--active' : ''" @click="setReviewRating(star)">
          ★
        </view>
      </view>
      <textarea v-model="reviewForm.content" class="review-textarea" placeholder="分享这次用餐体验、路线建议或者踩坑提醒" :maxlength="500" />
      <view class="submit-btn" @click="submitReview">
        发布评价
      </view>
    </view>

    <view v-if="showDiscussionSheet" class="sheet-overlay" :class="{ 'sheet-overlay--show': discussionSheetVisible }" @click="closeDiscussionPanel" />
    <view v-if="showDiscussionSheet" class="review-sheet" :class="{ 'review-sheet--show': discussionSheetVisible }">
      <view class="sheet-handle" />
      <view class="review-sheet__title">
        发讨论
      </view>
      <textarea v-model="discussionForm.content" class="review-textarea" placeholder="分享路线建议、排队情况、推荐菜或避坑提醒" :maxlength="500" />
      <view class="submit-btn" @click="submitDiscussion">
        发布讨论
      </view>
    </view>

    <view v-if="showNoteSheet" class="sheet-overlay" :class="{ 'sheet-overlay--show': noteSheetVisible }" @click="closeNotePanel" />
    <view v-if="showNoteSheet" class="review-sheet" :class="{ 'review-sheet--show': noteSheetVisible }">
      <view class="sheet-handle" />
      <view class="review-sheet__title">
        写笔记
      </view>
      <input v-model="noteForm.title" class="review-input" placeholder="给这篇笔记起个标题" :maxlength="40">
      <textarea v-model="noteForm.content" class="review-textarea" placeholder="记录推荐菜、排队体验、位置路线和踩坑提醒" :maxlength="2000" />
      <view class="submit-btn" @click="submitNote">
        发布笔记
      </view>
    </view>

    <view v-if="showQuestionSheet" class="sheet-overlay" :class="{ 'sheet-overlay--show': questionSheetVisible }" @click="closeQuestionPanel" />
    <view v-if="showQuestionSheet" class="review-sheet" :class="{ 'review-sheet--show': questionSheetVisible }">
      <view class="sheet-handle" />
      <view class="review-sheet__title">
        发起提问
      </view>
      <textarea v-model="questionForm.question" class="review-textarea" placeholder="例如：几点到店排队更少？适合带老人吗？" :maxlength="500" />
      <view class="submit-btn" @click="submitQuestion">
        发布问题
      </view>
    </view>

    <view v-if="showAnswerSheet" class="sheet-overlay" :class="{ 'sheet-overlay--show': answerSheetVisible }" @click="closeAnswerPanel" />
    <view v-if="showAnswerSheet" class="review-sheet" :class="{ 'review-sheet--show': answerSheetVisible }">
      <view class="sheet-handle" />
      <view class="review-sheet__title">
        回复问题
      </view>
      <textarea v-model="answerForm.content" class="review-textarea" placeholder="结合你的到店体验，给出更真实的建议" :maxlength="500" />
      <view class="submit-btn" @click="submitAnswer">
        发布回复
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top, rgba(255, 153, 102, 0.22), transparent 32%),
    linear-gradient(180deg, #fff5ec 0%, #f7f7f7 42%, #f4f4f4 100%);
  padding-bottom: calc(36px + env(safe-area-inset-bottom));
}

.status-wrap {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.status-text {
  font-size: 14px;
  color: #6b7280;
}

.retry-btn {
  padding: 10px 18px;
  border-radius: 999px;
  background: #ff7d45;
  color: #fff;
  font-size: 13px;
}

.hero-swiper {
  width: 100%;
  height: 420rpx;
}

.hero-image {
  width: 100%;
  height: 100%;
}

.detail-sheet {
  position: relative;
  margin-top: -28px;
  border-radius: 28px 28px 0 0;
  background: #f7f7f7;
  padding: 10px 14px 0;
}

.sheet-handle {
  width: 44px;
  height: 4px;
  border-radius: 999px;
  background: rgba(107, 114, 128, 0.22);
  margin: 0 auto 14px;
}

.hero-card,
.content-section {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.72);
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
}

.hero-card {
  border-radius: 24px;
  padding: 18px;
}

.hero-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.hero-title-wrap {
  flex: 1;
  min-width: 0;
}

.hero-title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
}

.hero-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: #6b7280;
}

.favorite-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 999px;
  background: #fff8f4;
}

.hero-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.metric-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 12px;
  border-radius: 18px;
  background: linear-gradient(180deg, #fffaf7 0%, #fff 100%);
}

.metric-card--wide {
  align-items: flex-start;
}

.metric-value {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.metric-label {
  font-size: 12px;
  color: #9ca3af;
}

.rating-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
}

.rating-stars {
  font-size: 16px;
  color: #f59e0b;
}

.rating-note {
  font-size: 12px;
  color: #6b7280;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.tag-chip {
  padding: 6px 10px;
  border-radius: 999px;
  background: #fff1e7;
  color: #ea580c;
  font-size: 12px;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 18px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.info-item--compact {
  align-items: center;
}

.info-content {
  min-width: 0;
  flex: 1;
}

.info-title {
  font-size: 12px;
  color: #9ca3af;
}

.info-text {
  margin-top: 4px;
  font-size: 14px;
  line-height: 1.6;
  color: #374151;
}

.action-row {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 0;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 600;
}

.action-btn--primary {
  background: linear-gradient(135deg, #ff7a3c 0%, #ff9f67 100%);
  color: #fff;
}

.action-btn--secondary {
  background: #f3f4f6;
  color: #4b5563;
}

.description-block {
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: 18px;
  background: #fffaf6;
  font-size: 14px;
  line-height: 1.8;
  color: #4b5563;
}

.content-section {
  margin-top: 14px;
  border-radius: 24px;
  padding: 18px;
}

.content-section--last {
  margin-bottom: calc(20px + env(safe-area-inset-bottom));
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.section-subtitle {
  margin-top: 6px;
  font-size: 12px;
  color: #9ca3af;
}

.section-action {
  padding: 8px 14px;
  border-radius: 999px;
  background: #fff1e7;
  color: #ea580c;
  font-size: 12px;
}

.section-action--ghost {
  background: #fff;
  border: 1px solid #fed7aa;
}

.empty-card {
  padding: 22px 14px;
  text-align: center;
  border-radius: 18px;
  background: #fafafa;
  color: #9ca3af;
  font-size: 13px;
}

.content-card {
  padding: 16px;
  border-radius: 20px;
  background: #fafafa;
  margin-top: 12px;
}

.content-card--discussion {
  background: linear-gradient(180deg, #f8fbff 0%, #f9fafb 100%);
}

.content-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.review-user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.review-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.review-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.review-time {
  margin-top: 4px;
  font-size: 11px;
  color: #9ca3af;
}

.review-rating {
  font-size: 14px;
  color: #f59e0b;
}

.review-content {
  margin-top: 12px;
  font-size: 14px;
  line-height: 1.8;
  color: #4b5563;
}

.review-images {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  overflow-x: auto;
}

.review-image {
  width: 96px;
  height: 96px;
  border-radius: 14px;
  flex-shrink: 0;
}

.review-footer {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  color: #9ca3af;
  font-size: 12px;
}

.review-footer--inline {
  margin-top: 0;
}

.review-footer--action {
  cursor: pointer;
}

.discussion-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0);
  z-index: 999;
  transition: background 0.26s ease;
}

.sheet-overlay--show {
  background: rgba(15, 23, 42, 0.45);
}

.review-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  padding: 12px 18px calc(18px + env(safe-area-inset-bottom));
  background: #fff;
  border-radius: 24px 24px 0 0;
  transform: translateY(100%);
  transition: transform 0.26s ease;
}

.review-sheet--show {
  transform: translateY(0);
}

.review-input {
  width: 100%;
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #f8fafc;
  font-size: 14px;
  color: #111827;
}

.note-cover {
  width: 100%;
  height: 180rpx;
  border-radius: 16px;
}

.note-title {
  margin-top: 12px;
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.question-title {
  margin-top: 12px;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.7;
  color: #111827;
}

.question-empty {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  color: #9ca3af;
}

.question-answer {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
}

.question-answer__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
}

.question-answer__content {
  min-width: 0;
  flex: 1;
}

.question-answer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.question-answer__text {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.7;
  color: #4b5563;
}

.review-sheet__title {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  text-align: center;
}

.review-star-row {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 18px;
}

.review-star {
  font-size: 28px;
  color: #d1d5db;
}

.review-star--active {
  color: #f59e0b;
}

.review-textarea {
  width: 100%;
  height: 140px;
  margin-top: 18px;
  padding: 14px;
  border-radius: 16px;
  background: #f5f5f5;
  box-sizing: border-box;
  font-size: 14px;
  color: #374151;
}

.submit-btn {
  margin-top: 16px;
  padding: 14px 0;
  text-align: center;
  border-radius: 16px;
  background: linear-gradient(135deg, #ff7a3c 0%, #ff9f67 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}
</style>
