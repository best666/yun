<script lang="ts" setup>
import type { ISpotReviewItem } from '@/api/types/spot'

const props = withDefaults(defineProps<{
  review: ISpotReviewItem
  highlighted?: boolean
  replyLimit?: number
  showDelete?: boolean
  showReplyAction?: boolean
  showMoreRepliesText?: string
}>(), {
  highlighted: false,
  replyLimit: 3,
  showDelete: false,
  showReplyAction: false,
  showMoreRepliesText: '',
})

const emit = defineEmits<{
  like: [reviewId: string]
  removeReply: [reviewId: string, replyId: string]
  remove: [reviewId: string]
  reply: [reviewId: string]
  moreReplies: [reviewId: string]
}>()

function renderStars(rating: number) {
  return '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '☆' : '')
}

function previewImages(images: string[], current: string) {
  if (!images.length) {
    return
  }

  uni.previewImage({
    urls: images,
    current,
  })
}

const previewReplies = computed(() => props.review.replies.slice(0, props.replyLimit))
</script>

<template>
  <view class="mt-12px rounded-22px bg-white p-16px" :class="props.highlighted ? 'ring-2 ring-orange-200' : ''">
    <view class="flex items-start justify-between gap-12px">
      <view class="min-w-0 flex items-center gap-10px">
        <image :src="props.review.avatar" class="h-42px w-42px flex-shrink-0 rounded-full" mode="aspectFill" />
        <view class="min-w-0">
          <view class="text-14px text-gray-900 font-600">
            {{ props.review.userName }}
          </view>
          <view class="mt-4px text-11px text-gray-400">
            {{ props.review.time }}
          </view>
        </view>
      </view>

      <view class="flex items-center gap-8px">
        <view v-if="props.review.images.length" class="rounded-full bg-#fff1e8 px-9px py-5px text-11px text-#ef5a32">
          有图
        </view>
        <view class="text-14px text-amber-500">
          {{ renderStars(props.review.rating) }}
        </view>
        <view
          v-if="props.showDelete && props.review.isMine"
          class="inline-flex items-center gap-4px text-12px text-gray-400"
          @click="emit('remove', props.review.id)"
        >
          <view class="i-carbon-trash-can text-14px text-gray-400" />
          <text>删除</text>
        </view>
      </view>
    </view>

    <view class="mt-12px text-14px text-gray-700 leading-1.75">
      {{ props.review.content }}
    </view>

    <view v-if="props.review.locationName || props.review.locationAddress" class="mt-10px flex items-center gap-6px">
      <view class="i-carbon-location-filled text-14px text-orange-500" />
      <text class="text-12px text-orange-800 leading-1.6">
        {{ props.review.locationName || props.review.locationAddress }}
      </text>
    </view>

    <view v-if="props.review.images.length" class="mt-12px flex gap-10px overflow-x-auto">
      <image
        v-for="image in props.review.images"
        :key="`${props.review.id}-${image}`"
        :src="image"
        class="h-96px w-96px flex-shrink-0 rounded-16px"
        mode="aspectFill"
        @click="previewImages(props.review.images, image)"
      />
    </view>

    <view class="mt-12px inline-flex items-center gap-6px text-12px text-gray-400">
      <view class="inline-flex items-center gap-6px" @click="emit('like', props.review.id)">
        <view :class="props.review.likedByCurrentUser ? 'i-carbon-thumbs-up-filled text-orange-500' : 'i-carbon-thumbs-up text-gray-400'" class="text-14px" />
        <text>{{ props.review.likeCount }}</text>
      </view>
      <view class="ml-12px inline-flex items-center gap-6px" @click="props.showReplyAction ? emit('reply', props.review.id) : undefined">
        <view class="i-carbon-chat text-14px text-gray-400" />
        <text>{{ props.review.replyCount }}</text>
      </view>
    </view>

    <view v-if="props.review.replies.length" class="mt-12px rounded-16px bg-#f8f9fb p-12px">
      <view v-for="(reply, index) in previewReplies" :key="reply.id" class="flex gap-10px" :class="index > 0 ? 'mt-10px' : ''">
        <image :src="reply.avatar" class="h-28px w-28px flex-shrink-0 rounded-full" mode="aspectFill" />
        <view class="min-w-0 flex-1">
          <view class="flex items-center justify-between gap-10px">
            <text class="text-12px text-gray-900 font-600">{{ reply.userName }}</text>
            <view class="flex items-center gap-8px">
              <text class="text-11px text-gray-400">{{ reply.time }}</text>
              <view v-if="reply.isMine" class="inline-flex items-center gap-4px text-12px text-gray-400" @click="emit('removeReply', props.review.id, reply.id)">
                <view class="i-carbon-trash-can text-12px text-gray-400" />
              </view>
            </view>
          </view>
          <view class="mt-4px text-12px text-gray-600 leading-1.7">
            {{ reply.content }}
          </view>
        </view>
      </view>

      <view
        v-if="props.showMoreRepliesText && props.review.replyCount > previewReplies.length"
        class="mt-10px text-12px text-orange-500"
        @click="emit('moreReplies', props.review.id)"
      >
        {{ props.showMoreRepliesText }}
      </view>
    </view>
  </view>
</template>
