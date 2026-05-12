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
  cardInteract: []
  openDetail: []
  toggleFavorite: []
  openLocation: []
  close: []
}>()

const CARD_SWIPE_THRESHOLD = 36

const cardTouchStartY = ref(0)
const cardTouchEndY = ref(0)

function notifyCardInteract() {
  emit('cardInteract')
}

function onTouchStart(event: any) {
  notifyCardInteract()
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
  <view
    class="will-change-[transform,opacity] [contain:layout_style_paint] fixed bottom-0 left-0 right-0 z-200 transition-[transform,opacity] duration-240 ease-[cubic-bezier(0.22,1,0.36,1)]"
    :class="props.visible ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-[calc(100%+18px)] opacity-0'"
    @touchstart.stop="notifyCardInteract"
  >
    <view
      v-if="props.place"
      class="[backface-visibility:hidden] [transform:translateZ(0)] mx-12px mb-[calc(60px+env(safe-area-inset-bottom))] overflow-hidden rounded-16px bg-white p-16px shadow-[0_-2px_20px_rgba(0,0,0,0.1)]"
      @tap.stop="emit('openDetail')"
      @click.stop="emit('openDetail')"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <view class="mx-auto mb-12px h-4px w-36px rounded-2px bg-#e0e0e0" />

      <view class="flex gap-3">
        <view class="h-80px w-80px center flex-shrink-0 rounded-full bg-[linear-gradient(135deg,#fff1e8_0%,#ffe4d4_100%)]">
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

      <view class="mt-12px mt-8px flex flex-wrap gap-8px">
        <text v-for="meta in props.metaList" :key="meta" class="inline-flex items-center rounded-full bg-#fff7ed px-10px py-4px text-11px text-#ea580c">
          {{ meta }}
        </text>
      </view>

      <view v-if="props.descriptionText" class="mt-10px text-12px text-gray-500 leading-1.7">
        {{ props.descriptionText }}
      </view>

      <view class="mt-12px flex justify-around border-t border-#f0f0f0 pt-12px">
        <view class="home-map-action-btn" @touchstart.stop="notifyCardInteract" @tap.stop="emit('toggleFavorite')" @click.stop="emit('toggleFavorite')">
          <view :class="props.isFavorited ? 'i-carbon-favorite-filled text-red-500' : 'i-carbon-favorite text-gray-400'" class="text-18px" />
          <text class="text-11px" :class="props.isFavorited ? 'text-red-500' : 'text-gray-400'">
            {{ props.isFavorited ? '已收藏' : '收藏' }}
          </text>
        </view>
        <view class="home-map-action-btn" @touchstart.stop="notifyCardInteract" @tap.stop="emit('openLocation')" @click.stop="emit('openLocation')">
          <view class="i-carbon-location-filled text-18px text-blue-500" />
          <text class="text-11px text-blue-500">路线</text>
        </view>
      </view>
    </view>
  </view>
</template>
