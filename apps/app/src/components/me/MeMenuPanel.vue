<script lang="ts" setup>
interface MeMenuItemViewModel {
  action: string
  icon: string
  label: string
  count?: number
  expanded?: boolean
}

const props = defineProps<{
  items: MeMenuItemViewModel[]
}>()

const emit = defineEmits<{
  itemtap: [action: string]
}>()

function handleSelect(action: string) {
  emit('itemtap', action)
}
</script>

<template>
  <view class="mx-12px mt-12px rounded-12px bg-white px-16px shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
    <view
      v-for="(item, index) in props.items"
      :key="item.action"
      class="flex items-center justify-between border-b border-#f5f5f5 py-16px transition-opacity duration-180 active:opacity-70"
      :class="{ 'border-b-0': index === props.items.length - 1 }"
      @tap="handleSelect(item.action)"
    >
      <view class="flex items-center gap-3">
        <view :class="item.icon" class="text-20px text-orange-500" />
        <text class="text-15px text-gray-700">{{ item.label }}</text>
        <text v-if="item.count && item.count > 0" class="text-12px text-gray-400">
          ({{ item.count }})
        </text>
      </view>
      <view
        class="text-16px text-gray-300 transition-transform duration-220 ease-[cubic-bezier(0.22,1,0.36,1)]"
        :class="item.expanded ? 'i-carbon-chevron-down translate-y-1px' : 'i-carbon-chevron-right'"
      />
    </view>
  </view>
</template>
