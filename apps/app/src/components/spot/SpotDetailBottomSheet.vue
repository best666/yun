<script lang="ts" setup>
const props = defineProps<{
  rendered: boolean
  visible: boolean
  title: string
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <view v-if="props.rendered">
    <view class="fixed inset-0 z-999 bg-[rgba(15,23,42,0)] transition-colors duration-260 ease-[ease]" :class="props.visible ? 'bg-[rgba(15,23,42,0.45)]' : ''" @click="emit('close')" />
    <view class="fixed bottom-0 left-0 right-0 z-1000 translate-y-full rounded-t-24px bg-white px-18px pb-[calc(18px+env(safe-area-inset-bottom))] pt-12px transition-transform duration-260 ease-[ease]" :class="props.visible ? 'translate-y-0' : ''" @click.stop>
      <view class="mx-auto mb-14px h-4px w-44px rounded-full bg-[rgba(107,114,128,0.22)]" />
      <view class="text-center text-16px text-#111827 font-700">
        {{ props.title }}
      </view>
      <slot />
    </view>
  </view>
</template>
