<script lang="ts" setup>
import type { ISpotDetail, ISpotDetailQuery } from '@/api/types/spot'
import { createSpotDiscussion, createSpotNote, createSpotQuestion, createSpotQuestionAnswer, createSpotReview, getSpotDetail, toggleSpotDiscussionLike, toggleSpotNoteLike } from '@/api/spot'
import { useFavoriteStore, useFootprintStore, useMapSettingStore, useTokenStore, useUserContentStore, useUserStore } from '@/store'
import { openNavigationWithPreference } from '@/utils/mapNavigation'
import { toLoginPage } from '@/utils/toLoginPage'

/** 详情内容 tab，用于在热度、笔记、问答之间切换。 */
type DetailTabKey = 'heat' | 'notes' | 'questions'

/** 详情页下划返回阈值，避免轻微滑动触发离开页面。 */
const DETAIL_BACK_SWIPE_THRESHOLD = 72

/** 详情 tab 配置，单独声明是为了模板渲染更稳定。 */
const DETAIL_TABS: Array<{ key: DetailTabKey, label: string }> = [
  { key: 'heat', label: '热度' },
  { key: 'notes', label: '笔记' },
  { key: 'questions', label: '问答' },
]

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '地点详情',
  },
})

/** 收藏仓库，用于同步游客态和登录态收藏。 */
const favoriteStore = useFavoriteStore()
/** 足迹仓库，用于记录真实浏览的地点。 */
const footprintStore = useFootprintStore()
/** 登录态仓库，用于拦截未登录的互动行为。 */
const tokenStore = useTokenStore()
/** 用户内容仓库，用于同步我的评价、讨论、笔记和问答。 */
const userContentStore = useUserContentStore()
/** 用户信息仓库，用于回填发布者昵称和头像。 */
const userStore = useUserStore()
/** 地图设置仓库，用于读取首选导航应用。 */
const mapSettingStore = useMapSettingStore()

/** 当前地点标识，可能是内部 spotId，也可能是外部 provider id。 */
const spotIdentity = ref('')
/** 页面加载态，避免首屏出现错位闪烁。 */
const loading = ref(true)
/** 页面加载错误信息。 */
const loadError = ref('')
/** 是否从地图页进入详情，用于控制下划返回交互。 */
const enteredFromMap = ref(false)
/** 当前激活的内容 tab。 */
const activeTab = ref<DetailTabKey>('heat')
/** 评价弹层是否挂载。 */
const showReviewSheet = ref(false)
/** 评价弹层动画可见状态。 */
const sheetVisible = ref(false)
/** 讨论弹层是否挂载。 */
const showDiscussionSheet = ref(false)
/** 讨论弹层动画可见状态。 */
const discussionSheetVisible = ref(false)
/** 笔记弹层是否挂载。 */
const showNoteSheet = ref(false)
/** 笔记弹层动画可见状态。 */
const noteSheetVisible = ref(false)
/** 提问弹层是否挂载。 */
const showQuestionSheet = ref(false)
/** 提问弹层动画可见状态。 */
const questionSheetVisible = ref(false)
/** 回复弹层是否挂载。 */
const showAnswerSheet = ref(false)
/** 回复弹层动画可见状态。 */
const answerSheetVisible = ref(false)
/** 当前准备回复的问题 ID，用来把回复提交到正确的问题下。 */
const answerTargetQuestionId = ref('')
/** 详情页触摸起点 Y 坐标。 */
const detailTouchStartY = ref(0)
/** 详情页触摸终点 Y 坐标。 */
const detailTouchEndY = ref(0)
/** 当前页面滚动位置，仅在页顶允许下划返回。 */
const detailScrollTop = ref(0)

/** 评价表单，单独存放是为了关闭弹层时可以完整重置。 */
const reviewForm = reactive({
  rating: 5,
  content: '',
})

/** 讨论表单。 */
const discussionForm = reactive({
  content: '',
})

/** 笔记表单。 */
const noteForm = reactive({
  title: '',
  content: '',
})

/** 提问表单，避免和其他输入弹层互相污染。 */
const questionForm = reactive({
  question: '',
})

/** 回复表单，和提问分离后可以持续保留回复上下文。 */
const answerForm = reactive({
  content: '',
})

/** 详情查询参数，兼容从收藏、地图搜索、足迹等多个入口进入。 */
const detailQuery = reactive<ISpotDetailQuery>({})
/** 当前地点详情实体，所有展示都以接口真实返回为准。 */
const spotDetail = ref<ISpotDetail | null>(null)

