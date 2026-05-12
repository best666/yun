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

const reviewImages = computed(() => Array.isArray(props.review.images) ? props.review.images : [])
const reviewReplies = computed(() => Array.isArray(props.review.replies) ? props.review.replies : [])
const previewReplies = computed(() => reviewReplies.value.slice(0, props.replyLimit))
const hasReviewImages = computed(() => reviewImages.value.length > 0)
const hasReviewReplies = computed(() => reviewReplies.value.length > 0)
const reviewUserAvatar = computed(() => props.review.avatar || '/static/images/default-avatar.png')

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

function getReplyAvatar(avatar?: string) {
  return avatar || '/static/images/default-avatar.png'
}
</script>

<template>
  <view class="mt-12px border border-[rgba(255,255,255,0.92)] rounded-22px bg-[linear-gradient(180deg,#ffffff_0%,#fffdfa_100%)] p-16px shadow-[0_14px_28px_rgba(15,23,42,0.06)]" :class="props.highlighted ? 'border-[rgba(251,146,60,0.38)] shadow-[0_16px_34px_rgba(249,115,22,0.14)]' : ''">
    <view class="flex items-start justify-between gap-12px">
      <view class="min-w-0 flex items-center gap-10px">
        <image :src="reviewUserAvatar" class="h-42px w-42px flex-shrink-0 rounded-full ring-1 ring-black/4" mode="aspectFill" />
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
        <view v-if="hasReviewImages" class="rounded-full bg-#fff1e8 px-9px py-5px text-11px text-#ef5a32">
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

    <view class="mt-12px text-wrap text-14px text-gray-700">
      {{ props.review.content }}
    </view>

    <view v-if="props.review.locationName || props.review.locationAddress" class="mt-10px flex items-center gap-6px">
      <view class="i-carbon-location-filled text-14px text-orange-500" />
      <text class="text-12px text-orange-800 leading-1.6">
        {{ props.review.locationName || props.review.locationAddress }}
      </text>
    </view>

    <view v-if="hasReviewImages" class="mt-12px flex gap-10px overflow-x-auto pb-2px">
      <image
        v-for="image in reviewImages"
        :key="`${props.review.id}-${image}`"
        :src="image"
        class="h-96px w-96px flex-shrink-0 rounded-16px shadow-[0_10px_20px_rgba(17,24,39,0.08)]"
        mode="aspectFill"
        @click="previewImages(reviewImages, image)"
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

    <view v-if="hasReviewReplies" class="mt-12px rounded-16px bg-#f8f9fb p-12px">
      <view v-for="(reply, index) in previewReplies" :key="reply.id" class="flex gap-10px" :class="index > 0 ? 'mt-10px' : ''">
        <image :src="getReplyAvatar(reply.avatar)" class="h-28px w-28px flex-shrink-0 rounded-full ring-1 ring-black/4" mode="aspectFill" />
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

      <view v-if="props.showMoreRepliesText && props.review.replyCount > previewReplies.length" class="mt-10px text-12px text-#ef5a32" @click="emit('moreReplies', props.review.id)">
        {{ props.showMoreRepliesText }}
      </view>
    </view>
  </view>
</template>
