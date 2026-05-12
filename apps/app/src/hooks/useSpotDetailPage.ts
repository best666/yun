import type { IUploadSuccessInfo } from '@/api/types/login'
import type { ISpotDetail, ISpotDetailQuery } from '@/api/types/spot'
import { createSpotReview, createSpotReviewReply, deleteMySpotReviewReply, toggleSpotReviewLike } from '@/api/spot'
import { useFavoriteStore, useFootprintStore, useMapSettingStore, useTokenStore, useUserContentStore, useUserStore } from '@/store'
import { getEnvBaseUrl } from '@/utils'
import { openNavigationWithPreference } from '@/utils/mapNavigation'
import { fetchAndCacheSpotDetail, getCachedSpotDetail } from '@/utils/spotDetailCache'
import { normalizeSpotReview, normalizeSpotReviewReply } from '@/utils/spotDetailNormalize'
import { toLoginPage } from '@/utils/toLoginPage'

type DetailTabKey = 'heat' | 'reviews'
type SpotMoreContentType = 'discussions' | 'reviews'
type ReviewSortKey = 'time' | 'hot'

const DETAIL_BACK_SWIPE_THRESHOLD = 72
const DETAIL_PREVIEW_COUNT = 3
const HEAT_TO_REVIEW_SCROLL_TOP = 440
const REVIEW_MAX_IMAGE_COUNT = 3
const DETAIL_SHEET_CLOSE_DELAY = 260

function createSheetController() {
  const rendered = ref(false)
  const visible = ref(false)
  let closeTimer: ReturnType<typeof setTimeout> | null = null

  function clearCloseTimer() {
    if (closeTimer) {
      clearTimeout(closeTimer)
      closeTimer = null
    }
  }

  function open() {
    clearCloseTimer()
    rendered.value = true

    nextTick(() => {
      visible.value = true
    })
  }

  function close(afterClose?: () => void) {
    visible.value = false
    clearCloseTimer()
    closeTimer = setTimeout(() => {
      rendered.value = false
      closeTimer = null
      afterClose?.()
    }, DETAIL_SHEET_CLOSE_DELAY)
  }

  onScopeDispose(() => {
    clearCloseTimer()
  })

  return {
    rendered,
    visible,
    open,
    close,
  }
}