/** 是否已经是后端持久化的内部地点。 */
const isPersistedSpot = computed(() => /^\d+$/.test(spotIdentity.value))
/** 评价列表。 */
const reviews = computed(() => spotDetail.value?.reviews ?? [])
/** 讨论列表。 */
const discussions = computed(() => spotDetail.value?.discussions ?? [])
/** 笔记列表。 */
const notes = computed(() => spotDetail.value?.notes ?? [])
/** 问答列表。 */
const questions = computed(() => spotDetail.value?.questions ?? [])

/** 头图轮播，接口异常缺图时退回封面，避免出现空白首屏。 */
const heroImages = computed(() => {
  if (!spotDetail.value) {
    return []
  }

  return spotDetail.value.images.length ? spotDetail.value.images : [spotDetail.value.cover]
})

/** 收藏态需要兼容游客本地收藏和登录态服务端收藏。 */
const isFavorited = computed(() => {
  if (!spotDetail.value) {
    return false
  }

  return tokenStore.hasLogin ? spotDetail.value.isFavorited : favoriteStore.isFavorited(spotDetail.value.id)
})

/** 收藏数在游客态下叠加本地收藏，避免点击后数字不更新。 */
const favoriteDisplayCount = computed(() => {
  if (!spotDetail.value) {
    return 0
  }

  if (tokenStore.hasLogin) {
    return spotDetail.value.favoriteCount
  }

  return spotDetail.value.favoriteCount + (isFavorited.value ? 1 : 0)
})

/** 评价数优先使用真实列表长度，其次使用接口聚合值。 */
const reviewDisplayCount = computed(() => reviews.value.length || spotDetail.value?.reviewCount || 0)

/** 热度概览芯片全部来自真实内容计数。 */
const heatSummaryChips = computed(() => {
  return [
    { label: '评价', count: reviewDisplayCount.value },
    { label: '讨论', count: discussions.value.length },
    { label: '笔记', count: notes.value.length },
    { label: '问答', count: questions.value.length },
  ].filter(item => item.count > 0)
})

/** 头部高亮信息标签，优先展示更像参考图里的景点卖点标签。 */
const heroHighlightChips = computed(() => {
  if (!spotDetail.value) {
    return []
  }

  return spotDetail.value.tags.filter(Boolean).slice(2, 6)
})

/** 头部分类信息，贴近参考图中“现代建筑 滇池”这一层的简洁表达。 */
const heroCategoryText = computed(() => {
  if (!spotDetail.value) {
    return ''
  }

  return spotDetail.value.tags.slice(0, 2).join('    ')
})

/** 营业信息压缩成单行，用于靠近参考图的状态展示。 */
const heroBusinessText = computed(() => {
  if (!spotDetail.value) {
    return ''
  }

  return [spotDetail.value.businessStatus, spotDetail.value.businessHours].filter(Boolean).join('   ')
})

/** 页面顶部显示的二级信息，优先展示导航标签和距离。 */
const headerSummaryText = computed(() => {
  if (!spotDetail.value) {
    return ''
  }

  const summaryParts = [spotDetail.value.navigationLabel]

  if (detailQuery.distance !== undefined) {
    summaryParts.push(`${formatDistance(detailQuery.distance)} 距离`)
  }

  return summaryParts.filter(Boolean).join(' · ')
})

/** 地址下方的路线辅助文案。 */
const travelSummaryText = computed(() => {
  if (!spotDetail.value) {
    return ''
  }

  return spotDetail.value.routeTip
})

onLoad((query) => {
  spotIdentity.value = String(query?.id || '')
  enteredFromMap.value = query?.source === 'map'
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

onPageScroll((event) => {
  detailScrollTop.value = event.scrollTop
})

/** 把 query 中的数字参数安全转换成 number，避免 NaN 进入接口。 */
function parseNumberValue(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : undefined
}

/** 拉取地点详情，成功后顺便同步收藏和足迹。 */
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

/** 返回上一页；如果没有可返回页面，则回首页，避免白屏。 */
function goBack() {
  const pageStack = getCurrentPages()

  if (pageStack.length > 1) {
    uni.navigateBack()
    return
  }

  uni.switchTab({ url: '/pages/index/index' })
}

/** 分享按钮先退化为复制地点名称和地址，兼容多端且不依赖平台分享面板。 */
function shareSpot() {
  if (!spotDetail.value) {
    return
  }

  uni.setClipboardData({
    data: `${spotDetail.value.name} ${spotDetail.value.address}`,
    success: () => {
      uni.showToast({ title: '地点信息已复制', icon: 'none' })
    },
  })
}

/** 星级渲染保留半星简化表达，符合当前页面轻量展示需求。 */
function renderStars(rating: number) {
  return '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '☆' : '')
}

/** 距离统一格式化为 m/km，避免不同入口展示不一致。 */
function formatDistance(distance?: number) {
  if (typeof distance !== 'number' || Number.isNaN(distance)) {
    return ''
  }

  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(1)}km`
  }

  return `${Math.round(distance)}m`
}

/** 数值过大时转为 w 展示，让头部统计更接近常见内容产品样式。 */
function formatCount(count?: number) {
  if (!count) {
    return '0'
  }

  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}w`
  }

  return String(count)
}

