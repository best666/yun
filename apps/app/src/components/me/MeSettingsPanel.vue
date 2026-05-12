<script lang="ts" setup>
type NavigationMapApp = 'ask' | 'system' | 'tencent' | 'amap'

interface NavigationMapOption {
  label: string
  value: NavigationMapApp
}

const props = defineProps<{
  visible: boolean
  hasLogin: boolean
  selectedMapApp: NavigationMapApp
  selectedMapAppLabel: string
  navigationMapOptions: readonly NavigationMapOption[]
}>()

const emit = defineEmits<{
  close: []
  clearFootprints: []
  clearCache: []
  selectMapApp: [value: NavigationMapApp]
  showAbout: []
  logout: []
}>()
</script>

<template>
  <view v-if="props.visible" class="fixed inset-0 z-1000 center bg-[rgba(0,0,0,0.5)]" @click="emit('close')">
    <view class="w-80% rounded-16px bg-white p-20px" @click.stop>
      <view class="flex items-center justify-between border-b-1px border-gray-100 pb-3">
        <view class="text-16px text-gray-800 font-bold">
          设置
        </view>
        <view class="i-carbon-close text-20px text-gray-400" @click="emit('close')" />
      </view>
      <view class="flex items-center justify-between border-b border-#f5f5f5 py-16px active:opacity-70" @click="emit('clearFootprints')">
        <view class="flex items-center gap-3">
          <view class="i-carbon-trash-can text-18px text-gray-500" />
          <text class="text-15px text-gray-700">清空浏览足迹</text>
        </view>
        <view class="i-carbon-chevron-right text-16px text-gray-300" />
      </view>
      <view class="flex items-center justify-between border-b border-#f5f5f5 py-16px active:opacity-70" @click="emit('clearCache')">
        <view class="flex items-center gap-3">
          <view class="i-carbon-clean text-18px text-gray-500" />
          <text class="text-15px text-gray-700">清除缓存</text>
        </view>
        <view class="i-carbon-chevron-right text-16px text-gray-300" />
      </view>
      <view class="border-b border-#f5f5f5 py-16px">
        <view class="flex items-center justify-between">
          <view class="flex items-center gap-3">
            <view class="i-carbon-map text-18px text-gray-500" />
            <view>
              <view class="text-15px text-gray-700">
                导航地图
              </view>
              <view class="mt-1 text-12px text-gray-400">
                地点详情点击导航时，可按这里的偏好直接打开或每次选择
              </view>
            </view>
          </view>
          <view class="text-12px text-orange-500">
            当前：{{ props.selectedMapAppLabel }}
          </view>
        </view>
        <view class="mt-14px flex gap-10px">
          <view
            v-for="option in props.navigationMapOptions"
            :key="option.value"
            class="map-provider-chip"
            :class="{ '!border-#ff8c42 !bg-#fff4ed !text-#ea580c': props.selectedMapApp === option.value }"
            @click.stop="emit('selectMapApp', option.value)"
          >
            {{ option.label }}
          </view>
        </view>
      </view>
      <view class="flex items-center justify-between border-b border-#f5f5f5 py-16px active:opacity-70" @click="emit('showAbout')">
        <view class="flex items-center gap-3">
          <view class="i-carbon-information text-18px text-gray-500" />
          <text class="text-15px text-gray-700">关于</text>
        </view>
        <view class="i-carbon-chevron-right text-16px text-gray-300" />
      </view>
      <view v-if="props.hasLogin" class="flex items-center justify-between border-t border-#fff1f1 py-16px active:opacity-70" @click="emit('logout')">
        <view class="flex items-center gap-3">
          <view class="i-carbon-logout text-18px text-red-400" />
          <text class="text-15px text-red-400">退出登录</text>
        </view>
        <view class="i-carbon-chevron-right text-16px text-red-200" />
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.map-provider-chip {
  min-width: 88px;
  padding: 8px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #f9fafb;
  font-size: 13px;
  color: #6b7280;
  text-align: center;
}
</style>
