<script lang="ts" setup>
import type { IMySpotDiscussionItem } from '@/api/types/spot'

const props = defineProps<{
  discussion: IMySpotDiscussionItem
}>()

const emit = defineEmits<{
  openSpot: [spotId: number]
  remove: [discussionId: string]
}>()
</script>

<template>
  <view class="border-b border-gray-50 py-12px last:border-b-0">
    <view class="flex items-center justify-between">
      <view class="flex items-center gap-2" @click="emit('openSpot', props.discussion.spotId)">
        <view class="rounded-6px bg-orange-50 px-2 py-1 text-12px text-orange-500">
          {{ props.discussion.spotName }}
        </view>
        <view class="flex items-center gap-1 text-12px" :class="props.discussion.likedByCurrentUser ? 'text-orange-500' : 'text-gray-400'">
          <view :class="props.discussion.likedByCurrentUser ? 'i-carbon-thumbs-up-filled' : 'i-carbon-thumbs-up'" class="text-12px" />
          <text>{{ props.discussion.likeCount }}</text>
        </view>
      </view>
      <view class="i-carbon-close flex-shrink-0 text-14px text-gray-300" @click.stop="emit('remove', props.discussion.id)" />
    </view>
    <view class="mt-2 text-13px text-gray-600 leading-relaxed">
      {{ props.discussion.content }}
    </view>
    <view class="mt-1 text-11px text-gray-400">
      {{ props.discussion.time }}
    </view>
  </view>
</template>