/** 预览图片，复用 uni 原生能力而不是再引入额外预览组件。 */
function previewImages(images: string[], current: string) {
  if (!images.length) {
    return
  }

  uni.previewImage({
    urls: images,
    current,
  })
}

/** 切换收藏，成功后同步当前详情状态。 */
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

/** 使用用户当前偏好的地图应用打开导航。 */
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

/** 拨打商家电话，缺失号码时给出明确反馈。 */
function callPhone() {
  if (!spotDetail.value?.phone) {
    uni.showToast({ title: '暂无联系电话', icon: 'none' })
    return
  }

  uni.makePhoneCall({ phoneNumber: spotDetail.value.phone })
}

/** 切换内容 tab。 */
function switchTab(tabKey: DetailTabKey) {
  activeTab.value = tabKey
}

/** 打开评价弹层。 */
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

/** 关闭评价弹层。 */
function closeReviewPanel() {
  sheetVisible.value = false
  setTimeout(() => {
    showReviewSheet.value = false
  }, 260)
}

/** 打开讨论弹层。 */
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

/** 关闭讨论弹层。 */
function closeDiscussionPanel() {
  discussionSheetVisible.value = false
  setTimeout(() => {
    showDiscussionSheet.value = false
  }, 260)
}

/** 打开笔记弹层。 */
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

/** 关闭笔记弹层。 */
function closeNotePanel() {
  noteSheetVisible.value = false
  setTimeout(() => {
    showNoteSheet.value = false
  }, 260)
}

/** 打开提问弹层。 */
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

/** 关闭提问弹层。 */
function closeQuestionPanel() {
  questionSheetVisible.value = false
  setTimeout(() => {
    showQuestionSheet.value = false
  }, 260)
}

/** 打开回复弹层并记录当前回复目标。 */
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

/** 关闭回复弹层并清空目标问题。 */
function closeAnswerPanel() {
  answerSheetVisible.value = false
  setTimeout(() => {
    showAnswerSheet.value = false
    answerTargetQuestionId.value = ''
  }, 260)
}

/** 设置评价星级。 */
function setReviewRating(star: number) {
  reviewForm.rating = star
}

/** 提交评价并刷新真实详情，确保聚合统计同步。 */
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
    activeTab.value = 'heat'
    closeReviewPanel()
    uni.showToast({ title: '评价成功', icon: 'success' })
  }
  catch (error) {
    console.error('提交评价失败', error)
  }
}

/** 提交讨论后直接插入本地详情，减少额外等待。 */
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
    activeTab.value = 'heat'
    closeDiscussionPanel()
    uni.showToast({ title: '讨论已发布', icon: 'success' })
  }
  catch (error) {
    console.error('发布讨论失败', error)
  }
}

/** 提交笔记后保持在笔记 tab，符合用户心智。 */
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
    activeTab.value = 'notes'
    closeNotePanel()
    uni.showToast({ title: '笔记已发布', icon: 'success' })
  }
  catch (error) {
    console.error('发布笔记失败', error)
  }
}

/** 提交提问后保持在问答 tab，方便继续跟进回复。 */
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
    activeTab.value = 'questions'
    closeQuestionPanel()
    uni.showToast({ title: '提问已发布', icon: 'success' })
  }
  catch (error) {
    console.error('发布提问失败', error)
  }
}

/** 提交回复后就地插入目标问题，避免整页刷新。 */
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
    activeTab.value = 'questions'
    closeAnswerPanel()
    uni.showToast({ title: '回复已发布', icon: 'success' })
  }
  catch (error) {
    console.error('发布回复失败', error)
  }
}

/** 删除评价后同步更新当前列表。 */
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

/** 讨论点赞。 */
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

/** 删除讨论后同步更新当前列表。 */
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

