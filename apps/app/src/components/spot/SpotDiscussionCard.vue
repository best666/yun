<script lang="ts" setup>
import type { ISpotDiscussionItem } from '@/api/types/spot'

const props = defineProps<{
  discussion: ISpotDiscussionItem
}>()

const emit = defineEmits<{
  like: [discussionId: string]
}>()
</script>

<template>
  <view class="mt-12px rounded-22px from-#f9fbff to-#f8fafc bg-gradient-to-b p-16px">
    <view class="flex items-start justify-between gap-12px">
      <view class="min-w-0 flex items-center gap-10px">
        <image :src="props.discussion.avatar" class="h-42px w-42px flex-shrink-0 rounded-full" mode="aspectFill" />
        <view class="min-w-0">
          <view class="text-14px text-gray-900 font-600">
            {{ props.discussion.userName }}
          </view>
          <view class="mt-4px text-11px text-gray-400">
            {{ props.discussion.time }}
          </view>
        </view>
      </view>

      <view class="inline-flex items-center gap-6px text-12px text-gray-400" @click="emit('like', props.discussion.id)">
        <view :class="props.discussion.likedByCurrentUser ? 'i-carbon-thumbs-up-filled text-orange-500' : 'i-carbon-thumbs-up text-gray-400'" class="text-14px" />
        <text>{{ props.discussion.likeCount }}</text>
      </view>
    </view>

    <view class="mt-12px text-14px text-gray-700 leading-1.75">
      {{ props.discussion.content }}
    </view>
  </view>
</template>
