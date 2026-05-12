<script lang="ts" setup>
import type { IMySpotReviewItem } from '@/api/types/spot'

const props = defineProps<{
  review: IMySpotReviewItem
}>()

const emit = defineEmits<{
  openSpot: [spotId: number]
  remove: [reviewId: string]
}>()

function renderStars(rating: number) {
  return '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '☆' : '')
}
</script>

<template>
  <view class="border-b border-gray-50 py-12px last:border-b-0">
    <view class="flex items-center justify-between">
      <view class="flex items-center gap-2" @click="emit('openSpot', props.review.spotId)">
        <view class="rounded-6px bg-orange-50 px-2 py-1 text-12px text-orange-500">
          {{ props.review.spotName }}
        </view>
        <text class="text-14px text-orange-400">{{ renderStars(props.review.rating) }}</text>
      </view>
      <view class="i-carbon-close flex-shrink-0 text-14px text-gray-300" @click.stop="emit('remove', props.review.id)" />
    </view>
    <view class="mt-2 text-13px text-gray-600 leading-relaxed">
      {{ props.review.content }}
    </view>
    <view class="mt-1 text-11px text-gray-400">
      {{ props.review.time }}
    </view>
  </view>
</template>
