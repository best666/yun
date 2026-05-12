<script lang="ts" setup>
import type { ISpotDetail } from '@/api/types/spot'
import SpotDetailBottomSheet from '@/components/spot/SpotDetailBottomSheet.vue'
import SpotDetailHeatPanel from '@/components/spot/SpotDetailHeatPanel.vue'
import SpotDetailHero from '@/components/spot/SpotDetailHero.vue'
import SpotDetailReviewPanel from '@/components/spot/SpotDetailReviewPanel.vue'
import { useSpotDetailPage } from '@/hooks/useSpotDetailPage'
import {
  buildSpotDetailHeatPanelViewModel,
  buildSpotDetailHeroViewModel,
  buildSpotDetailQuickReviewViewModel,
  buildSpotDetailReplyComposerViewModel,
  buildSpotDetailReviewComposerViewModel,
  buildSpotDetailReviewPanelViewModel,
} from '@/utils/spotDetailView'

type DetailTabKey = 'heat' | 'reviews'

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

const {
  activeTab,
  loading,
  loadError,
  showReviewSheet,
  sheetVisible,
  showReviewReplySheet,
  reviewReplySheetVisible,
  reviewForm,
  reviewReplyForm,
  spotDetail,
  previewReviews,
  reviewReplyTarget,
  highlightedReviewId,
  isFavorited,
  favoriteDisplayCount,
  detailDistance,
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
} = useSpotDetailPage()

const reviews = computed(() => spotDetail.value?.reviews ?? [])
const hotReviews = computed(() => {
  return [...reviews.value].sort((leftReview, rightReview) => {
    const interactionDelta = getReviewHeatScore(rightReview) - getReviewHeatScore(leftReview)
    if (interactionDelta !== 0) {
      return interactionDelta
    }

    if (rightReview.replyCount !== leftReview.replyCount) {
      return rightReview.replyCount - leftReview.replyCount
    }

    const rightReviewImages = getReviewImages(rightReview)
    const leftReviewImages = getReviewImages(leftReview)
    if (rightReviewImages.length !== leftReviewImages.length) {
      return rightReviewImages.length - leftReviewImages.length
    }

    return (Date.parse(rightReview.time) || 0) - (Date.parse(leftReview.time) || 0)
  })
})
const previewHotReviews = computed(() => hotReviews.value.slice(0, 3))
const hasMoreReviews = computed(() => reviews.value.length > previewReviews.value.length)
const hasMoreHotReviews = computed(() => hotReviews.value.length > previewHotReviews.value.length)
const hasNoReviews = computed(() => reviews.value.length === 0)
const reviewLocationLabel = computed(() => {
  return [reviewForm.locationName, reviewForm.locationAddress].filter(Boolean).join(' · ')
})
const reviewDisplayCount = computed(() => reviews.value.length || spotDetail.value?.reviewCount || 0)
const heatPanelView = computed(() => {
  return buildSpotDetailHeatPanelViewModel({
    reviewCount: reviewDisplayCount.value,
    hotReviewCount: hotReviews.value.filter(review => review.likeCount > 0).length,
    reviewWithImagesCount: reviews.value.filter(review => getReviewImages(review).length > 0).length,
    hasMore: hasMoreHotReviews.value,
  })
})
const reviewPanelView = computed(() => {
  return buildSpotDetailReviewPanelViewModel(hasMoreReviews.value)
})
const quickReviewView = computed(() => {
  return buildSpotDetailQuickReviewViewModel(hasNoReviews.value)
})
const reviewComposerView = computed(() => {
  return buildSpotDetailReviewComposerViewModel({
    isUploadingImage: isUploadingReviewImage.value,
    hasLocation: Boolean(reviewLocationLabel.value),
    locationLabel: reviewLocationLabel.value,
  })
})
const replyComposerView = computed(() => {
  return buildSpotDetailReplyComposerViewModel({
    targetUserName: reviewReplyTarget.value?.userName,
    targetContent: reviewReplyTarget.value?.content,
  })
})
const heroView = computed(() => {
  if (!spotDetail.value) {
    return null
  }

  return buildSpotDetailHeroViewModel(spotDetail.value, {
    distance: detailDistance.value,
    favoriteCount: favoriteDisplayCount.value,
    reviewCount: reviewDisplayCount.value,
  })
})