export function useSpotDetailPage() {
  const favoriteStore = useFavoriteStore()
  const footprintStore = useFootprintStore()
  const tokenStore = useTokenStore()
  const userContentStore = useUserContentStore()
  const userStore = useUserStore()
  const mapSettingStore = useMapSettingStore()

  const spotIdentity = ref('')
  const loading = ref(true)
  const loadError = ref('')
  const enteredFromMap = ref(false)
  const activeTab = ref<DetailTabKey>('heat')
  const reviewReplyTargetId = ref('')
  const highlightedReviewId = ref('')
  const detailTouchStartY = ref(0)
  const detailTouchEndY = ref(0)
  const detailScrollTop = ref(0)
  const isUploadingReviewImage = ref(false)

  const reviewSheetController = createSheetController()
  const reviewReplySheetController = createSheetController()

  const reviewForm = reactive({
    rating: 5,
    content: '',
    images: [] as string[],
    locationName: '',
    locationAddress: '',
  })

  const reviewReplyForm = reactive({
    content: '',
  })

  const detailQuery = reactive<ISpotDetailQuery>({})
  const spotDetail = ref<ISpotDetail | null>(null)

  const isPersistedSpot = computed(() => /^\d+$/.test(spotIdentity.value))
  const reviews = computed(() => spotDetail.value?.reviews ?? [])
  const previewReviews = computed(() => buildPreviewReviewList(reviews.value, highlightedReviewId.value))
  const reviewReplyTarget = computed(() => {
    return reviews.value.find(review => review.id === reviewReplyTargetId.value) || null
  })
  const detailDistance = computed(() => detailQuery.distance)

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

  const travelSummaryText = computed(() => {
    if (!spotDetail.value) {
      return ''
    }

    return spotDetail.value.routeTip
  })

  const shareTitle = computed(() => {
    if (!spotDetail.value) {
      return '地点详情'
    }

    return `${spotDetail.value.name} | ${spotDetail.value.rating.toFixed(1)}分推荐`
  })

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

  onShareAppMessage(() => {
    return {
      title: shareTitle.value,
      path: buildSpotDetailSharePath(),
      imageUrl: spotDetail.value?.cover,
    }
  })

  onShareTimeline(() => {
    return {
      title: shareTitle.value,
      query: buildSpotDetailShareQuery(),
      imageUrl: spotDetail.value?.cover,
    }
  })

  function parseNumberValue(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return undefined
    }

    const parsedValue = Number(value)
    return Number.isFinite(parsedValue) ? parsedValue : undefined
  }

  function appendQueryParam(queryList: string[], key: string, value: string | number | undefined) {
    if (value === undefined || value === null || value === '') {
      return
    }

    queryList.push(`${key}=${encodeURIComponent(String(value))}`)
  }

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

  function getReviewAnchorId(reviewId: string) {
    return `review-card-${reviewId}`
  }

  function isHighlightedReview(reviewId: string) {
    return highlightedReviewId.value === reviewId
  }

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

  function buildSpotDetailSharePath() {
    const queryString = buildSpotDetailShareQuery()
    return queryString ? `/pages/spot/detail?${queryString}` : '/pages/spot/detail'
  }

  function buildSpotMorePagePath(contentType: SpotMoreContentType) {
    const queryString = buildSpotDetailShareQuery()
    const typeQuery = `type=${encodeURIComponent(contentType)}`

    return queryString ? `/pages/spot/more?${typeQuery}&${queryString}` : `/pages/spot/more?${typeQuery}`
  }

  function buildReviewMorePagePath(sortKey: ReviewSortKey, withImagesOnly = false) {
    const queryString = buildSpotDetailShareQuery()
    const extraQuery = [
      'type=reviews',
      `sort=${encodeURIComponent(sortKey)}`,
      `withImages=${withImagesOnly ? '1' : '0'}`,
    ].join('&')

    return queryString ? `/pages/spot/more?${extraQuery}&${queryString}` : `/pages/spot/more?${extraQuery}`
  }

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

  function resetReviewForm(initialRating = 5) {
    reviewForm.rating = initialRating
    reviewForm.content = ''
    reviewForm.images = []
    reviewForm.locationName = ''
    reviewForm.locationAddress = ''
  }

  async function fetchSpotDetail() {
    loading.value = true
    loadError.value = ''

    const detailQuerySnapshot = { ...detailQuery }
    const cachedDetail = getCachedSpotDetail(detailQuerySnapshot)

    if (cachedDetail) {
      spotDetail.value = cachedDetail
      spotIdentity.value = cachedDetail.id
      loading.value = false
    }

    try {
      spotDetail.value = await fetchAndCacheSpotDetail(detailQuerySnapshot, !cachedDetail)
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
      if (cachedDetail) {
        console.error('刷新地点详情失败，已回退到预取缓存', error)
        return
      }

      spotDetail.value = null
      loadError.value = '地点详情加载失败，请稍后重试'
      console.error('加载地点详情失败', error)
    }
    finally {
      loading.value = false
    }
  }

  function goBack() {
    const pageStack = getCurrentPages()

    if (pageStack.length > 1) {
      uni.navigateBack()
      return
    }

    uni.switchTab({ url: '/pages/index/index' })
  }

  function copyText(text: string, toastTitle: string) {
    uni.setClipboardData({
      data: text,
      success: () => {
        uni.showToast({ title: toastTitle, icon: 'none' })
      },
    })
  }

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

  function previewImages(images: string[], current: string) {
    if (!images.length) {
      return
    }

    uni.previewImage({
      urls: images,
      current,
    })
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

  function openMorePage(contentType: SpotMoreContentType) {
    uni.navigateTo({
      url: buildSpotMorePagePath(contentType),
    })
  }

  function openHotReviewPage() {
    uni.navigateTo({
      url: buildReviewMorePagePath('hot'),
    })
  }

  function callPhone() {
    if (!spotDetail.value?.phone) {
      uni.showToast({ title: '暂无联系电话', icon: 'none' })
      return
    }

    uni.makePhoneCall({ phoneNumber: spotDetail.value.phone })
  }

  function switchTab(tabKey: DetailTabKey) {
    activeTab.value = tabKey
  }

  function ensureLoggedIn() {
    if (!tokenStore.updateNowTime().hasLogin) {
      toLoginPage()
      return false
    }

    return true
  }

  function ensurePersistedSpotReady() {
    if (!isPersistedSpot.value) {
      uni.showToast({ title: '地点信息尚未准备好，请稍后重试', icon: 'none' })
      return false
    }

    return true
  }

  function openReviewPanel() {
    if (!ensureLoggedIn() || !ensurePersistedSpotReady()) {
      return
    }

    resetReviewForm(5)
    reviewSheetController.open()
  }

  function openReviewPanelWithRating(star: number) {
    if (!ensureLoggedIn() || !ensurePersistedSpotReady()) {
      return
    }

    resetReviewForm(star)
    reviewSheetController.open()
  }

  function closeReviewPanel() {
    reviewSheetController.close(() => {
      isUploadingReviewImage.value = false
    })
  }

  function addReviewImage() {
    if (reviewForm.images.length >= REVIEW_MAX_IMAGE_COUNT) {
      uni.showToast({ title: `最多上传${REVIEW_MAX_IMAGE_COUNT}张图片`, icon: 'none' })
      return
    }

    isUploadingReviewImage.value = true
    runReviewImageUpload()
  }

  function removeReviewImage(imageUrl: string) {
    reviewForm.images = reviewForm.images.filter(item => item !== imageUrl)
  }

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

  function clearReviewLocation() {
    reviewForm.locationName = ''
    reviewForm.locationAddress = ''
  }

  function openReviewReplyPanel(reviewId: string) {
    if (!ensureLoggedIn()) {
      return
    }

    reviewReplyTargetId.value = reviewId
    reviewReplyForm.content = ''
    reviewReplySheetController.open()
  }

  function closeReviewReplyPanel() {
    reviewReplySheetController.close(() => {
      reviewReplyTargetId.value = ''
    })
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
        images: reviewForm.images,
        locationName: reviewForm.locationName || undefined,
        locationAddress: reviewForm.locationAddress || undefined,
      })
      const normalizedReview = normalizeSpotReview(createdReview)

      userContentStore.addReview({
        id: normalizedReview.id,
        spotId: Number(spotIdentity.value),
        spotName: spotDetail.value.name,
        userName: normalizedReview.userName || userStore.userInfo.nickname || '美食探索者',
        avatar: normalizedReview.avatar || userStore.userInfo.avatar,
        rating: normalizedReview.rating,
        content: normalizedReview.content,
        images: normalizedReview.images,
        locationName: normalizedReview.locationName,
        locationAddress: normalizedReview.locationAddress,
        time: normalizedReview.time,
        likeCount: normalizedReview.likeCount,
        likedByCurrentUser: normalizedReview.likedByCurrentUser,
        replyCount: normalizedReview.replyCount,
        replies: normalizedReview.replies,
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

  async function likeReview(reviewId: string) {
    if (!ensureLoggedIn() || !spotDetail.value) {
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
      const normalizedReply = normalizeSpotReviewReply(createdReply)

      review.replies = [...review.replies, normalizedReply]
      review.replyCount = review.replies.length
      closeReviewReplyPanel()
      uni.showToast({ title: '回复已发布', icon: 'success' })
    }
    catch (error) {
      console.error('发布评价回复失败', error)
    }
  }

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

  function onDetailTouchStart(event: any) {
    detailTouchStartY.value = event.touches?.[0]?.clientY ?? 0
    detailTouchEndY.value = detailTouchStartY.value
  }

  function onDetailTouchMove(event: any) {
    detailTouchEndY.value = event.touches?.[0]?.clientY ?? detailTouchEndY.value
  }

  function onDetailTouchEnd() {
    if (!enteredFromMap.value || detailScrollTop.value > 8) {
      return
    }

    const swipeDistance = detailTouchEndY.value - detailTouchStartY.value
    if (swipeDistance > DETAIL_BACK_SWIPE_THRESHOLD) {
      goBack()
    }
  }

  return {
    activeTab,
    loading,
    loadError,
    showReviewSheet: reviewSheetController.rendered,
    sheetVisible: reviewSheetController.visible,
    showReviewReplySheet: reviewReplySheetController.rendered,
    reviewReplySheetVisible: reviewReplySheetController.visible,
    reviewForm,
    reviewReplyForm,
    spotDetail,
    previewReviews,
    highlightedReviewId,
    reviewReplyTarget,
    detailDistance,
    isFavorited,
    favoriteDisplayCount,
    fetchSpotDetail,
    goBack,
    shareSpot,
    previewImages,
    toggleFavorite,
    openNavigation,
    openMorePage,
    openHotReviewPage,
    callPhone,
    switchTab,
    openReviewPanel,
    openReviewPanelWithRating,
    closeReviewPanel,
    addReviewImage,
    isUploadingReviewImage,
    removeReviewImage,
    chooseReviewLocation,
    clearReviewLocation,
    openReviewReplyPanel,
    closeReviewReplyPanel,
    setReviewRating,
    submitReview,
    likeReview,
    submitReviewReply,
    removeReviewReply,
    removeReview,
    onDetailTouchStart,
    onDetailTouchMove,
    onDetailTouchEnd,
  }
}
