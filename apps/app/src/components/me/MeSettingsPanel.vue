<script lang="ts" setup>
type NavigationMapApp = 'ask' | 'system' | 'tencent' | 'amap'

interface NavigationMapOption {
  label: string
  value: NavigationMapApp
}

const props = defineProps<{
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
  <view class="overflow-hidden rounded-20px bg-white px-16px shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
    <view class="flex items-center justify-between border-b border-#eef2f7 py-16px">
      <view>
        <view class="text-16px text-#0f172a font-700">
          常用设置
        </view>
        <view class="mt-4px text-12px text-#64748b">
          地图偏好、缓存和账号操作都在这里维护
        </view>
      </view>
      <view class="rounded-full bg-#fff7ed px-10px py-5px text-11px text-#ea580c">
        当前：{{ props.selectedMapAppLabel }}
      </view>
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
      <view class="flex items-center justify-between gap-3">
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

      <view class="mt-14px flex flex-wrap gap-10px">
        <view
          v-for="option in props.navigationMapOptions"
          :key="option.value"
          class="min-w-88px border border-#e5e7eb rounded-full bg-#f9fafb px-14px py-8px text-center text-13px text-gray-500"
          :class="props.selectedMapApp === option.value ? '!border-#ff8c42 !bg-#fff4ed !text-#ea580c' : ''"
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

    <view v-if="props.hasLogin" class="flex items-center justify-between py-16px active:opacity-70" @click="emit('logout')">
      <view class="flex items-center gap-3">
        <view class="i-carbon-logout text-18px text-red-400" />
        <text class="text-15px text-red-400">退出登录</text>
      </view>
      <view class="i-carbon-chevron-right text-16px text-red-200" />
    </view>
  </view>
</template>
