<script lang="ts" setup>
const props = defineProps<{
  rendered: boolean
  visible: boolean
  title: string
  description?: string
}>()

const emit = defineEmits<{
  close: []
}>()

function handleClose() {
  emit('close')
}
</script>

<template>
  <view v-if="props.rendered">
    <view
      class="fixed inset-0 z-980 transition-all duration-280 ease-[cubic-bezier(0.22,1,0.36,1)]"
      :class="props.visible ? 'bg-[rgba(15,23,42,0.42)] opacity-100' : 'pointer-events-none bg-[rgba(15,23,42,0)] opacity-0'"
      @tap="handleClose"
    />
    <view
      class="fixed bottom-0 left-0 right-0 z-990 rounded-t-24px bg-#f8fafc px-16px pb-[calc(18px+env(safe-area-inset-bottom))] pt-12px shadow-[0_-12px_30px_rgba(15,23,42,0.12)] transition-all duration-280 ease-[cubic-bezier(0.22,1,0.36,1)]"
      :class="props.visible ? 'translate-y-0 opacity-100' : 'translate-y-[108%] opacity-96'"
      style="height: 72%;"
      @tap.stop
    >
      <view class="mx-auto mb-14px h-5px w-42px rounded-full bg-[rgba(148,163,184,0.4)]" />
      <view class="flex items-start justify-between gap-3">
        <view class="min-w-0 flex-1">
          <view class="text-17px text-#0f172a font-700">
            {{ props.title }}
          </view>
          <view v-if="props.description" class="mt-6px text-12px text-#64748b leading-1.6">
            {{ props.description }}
          </view>
        </view>
        <view class="h-36px w-36px center rounded-full bg-white text-18px text-#64748b shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition-opacity duration-180 active:opacity-70" @tap="handleClose">
          <view class="i-carbon-close" />
        </view>
      </view>
      <scroll-view scroll-y class="pt-14px" style="height: calc(100% - 88px - env(safe-area-inset-bottom));">
        <slot />
      </scroll-view>
    </view>
  </view>
</template>