/** 笔记点赞。 */
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

/** 记录详情页触摸起点，仅用于地图来源的下划返回。 */
function onDetailTouchStart(event: any) {
  detailTouchStartY.value = event.touches?.[0]?.clientY ?? 0
  detailTouchEndY.value = detailTouchStartY.value
}

/** 持续更新详情页触摸终点。 */
function onDetailTouchMove(event: any) {
  detailTouchEndY.value = event.touches?.[0]?.clientY ?? detailTouchEndY.value
}

/** 页顶下划时返回地图页，形成和首页上划进入详情的闭环。 */
function onDetailTouchEnd() {
  if (!enteredFromMap.value || detailScrollTop.value > 8) {
    return
  }

  const swipeDistance = detailTouchEndY.value - detailTouchStartY.value
  if (swipeDistance > DETAIL_BACK_SWIPE_THRESHOLD) {
    goBack()
  }
}
</script>

<template>
  <view class="detail-page" @touchstart="onDetailTouchStart" @touchmove="onDetailTouchMove" @touchend="onDetailTouchEnd">
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
      <!-- 沉浸式头图区域：仿照内容社区详情页，把地点核心信息直接压在图片上。 -->
      <view class="hero-section">
        <swiper class="hero-swiper" circular autoplay indicator-dots indicator-color="rgba(255,255,255,0.4)" indicator-active-color="#fff">
          <swiper-item v-for="image in heroImages" :key="image">
            <image :src="image" class="hero-image" mode="aspectFill" />
          </swiper-item>
        </swiper>

        <view class="hero-mask" />

        <view class="hero-topbar">
          <view class="hero-icon-btn" @click="goBack">
            <view class="i-carbon-chevron-left text-20px text-white" />
          </view>

          <view class="hero-topbar__right">
            <view class="hero-icon-btn" @click="toggleFavorite">
              <view :class="isFavorited ? 'i-carbon-favorite-filled text-orange-300' : 'i-carbon-favorite text-white'" class="text-18px" />
            </view>
            <view class="hero-icon-btn" @click="shareSpot">
              <view class="i-carbon-share text-18px text-white" />
            </view>
          </view>
        </view>

        <view class="hero-content">
          <view class="hero-title-row">
            <view class="hero-title-wrap">
              <view class="hero-title">
                {{ spotDetail.name }}
              </view>
              <view class="hero-rating-row">
                <text class="hero-stars">{{ renderStars(spotDetail.rating) }}</text>
                <text class="hero-rating-value">{{ spotDetail.rating.toFixed(1) }}</text>
                <text class="hero-rating-divider">|</text>
                <text class="hero-rating-count">{{ formatCount(reviewDisplayCount) }} 人评价</text>
              </view>
            </view>

            <view class="hero-favorite-pill" @click="toggleFavorite">
              <view :class="isFavorited ? 'i-carbon-favorite-filled text-orange-400' : 'i-carbon-favorite text-white'" class="text-18px" />
              <text class="hero-favorite-pill__text">收藏 {{ formatCount(favoriteDisplayCount) }}</text>
            </view>
          </view>

          <view v-if="headerSummaryText" class="hero-summary-line">
            {{ headerSummaryText }}
          </view>

          <view v-if="heroCategoryText" class="hero-category-line">
            {{ heroCategoryText }}
          </view>

          <view class="hero-meta-chips hero-meta-chips--status">
            <view v-if="heroBusinessText" class="hero-meta-chip hero-meta-chip--soft">
              {{ heroBusinessText }}
            </view>
            <view v-for="chip in heroHighlightChips" :key="chip" class="hero-meta-chip">
              {{ chip }}
            </view>
          </view>

          <view class="hero-address-block">
            <view class="hero-address-text">
              {{ spotDetail.address }}
              <text class="hero-address-arrow"> ></text>
            </view>
            <view class="hero-route-text">
              {{ travelSummaryText }}
            </view>
          </view>
        </view>

        <view class="hero-nav-btn" @click="openNavigation">
          <view class="i-carbon-navigation text-24px text-white" />
          <text class="hero-nav-btn__text">导航</text>
        </view>
      </view>

      <!-- 白色内容承接区：通过更轻的白色面板承接头图，弱化工具感，靠近小红书内容页质感。 -->
      <view class="detail-shell">
        <view class="brief-card">
          <view class="brief-card__summary">
            <view class="brief-card__headline">
              地点简介
            </view>
            <view class="brief-card__description">
              {{ spotDetail.description }}
            </view>
          </view>

          <view class="brief-card__stats">
            <view class="brief-stat">
              <text class="brief-stat__value">{{ spotDetail.rating.toFixed(1) }}</text>
              <text class="brief-stat__label">评分</text>
            </view>
            <view class="brief-stat">
              <text class="brief-stat__value">{{ formatCount(reviewDisplayCount) }}</text>
              <text class="brief-stat__label">评价</text>
            </view>
            <view class="brief-stat">
              <text class="brief-stat__value">¥{{ spotDetail.avgPrice || '--' }}</text>
              <text class="brief-stat__label">人均</text>
            </view>
          </view>

          <view class="detail-actions detail-actions--compact">
            <view class="detail-action" @click="toggleFavorite">
              <view :class="isFavorited ? 'i-carbon-favorite-filled text-orange-500' : 'i-carbon-favorite text-gray-500'" class="text-18px" />
              <text class="detail-action__text">{{ isFavorited ? '已收藏' : '收藏' }}</text>
            </view>
            <view class="detail-action" @click="openNavigation">
              <view class="i-carbon-navigation text-18px text-gray-500" />
              <text class="detail-action__text">路线</text>
            </view>
            <view class="detail-action" @click="callPhone">
              <view class="i-carbon-phone text-18px text-gray-500" />
              <text class="detail-action__text">电话</text>
            </view>
          </view>
        </view>

        <!-- 内容导航：用贴近小红书的细线 tab，而不是厚重的业务分栏。 -->
        <view class="content-tabs-wrap">
          <view class="content-tabs">
            <view
              v-for="tab in DETAIL_TABS"
              :key="tab.key"
              class="content-tab"
              :class="{ 'content-tab--active': activeTab === tab.key }"
              @click="switchTab(tab.key)"
            >
              {{ tab.label }}
            </view>
          </view>
        </view>

        <!-- 热度页：先展示讨论，再承接真实评价，层级更接近社区内容流。 -->
        <view v-if="activeTab === 'heat'" class="content-panel">
          <view class="panel-section">
            <view class="panel-header">
              <view>
                <view class="panel-title">
                  讨论热度
                </view>
                <view class="panel-subtitle">
                  全部来自当前地点的真实内容统计
                </view>
              </view>
              <view class="panel-action" @click="openDiscussionPanel">
                发讨论
              </view>
            </view>

            <view v-if="heatSummaryChips.length" class="summary-chip-row">
              <view v-for="chip in heatSummaryChips" :key="chip.label" class="summary-chip">
                {{ chip.label }} {{ chip.count }}
              </view>
            </view>

            <view v-if="discussions.length === 0" class="empty-card">
              暂无讨论内容，来分享第一条到店体验吧
            </view>

            <view v-for="discussion in discussions" :key="discussion.id" class="content-card">
              <view class="content-card__header">
                <view class="author-row">
                  <image :src="discussion.avatar" class="author-avatar" mode="aspectFill" />
                  <view class="author-info">
                    <view class="author-name">
                      {{ discussion.userName }}
                    </view>
                    <view class="author-time">
                      {{ discussion.time }}
                    </view>
                  </view>
                </view>

                <view class="card-side-actions">
                  <view v-if="discussion.isMine" class="mini-action" @click="removeDiscussion(discussion.id)">
                    <view class="i-carbon-trash-can text-14px text-gray-400" />
                    <text>删除</text>
                  </view>
                  <view class="mini-action" @click="likeDiscussion(discussion.id)">
                    <view :class="discussion.likedByCurrentUser ? 'i-carbon-thumbs-up-filled text-orange-500' : 'i-carbon-thumbs-up text-gray-400'" class="text-14px" />
                    <text>{{ discussion.likeCount }}</text>
                  </view>
                </view>
              </view>

              <view class="card-text">
                {{ discussion.content }}
              </view>
            </view>
          </view>

          <view class="panel-section panel-section--split">
            <view class="panel-header">
              <view>
                <view class="panel-title">
                  用户评价
                </view>
                <view class="panel-subtitle">
                  真实到店反馈会直接影响综合评分
                </view>
              </view>
              <view class="panel-action" @click="openReviewPanel">
                写评价
              </view>
            </view>

            <view v-if="reviews.length === 0" class="empty-card">
              还没有评价，来留下第一条印象吧
            </view>

            <view v-for="review in reviews" :key="review.id" class="content-card content-card--white">
              <view class="content-card__header">
                <view class="author-row">
                  <image :src="review.avatar" class="author-avatar" mode="aspectFill" />
                  <view class="author-info">
                    <view class="author-name">
                      {{ review.userName }}
                    </view>
                    <view class="author-time">
                      {{ review.time }}
                    </view>
                  </view>
                </view>

                <view class="card-side-actions">
                  <view class="review-stars">
                    {{ renderStars(review.rating) }}
                  </view>
                  <view v-if="review.isMine" class="mini-action" @click="removeReview(review.id)">
                    <view class="i-carbon-trash-can text-14px text-gray-400" />
                    <text>删除</text>
                  </view>
                </view>
              </view>

              <view class="card-text">
                {{ review.content }}
              </view>

              <view v-if="review.images.length" class="image-row">
                <image
                  v-for="image in review.images"
                  :key="`${review.id}-${image}`"
                  :src="image"
                  class="content-image"
                  mode="aspectFill"
                  @click="previewImages(review.images, image)"
                />
              </view>

              <view class="card-footer">
                <view class="i-carbon-thumbs-up text-14px text-gray-400" />
                <text>{{ review.likeCount }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 笔记页：改为双列卡片流，让笔记展示更像内容社区而不是列表。 -->
        <view v-else-if="activeTab === 'notes'" class="content-panel">
          <view class="panel-section">
            <view class="panel-header">
              <view>
                <view class="panel-title">
                  用户笔记
                </view>
                <view class="panel-subtitle">
                  真实探店记录与路线心得
                </view>
              </view>
              <view class="panel-action" @click="openNotePanel">
                写笔记
              </view>
            </view>

            <view v-if="notes.length === 0" class="empty-card">
              暂无笔记内容，来整理第一篇探店记录吧
            </view>

            <view v-if="notes.length > 0" class="notes-grid">
              <view v-for="note in notes" :key="note.id" class="note-card">
                <image :src="note.cover" class="note-card__cover" mode="aspectFill" @click="previewImages([note.cover], note.cover)" />

                <view class="note-card__body">
                  <view class="note-card__title">
                    {{ note.title }}
                  </view>
                  <view class="card-text note-card__text">
                    {{ note.content }}
                  </view>

                  <view class="note-card__footer">
                    <view class="author-row author-row--compact">
                      <image :src="note.avatar" class="author-avatar author-avatar--small" mode="aspectFill" />
                      <view class="author-info">
                        <view class="author-name author-name--compact">
                          {{ note.userName }}
                        </view>
                      </view>
                    </view>

                    <view class="mini-action" @click="likeNote(note.id)">
                      <view :class="note.likedByCurrentUser ? 'i-carbon-thumbs-up-filled text-orange-500' : 'i-carbon-thumbs-up text-gray-400'" class="text-14px" />
                      <text>{{ note.likeCount }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 问答页：保留真实问答，但收紧信息密度，避免像表单回执。 -->
        <view v-else class="content-panel">
          <view class="panel-section">
            <view class="panel-header">
              <view>
                <view class="panel-title">
                  热门问答
                </view>
                <view class="panel-subtitle">
                  排队、路线、适合人群等问题都可以直接交流
                </view>
              </view>
              <view class="panel-action" @click="openQuestionPanel">
                去提问
              </view>
            </view>

            <view v-if="questions.length === 0" class="empty-card">
              暂无问答内容，来提第一个问题吧
            </view>

            <view v-for="question in questions" :key="question.id" class="content-card content-card--white">
              <view class="content-card__header">
                <view class="author-row">
                  <image :src="question.askerAvatar" class="author-avatar" mode="aspectFill" />
                  <view class="author-info">
                    <view class="author-name">
                      {{ question.asker }}
                    </view>
                    <view class="author-time">
                      {{ question.time }}
                    </view>
                  </view>
                </view>

                <view class="panel-action panel-action--ghost" @click="openAnswerPanel(question.id)">
                  回复
                </view>
              </view>

              <view class="question-title">
                {{ question.question }}
              </view>

              <view v-if="question.answers.length === 0" class="question-empty">
                还没有人回复，欢迎分享你的经验
              </view>

              <view v-for="answer in question.answers" :key="answer.id" class="answer-card">
                <image :src="answer.avatar" class="answer-card__avatar" mode="aspectFill" />
                <view class="answer-card__content">
                  <view class="answer-card__header">
                    <text class="author-name">{{ answer.userName }}</text>
                    <text class="author-time">{{ answer.time }}</text>
                  </view>
                  <view class="answer-card__text">
                    {{ answer.content }}
                  </view>
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
      <textarea v-model="reviewForm.content" class="review-textarea" placeholder="分享这次到店体验、路线建议或者踩坑提醒" :maxlength="500" />
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
      <textarea v-model="discussionForm.content" class="review-textarea" placeholder="分享路线建议、排队情况、拍照建议或避坑提醒" :maxlength="500" />
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
      <textarea v-model="noteForm.content" class="review-textarea" placeholder="记录亮点、路线、拍照点位和个人感受" :maxlength="2000" />
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
      <textarea v-model="questionForm.question" class="review-textarea" placeholder="例如：几点去人更少？适合带老人或小孩吗？" :maxlength="500" />
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
/* 页面基底：用浅灰白内容背景承接头图，避免传统业务页的厚重感。 */
.detail-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top, rgba(45, 59, 92, 0.14), transparent 34%),
    linear-gradient(180deg, #f7f7f8 0%, #f8f8fa 42%, #f5f5f6 100%);
  padding-bottom: calc(28px + env(safe-area-inset-bottom));
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

/* 头图区：高度拉高、文字更靠下，营造内容社区详情页的沉浸感。 */
.hero-section {
  position: relative;
  height: 720rpx;
  overflow: hidden;
}

.hero-swiper,
.hero-image {
  width: 100%;
  height: 100%;
}

.hero-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(10, 16, 28, 0.08) 0%,
    rgba(10, 16, 28, 0.34) 44%,
    rgba(10, 16, 28, 0.82) 100%
  );
}

