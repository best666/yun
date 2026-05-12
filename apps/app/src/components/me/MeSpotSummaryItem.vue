<script lang="ts" setup>
import type { FavoriteSpotSummary } from '@/api/types/spot'

interface SpotSummaryItem extends FavoriteSpotSummary {
  viewedAt?: string
}

const props = defineProps<{
  spot: SpotSummaryItem
  removable?: boolean
  timestampLabel?: string
}>()

const emit = defineEmits<{
  select: [spot: SpotSummaryItem]
  remove: [spot: SpotSummaryItem]
}>()
</script>

<template>
  <view class="flex items-center border-b border-gray-50 py-10px last:border-b-0 active:opacity-70" @click="emit('select', props.spot)">
    <image :src="props.spot.cover" class="h-60px w-60px flex-shrink-0 rounded-10px" mode="aspectFill" />
    <view class="ml-3 min-w-0 flex-1">
      <view class="truncate text-14px text-gray-800 font-medium">
        {{ props.spot.name }}
      </view>
      <view class="mt-1 flex items-center gap-2 text-12px text-gray-400">
        <text>★{{ props.spot.rating }}</text>
        <text>¥{{ props.spot.avgPrice }}/人</text>
      </view>
      <view class="mt-0.5 truncate text-12px text-gray-400">
        {{ props.spot.address }}
      </view>
      <view v-if="props.timestampLabel" class="mt-0.5 text-11px text-gray-300">
        {{ props.timestampLabel }}
      </view>
    </view>
    <view
      v-if="props.removable"
      class="i-carbon-close flex-shrink-0 text-16px text-gray-300"
      @click.stop="emit('remove', props.spot)"
    />
  </view>
</template>