function getReviewHeatScore(review: NonNullable<ISpotDetail['reviews']>[number]) {
  return review.likeCount + review.replyCount
}

function getReviewImages(review: NonNullable<ISpotDetail['reviews']>[number]) {
  return Array.isArray(review.images) ? review.images : []
}

function getReviewAnchorId(reviewId: string) {
  return `review-card-${reviewId}`
}

function isHighlightedReview(reviewId: string) {
  return highlightedReviewId.value === reviewId
}
</script>

<template>
  <view class="min-h-screen bg-[radial-gradient(circle_at_top,rgba(45,59,92,0.14),transparent_34%),linear-gradient(180deg,#f7f7f8_0%,#f8f8fa_42%,#f5f5f6_100%)] pb-[calc(28px+env(safe-area-inset-bottom))]" @touchstart="onDetailTouchStart" @touchmove="onDetailTouchMove" @touchend="onDetailTouchEnd">
    <view v-if="loading" class="spot-detail-status-wrap">
      <text class="spot-detail-status-text">正在加载地点详情...</text>
    </view>

    <view v-else-if="loadError" class="spot-detail-status-wrap">
      <text class="spot-detail-status-text">{{ loadError }}</text>
      <view class="spot-detail-retry-btn" @click="fetchSpotDetail">
        重新加载
      </view>
    </view>

    <template v-else-if="spotDetail">
      <SpotDetailHero
        v-if="heroView"
        :hero="heroView"
        :is-favorited="isFavorited"
        @back="goBack"
        @toggle-favorite="toggleFavorite"
        @share="shareSpot"
        @open-navigation="openNavigation"
        @call-phone="callPhone"
      />

      <!-- 白色内容承接区：通过更轻的白色面板承接头图，弱化工具感，靠近小红书内容页质感。 -->
      <view class="relative z-1 mt--32px rounded-t-32px bg-#f8f8fa px-12px pt-14px">
        <view class="mt-10px border border-[rgba(255,177,141,0.34)] rounded-24px bg-[linear-gradient(135deg,#fff7f2_0%,#ffffff_100%)] px-16px pb-14px pt-16px shadow-[0_10px_24px_rgba(239,90,50,0.08)]">
          <view class="flex items-start justify-between gap-12px">
            <view>
              <view class="text-16px text-#111827 font-700">
                {{ quickReviewView.title }}
              </view>
              <view class="mt-6px text-12px text-gray-500 leading-1.6">
                {{ quickReviewView.subtitle }}
              </view>
            </view>
            <view class="flex-shrink-0 rounded-full bg-#ffede6 px-12px py-8px text-12px text-#ef5a32" @click="openReviewPanel">
              {{ quickReviewView.actionText }}
            </view>
          </view>

          <view class="mt-14px flex items-center gap-10px">
            <view
              v-for="star in 5"
              :key="`quick-star-${star}`"
              class="text-24px text-#ff7a3c leading-1"
              @click="openReviewPanelWithRating(star)"
            >
              ★
            </view>
          </view>
        </view>

        <!-- 内容导航：用贴近小红书的细线 tab，而不是厚重的业务分栏。 -->
        <view class="mt-14px border border-[rgba(255,255,255,0.74)] rounded-t-24px bg-[rgba(255,255,255,0.94)] px-18px shadow-[0_10px_28px_rgba(15,23,42,0.05)] backdrop-blur-[14px]">
          <view class="flex gap-26px pt-18px">
            <view
              v-for="tab in DETAIL_TABS"
              :key="tab.key"
              class="relative pb-12px text-17px text-gray-400 font-500"
              :class="activeTab === tab.key ? 'text-#111827 font-700 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-3px after:rounded-full after:bg-#ff5e3a after:content-[\'\']' : ''"
              @click="switchTab(tab.key)"
            >
              {{ tab.label }}
            </view>
          </view>
        </view>

        <SpotDetailHeatPanel
          v-if="activeTab === 'heat'"
          :panel="heatPanelView.panel"
          :reviews="previewHotReviews"
          :summary-chips="heatPanelView.summaryChips"
          @open-more="openHotReviewPage"
          @open-review="openReviewPanel"
          @like="likeReview"
          @reply="openReviewReplyPanel"
          @remove="removeReview"
          @remove-reply="removeReviewReply"
        />

        <SpotDetailReviewPanel
          v-else
          :panel="reviewPanelView"
          :reviews="previewReviews"
          :build-anchor-id="getReviewAnchorId"
          :is-highlighted="isHighlightedReview"
          @open-more="openMorePage('reviews')"
          @open-review="openReviewPanel"
          @like="likeReview"
          @reply="openReviewReplyPanel"
          @remove="removeReview"
          @remove-reply="removeReviewReply"
        />
      </view>
    </template>

    <SpotDetailBottomSheet :rendered="showReviewSheet" :visible="sheetVisible" :title="reviewComposerView.title" @close="closeReviewPanel">
      <view class="mt-18px flex justify-center gap-10px">
        <view v-for="star in 5" :key="star" class="text-28px text-gray-300" :class="star <= reviewForm.rating ? 'text-amber-500' : ''" @click="setReviewRating(star)">
          ★
        </view>
      </view>
      <view class="spot-review-toolbar">
        <view class="spot-review-toolbar-btn" @click="addReviewImage">
          <view class="i-carbon-image text-16px text-orange-500" />
          <text>{{ reviewComposerView.imageActionText }}</text>
        </view>
        <view class="spot-review-toolbar-btn" @click="chooseReviewLocation">
          <view class="i-carbon-location-filled text-16px text-orange-500" />
          <text>{{ reviewComposerView.locationActionText }}</text>
        </view>
      </view>
      <view v-if="reviewForm.images.length" class="mt-14px flex gap-10px overflow-x-auto">
        <view v-for="image in reviewForm.images" :key="image" class="relative h-84px w-84px flex-shrink-0">
          <image :src="image" class="h-full w-full rounded-14px" mode="aspectFill" @click="previewImages(reviewForm.images, image)" />
          <view class="absolute right--6px top--6px h-20px w-20px center rounded-full bg-[rgba(17,24,39,0.78)] text-12px text-white" @click="removeReviewImage(image)">
            ×
          </view>
        </view>
      </view>
      <view v-if="reviewComposerView.locationLabel" class="mt-14px flex items-center gap-6px rounded-14px bg-#fff7f2 px-12px py-10px">
        <view class="i-carbon-location-filled text-14px text-orange-500" />
        <text class="min-w-0 flex-1 text-12px text-#9a3412 leading-1.5">{{ reviewComposerView.locationLabel }}</text>
        <view class="flex-shrink-0 text-12px text-#ef5a32" @click="clearReviewLocation">
          清除
        </view>
      </view>
      <textarea v-model="reviewForm.content" class="spot-review-textarea" :placeholder="reviewComposerView.placeholder" :maxlength="500" />
      <view class="spot-review-submit-btn" @click="submitReview">
        {{ reviewComposerView.submitText }}
      </view>
    </SpotDetailBottomSheet>

    <SpotDetailBottomSheet :rendered="showReviewReplySheet" :visible="reviewReplySheetVisible" :title="replyComposerView.title" @close="closeReviewReplyPanel">
      <view v-if="reviewReplyTarget" class="mt-14px rounded-16px bg-#f8f9fb px-14px py-12px">
        <view class="text-13px text-#111827 font-600">
          {{ replyComposerView.targetTitle }}
        </view>
        <view class="mt-6px text-12px text-gray-500 leading-1.6">
          {{ replyComposerView.targetContent }}
        </view>
      </view>
      <textarea v-model="reviewReplyForm.content" class="spot-review-textarea" :placeholder="replyComposerView.placeholder" :maxlength="500" />
      <view class="spot-review-submit-btn" @click="submitReviewReply">
        {{ replyComposerView.submitText }}
      </view>
    </SpotDetailBottomSheet>
  </view>
</template>
