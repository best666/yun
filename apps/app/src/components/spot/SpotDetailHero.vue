<script lang="ts" setup>
import type { ISpotDetail } from '@/api/types/spot'

const props = defineProps<{
  spotDetail: ISpotDetail
  heroImages: string[]
  hasSpotPhone: boolean
  headerSummaryText: string
  heroCategoryText: string
  heroBusinessText: string
  heroHighlightChips: string[]
  isFavorited: boolean
  favoriteCountText: string
  ratingStars: string
  reviewCountText: string
}>()

const emit = defineEmits<{
  back: []
  toggleFavorite: []
  share: []
  openNavigation: []
  callPhone: []
}>()
</script>

<template>
  <view class="hero-section">
    <swiper class="hero-swiper" circular autoplay indicator-dots indicator-color="rgba(255,255,255,0.4)" indicator-active-color="#fff">
      <swiper-item v-for="image in props.heroImages" :key="image">
        <image :src="image" class="hero-image" mode="aspectFill" />
      </swiper-item>
    </swiper>

    <view class="hero-mask" />

    <view class="hero-topbar">
      <view class="hero-icon-btn" @click="emit('back')">
        <view class="i-carbon-chevron-left text-20px text-white" />
      </view>

      <view class="hero-topbar__right">
        <view class="hero-icon-btn" @click="emit('toggleFavorite')">
          <view :class="props.isFavorited ? 'i-carbon-favorite-filled text-orange-300' : 'i-carbon-favorite text-white'" class="text-18px" />
        </view>
        <view class="hero-icon-btn" @click="emit('share')">
          <view class="i-carbon-share text-18px text-white" />
        </view>
      </view>
    </view>

    <view class="hero-content">
      <view class="hero-title-row">
        <view class="hero-title-wrap">
          <view class="hero-title">
            {{ props.spotDetail.name }}
          </view>
          <view class="hero-rating-row">
            <text class="hero-stars">{{ props.ratingStars }}</text>
            <text class="hero-rating-value">{{ props.spotDetail.rating.toFixed(1) }}</text>
            <text class="hero-rating-divider">|</text>
            <text class="hero-rating-count">{{ props.reviewCountText }} 人评价</text>
          </view>
        </view>

        <view class="hero-favorite-pill" @click="emit('toggleFavorite')">
          <view :class="props.isFavorited ? 'i-carbon-favorite-filled text-orange-400' : 'i-carbon-favorite text-white'" class="text-18px" />
          <text class="hero-favorite-pill__text">收藏 {{ props.favoriteCountText }}</text>
        </view>
      </view>

      <view v-if="props.headerSummaryText" class="hero-summary-line">
        {{ props.headerSummaryText }}
      </view>

      <view v-if="props.heroCategoryText" class="hero-category-line">
        {{ props.heroCategoryText }}
      </view>

      <view class="hero-meta-chips hero-meta-chips--status">
        <view v-if="props.heroBusinessText" class="hero-meta-chip hero-meta-chip--soft">
          {{ props.heroBusinessText }}
        </view>
        <view v-for="chip in props.heroHighlightChips" :key="chip" class="hero-meta-chip">
          {{ chip }}
        </view>
      </view>

      <view class="hero-address-block">
        <view class="hero-address-text">
          {{ props.spotDetail.address }}
          <text class="hero-address-arrow">›</text>
        </view>
      </view>
    </view>

    <view class="hero-side-actions">
      <view class="hero-side-btn" @click="emit('openNavigation')">
        <view class="i-carbon-location-filled text-22px text-white" />
        <text class="hero-side-btn__text">导航</text>
      </view>
      <view v-if="props.hasSpotPhone" class="hero-side-btn" @click="emit('callPhone')">
        <view class="i-carbon-phone text-22px text-white" />
        <text class="hero-side-btn__text">电话</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
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
</style>
