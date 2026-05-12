<script lang="ts" setup>
import type { ISpotDetail, ISpotDetailQuery } from '@/api/types/spot'
import { deleteMySpotReviewReply, getSpotDetail, toggleSpotDiscussionLike, toggleSpotReviewLike } from '@/api/spot'
import { useTokenStore } from '@/store'
import { toLoginPage } from '@/utils/toLoginPage'

/** 更多页支持的内容类型。 */
type SpotMoreContentType = 'discussions' | 'reviews'

/** 评价列表排序方式。 */
type ReviewSortKey = 'time' | 'hot'

/** 热度流条目类型，把问答并入讨论区统一展示。 */
type HeatFeedItem
  = | { type: 'discussion', id: string, sortTime: number, discussion: NonNullable<ISpotDetail['discussions']>[number] }
    | { type: 'question', id: string, sortTime: number, question: NonNullable<ISpotDetail['questions']>[number] }

/** 更多页标题映射，避免模板里出现分支判断。 */
const MORE_PAGE_TITLE_MAP: Record<SpotMoreContentType, string> = {
  discussions: '全部讨论',
  reviews: '全部评价',
}

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '更多内容',
  },
})

/** 登录态仓库，用于拦截点赞等互动行为。 */
const tokenStore = useTokenStore()
/** 当前内容类型，由详情页通过 query 传入。 */
const contentType = ref<SpotMoreContentType>('reviews')
/** 页面加载态。 */
const loading = ref(true)
/** 页面错误信息。 */
const loadError = ref('')
/** 评价页当前排序方式。 */
const reviewSortKey = ref<ReviewSortKey>('time')
/** 是否只看有图评价。 */
const withImagesOnly = ref(false)
/** 详情查询参数，复用详情接口拿完整真实内容。 */
const detailQuery = reactive<ISpotDetailQuery>({})
/** 当前地点详情实体。 */
const spotDetail = ref<ISpotDetail | null>(null)

/** 当前页面标题。 */
const pageTitle = computed(() => MORE_PAGE_TITLE_MAP[contentType.value])
/** 当前地点名称，用于补充页面标题下的上下文。 */
const spotName = computed(() => spotDetail.value?.name || detailQuery.title || '地点内容')
/** 完整讨论列表。 */
const discussions = computed(() => spotDetail.value?.discussions ?? [])
/** 完整评价列表。 */
const reviews = computed(() => spotDetail.value?.reviews ?? [])
/** 评价筛选排序后的结果，用于承接时间、热度和有图过滤。 */
const filteredReviews = computed(() => {
  const sourceReviews = withImagesOnly.value
    ? reviews.value.filter(review => review.images.length > 0)
    : reviews.value

  return [...sourceReviews].sort((leftReview, rightReview) => {
    if (reviewSortKey.value === 'hot') {
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
    }

    return (Date.parse(rightReview.time) || 0) - (Date.parse(leftReview.time) || 0)
  })
})
/** 完整问答列表。 */
const questions = computed(() => spotDetail.value?.questions ?? [])
/** 讨论与问答合并后的完整热度流。 */
const heatFeedItems = computed<HeatFeedItem[]>(() => {
  const discussionItems = discussions.value.map(item => ({
    type: 'discussion' as const,
    id: `discussion-${item.id}`,
    sortTime: Date.parse(item.time) || 0,
    discussion: item,
  }))
  const questionItems = questions.value.map(item => ({
    type: 'question' as const,
    id: `question-${item.id}`,
    sortTime: Date.parse(item.time) || 0,
    question: item,
  }))

  return [...discussionItems, ...questionItems].sort((leftItem, rightItem) => rightItem.sortTime - leftItem.sortTime)
})