.hero-topbar {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(18px + env(safe-area-inset-top));
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 2;
}

.hero-topbar__right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hero-icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.24);
  backdrop-filter: blur(10px);
}

.hero-content {
  position: absolute;
  left: 0;
  right: 88px;
  bottom: 36px;
  z-index: 2;
  padding: 0 20px;
}

.hero-title-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.hero-title-wrap {
  flex: 1;
  min-width: 0;
}

.hero-title {
  font-size: 34px;
  font-weight: 700;
  line-height: 1.2;
  color: #fff;
}

.hero-rating-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.hero-stars {
  font-size: 17px;
  color: #ff6740;
}

.hero-rating-value,
.hero-rating-count {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.96);
}

.hero-rating-divider {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.56);
}

.hero-favorite-pill {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  backdrop-filter: blur(10px);
}

.hero-favorite-pill__text {
  font-size: 14px;
}

.hero-summary-line {
  margin-top: 14px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.88);
}

.hero-category-line {
  margin-top: 10px;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.95);
}

.hero-meta-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.hero-meta-chips--status {
  margin-top: 12px;
}

.hero-meta-chip {
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(10px);
}

.hero-meta-chip--soft {
  background: rgba(255, 255, 255, 0.08);
}

.hero-address-block {
  margin-top: 18px;
}

