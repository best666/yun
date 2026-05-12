<script lang="ts" setup>
import type { IUploadSuccessInfo } from '@/api/types/login'
import type { ISpotDetail, ISpotDetailQuery } from '@/api/types/spot'
import { createSpotDiscussion, createSpotReview, createSpotReviewReply, deleteMySpotReviewReply, getSpotDetail, toggleSpotDiscussionLike, toggleSpotReviewLike } from '@/api/spot'
import { useFavoriteStore, useFootprintStore, useMapSettingStore, useTokenStore, useUserContentStore, useUserStore } from '@/store'
import { getEnvBaseUrl } from '@/utils'
import { openNavigationWithPreference } from '@/utils/mapNavigation'
import { toLoginPage } from '@/utils/toLoginPage'

/** 详情内容 tab，用于在热度和评价之间切换。 */
type DetailTabKey = 'heat' | 'reviews'

/** 更多页内容类型，用于承接详情页的完整列表展示。 */
type SpotMoreContentType = 'discussions' | 'reviews'

/** 更多页评价排序类型，便于详情页跳转时带上默认排序。 */
type ReviewSortKey = 'time' | 'hot'

/** 详情页下划返回阈值，避免轻微滑动触发离开页面。 */
const DETAIL_BACK_SWIPE_THRESHOLD = 72
/** 详情页默认预览条数，避免首屏信息过长压缩头图。 */
const DETAIL_PREVIEW_COUNT = 3
/** 热度页继续下滑时自动切到评价 tab，让浏览路径更接近内容产品。 */
const HEAT_TO_REVIEW_SCROLL_TOP = 440
/** 现场评价最多上传的图片数量，控制弹层操作复杂度。 */
const REVIEW_MAX_IMAGE_COUNT = 3