onLoad((query) => {
  contentType.value = normalizeMoreContentType(query?.type)
  reviewSortKey.value = normalizeReviewSortKey(query?.sort)
  withImagesOnly.value = parseBooleanFlag(query?.withImages)
  detailQuery.id = typeof query?.id === 'string' ? query.id : undefined
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

/** 规范化更多页类型，避免 query 异常导致页面白屏。 */
function normalizeMoreContentType(value: unknown): SpotMoreContentType {
  if (value === 'discussions' || value === 'reviews') {
    return value
  }

  if (value === 'questions') {
    return 'discussions'
  }

  return 'reviews'
}

/** 规范化评价排序类型，避免 query 异常导致排序状态不可控。 */
function normalizeReviewSortKey(value: unknown): ReviewSortKey {
  return value === 'hot' ? 'hot' : 'time'
}

/** 解析布尔开关 query，兼容 1/0 和 true/false。 */
function parseBooleanFlag(value: unknown) {
  return value === '1' || value === 'true'
}

/** 把 query 中的数字参数安全转换成 number。 */
function parseNumberValue(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : undefined
}

/** 拉取地点详情，直接复用详情接口拿到完整内容列表。 */
async function fetchSpotDetail() {
  loading.value = true
  loadError.value = ''

  try {
    spotDetail.value = await getSpotDetail({ ...detailQuery })
  }
  catch (error) {
    spotDetail.value = null
    loadError.value = '内容加载失败，请稍后重试'
    console.error('加载更多内容失败', error)
  }
  finally {
    loading.value = false
  }
}

/** 返回上一页。 */
function goBack() {
  const pageStack = getCurrentPages()

  if (pageStack.length > 1) {
    uni.navigateBack()
    return
  }

  uni.redirectTo({ url: '/pages/spot/detail' })
}

/** 星级展示与详情页保持一致。 */
function renderStars(rating: number) {
  return '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '☆' : '')
}

/** 评价热度由点赞和回复共同决定，避免高讨论度评价被时间排序淹没。 */
function getReviewHeatScore(review: NonNullable<ISpotDetail['reviews']>[number]) {
  return review.likeCount + review.replyCount
}

/** 更多页同样只预览一部分回复，避免单条评价高度过长。 */
function getPreviewReviewReplies(review: NonNullable<ISpotDetail['reviews']>[number]) {
  return review.replies.slice(0, 3)
}

/** 图片预览复用 uni 原生能力。 */
function previewImages(images: string[], current: string) {
  if (!images.length) {
    return
  }

  uni.previewImage({
    urls: images,
    current,
  })
}

/** 讨论点赞，保证更多页和详情页交互一致。 */
async function likeDiscussion(discussionId: string) {
  if (!tokenStore.updateNowTime().hasLogin) {
    toLoginPage()
    return
  }

  const discussion = spotDetail.value?.discussions.find(item => item.id === discussionId)
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
    console.error('更多页讨论点赞失败', error)
  }
}

/** 更多页里的评价点赞保持和详情页一致，直接更新真实热度。 */
async function likeReview(reviewId: string) {
  if (!tokenStore.updateNowTime().hasLogin) {
    toLoginPage()
    return
  }

  const review = spotDetail.value?.reviews.find(item => item.id === reviewId)
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
    console.error('更多页评价点赞失败', error)
  }
}

/** 更多页里允许直接删除自己的评价回复，避免来回跳我的页处理。 */
function removeReviewReply(reviewId: string, replyId: string) {
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
        console.error('更多页删除评价回复失败', error)
      }
    },
  })
}

/** 切换评价排序方式。 */
function switchReviewSort(sortKey: ReviewSortKey) {
  reviewSortKey.value = sortKey
}

/** 切换是否只看有图评价。 */
function toggleWithImagesOnly() {
  withImagesOnly.value = !withImagesOnly.value
}
</script>

