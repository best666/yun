<script lang="ts" setup>
import type { ISpotReviewItem } from '@/api/types/spot'
import SpotReviewCard from '@/components/spot/SpotReviewCard.vue'

interface SummaryChip {
  label: string
  count: number
}

const props = defineProps<{
  reviews: ISpotReviewItem[]
  summaryChips: SummaryChip[]
  hasMore: boolean
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
    <view class="panel-section">
      <view class="panel-header">
        <view>
          <view class="panel-title">
            热门评价
          </view>
          <view class="panel-subtitle">
            优先展示点赞更高、图片更完整的真实评价，继续下滑会自动切到评价
          </view>
        </view>
        <view class="panel-header__actions">
          <view v-if="props.hasMore" class="panel-link" @click="emit('openMore')">
            更多谈论
            <text class="panel-link__arrow">›</text>
          </view>
          <view class="panel-action" @click="emit('openReview')">
            写评价
          </view>
        </view>
      </view>

      <view v-if="props.summaryChips.length" class="summary-chip-row">
        <view v-for="chip in props.summaryChips" :key="chip.label" class="summary-chip">
          {{ chip.label }} {{ chip.count }}
        </view>
      </view>

      <view v-if="props.reviews.length === 0" class="empty-card">
        暂无热门评价，来留下第一条到店体验吧
      </view>

      <SpotReviewCard
        v-for="review in props.reviews"
        :key="review.id"
        :review="review"
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

.summary-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.summary-chip {
  padding: 9px 14px;
  border-radius: 14px;
  background: #f7f7f8;
  color: #4b5563;
  font-size: 13px;
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