/** 详情 tab 配置，单独声明是为了模板渲染更稳定。 */
const DETAIL_TABS: Array<{ key: DetailTabKey, label: string }> = [
  { key: 'heat', label: '热度' },
  { key: 'reviews', label: '评价' },
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
/** 评价回复弹层是否挂载。 */
const showReviewReplySheet = ref(false)
/** 评价回复弹层动画状态。 */
const reviewReplySheetVisible = ref(false)
/** 当前准备回复的评价 ID。 */
const reviewReplyTargetId = ref('')
/** 互动提醒跳转时目标评价 ID，用于把具体评价带到当前视口。 */
const highlightedReviewId = ref('')
/** 详情页触摸起点 Y 坐标。 */
const detailTouchStartY = ref(0)
/** 详情页触摸终点 Y 坐标。 */
const detailTouchEndY = ref(0)
/** 当前页面滚动位置，仅在页顶允许下划返回。 */
const detailScrollTop = ref(0)
/** 评价图片上传中状态，避免用户连续点击触发重复上传。 */
const isUploadingReviewImage = ref(false)

/** 评价表单，单独存放是为了关闭弹层时可以完整重置。 */
const reviewForm = reactive({
  rating: 5,
  content: '',
  images: [] as string[],
  locationName: '',
  locationAddress: '',
})

/** 讨论表单。 */
const discussionForm = reactive({
  content: '',
})

/** 评价回复表单，单独维护避免和问答回复串值。 */
const reviewReplyForm = reactive({
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
/** 评价按热度排序后的列表，当前真实数据只基于点赞数、有图优先级和时间兜底。 */
const hotReviews = computed(() => {
  return [...reviews.value].sort((leftReview, rightReview) => {
    const interactionDelta = getReviewHeatScore(rightReview) - getReviewHeatScore(leftReview)
    if (interactionDelta !== 0) {
      return interactionDelta
    }

    if (rightReview.replyCount !== leftReview.replyCount) {
      return rightReview.replyCount - leftReview.replyCount
    }

    if (rightReview.images.length !== leftReview.images.length) {
      return rightReview.images.length - leftReview.images.length
    }

    return (Date.parse(rightReview.time) || 0) - (Date.parse(leftReview.time) || 0)
  })
})
/** 评价预览列表。 */
const previewReviews = computed(() => buildPreviewReviewList(reviews.value, highlightedReviewId.value))
/** 热度区预览列表，只展示高互动评价。 */
const previewHotReviews = computed(() => hotReviews.value.slice(0, DETAIL_PREVIEW_COUNT))
/** 当前地点是否存在联系电话，用来控制右侧电话按钮显隐。 */
const hasSpotPhone = computed(() => Boolean(spotDetail.value?.phone))
/** 是否还有更多评价未展示。 */
const hasMoreReviews = computed(() => reviews.value.length > previewReviews.value.length)
/** 热度区是否还有更多评价未展示。 */
const hasMoreHotReviews = computed(() => hotReviews.value.length > previewHotReviews.value.length)
/** 当前用户是否还没有留下评价，用于强化首评入口。 */
const hasNoReviews = computed(() => reviews.value.length === 0)
/** 评价入口说明文案。 */
const reviewEntryHintText = computed(() => {
  return hasNoReviews.value ? '还没有评价，点亮星星发布第一条现场评价' : '为这家店补充你的真实体验和图片'
})
/** 当前已选择的现场定位展示文案。 */
const reviewLocationLabel = computed(() => {
  return [reviewForm.locationName, reviewForm.locationAddress].filter(Boolean).join(' · ')
})
/** 当前评价回复目标，用于弹层顶部提示回复对象。 */
const reviewReplyTarget = computed(() => {
  return reviews.value.find(review => review.id === reviewReplyTargetId.value) || null
})

/** 评价图片上传器，复用现有上传 hook，把上传后的地址写回表单。 */
const { run: runReviewImageUpload } = useUpload<'image'>({
  success: (uploadResult: IUploadSuccessInfo | string | Record<string, any>) => {
    const reviewImageUrl = resolveUploadedFileUrl(uploadResult)
    if (!reviewImageUrl) {
      uni.showToast({ title: '图片地址解析失败', icon: 'none' })
      return
    }

    reviewForm.images = [...reviewForm.images, reviewImageUrl].slice(0, REVIEW_MAX_IMAGE_COUNT)
    isUploadingReviewImage.value = false
  },
  error: () => {
    isUploadingReviewImage.value = false
    uni.showToast({ title: '图片上传失败', icon: 'none' })
  },
})

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
    { label: '高赞评价', count: hotReviews.value.filter(review => review.likeCount > 0).length },
    { label: '有图评价', count: reviews.value.filter(review => review.images.length > 0).length },
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

/** 分享主标题，优先突出地点名称和评分。 */
const shareTitle = computed(() => {
  if (!spotDetail.value) {
    return '地点详情'
  }

  return `${spotDetail.value.name} | ${spotDetail.value.rating.toFixed(1)}分推荐`
})

/** 分享摘要文案，用于复制和 H5 原生分享。 */
const shareSummaryText = computed(() => {
  if (!spotDetail.value) {
    return ''
  }

  return [spotDetail.value.name, spotDetail.value.address, travelSummaryText.value].filter(Boolean).join('\n')
})

onLoad((query) => {
  spotIdentity.value = String(query?.id || '')
  enteredFromMap.value = query?.source === 'map'
  activeTab.value = query?.tab === 'reviews' ? 'reviews' : 'heat'
  highlightedReviewId.value = typeof query?.reviewId === 'string' ? query.reviewId : ''
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

watch(activeTab, (tabKey) => {
  if (tabKey === 'reviews' && highlightedReviewId.value) {
    scrollToHighlightedReview()
  }
})

onPageScroll((event) => {
  detailScrollTop.value = event.scrollTop

  if (activeTab.value === 'heat' && event.scrollTop >= HEAT_TO_REVIEW_SCROLL_TOP) {
    activeTab.value = 'reviews'
    return
  }

  if (activeTab.value === 'reviews' && event.scrollTop <= HEAT_TO_REVIEW_SCROLL_TOP / 2) {
    activeTab.value = 'heat'
  }
})

/** 小程序分享给好友时使用真实详情链接，避免只分享当前会话态。 */
onShareAppMessage(() => {
  return {
    title: shareTitle.value,
    path: buildSpotDetailSharePath(),
    imageUrl: spotDetail.value?.cover,
  }
})

/** 小程序分享到朋友圈时复用相同内容，减少不同平台文案割裂。 */
onShareTimeline(() => {
  return {
    title: shareTitle.value,
    query: buildSpotDetailShareQuery(),
    imageUrl: spotDetail.value?.cover,
  }
})

/** 把 query 中的数字参数安全转换成 number，避免 NaN 进入接口。 */
function parseNumberValue(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : undefined
}

/** 向 query 列表安全追加参数，避免 undefined 进入分享链接。 */
function appendQueryParam(queryList: string[], key: string, value: string | number | undefined) {
  if (value === undefined || value === null || value === '') {
    return
  }

  queryList.push(`${key}=${encodeURIComponent(String(value))}`)
}

/** 互动跳转时优先把目标评价塞进预览列表，避免只因排序截断而找不到目标内容。 */
function buildPreviewReviewList(sourceReviews: NonNullable<ISpotDetail['reviews']>, targetReviewId: string, limit = DETAIL_PREVIEW_COUNT) {
  const defaultPreviewReviews = sourceReviews.slice(0, limit)
  if (!targetReviewId || defaultPreviewReviews.some(review => review.id === targetReviewId)) {
    return defaultPreviewReviews
  }

  const targetReview = sourceReviews.find(review => review.id === targetReviewId)
  if (!targetReview) {
    return defaultPreviewReviews
  }

  return [...defaultPreviewReviews.slice(0, Math.max(limit - 1, 0)), targetReview]
}

/** 评价卡片锚点，供通知跳转后滚动定位使用。 */
function getReviewAnchorId(reviewId: string) {
  return `review-card-${reviewId}`
}

/** 判断某条评价是否是提醒命中的目标，用于添加高亮样式。 */
function isHighlightedReview(reviewId: string) {
  return highlightedReviewId.value === reviewId
}

/** 提醒跳转到详情后，自动滚动到目标评价附近，减少用户二次查找。 */
function scrollToHighlightedReview() {
  if (!highlightedReviewId.value) {
    return
  }

  nextTick(() => {
    let reviewRect: UniApp.NodeInfo | null = null
    let viewportRect: UniApp.NodeInfo | null = null
    const selectorQuery = uni.createSelectorQuery()
    selectorQuery.select(`#${getReviewAnchorId(highlightedReviewId.value)}`).boundingClientRect((result) => {
      reviewRect = result as UniApp.NodeInfo
    })
    selectorQuery.selectViewport().scrollOffset((result) => {
      viewportRect = result as UniApp.NodeInfo
    })
    selectorQuery.exec(() => {
      if (!reviewRect || !viewportRect) {
        return
      }

      uni.pageScrollTo({
        scrollTop: Math.max((reviewRect.top || 0) + (viewportRect.scrollTop || 0) - 96, 0),
        duration: 280,
      })
    })
  })
}

/** 构建当前详情页的 query 参数，更多页和分享都会复用。 */
function buildSpotDetailShareQuery() {
  const queryList: string[] = []

  appendQueryParam(queryList, 'id', spotIdentity.value)
  appendQueryParam(queryList, 'title', detailQuery.title)
  appendQueryParam(queryList, 'address', detailQuery.address)
  appendQueryParam(queryList, 'latitude', detailQuery.latitude)
  appendQueryParam(queryList, 'longitude', detailQuery.longitude)
  appendQueryParam(queryList, 'distance', detailQuery.distance)
  appendQueryParam(queryList, 'category', detailQuery.category)
  appendQueryParam(queryList, 'district', detailQuery.district)
  appendQueryParam(queryList, 'provider', detailQuery.provider)

  return queryList.join('&')
}

/** 构建当前详情页完整分享路径，确保外部打开后还能还原地点上下文。 */
function buildSpotDetailSharePath() {
  const queryString = buildSpotDetailShareQuery()
  return queryString ? `/pages/spot/detail?${queryString}` : '/pages/spot/detail'
}

/** 构建“更多内容”页面路径，承接完整列表。 */
function buildSpotMorePagePath(contentType: SpotMoreContentType) {
  const queryString = buildSpotDetailShareQuery()
  const typeQuery = `type=${encodeURIComponent(contentType)}`

  return queryString ? `/pages/spot/more?${typeQuery}&${queryString}` : `/pages/spot/more?${typeQuery}`
}

/** 构建评价更多页路径，可附带默认排序和筛选状态。 */
function buildReviewMorePagePath(sortKey: ReviewSortKey, withImagesOnly = false) {
  const queryString = buildSpotDetailShareQuery()
  const extraQuery = [
    'type=reviews',
    `sort=${encodeURIComponent(sortKey)}`,
    `withImages=${withImagesOnly ? '1' : '0'}`,
  ].join('&')

  return queryString ? `/pages/spot/more?${extraQuery}&${queryString}` : `/pages/spot/more?${extraQuery}`
}

/** 上传结果可能返回完整 URL 或相对路径，这里统一规范成可直接展示的地址。 */
function resolveUploadedFileUrl(uploadResult: IUploadSuccessInfo | string | Record<string, any>) {
  const uploadResultRecord = typeof uploadResult === 'object' && uploadResult !== null
    ? uploadResult as Record<string, any>
    : null
  const rawUrl = typeof uploadResult === 'string'
    ? uploadResult
    : String(uploadResultRecord?.storagePath || uploadResultRecord?.url || '')

  if (!rawUrl) {
    return ''
  }

  if (/^https?:\/\//.test(rawUrl)) {
    return rawUrl
  }

  return `${getEnvBaseUrl().replace(/\/$/, '')}/${rawUrl.replace(/^\//, '')}`
}

/** 重置评价表单，确保再次打开弹层时不会残留上一次的图片和定位。 */
function resetReviewForm(initialRating = 5) {
  reviewForm.rating = initialRating
  reviewForm.content = ''
  reviewForm.images = []
  reviewForm.locationName = ''
  reviewForm.locationAddress = ''
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

    if (activeTab.value === 'reviews' && highlightedReviewId.value) {
      scrollToHighlightedReview()
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

/** 复制文本到剪贴板，统一处理成功提示。 */
function copyText(text: string, toastTitle: string) {
  uni.setClipboardData({
    data: text,
    success: () => {
      uni.showToast({ title: toastTitle, icon: 'none' })
    },
  })
}

/** 分享按钮优先使用原生分享，降级时提供复制地点信息和复制链接。 */
async function shareSpot() {
  if (!spotDetail.value) {
    return
  }

  const sharePath = buildSpotDetailSharePath()
  const shareText = shareSummaryText.value

  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: shareTitle.value,
        text: shareText,
        url: new URL(sharePath, window.location.origin).toString(),
      })
      return
    }
    catch (error: any) {
      if (error?.name === 'AbortError') {
        return
      }

      console.error('H5 分享失败，已降级为复制操作', error)
    }
  }

  uni.showActionSheet({
    itemList: ['复制地点信息', '复制详情链接'],
    success: (result) => {
      if (result.tapIndex === 0) {
        copyText(shareText, '地点信息已复制')
        return
      }

      copyText(sharePath, '详情链接已复制')
    },
  })
}

/** 星级渲染保留半星简化表达，符合当前页面轻量展示需求。 */
function renderStars(rating: number) {
  return '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '☆' : '')
}

/** 评价热度分数由点赞数和回复数共同决定，避免只看单一维度。 */
function getReviewHeatScore(review: NonNullable<ISpotDetail['reviews']>[number]) {
  return review.likeCount + review.replyCount
}

/** 评价下方只预览少量回复，避免卡片高度失控。 */
function getPreviewReviewReplies(review: NonNullable<ISpotDetail['reviews']>[number]) {
  return review.replies.slice(0, 2)
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

/** 打开完整内容页，承接详情页未展示的剩余真实内容。 */
function openMorePage(contentType: SpotMoreContentType) {
  uni.navigateTo({
    url: buildSpotMorePagePath(contentType),
  })
}

/** 从热度区进入更多评价页时默认按热度排序。 */
function openHotReviewPage() {
  uni.navigateTo({
    url: buildReviewMorePagePath('hot'),
  })
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

  resetReviewForm(5)
  showReviewSheet.value = true

  nextTick(() => {
    sheetVisible.value = true
  })
}

/** 点击评分入口时可以带着目标星级打开评价弹层，减少用户额外点击。 */
function openReviewPanelWithRating(star: number) {
  if (!tokenStore.updateNowTime().hasLogin) {
    toLoginPage()
    return
  }

  if (!isPersistedSpot.value) {
    uni.showToast({ title: '地点信息尚未准备好，请稍后重试', icon: 'none' })
    return
  }

  resetReviewForm(star)
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
    isUploadingReviewImage.value = false
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

/** 给评价添加图片，达到上限时直接提示。 */
function addReviewImage() {
  if (reviewForm.images.length >= REVIEW_MAX_IMAGE_COUNT) {
    uni.showToast({ title: `最多上传${REVIEW_MAX_IMAGE_COUNT}张图片`, icon: 'none' })
    return
  }

  isUploadingReviewImage.value = true
  runReviewImageUpload()
}

/** 删除评价里的某一张图片。 */
function removeReviewImage(imageUrl: string) {
  reviewForm.images = reviewForm.images.filter(item => item !== imageUrl)
}

/** 给评价补充现场定位，优先使用 chooseLocation 让用户明确确认位置。 */
function chooseReviewLocation() {
  uni.chooseLocation({
    success: (locationResult) => {
      reviewForm.locationName = locationResult.name || spotDetail.value?.name || ''
      reviewForm.locationAddress = locationResult.address || spotDetail.value?.address || ''
    },
    fail: () => {
      uni.showToast({ title: '定位选择已取消', icon: 'none' })
    },
  })
}

/** 清空评价中已附加的定位信息。 */
function clearReviewLocation() {
  reviewForm.locationName = ''
  reviewForm.locationAddress = ''
}

/** 打开评价回复弹层并记录当前回复目标。 */
function openReviewReplyPanel(reviewId: string) {
  if (!tokenStore.updateNowTime().hasLogin) {
    toLoginPage()
    return
  }

  reviewReplyTargetId.value = reviewId
  reviewReplyForm.content = ''
  showReviewReplySheet.value = true

  nextTick(() => {
    reviewReplySheetVisible.value = true
  })
}

/** 关闭评价回复弹层并清空目标评价。 */
function closeReviewReplyPanel() {
  reviewReplySheetVisible.value = false
  setTimeout(() => {
    showReviewReplySheet.value = false
    reviewReplyTargetId.value = ''
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
      images: reviewForm.images,
      locationName: reviewForm.locationName || undefined,
      locationAddress: reviewForm.locationAddress || undefined,
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
      locationName: createdReview.locationName,
      locationAddress: createdReview.locationAddress,
      time: createdReview.time,
      likeCount: createdReview.likeCount,
      likedByCurrentUser: createdReview.likedByCurrentUser,
      replyCount: createdReview.replyCount,
      replies: createdReview.replies,
      isMine: true,
    })

    await fetchSpotDetail()
    activeTab.value = 'reviews'
    closeReviewPanel()
    uni.showToast({ title: '评价成功', icon: 'success' })
  }
  catch (error) {
    console.error('提交评价失败', error)
  }
}

/** 评价点赞切到真实接口后，热度排序会即时反映点赞变化。 */
async function likeReview(reviewId: string) {
  if (!tokenStore.updateNowTime().hasLogin) {
    toLoginPage()
    return
  }

  if (!spotDetail.value) {
    return
  }

  const review = spotDetail.value.reviews.find(item => item.id === reviewId)
  if (!review) {
    return
  }

  try {
    const result = await toggleSpotReviewLike({
      reviewId: Number(reviewId),
    })

    review.likedByCurrentUser = result.liked
    review.likeCount = result.likeCount
  }
  catch (error) {
    console.error('评价点赞失败', error)
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

/** 提交评价回复后就地更新目标评价的回复列表和回复数。 */
async function submitReviewReply() {
  if (!spotDetail.value || !reviewReplyTargetId.value) {
    return
  }

  if (!reviewReplyForm.content.trim()) {
    uni.showToast({ title: '请输入回复内容', icon: 'none' })
    return
  }

  const review = spotDetail.value.reviews.find(item => item.id === reviewReplyTargetId.value)
  if (!review) {
    return
  }

  try {
    const createdReply = await createSpotReviewReply({
      reviewId: Number(reviewReplyTargetId.value),
      content: reviewReplyForm.content.trim(),
    })

    review.replies = [...review.replies, createdReply]
    review.replyCount = review.replies.length
    closeReviewReplyPanel()
    uni.showToast({ title: '回复已发布', icon: 'success' })
  }
  catch (error) {
    console.error('发布评价回复失败', error)
  }
}

/** 删除评价回复，优先在详情页原位更新，减少用户返回我的页处理。 */
async function removeReviewReply(reviewId: string, replyId: string) {
  if (!spotDetail.value) {
    return
  }

  uni.showModal({
    title: '提示',
    content: '确定要删除这条回复吗？',
    success: async (res) => {
      if (!res.confirm) {
        return
      }

      try {
        await deleteMySpotReviewReply(Number(replyId))

        const review = spotDetail.value?.reviews.find(item => item.id === reviewId)
        if (!review) {
          return
        }

        review.replies = review.replies.filter(item => item.id !== replyId)
        review.replyCount = review.replies.length
        uni.showToast({ title: '已删除', icon: 'none' })
      }
      catch (error) {
        console.error('删除评价回复失败', error)
      }
    },
  })
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
              <text class="hero-address-arrow">›</text>
            </view>
          </view>
        </view>

        <!-- 右侧操作区：导航常驻，存在电话时并排补充电话入口。 -->
        <view class="hero-side-actions">
          <view class="hero-side-btn" @click="openNavigation">
            <view class="i-carbon-location-filled text-22px text-white" />
            <text class="hero-side-btn__text">导航</text>
          </view>
          <view v-if="hasSpotPhone" class="hero-side-btn" @click="callPhone">
            <view class="i-carbon-phone text-22px text-white" />
            <text class="hero-side-btn__text">电话</text>
          </view>
        </view>
      </view>

      <!-- 白色内容承接区：通过更轻的白色面板承接头图，弱化工具感，靠近小红书内容页质感。 -->
      <view class="detail-shell">
        <view class="quick-review-card">
          <view class="quick-review-card__top">
            <view>
              <view class="quick-review-card__title">
                {{ hasNoReviews ? '点亮评分，发布首条评价' : '现场评价' }}
              </view>
              <view class="quick-review-card__subtitle">
                {{ reviewEntryHintText }}
              </view>
            </view>
            <view class="quick-review-card__action" @click="openReviewPanel">
              去评价
            </view>
          </view>

          <view class="quick-review-stars">
            <view
              v-for="star in 5"
              :key="`quick-star-${star}`"
              class="quick-review-star"
              @click="openReviewPanelWithRating(star)"
            >
              ★
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

        <!-- 热度页：只展示评价里的高互动内容，更多时进入评价页按热度继续浏览。 -->
        <view v-if="activeTab === 'heat'" class="content-panel">
          <view class="panel-section">
            <view class="panel-header">
              <view>
                <view class="panel-title">
                  热门评价
                </view>
                <view class="panel-subtitle">
                  优先展示点赞更高、图片更完整的真实评价，继续下滑会自动切到评价
                </view>
              </view>
              <view class="panel-header__actions">
                <view v-if="hasMoreHotReviews" class="panel-link" @click="openHotReviewPage">
                  更多谈论
                  <text class="panel-link__arrow">›</text>
                </view>
                <view class="panel-action" @click="openReviewPanel">
                  写评价
                </view>
              </view>
            </view>

            <view v-if="heatSummaryChips.length" class="summary-chip-row">
              <view v-for="chip in heatSummaryChips" :key="chip.label" class="summary-chip">
                {{ chip.label }} {{ chip.count }}
              </view>
            </view>

            <view v-if="hotReviews.length === 0" class="empty-card">
              暂无热门评价，来留下第一条到店体验吧
            </view>

            <view v-for="review in previewHotReviews" :key="review.id" class="content-card content-card--white">
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
                  <view v-if="review.images.length" class="hot-review-tag">
                    有图
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

              <view v-if="review.locationName || review.locationAddress" class="review-location-row">
                <view class="i-carbon-location-filled text-14px text-orange-500" />
                <text class="review-location-row__text">
                  {{ review.locationName || review.locationAddress }}
                </text>
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
                <view class="mini-action" @click="likeReview(review.id)">
                  <view :class="review.likedByCurrentUser ? 'i-carbon-thumbs-up-filled text-orange-500' : 'i-carbon-thumbs-up text-14px text-gray-400'" class="text-14px" />
                  <text>{{ review.likeCount }}</text>
                </view>
                <view class="mini-action" @click="openReviewReplyPanel(review.id)">
                  <view class="i-carbon-chat text-14px text-gray-400" />
                  <text>{{ review.replyCount }}</text>
                </view>
              </view>

              <view v-if="review.replies.length" class="review-reply-list">
                <view v-for="reply in getPreviewReviewReplies(review)" :key="reply.id" class="review-reply-item">
                  <image :src="reply.avatar" class="review-reply-item__avatar" mode="aspectFill" />
                  <view class="review-reply-item__body">
                    <view class="review-reply-item__header">
                      <text class="author-name author-name--compact">{{ reply.userName }}</text>
                      <view class="review-reply-item__actions">
                        <text class="author-time">{{ reply.time }}</text>
                        <view v-if="reply.isMine" class="mini-action" @click="removeReviewReply(review.id, reply.id)">
                          <view class="i-carbon-trash-can text-12px text-gray-400" />
                        </view>
                      </view>
                    </view>
                    <view class="review-reply-item__text">
                      {{ reply.content }}
                    </view>
                  </view>
                </view>
                <view v-if="review.replyCount > getPreviewReviewReplies(review).length" class="review-reply-more" @click="openHotReviewPage">
                  查看全部 {{ review.replyCount }} 条回复
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 评价页：笔记位替换成真实评价流，专门承接评分、图文和现场定位内容。 -->
        <view v-else class="content-panel">
          <view class="panel-section panel-section--split">
            <view class="panel-header">
              <view>
                <view class="panel-title">
                  用户评价
                </view>
                <view class="panel-subtitle">
                  评分、图文和现场定位都会展示在这里
                </view>
              </view>
              <view class="panel-header__actions">
                <view v-if="hasMoreReviews" class="panel-link" @click="openMorePage('reviews')">
                  全部
                  <text class="panel-link__arrow">›</text>
                </view>
                <view class="panel-action" @click="openReviewPanel">
                  写评价
                </view>
              </view>
            </view>

            <view v-if="reviews.length === 0" class="empty-card">
              还没有评价，来留下第一条印象吧
            </view>

            <view
              v-for="review in previewReviews"
              :id="getReviewAnchorId(review.id)"
              :key="review.id"
              class="content-card content-card--white"
              :class="{ 'content-card--highlight': isHighlightedReview(review.id) }"
            >
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

              <view v-if="review.locationName || review.locationAddress" class="review-location-row">
                <view class="i-carbon-location-filled text-14px text-orange-500" />
                <text class="review-location-row__text">
                  {{ review.locationName || review.locationAddress }}
                </text>
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
                <view class="mini-action" @click="likeReview(review.id)">
                  <view :class="review.likedByCurrentUser ? 'i-carbon-thumbs-up-filled text-orange-500' : 'i-carbon-thumbs-up text-14px text-gray-400'" class="text-14px" />
                  <text>{{ review.likeCount }}</text>
                </view>
                <view class="mini-action" @click="openReviewReplyPanel(review.id)">
                  <view class="i-carbon-chat text-14px text-gray-400" />
                  <text>{{ review.replyCount }}</text>
                </view>
              </view>

              <view v-if="review.replies.length" class="review-reply-list">
                <view v-for="reply in getPreviewReviewReplies(review)" :key="reply.id" class="review-reply-item">
                  <image :src="reply.avatar" class="review-reply-item__avatar" mode="aspectFill" />
                  <view class="review-reply-item__body">
                    <view class="review-reply-item__header">
                      <text class="author-name author-name--compact">{{ reply.userName }}</text>
                      <view class="review-reply-item__actions">
                        <text class="author-time">{{ reply.time }}</text>
                        <view v-if="reply.isMine" class="mini-action" @click="removeReviewReply(review.id, reply.id)">
                          <view class="i-carbon-trash-can text-12px text-gray-400" />
                        </view>
                      </view>
                    </view>
                    <view class="review-reply-item__text">
                      {{ reply.content }}
                    </view>
                  </view>
                </view>
                <view v-if="review.replyCount > getPreviewReviewReplies(review).length" class="review-reply-more" @click="openMorePage('reviews')">
                  查看全部 {{ review.replyCount }} 条回复
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
        现场评价
      </view>
      <view class="review-star-row">
        <view v-for="star in 5" :key="star" class="review-star" :class="star <= reviewForm.rating ? 'review-star--active' : ''" @click="setReviewRating(star)">
          ★
        </view>
      </view>
      <view class="review-sheet__toolbar">
        <view class="review-sheet__toolbar-btn" @click="addReviewImage">
          <view class="i-carbon-image text-16px text-orange-500" />
          <text>{{ isUploadingReviewImage ? '上传中...' : '添加图片' }}</text>
        </view>
        <view class="review-sheet__toolbar-btn" @click="chooseReviewLocation">
          <view class="i-carbon-location-filled text-16px text-orange-500" />
          <text>{{ reviewLocationLabel ? '重新定位' : '添加定位' }}</text>
        </view>
      </view>
      <view v-if="reviewForm.images.length" class="review-image-row">
        <view v-for="image in reviewForm.images" :key="image" class="review-image-card">
          <image :src="image" class="review-image-card__image" mode="aspectFill" @click="previewImages(reviewForm.images, image)" />
          <view class="review-image-card__remove" @click="removeReviewImage(image)">
            ×
          </view>
        </view>
      </view>
      <view v-if="reviewLocationLabel" class="review-location-pill">
        <view class="i-carbon-location-filled text-14px text-orange-500" />
        <text class="review-location-pill__text">{{ reviewLocationLabel }}</text>
        <view class="review-location-pill__clear" @click="clearReviewLocation">
          清除
        </view>
      </view>
      <textarea v-model="reviewForm.content" class="review-textarea" placeholder="分享这次到店体验、路线建议或者踩坑提醒" :maxlength="500" />
      <view class="submit-btn" @click="submitReview">
        发布现场评价
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

    <view v-if="showReviewReplySheet" class="sheet-overlay" :class="{ 'sheet-overlay--show': reviewReplySheetVisible }" @click="closeReviewReplyPanel" />
    <view v-if="showReviewReplySheet" class="review-sheet" :class="{ 'review-sheet--show': reviewReplySheetVisible }">
      <view class="sheet-handle" />
      <view class="review-sheet__title">
        回复评价
      </view>
      <view v-if="reviewReplyTarget" class="reply-target-card">
        <view class="reply-target-card__name">
          回复 {{ reviewReplyTarget.userName }}
        </view>
        <view class="reply-target-card__content">
          {{ reviewReplyTarget.content }}
        </view>
      </view>
      <textarea v-model="reviewReplyForm.content" class="review-textarea" placeholder="补充路线建议、避坑提醒或到店体验" :maxlength="500" />
      <view class="submit-btn" @click="submitReviewReply">
        发布评价回复
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
  right: 92px;
  bottom: 34px;
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
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.24;
  color: #fff;
}

.hero-rating-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.hero-stars {
  font-size: 15px;
  color: #ff6740;
}

.hero-rating-value,
.hero-rating-count {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.96);
}

.hero-rating-divider {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.56);
}

.hero-favorite-pill {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  backdrop-filter: blur(10px);
}

.hero-favorite-pill__text {
  font-size: 13px;
}

.hero-summary-line {
  margin-top: 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.88);
}

.hero-category-line {
  margin-top: 8px;
  font-size: 14px;
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
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(10px);
}

.hero-meta-chip--soft {
  background: rgba(255, 255, 255, 0.08);
}

.hero-address-block {
  margin-top: 14px;
}

.hero-address-text {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 500;
  color: #fff;
}

.hero-address-arrow {
  font-size: 13px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.84);
}

.hero-route-text {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.8);
}

.hero-side-actions {
  position: absolute;
  right: 16px;
  bottom: 42px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.hero-side-btn {
  width: 56px;
  height: 56px;
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(14, 23, 39, 0.32);
  border: 1px solid rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(12px);
}

.hero-side-btn__text {
  font-size: 11px;
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

.quick-review-card {
  margin-top: 10px;
  padding: 16px 16px 14px;
  border-radius: 24px;
  background: linear-gradient(135deg, #fff7f2 0%, #ffffff 100%);
  border: 1px solid rgba(255, 177, 141, 0.34);
  box-shadow: 0 10px 24px rgba(239, 90, 50, 0.08);
}

.quick-review-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.quick-review-card__title {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.quick-review-card__subtitle {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: #6b7280;
}

.quick-review-card__action {
  flex-shrink: 0;
  padding: 8px 12px;
  border-radius: 999px;
  background: #ffede6;
  color: #ef5a32;
  font-size: 12px;
}

.quick-review-stars {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
}

.quick-review-star {
  font-size: 24px;
  line-height: 1;
  color: #ff7a3c;
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

.panel-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
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

.panel-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: #9ca3af;
  font-size: 12px;
}

.panel-link__arrow {
  font-size: 13px;
  line-height: 1;
}

.panel-action--ghost {
  background: #fff;
  border: 1px solid #fed7aa;
}

.question-card {
  background: linear-gradient(180deg, #fff8f3 0%, #ffffff 100%);
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

.content-card--highlight {
  border: 1px solid rgba(239, 90, 50, 0.28);
  box-shadow: 0 12px 26px rgba(239, 90, 50, 0.12);
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

.review-location-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
}

.review-location-row__text {
  font-size: 12px;
  line-height: 1.6;
  color: #9a3412;
}

.hot-review-tag {
  padding: 5px 9px;
  border-radius: 999px;
  background: #fff1e8;
  color: #ef5a32;
  font-size: 11px;
}

.review-reply-list {
  margin-top: 12px;
  padding: 12px;
  border-radius: 16px;
  background: #f8f9fb;
}

.review-reply-item {
  display: flex;
  gap: 10px;
}

.review-reply-item + .review-reply-item {
  margin-top: 10px;
}

.review-reply-item__avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
}

.review-reply-item__body {
  min-width: 0;
  flex: 1;
}

.review-reply-item__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.review-reply-item__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.review-reply-item__text {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.7;
  color: #4b5563;
}

.review-reply-more {
  margin-top: 10px;
  font-size: 12px;
  color: #ef5a32;
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

.review-sheet__toolbar {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.review-sheet__toolbar-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 14px;
  background: #fff7f2;
  color: #ef5a32;
  font-size: 12px;
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
  margin-top: 14px;
  padding: 14px;
  border-radius: 16px;
  background: #f5f5f5;
  box-sizing: border-box;
  font-size: 14px;
  color: #374151;
}

.review-image-row {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  margin-top: 14px;
}

.review-image-card {
  position: relative;
  width: 84px;
  height: 84px;
  flex-shrink: 0;
}

.review-image-card__image {
  width: 100%;
  height: 100%;
  border-radius: 14px;
}

.review-image-card__remove {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(17, 24, 39, 0.78);
  color: #fff;
  font-size: 12px;
}

.review-location-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 14px;
  background: #fff7f2;
}

.review-location-pill__text {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #9a3412;
}

.review-location-pill__clear {
  flex-shrink: 0;
  font-size: 12px;
  color: #ef5a32;
}

.reply-target-card {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 16px;
  background: #f8f9fb;
}

.reply-target-card__name {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.reply-target-card__content {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: #6b7280;
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
