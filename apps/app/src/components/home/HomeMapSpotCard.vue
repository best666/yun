<script lang="ts" setup>
import type { IMapSearchPlaceItem } from '@/api/types/map'

const props = withDefaults(defineProps<{
  visible: boolean
  place: IMapSearchPlaceItem | null
  subtitle: string
  distanceText?: string
  addressText?: string
  metaList: string[]
  summaryText?: string
  descriptionText?: string
  isLoadingDetail?: boolean
  isFavorited?: boolean
}>(), {
  distanceText: '',
  addressText: '',
  summaryText: '',
  descriptionText: '',
  isLoadingDetail: false,
  isFavorited: false,
})

const emit = defineEmits<{
  openDetail: []
  toggleFavorite: []
  openLocation: []
  close: []
}>()

const CARD_SWIPE_THRESHOLD = 36

const cardTouchStartY = ref(0)
const cardTouchEndY = ref(0)

function onTouchStart(event: any) {
  cardTouchStartY.value = event.touches?.[0]?.clientY ?? 0
  cardTouchEndY.value = cardTouchStartY.value
}

function onTouchMove(event: any) {
  cardTouchEndY.value = event.touches?.[0]?.clientY ?? cardTouchEndY.value
}

function onTouchEnd() {
  const swipeDistance = cardTouchStartY.value - cardTouchEndY.value

  if (swipeDistance > CARD_SWIPE_THRESHOLD) {
    emit('openDetail')
    return
  }

  if (swipeDistance < -CARD_SWIPE_THRESHOLD) {
    emit('close')
  }
}
</script>

<template>
  <view class="bottom-card" :class="{ 'bottom-card--show': props.visible }">
    <view
      v-if="props.place"
      class="card-content"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <view class="drag-bar" />

      <view class="flex gap-3" @click="emit('openDetail')">
        <view class="search-place-card-avatar">
          <view class="i-carbon-location-filled text-24px text-blue-500" />
        </view>
        <view class="min-w-0 flex-1">
          <view class="truncate text-16px text-gray-900 font-bold">
            {{ props.place.title }}
          </view>
          <view class="mt-1 flex items-center gap-2 text-12px text-gray-500">
            <text>{{ props.subtitle }}</text>
            <text v-if="props.distanceText">距离 {{ props.distanceText }}</text>
          </view>
          <view class="mt-1 text-12px text-gray-500">
            {{ props.addressText }}
          </view>
          <view v-if="props.summaryText" class="mt-6px text-12px text-#8a5a3b">
            {{ props.summaryText }}
          </view>
          <view v-else-if="props.isLoadingDetail" class="mt-6px text-12px text-gray-400">
            正在加载详情...
          </view>
        </view>
      </view>

      <view class="card-expanded-meta card-expanded-meta--inline">
        <text v-for="meta in props.metaList" :key="meta" class="card-expanded-meta__item">
          {{ meta }}
        </text>
      </view>

      <view v-if="props.descriptionText" class="card-description">
        {{ props.descriptionText }}
      </view>

      <view class="card-actions">
        <view class="card-action-btn" @click.stop="emit('toggleFavorite')">
          <view :class="props.isFavorited ? 'i-carbon-favorite-filled text-red-500' : 'i-carbon-favorite text-gray-400'" class="text-18px" />
          <text class="text-11px" :class="props.isFavorited ? 'text-red-500' : 'text-gray-400'">
            {{ props.isFavorited ? '已收藏' : '收藏' }}
          </text>
        </view>
        <view class="card-action-btn" @click.stop="emit('openDetail')">
          <view class="i-carbon-view text-18px text-orange-500" />
          <text class="text-11px text-orange-500">查看详情</text>
        </view>
        <view class="card-action-btn" @click.stop="emit('openLocation')">
          <view class="i-carbon-location-filled text-18px text-blue-500" />
          <text class="text-11px text-blue-500">路线</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.bottom-card {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 200;
  opacity: 0;
  pointer-events: none;
  transform: translate3d(0, calc(100% + 18px), 0);
  will-change: transform, opacity;
  transition:
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.18s ease-out;
  contain: layout style paint;

  &--show {
    opacity: 1;
    pointer-events: auto;
    transform: translate3d(0, 0, 0);
  }
}

.card-content {
  margin: 0 12px;
  margin-bottom: calc(60px + env(safe-area-inset-bottom));
  padding: 16px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 -2px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.drag-bar {
  width: 36px;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  margin: 0 auto 12px;
}

.search-place-card-avatar {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, #fff1e8 0%, #ffe4d4 100%);
}

.card-actions {
  display: flex;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  justify-content: space-around;
}

.card-expanded-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.card-description {
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.7;
  color: #6b7280;
}

.card-expanded-meta--inline {
  margin-top: 12px;
}

.card-expanded-meta__item {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: #fff7ed;
  font-size: 11px;
  color: #ea580c;
}

.card-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px 16px;

  &:active {
    opacity: 0.6;
  }
}
</style>