.hero-address-text {
  font-size: 18px;
  line-height: 1.5;
  font-weight: 600;
  color: #fff;
}

.hero-address-arrow {
  font-size: 15px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.84);
}

.hero-route-text {
  margin-top: 8px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.hero-nav-btn {
  position: absolute;
  right: 16px;
  bottom: 46px;
  z-index: 2;
  width: 56px;
  height: 112px;
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(14, 23, 39, 0.32);
  border: 1px solid rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(12px);
}

.hero-nav-btn__text {
  font-size: 14px;
  color: #fff;
}

/* 白色承接层：通过更大的圆角和更轻的阴影做出内容页的柔和过渡。 */
.detail-shell {
  position: relative;
  z-index: 1;
  margin-top: -32px;
  border-radius: 32px 32px 0 0;
  background: #f8f8fa;
  padding: 14px 12px 0;
}

.brief-card,
.content-tabs-wrap,
.content-panel {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.74);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
  backdrop-filter: blur(14px);
}

/* 简洁摘要卡：替代原先大块概览卡，视觉上更贴近参考图的轻内容承接。 */
.brief-card {
  margin-top: 14px;
  border-radius: 26px;
  padding: 16px;
}

.brief-card__summary {
  padding-bottom: 14px;
  border-bottom: 1px solid #f1f3f5;
}

