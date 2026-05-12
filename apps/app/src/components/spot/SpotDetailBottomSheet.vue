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
    <view class="sheet-overlay" :class="{ 'sheet-overlay--show': props.visible }" @click="emit('close')" />
    <view class="review-sheet" :class="{ 'review-sheet--show': props.visible }" @click.stop>
      <view class="sheet-handle" />
      <view class="review-sheet__title">
        {{ props.title }}
      </view>
      <slot />
    </view>
  </view>
</template>

<style lang="scss" scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0);
  z-index: 999;
  transition: background 0.26s ease;
}

.sheet-overlay--show {
  background: rgba(15, 23, 42, 0.45);
}

.review-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  padding: 12px 18px calc(18px + env(safe-area-inset-bottom));
  background: #fff;
  border-radius: 24px 24px 0 0;
  transform: translateY(100%);
  transition: transform 0.26s ease;
}

.review-sheet--show {
  transform: translateY(0);
}

.sheet-handle {
  width: 44px;
  height: 4px;
  border-radius: 999px;
  background: rgba(107, 114, 128, 0.22);
  margin: 0 auto 14px;
}

.review-sheet__title {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  text-align: center;
}
</style>
