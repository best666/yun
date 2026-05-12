<script lang="ts" setup>
defineSlots<{
  default: () => any
}>()
</script>

<template>
  <view class="mx-12px mb-12px rounded-12px bg-white px-16px py-8px shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
    <slot />
  </view>
</template>