<template>
  <view class="spot-more-page">
    <view class="more-topbar">
      <view class="more-topbar__back" @click="goBack">
        <view class="i-carbon-chevron-left text-18px text-gray-900" />
      </view>
      <view class="more-topbar__title-wrap">
        <view class="more-topbar__title">
          {{ pageTitle }}
        </view>
        <view class="more-topbar__subtitle">
          {{ spotName }}
        </view>
      </view>
      <view class="more-topbar__placeholder" />
    </view>

    <view v-if="loading" class="status-wrap">
      <text class="status-text">正在加载内容...</text>
    </view>

    <view v-else-if="loadError" class="status-wrap">
      <text class="status-text">{{ loadError }}</text>
      <view class="retry-btn" @click="fetchSpotDetail">
        重新加载
      </view>
    </view>

    <template v-else-if="spotDetail">
      <view v-if="contentType === 'discussions'" class="content-list">
        <view v-if="heatFeedItems.length === 0" class="empty-card">
          暂无讨论或问答内容
        </view>

        <template v-for="feedItem in heatFeedItems" :key="feedItem.id">
          <view v-if="feedItem.type === 'discussion'" class="content-card">
            <view class="content-card__header">
              <view class="author-row">
                <image :src="feedItem.discussion.avatar" class="author-avatar" mode="aspectFill" />
                <view class="author-info">
                  <view class="author-name">
                    {{ feedItem.discussion.userName }}
                  </view>
                  <view class="author-time">
                    {{ feedItem.discussion.time }}
                  </view>
                </view>
              </view>

              <view class="mini-action" @click="likeDiscussion(feedItem.discussion.id)">
                <view :class="feedItem.discussion.likedByCurrentUser ? 'i-carbon-thumbs-up-filled text-orange-500' : 'i-carbon-thumbs-up text-gray-400'" class="text-14px" />
                <text>{{ feedItem.discussion.likeCount }}</text>
              </view>
            </view>

            <view class="card-text">
              {{ feedItem.discussion.content }}
            </view>
          </view>

          <view v-else class="content-card content-card--white">
            <view class="content-card__header">
              <view class="author-row">
                <image :src="feedItem.question.askerAvatar" class="author-avatar" mode="aspectFill" />
                <view class="author-info">
                  <view class="author-name">
                    {{ feedItem.question.asker }}
                  </view>
                  <view class="author-time">
                    {{ feedItem.question.time }}
                  </view>
                </view>
              </view>
            </view>

            <view class="question-title">
              {{ feedItem.question.question }}
            </view>

            <view v-if="feedItem.question.answers.length === 0" class="question-empty">
              还没有人回复，欢迎稍后回来查看
            </view>

            <view v-for="answer in feedItem.question.answers" :key="answer.id" class="answer-card">
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
        </template>
      </view>

      <view v-else-if="contentType === 'reviews'" class="content-list">
        <view class="review-filter-row">
          <view class="review-filter-row__label">
            排序筛选
          </view>
          <view class="review-filter-row__actions">
            <view class="review-filter-chip" :class="{ 'review-filter-chip--active': reviewSortKey === 'time' }" @click="switchReviewSort('time')">
              按时间
            </view>
            <view class="review-filter-chip" :class="{ 'review-filter-chip--active': reviewSortKey === 'hot' }" @click="switchReviewSort('hot')">
              按热度
            </view>
            <view class="review-filter-chip" :class="{ 'review-filter-chip--active': withImagesOnly }" @click="toggleWithImagesOnly">
              只看有图
            </view>
          </view>
        </view>

        <view v-if="filteredReviews.length === 0" class="empty-card">
          暂无评价内容
        </view>

        <view v-for="review in filteredReviews" :key="review.id" class="content-card content-card--white">
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

            <view class="review-side-meta">
              <view v-if="review.images.length" class="hot-review-tag">
                有图
              </view>
              <view class="review-stars">
                {{ renderStars(review.rating) }}
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
              <view :class="review.likedByCurrentUser ? 'i-carbon-thumbs-up-filled text-orange-500' : 'i-carbon-thumbs-up text-gray-400'" class="text-14px" />
              <text>{{ review.likeCount }}</text>
            </view>
            <view class="mini-action">
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
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
/* 更多页容器：保持白底内容页风格，突出完整列表浏览。 */
.spot-more-page {
  min-height: 100vh;
  background: #f7f7f8;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.more-topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(14px + env(safe-area-inset-top)) 16px 12px;
  background: rgba(247, 247, 248, 0.96);
  backdrop-filter: blur(12px);
}

.more-topbar__back,
.more-topbar__placeholder {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.more-topbar__back {
  border-radius: 50%;
  background: #fff;
}

.more-topbar__title-wrap {
  flex: 1;
  min-width: 0;
  text-align: center;
  padding: 0 10px;
}

.more-topbar__title {
  font-size: 17px;
  font-weight: 700;
  color: #111827;
}

.more-topbar__subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #9ca3af;
}

.status-wrap {
  min-height: 70vh;
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

.content-list {
  padding: 12px 14px 0;
}

.review-filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.review-filter-row__label {
  flex-shrink: 0;
  font-size: 12px;
  color: #9ca3af;
}

.review-filter-row__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.review-filter-chip {
  padding: 8px 12px;
  border-radius: 999px;
  background: #ffffff;
  color: #6b7280;
  font-size: 12px;
}

.review-filter-chip--active {
  background: #111827;
  color: #ffffff;
}

.empty-card {
  padding: 22px 14px;
  text-align: center;
  border-radius: 18px;
  background: #fff;
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
  background: #fff;
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

.review-side-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hot-review-tag {
  padding: 5px 9px;
  border-radius: 999px;
  background: #fff1e8;
  color: #ef5a32;
  font-size: 11px;
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
</style>
