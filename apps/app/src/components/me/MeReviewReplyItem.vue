<script lang="ts" setup>
import type { IMySpotReviewReplyItem } from '@/api/types/spot'

const props = defineProps<{
  reply: IMySpotReviewReplyItem
}>()

const emit = defineEmits<{
  openSpot: [spotId: number]
  remove: [replyId: string]
}>()
</script>

<template>
  <view class="border-b border-gray-50 py-12px last:border-b-0">
    <view class="flex items-center justify-between">
      <view class="flex items-center gap-2" @click="emit('openSpot', props.reply.spotId)">
        <view class="rounded-6px bg-orange-50 px-2 py-1 text-12px text-orange-500">
          {{ props.reply.spotName }}
        </view>
        <view class="rounded-6px bg-gray-100 px-2 py-1 text-11px text-gray-500">
          评价回复
        </view>
      </view>
      <view class="i-carbon-close flex-shrink-0 text-14px text-gray-300" @click.stop="emit('remove', props.reply.id)" />
    </view>
    <view class="mt-2 rounded-12px bg-gray-50 px-3 py-2 text-12px text-gray-500 leading-relaxed">
      {{ props.reply.reviewContent }}
    </view>
    <view class="mt-2 text-13px text-gray-600 leading-relaxed">
      {{ props.reply.content }}
    </view>
    <view class="mt-1 text-11px text-gray-400">
      {{ props.reply.time }}
    </view>
  </view>
</template>
