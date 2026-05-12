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
  <view class="review-card" :class="props.highlighted ? 'review-card--highlighted' : ''">
    <view class="review-card__header">
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

      <view class="review-card__meta">
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

    <view class="review-card__content">
      {{ props.review.content }}
    </view>

    <view v-if="props.review.locationName || props.review.locationAddress" class="review-card__location">
      <view class="i-carbon-location-filled text-14px text-orange-500" />
      <text class="text-12px text-orange-800 leading-1.6">
        {{ props.review.locationName || props.review.locationAddress }}
      </text>
    </view>

    <view v-if="hasReviewImages" class="review-card__images">
      <image
        v-for="image in reviewImages"
        :key="`${props.review.id}-${image}`"
        :src="image"
        class="h-96px w-96px flex-shrink-0 rounded-16px shadow-[0_10px_20px_rgba(17,24,39,0.08)]"
        mode="aspectFill"
        @click="previewImages(reviewImages, image)"
      />
    </view>

    <view class="review-card__actions">
      <view class="inline-flex items-center gap-6px" @click="emit('like', props.review.id)">
        <view :class="props.review.likedByCurrentUser ? 'i-carbon-thumbs-up-filled text-orange-500' : 'i-carbon-thumbs-up text-gray-400'" class="text-14px" />
        <text>{{ props.review.likeCount }}</text>
      </view>
      <view class="ml-12px inline-flex items-center gap-6px" @click="props.showReplyAction ? emit('reply', props.review.id) : undefined">
        <view class="i-carbon-chat text-14px text-gray-400" />
        <text>{{ props.review.replyCount }}</text>
      </view>
    </view>

    <view v-if="hasReviewReplies" class="review-card__replies">
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

      <view v-if="props.showMoreRepliesText && props.review.replyCount > previewReplies.length" class="review-card__more-replies" @click="emit('moreReplies', props.review.id)">
        {{ props.showMoreRepliesText }}
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.review-card {
  margin-top: 12px;
  border-radius: 22px;
  padding: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #fffdfa 100%);
  border: 1px solid rgba(255, 255, 255, 0.92);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.06);
}

.review-card--highlighted {
  border-color: rgba(251, 146, 60, 0.38);
  box-shadow: 0 16px 34px rgba(249, 115, 22, 0.14);
}

.review-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.review-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.review-card__content {
  margin-top: 12px;
  font-size: 14px;
  line-height: 1.75;
  color: #374151;
}

.review-card__location {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
}

.review-card__images {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  margin-top: 12px;
  padding-bottom: 2px;
}

.review-card__actions {
  margin-top: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #9ca3af;
}

.review-card__replies {
  margin-top: 12px;
  padding: 12px;
  border-radius: 16px;
  background: #f8f9fb;
}

.review-card__more-replies {
  margin-top: 10px;
  font-size: 12px;
  color: #ef5a32;
}
</style>
