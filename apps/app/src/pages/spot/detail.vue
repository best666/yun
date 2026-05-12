<script lang="ts" setup>
import type { ISpotDetail } from '@/api/types/spot'
import SpotReviewCard from '@/components/spot/SpotReviewCard.vue'
import { useSpotDetailPage } from '@/hooks/useSpotDetailPage'

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
  showDiscussionSheet,
  discussionSheetVisible,
  showReviewReplySheet,
  reviewReplySheetVisible,
  reviewForm,
  discussionForm,
  reviewReplyForm,
  spotDetail,
  previewReviews,
  reviewReplyTarget,
  isFavorited,
  favoriteDisplayCount,
  detailDistance,
  fetchSpotDetail,
  goBack,
  shareSpot,
  renderStars,
  formatCount,
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
  openDiscussionPanel,
  closeDiscussionPanel,
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
  submitDiscussion,
  submitReviewReply,
  removeReviewReply,
  removeReview,
  likeDiscussion,
  removeDiscussion,
  onDetailTouchStart,
  onDetailTouchMove,
  onDetailTouchEnd,
  formatDistance,
  isHighlightedReview,
  getReviewAnchorId,
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

    if (rightReview.images.length !== leftReview.images.length) {
      return rightReview.images.length - leftReview.images.length
    }

    return (Date.parse(rightReview.time) || 0) - (Date.parse(leftReview.time) || 0)
  })
})
const previewHotReviews = computed(() => hotReviews.value.slice(0, 3))
const heroImages = computed(() => {
  if (!spotDetail.value) {
    return []
  }

  return spotDetail.value.images.length ? spotDetail.value.images : [spotDetail.value.cover]
})
const hasSpotPhone = computed(() => Boolean(spotDetail.value?.phone))
const hasMoreReviews = computed(() => reviews.value.length > previewReviews.value.length)
const hasMoreHotReviews = computed(() => hotReviews.value.length > previewHotReviews.value.length)
const hasNoReviews = computed(() => reviews.value.length === 0)
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
    { label: '有图评价', count: reviews.value.filter(review => review.images.length > 0).length },
  ].filter(item => item.count > 0)
})
const heroHighlightChips = computed(() => {
  return spotDetail.value?.tags.filter(Boolean).slice(2, 6) ?? []
})
const heroCategoryText = computed(() => {
  return spotDetail.value?.tags.slice(0, 2).join('    ') ?? ''
})
const heroBusinessText = computed(() => {
  if (!spotDetail.value) {
    return ''
  }

  return [spotDetail.value.businessStatus, spotDetail.value.businessHours].filter(Boolean).join('   ')
})
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

            <SpotReviewCard
              v-for="review in previewHotReviews"
              :key="review.id"
              :review="review"
              :reply-limit="2"
              :show-delete="true"
              :show-reply-action="true"
              :show-more-replies-text="`查看全部 ${review.replyCount} 条回复`"
              @like="likeReview"
              @reply="openReviewReplyPanel"
              @remove="removeReview"
              @remove-reply="removeReviewReply"
              @more-replies="openHotReviewPage"
            />
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

            <SpotReviewCard
              v-for="review in previewReviews"
              :id="getReviewAnchorId(review.id)"
              :key="review.id"
              :review="review"
              :highlighted="isHighlightedReview(review.id)"
              :reply-limit="2"
              :show-delete="true"
              :show-reply-action="true"
              :show-more-replies-text="`查看全部 ${review.replyCount} 条回复`"
              @like="likeReview"
              @reply="openReviewReplyPanel"
              @remove="removeReview"
              @remove-reply="removeReviewReply"
              @more-replies="() => openMorePage('reviews')"
            />
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
