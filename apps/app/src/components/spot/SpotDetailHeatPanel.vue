<script lang="ts" setup>
import type { ISpotReviewItem } from '@/api/types/spot'
import type { SpotDetailPanelViewModel, SpotDetailSummaryChipViewModel } from '@/utils/spotDetailView'
import SpotReviewCard from '@/components/spot/SpotReviewCard.vue'

const props = defineProps<{
  panel: SpotDetailPanelViewModel
  reviews: ISpotReviewItem[]
  summaryChips: SpotDetailSummaryChipViewModel[]
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
  <view class="spot-detail-panel">
    <view>
      <view class="spot-detail-panel-header">
        <view>
          <view class="spot-detail-panel-title">
            {{ props.panel.title }}
          </view>
          <view class="spot-detail-panel-subtitle">
            {{ props.panel.subtitle }}
          </view>
        </view>
        <view class="spot-detail-panel-actions">
          <view v-if="props.panel.moreText" class="spot-detail-panel-link" @click="emit('openMore')">
            {{ props.panel.moreText }}
            <text class="spot-detail-panel-link-arrow">›</text>
          </view>
          <view class="spot-detail-panel-action" @click="emit('openReview')">
            写评价
          </view>
        </view>
      </view>

      <view v-if="props.summaryChips.length" class="spot-detail-summary-chip-row">
        <view v-for="chip in props.summaryChips" :key="chip.label" class="spot-detail-summary-chip">
          {{ chip.label }} {{ chip.count }}
        </view>
      </view>

      <view v-if="props.reviews.length === 0" class="spot-detail-panel-empty">
        {{ props.panel.emptyText }}
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