.brief-card__headline {
  font-size: 17px;
  font-weight: 700;
  color: #111827;
}

.brief-card__description {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.8;
  color: #6b7280;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.brief-card__stats {
  display: flex;
  align-items: stretch;
  margin-top: 14px;
  padding: 4px 0;
}

.brief-stat {
  flex: 1;
  text-align: center;
}

.brief-stat + .brief-stat {
  border-left: 1px solid #f0f1f3;
}

.brief-stat__value {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: #111827;
}

.brief-stat__label {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #9ca3af;
}

.detail-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.detail-actions--compact {
  margin-top: 14px;
}

.detail-action {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px 0;
  border-radius: 20px;
  background: #f7f7f8;
}

.detail-action__text {
  font-size: 12px;
  color: #4b5563;
}

/* tab 区：单独包一层白底，做出参考图里那种“内容已开始”的切换感。 */
.content-tabs-wrap {
  margin-top: 14px;
  border-radius: 24px 24px 0 0;
  padding: 0 18px;
}

.content-tabs {
  display: flex;
  gap: 26px;
  padding: 18px 0 0;
}

.content-tab {
  position: relative;
  padding-bottom: 12px;
  font-size: 17px;
  color: #9ca3af;
  font-weight: 500;
}

.content-tab--active {
  color: #111827;
  font-weight: 700;
}

