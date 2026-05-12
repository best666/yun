<script lang="ts" setup>
import type { ISpotReviewItem } from '@/api/types/spot'
import SpotReviewCard from '@/components/spot/SpotReviewCard.vue'

const props = defineProps<{
  reviews: ISpotReviewItem[]
  hasMore: boolean
  buildAnchorId: (reviewId: string) => string
  isHighlighted: (reviewId: string) => boolean
}>()

const emit = defineEmits<{
  openMore: []
  openReview: []
  like: [reviewId: string]
  reply: [reviewId: string]
  remove: [reviewId: string]
  removeReply: [reviewId: string, replyId: string]
}>()
</script>

<template>
  <view class="content-panel">
    <view class="panel-section panel-section--split">
      <view class="panel-header">
        <view>
          <view class="panel-title">
            用户评价
          </view>
          <view class="panel-subtitle">
            评分、图文和现场定位都会展示在这里
          </view>
        </view>
        <view class="panel-header__actions">
          <view v-if="props.hasMore" class="panel-link" @click="emit('openMore')">
            全部
            <text class="panel-link__arrow">›</text>
          </view>
          <view class="panel-action" @click="emit('openReview')">
            写评价
          </view>
        </view>
      </view>

      <view v-if="props.reviews.length === 0" class="empty-card">
        还没有评价，来留下第一条印象吧
      </view>

      <SpotReviewCard
        v-for="review in props.reviews"
        :id="props.buildAnchorId(review.id)"
        :key="review.id"
        :review="review"
        :highlighted="props.isHighlighted(review.id)"
        :reply-limit="2"
        :show-delete="true"
        :show-reply-action="true"
        :show-more-replies-text="`查看全部 ${review.replyCount} 条回复`"
        @like="emit('like', $event)"
        @reply="emit('reply', $event)"
        @remove="emit('remove', $event)"
        @remove-reply="emit('removeReply', $event[0], $event[1])"
        @more-replies="emit('openMore')"
      />
    </view>
  </view>
</template>

<style lang="scss" scoped>
.content-panel {
  margin-top: 0;
  border-radius: 0 0 28px 28px;
  padding: 18px 18px calc(28px + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.74);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
  backdrop-filter: blur(14px);
}

.panel-section--split {
  padding-top: 4px;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.panel-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.panel-subtitle {
  margin-top: 6px;
  font-size: 12px;
  color: #9ca3af;
}

.panel-action {
  flex-shrink: 0;
  padding: 8px 14px;
  border-radius: 999px;
  background: #fff3ee;
  color: #ef5a32;
  font-size: 12px;
}

.panel-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: #9ca3af;
  font-size: 12px;
}

.panel-link__arrow {
  font-size: 13px;
  line-height: 1;
}

.empty-card {
  padding: 22px 14px;
  text-align: center;
  border-radius: 18px;
  background: #f8f9fb;
  color: #9ca3af;
  font-size: 13px;
}
</style>
