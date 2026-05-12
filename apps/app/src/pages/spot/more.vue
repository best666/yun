<script lang="ts" setup>
import type { ISpotDetail, ISpotDetailQuery } from '@/api/types/spot'
import { deleteMySpotReviewReply, toggleSpotDiscussionLike, toggleSpotReviewLike } from '@/api/spot'
import SpotDiscussionCard from '@/components/spot/SpotDiscussionCard.vue'
import SpotQuestionCard from '@/components/spot/SpotQuestionCard.vue'
import SpotReviewCard from '@/components/spot/SpotReviewCard.vue'
import { useTokenStore } from '@/store'
import { fetchAndCacheSpotDetail, getCachedSpotDetail } from '@/utils/spotDetailCache'
import { toLoginPage } from '@/utils/toLoginPage'

type SpotMoreContentType = 'discussions' | 'reviews'
type ReviewSortKey = 'time' | 'hot'
type HeatFeedItem
  = | { type: 'discussion', id: string, sortTime: number, discussion: NonNullable<ISpotDetail['discussions']>[number] }
    | { type: 'question', id: string, sortTime: number, question: NonNullable<ISpotDetail['questions']>[number] }

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

const tokenStore = useTokenStore()

const contentType = ref<SpotMoreContentType>('reviews')
const loading = ref(true)
const loadError = ref('')
const reviewSortKey = ref<ReviewSortKey>('time')
const withImagesOnly = ref(false)
const detailQuery = reactive<ISpotDetailQuery>({})
const spotDetail = ref<ISpotDetail | null>(null)

const pageTitle = computed(() => MORE_PAGE_TITLE_MAP[contentType.value])
const spotName = computed(() => spotDetail.value?.name || detailQuery.title || '地点内容')
const discussions = computed(() => spotDetail.value?.discussions ?? [])
const reviews = computed(() => spotDetail.value?.reviews ?? [])
const questions = computed(() => spotDetail.value?.questions ?? [])

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

function normalizeMoreContentType(value: unknown): SpotMoreContentType {
  if (value === 'discussions' || value === 'reviews') {
    return value
  }

  if (value === 'questions') {
    return 'discussions'
  }

  return 'reviews'
}

function normalizeReviewSortKey(value: unknown): ReviewSortKey {
  return value === 'hot' ? 'hot' : 'time'
}

function parseBooleanFlag(value: unknown) {
  return value === '1' || value === 'true'
}

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
  const nextDetailQuery = { ...detailQuery }
  const cachedDetail = getCachedSpotDetail(nextDetailQuery)

  if (cachedDetail) {
    spotDetail.value = cachedDetail
    loading.value = false
  }

  try {
    spotDetail.value = await fetchAndCacheSpotDetail(nextDetailQuery)
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

function goBack() {
  const pageStack = getCurrentPages()

  if (pageStack.length > 1) {
    uni.navigateBack()
    return
  }

  uni.redirectTo({ url: '/pages/spot/detail' })
}

function getReviewHeatScore(review: NonNullable<ISpotDetail['reviews']>[number]) {
  return review.likeCount + review.replyCount
}

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

function switchReviewSort(sortKey: ReviewSortKey) {
  reviewSortKey.value = sortKey
}

function toggleWithImagesOnly() {
  withImagesOnly.value = !withImagesOnly.value
}
</script>

<template>
  <view class="min-h-screen bg-#f7f7f8 pb-[calc(24px+env(safe-area-inset-bottom))]">
    <view class="sticky top-0 z-10 flex items-center justify-between bg-[rgba(247,247,248,0.96)] px-16px pb-12px pt-[calc(14px+env(safe-area-inset-top))] backdrop-blur-[12px]">
      <view class="h-36px w-36px center rounded-full bg-white" @click="goBack">
        <view class="i-carbon-chevron-left text-18px text-gray-900" />
      </view>
      <view class="min-w-0 flex-1 px-10px text-center">
        <view class="text-17px text-gray-900 font-700">
          {{ pageTitle }}
        </view>
        <view class="mt-4px text-12px text-gray-400">
          {{ spotName }}
        </view>
      </view>
      <view class="h-36px w-36px" />
    </view>

    <view v-if="loading" class="min-h-70vh center flex-col gap-16px">
      <text class="text-14px text-gray-500">正在加载内容...</text>
    </view>

    <view v-else-if="loadError" class="min-h-70vh center flex-col gap-16px">
      <text class="text-14px text-gray-500">{{ loadError }}</text>
      <view class="rounded-full bg-#ff7d45 px-18px py-10px text-13px text-white" @click="fetchSpotDetail">
        重新加载
      </view>
    </view>

    <template v-else-if="spotDetail">
      <view v-if="contentType === 'discussions'" class="px-14px pt-12px">
        <view v-if="heatFeedItems.length === 0" class="rounded-18px bg-white px-14px py-22px text-center text-13px text-gray-400">
          暂无讨论或问答内容
        </view>

        <template v-for="feedItem in heatFeedItems" :key="feedItem.id">
          <SpotDiscussionCard v-if="feedItem.type === 'discussion'" :discussion="feedItem.discussion" @like="likeDiscussion" />
          <SpotQuestionCard v-else :question="feedItem.question" />
        </template>
      </view>

      <view v-else-if="contentType === 'reviews'" class="px-14px pt-12px">
        <view class="mb-12px flex items-center justify-between gap-12px">
          <view class="flex-shrink-0 text-12px text-gray-400">
            排序筛选
          </view>
          <view class="flex flex-wrap justify-end gap-8px">
            <view class="rounded-full bg-white px-12px py-8px text-12px text-gray-500" :class="{ '!bg-gray-900 !text-white': reviewSortKey === 'time' }" @click="switchReviewSort('time')">
              按时间
            </view>
            <view class="rounded-full bg-white px-12px py-8px text-12px text-gray-500" :class="{ '!bg-gray-900 !text-white': reviewSortKey === 'hot' }" @click="switchReviewSort('hot')">
              按热度
            </view>
            <view class="rounded-full bg-white px-12px py-8px text-12px text-gray-500" :class="{ '!bg-gray-900 !text-white': withImagesOnly }" @click="toggleWithImagesOnly">
              只看有图
            </view>
          </view>
        </view>

        <view v-if="filteredReviews.length === 0" class="rounded-18px bg-white px-14px py-22px text-center text-13px text-gray-400">
          暂无评价内容
        </view>

        <SpotReviewCard
          v-for="review in filteredReviews"
          :key="review.id"
          :review="review"
          :reply-limit="3"
          @like="likeReview"
          @remove-reply="removeReviewReply"
        />
      </view>
    </template>
  </view>
</template>