.content-tab--active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  border-radius: 999px;
  background: #ff5e3a;
}

/* 内容区：保持大面积白底，但减少厚重边框，靠间距去分层。 */
.content-panel {
  margin-top: 0;
  border-radius: 0 0 28px 28px;
  padding: 18px 18px calc(28px + env(safe-area-inset-bottom));
}

.panel-section + .panel-section {
  margin-top: 24px;
}

.panel-section--split {
  padding-top: 4px;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.panel-title {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.panel-subtitle {
  margin-top: 6px;
  font-size: 12px;
  color: #9ca3af;
}

.panel-action {
  flex-shrink: 0;
  padding: 8px 14px;
  border-radius: 999px;
  background: #fff3ee;
  color: #ef5a32;
  font-size: 12px;
}

.panel-action--ghost {
  background: #fff;
  border: 1px solid #fed7aa;
}

.summary-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.summary-chip {
  padding: 9px 14px;
  border-radius: 14px;
  background: #f7f7f8;
  color: #4b5563;
  font-size: 13px;
}

.empty-card {
  padding: 22px 14px;
  text-align: center;
  border-radius: 18px;
  background: #f8f9fb;
  color: #9ca3af;
  font-size: 13px;
}

.content-card,
.note-card {
  margin-top: 12px;
  border-radius: 22px;
  background: linear-gradient(180deg, #f9fbff 0%, #f8fafc 100%);
  padding: 16px;
}

.content-card--white {
  background: #fafafa;
}

.content-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.author-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.author-row--compact {
  gap: 8px;
}

.author-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  flex-shrink: 0;
}

.author-avatar--small {
  width: 30px;
  height: 30px;
}

.author-info {
  min-width: 0;
}

.author-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.author-name--compact {
  font-size: 12px;
}

.author-time {
  margin-top: 4px;
  font-size: 11px;
  color: #9ca3af;
}

.card-side-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mini-action,
.card-footer {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #9ca3af;
  font-size: 12px;
}

.review-stars {
  font-size: 14px;
  color: #f59e0b;
}

.card-text {
  margin-top: 12px;
  font-size: 14px;
  line-height: 1.75;
  color: #374151;
}

.image-row {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  margin-top: 12px;
}

.content-image {
  width: 96px;
  height: 96px;
  border-radius: 16px;
  flex-shrink: 0;
}

.card-footer {
  margin-top: 12px;
}

.note-card {
  padding: 0;
  overflow: hidden;
}

.notes-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.note-card__cover {
  width: 100%;
  height: 260rpx;
}

.note-card__body {
  padding: 14px 12px 12px;
}

.note-card__title {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.5;
  color: #111827;
}

.note-card__text {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.7;
  color: #4b5563;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.note-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 14px;
}

.question-title {
  margin-top: 12px;
  font-size: 16px;
  line-height: 1.7;
  font-weight: 600;
  color: #111827;
}

.question-empty {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #f8f9fb;
  font-size: 12px;
  color: #9ca3af;
}

.answer-card {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  padding: 12px;
  border-radius: 16px;
  background: #f8f9fb;
}

.answer-card__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
}

.answer-card__content {
  min-width: 0;
  flex: 1;
}

.answer-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.answer-card__text {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.75;
  color: #4b5563;
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

.sheet-handle {
  width: 44px;
  height: 4px;
  border-radius: 999px;
  background: rgba(107, 114, 128, 0.22);
  margin: 0 auto 14px;
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

.review-input {
  width: 100%;
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #f8fafc;
  font-size: 14px;
  color: #111827;
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
