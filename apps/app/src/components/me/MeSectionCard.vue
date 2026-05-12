<script lang="ts" setup>
defineSlots<{
  default: () => any
}>()
</script>

<template>
  <view class="me-section-card">
    <slot />
  </view>
</template>

<style lang="scss" scoped>
.me-section-card {
  margin: 0 12px 12px;
  border-radius: 12px;
  background: #fff;
  padding: 8px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
</style>
