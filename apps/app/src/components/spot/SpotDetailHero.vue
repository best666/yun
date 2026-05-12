<script lang="ts" setup>
import type { SpotDetailHeroViewModel } from '@/utils/spotDetailView'

const props = defineProps<{
  hero: SpotDetailHeroViewModel
  isFavorited: boolean
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
  <view class="relative h-720rpx overflow-hidden">
    <swiper class="h-full w-full" circular autoplay indicator-dots indicator-color="rgba(255,255,255,0.4)" indicator-active-color="#fff">
      <swiper-item v-for="image in props.hero.images" :key="image">
        <image :src="image" class="h-full w-full" mode="aspectFill" />
      </swiper-item>
    </swiper>

    <view class="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,16,28,0.08)_0%,rgba(10,16,28,0.34)_44%,rgba(10,16,28,0.82)_100%)]" />

    <view class="absolute left-0 right-0 top-[calc(18px+env(safe-area-inset-top))] z-2 flex items-center justify-between px-16px">
      <view class="spot-hero-icon-btn" @click="emit('back')">
        <view class="i-carbon-chevron-left text-20px text-white" />
      </view>

      <view class="flex items-center gap-10px">
        <view class="spot-hero-icon-btn" @click="emit('toggleFavorite')">
          <view :class="props.isFavorited ? 'i-carbon-favorite-filled text-orange-300' : 'i-carbon-favorite text-white'" class="text-18px" />
        </view>
        <view class="spot-hero-icon-btn" @click="emit('share')">
          <view class="i-carbon-share text-18px text-white" />
        </view>
      </view>
    </view>

    <view class="absolute bottom-34px left-0 right-0 z-2 px-20px">
      <view class="w-full">
        <view class="min-w-0 w-full flex items-center justify-between gap-12px">
          <view class="min-w-0 flex-1 truncate text-16px text-white font-700">
            {{ props.hero.title }}
          </view>
          <view class="flex flex-shrink-0 items-center gap-6px border border-[rgba(255,255,255,0.2)] rounded-full bg-[rgba(255,255,255,0.14)] px-12px py-4px text-white backdrop-blur-[10px]" @click="emit('toggleFavorite')">
            <view :class="props.isFavorited ? 'i-carbon-favorite-filled text-orange-400' : 'i-carbon-favorite text-white'" class="text-18px" />
            <text class="text-13px">收藏 {{ props.hero.favoriteCountText }}</text>
          </view>
        </view>
        <view class="mt-10px flex items-center gap-6px">
          <text class="text-15px text-#ff6740">{{ props.hero.ratingStars }}</text>
          <text class="text-14px text-[rgba(255,255,255,0.96)]">{{ props.hero.ratingText }}</text>
          <text class="text-12px text-[rgba(255,255,255,0.56)]">|</text>
          <text class="whitespace-nowrap text-14px text-[rgba(255,255,255,0.96)]">{{ props.hero.reviewCountText }} 人评价</text>
        </view>
      </view>

      <view v-if="props.hero.summaryText" class="mt-12px text-12px text-[rgba(255,255,255,0.88)]">
        {{ props.hero.summaryText }}
      </view>

      <view v-if="props.hero.categoryText" class="mt-8px text-14px text-[rgba(255,255,255,0.95)]">
        {{ props.hero.categoryText }}
      </view>

      <view class="mt-12px flex flex-wrap gap-8px">
        <view v-if="props.hero.businessText" class="rounded-full bg-[rgba(255,255,255,0.08)] px-10px py-6px text-11px text-[rgba(255,255,255,0.94)] backdrop-blur-[10px]">
          {{ props.hero.businessText }}
        </view>
        <view v-for="chip in props.hero.highlightChips" :key="chip" class="rounded-full bg-[rgba(255,255,255,0.18)] px-10px py-6px text-11px text-[rgba(255,255,255,0.94)] backdrop-blur-[10px]">
          {{ chip }}
        </view>
      </view>

      <view class="mt-14px">
        <view class="[-webkit-box-orient:vertical] [-webkit-line-clamp:2] [display:-webkit-box] overflow-hidden text-12px text-white font-500 leading-[1.45]">
          {{ props.hero.addressText }}
          <text class="text-13px text-[rgba(255,255,255,0.84)] font-400">›</text>
        </view>
      </view>
    </view>

    <view class="absolute bottom-42px right-16px z-2 flex flex-col items-center gap-10px">
      <view class="spot-hero-side-btn" @click="emit('openNavigation')">
        <view class="i-carbon-location-filled text-22px text-white" />
        <text class="text-11px text-white">导航</text>
      </view>
      <view v-if="props.hero.hasPhone" class="spot-hero-side-btn" @click="emit('callPhone')">
        <view class="i-carbon-phone text-22px text-white" />
        <text class="text-11px text-white">电话</text>
      </view>
    </view>
  </view>
</template>
