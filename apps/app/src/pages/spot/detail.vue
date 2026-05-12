<script lang="ts" setup>
import type { ISpotDetail } from '@/api/types/spot'
import SpotDetailBottomSheet from '@/components/spot/SpotDetailBottomSheet.vue'
import SpotDetailHeatPanel from '@/components/spot/SpotDetailHeatPanel.vue'
import SpotDetailHero from '@/components/spot/SpotDetailHero.vue'
import SpotDetailReviewPanel from '@/components/spot/SpotDetailReviewPanel.vue'
import { useSpotDetailPage } from '@/hooks/useSpotDetailPage'
import { formatDistance } from '@/utils/formatDistance'

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
const heroImages = computed(() => {
  if (!spotDetail.value) {
    return []
  }

  return getSpotImages(spotDetail.value).length ? getSpotImages(spotDetail.value) : [spotDetail.value.cover]
})
const hasSpotPhone = computed(() => Boolean(spotDetail.value?.phone))
const hasMoreReviews = computed(() => reviews.value.length > previewReviews.value.length)
const hasMoreHotReviews = computed(() => hotReviews.value.length > previewHotReviews.value.length)
const hasNoReviews = computed(() => reviews.value.length === 0)
const heroRatingStars = computed(() => (spotDetail.value ? renderStars(spotDetail.value.rating) : ''))
const reviewEntryHintText = computed(() => {
  return hasNoReviews.value ? '还没有评价，点亮星星发布第一条现场评价' : '为这家店补充你的真实体验和图片'
})
const reviewLocationLabel = computed(() => {
  return [reviewForm.locationName, reviewForm.locationAddress].filter(Boolean).join(' · ')
})
const reviewDisplayCount = computed(() => reviews.value.length || spotDetail.value?.reviewCount || 0)
const heatSummaryChips = computed(() => {
  return [
    { label: '评价', count: reviewDisplayCount.value },
    { label: '高赞评价', count: hotReviews.value.filter(review => review.likeCount > 0).length },
    { label: '有图评价', count: reviews.value.filter(review => getReviewImages(review).length > 0).length },
  ].filter(item => item.count > 0)
})
const heroHighlightChips = computed(() => {
  return getSpotTags(spotDetail.value).filter(Boolean).slice(2, 6)
})
const heroCategoryText = computed(() => {
  return getSpotTags(spotDetail.value).slice(0, 2).join('    ')
})
const heroBusinessText = computed(() => {
  if (!spotDetail.value) {
    return ''
  }

  return [spotDetail.value.businessStatus, spotDetail.value.businessHours].filter(Boolean).join('   ')
})
const favoriteDisplayText = computed(() => formatCount(favoriteDisplayCount.value))
const reviewCountText = computed(() => formatCount(reviewDisplayCount.value))
const headerSummaryText = computed(() => {
  if (!spotDetail.value) {
    return ''
  }

  const summaryParts = [spotDetail.value.navigationLabel]

  if (detailDistance.value !== undefined) {
    summaryParts.push(`${formatDistance(detailDistance.value)} 距离`)
  }

  return summaryParts.filter(Boolean).join(' · ')
})

function getReviewHeatScore(review: NonNullable<ISpotDetail['reviews']>[number]) {
  return review.likeCount + review.replyCount
}

function getReviewImages(review: NonNullable<ISpotDetail['reviews']>[number]) {
  return Array.isArray(review.images) ? review.images : []
}

function getSpotImages(detail: ISpotDetail) {
  return Array.isArray(detail.images) ? detail.images : []
}

function getSpotTags(detail: ISpotDetail | null | undefined) {
  return Array.isArray(detail?.tags) ? detail.tags : []
}

function renderStars(rating: number) {
  return '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '☆' : '')
}

function formatCount(count?: number) {
  if (!count) {
    return '0'
  }

  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}w`
  }

  return String(count)
}

function getReviewAnchorId(reviewId: string) {
  return `review-card-${reviewId}`
}

function isHighlightedReview(reviewId: string) {
  return highlightedReviewId.value === reviewId
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
      <SpotDetailHero
        :spot-detail="spotDetail"
        :hero-images="heroImages"
        :has-spot-phone="hasSpotPhone"
        :header-summary-text="headerSummaryText"
        :hero-category-text="heroCategoryText"
        :hero-business-text="heroBusinessText"
        :hero-highlight-chips="heroHighlightChips"
        :is-favorited="isFavorited"
        :favorite-count-text="favoriteDisplayText"
        :rating-stars="heroRatingStars"
        :review-count-text="reviewCountText"
        @back="goBack"
        @toggle-favorite="toggleFavorite"
        @share="shareSpot"
        @open-navigation="openNavigation"
        @call-phone="callPhone"
      />

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

        <SpotDetailHeatPanel
          v-if="activeTab === 'heat'"
          :reviews="previewHotReviews"
          :summary-chips="heatSummaryChips"
          :has-more="hasMoreHotReviews"
          @open-more="openHotReviewPage"
          @open-review="openReviewPanel"
          @like="likeReview"
          @reply="openReviewReplyPanel"
          @remove="removeReview"
          @remove-reply="removeReviewReply"
        />

        <SpotDetailReviewPanel
          v-else
          :reviews="previewReviews"
          :has-more="hasMoreReviews"
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

    <SpotDetailBottomSheet :rendered="showReviewSheet" :visible="sheetVisible" title="现场评价" @close="closeReviewPanel">
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
    </SpotDetailBottomSheet>

    <SpotDetailBottomSheet :rendered="showReviewReplySheet" :visible="reviewReplySheetVisible" title="回复评价" @close="closeReviewReplyPanel">
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
    </SpotDetailBottomSheet>
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

/* tab 区：单独包一层白底，做出参考图里那种“内容已开始”的切换感。 */
.content-tabs-wrap {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.74);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
  backdrop-filter: blur(14px);
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
