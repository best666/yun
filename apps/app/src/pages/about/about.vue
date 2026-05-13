<script lang="ts" setup>
import { APP_LAST_UPDATED, APP_LEGAL_PAGES, APP_NAME, APP_VERSION } from '@/config/appMeta'

definePage({
  style: {
    navigationBarTitleText: '关于',
    navigationBarBackgroundColor: '#fff7f2',
    navigationBarTextStyle: 'black',
    backgroundColor: '#fff7f2',
  },
})

const APP_SLOGAN = '帮你发现附近值得专程去吃的一口'

const featureList = [
  {
    title: '地图找店更直接',
    description: '按当前位置查看附近美食地点，快速切换地图视角和搜索结果。',
    icon: 'i-carbon-map',
  },
  {
    title: '收藏与足迹同步整理',
    description: '把想吃和看过的地点集中保留，回头再找不会丢。',
    icon: 'i-carbon-favorite',
  },
  {
    title: '评价与互动沉淀口碑',
    description: '通过评价、回复和提醒，把真实体验逐步沉淀成可靠参考。',
    icon: 'i-carbon-chat',
  },
] as const

const infoList = [
  { label: '应用名称', value: APP_NAME },
  { label: '当前版本', value: APP_VERSION },
  { label: '最后更新', value: APP_LAST_UPDATED },
  { label: '适用场景', value: 'H5 / 微信小程序 / uni-app 多端' },
]

const legalEntryList = [
  {
    title: '用户协议',
    description: '说明账号、服务使用边界和用户行为规范。',
    url: APP_LEGAL_PAGES.agreement,
    icon: 'i-carbon-document',
  },
  {
    title: '隐私政策',
    description: '说明定位、登录、互动等数据的收集与使用方式。',
    url: APP_LEGAL_PAGES.privacy,
    icon: 'i-carbon-security',
  },
] as const

const currentYear = new Date().getFullYear()

function copyAppName() {
  uni.setClipboardData({
    data: APP_NAME,
    success: () => {
      uni.showToast({ title: '已复制应用名称', icon: 'none' })
    },
  })
}

function openLegalPage(url: string) {
  uni.navigateTo({ url })
}
</script>

<template>
  <scroll-view scroll-y class="min-h-screen bg-#fff7f2">
    <view class="px-16px pb-[calc(24px+env(safe-area-inset-bottom))] pt-16px">
      <view class="overflow-hidden rounded-24px bg-[linear-gradient(135deg,#ff7a45_0%,#ff9b73_55%,#ffd6bf_100%)] px-18px pb-20px pt-22px text-white shadow-[0_18px_40px_rgba(255,122,69,0.22)]">
        <view class="flex items-center justify-between gap-3">
          <view class="min-w-0 flex-1">
            <view class="text-12px text-white/80 tracking-[0.24em]">
              ABOUT
            </view>
            <view class="mt-10px text-26px font-700 leading-tight">
              {{ APP_NAME }}
            </view>
            <view class="mt-8px text-13px text-white/86" style="line-height: 22px;">
              {{ APP_SLOGAN }}
            </view>
          </view>
          <view class="h-66px w-66px flex flex-shrink-0 items-center justify-center rounded-20px bg-white/20 text-30px backdrop-blur-8">
            <view class="i-carbon-location-heart" />
          </view>
        </view>

        <view class="mt-18px flex items-center justify-between rounded-18px bg-white/14 px-14px py-12px backdrop-blur-8">
          <view>
            <view class="text-11px text-white/70">
              当前版本
            </view>
            <view class="mt-4px text-16px font-600">
              v{{ APP_VERSION }}
            </view>
          </view>
          <view class="border border-white/26 rounded-full px-12px py-7px text-12px text-white active:opacity-75" @tap="copyAppName">
            复制应用名
          </view>
        </view>
      </view>

      <view class="mt-14px rounded-20px bg-white px-16px py-18px shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <view class="text-16px text-#111827 font-600">
          应用简介
        </view>
        <view class="mt-10px text-13px text-#6b7280" style="line-height: 24px;">
          云南美食集聚焦“地图找吃的”这一条最短路径，帮助用户在附近快速发现地点、查看口碑、记录收藏与足迹，并通过互动沉淀真实的吃喝参考。
        </view>
      </view>

      <view class="mt-14px">
        <view class="mb-10px px-4px text-15px text-#374151 font-600">
          核心能力
        </view>
        <view
          v-for="feature in featureList"
          :key="feature.title"
          class="mb-10px rounded-20px bg-white px-16px py-15px shadow-[0_10px_24px_rgba(15,23,42,0.05)] last:mb-0"
        >
          <view class="flex items-start gap-12px">
            <view class="h-40px w-40px flex flex-shrink-0 items-center justify-center rounded-14px bg-#fff1ea text-20px text-#ff6b35">
              <view :class="feature.icon" />
            </view>
            <view class="min-w-0 flex-1">
              <view class="text-15px text-#111827 font-600">
                {{ feature.title }}
              </view>
              <view class="mt-6px text-13px text-#6b7280" style="line-height: 22px;">
                {{ feature.description }}
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="mt-14px rounded-20px bg-white px-16px py-16px shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <view class="text-16px text-#111827 font-600">
          基本信息
        </view>
        <view
          v-for="item in infoList"
          :key="item.label"
          class="flex items-center justify-between border-b border-#f3f4f6 py-13px last:border-b-0 last:pb-0"
        >
          <text class="text-13px text-#6b7280">
            {{ item.label }}
          </text>
          <text class="max-w-58% text-right text-13px text-#111827">
            {{ item.value }}
          </text>
        </view>
      </view>

      <view class="mt-14px rounded-20px bg-white px-16px py-16px shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <view class="text-16px text-#111827 font-600">
          协议与说明
        </view>
        <view
          v-for="entry in legalEntryList"
          :key="entry.title"
          class="flex items-center justify-between border-b border-#f3f4f6 py-14px last:border-b-0 last:pb-0 active:opacity-75"
          @tap="openLegalPage(entry.url)"
        >
          <view class="min-w-0 flex flex-1 items-center gap-12px pr-12px">
            <view class="h-38px w-38px flex flex-shrink-0 items-center justify-center rounded-14px bg-#fff1ea text-18px text-#ff6b35">
              <view :class="entry.icon" />
            </view>
            <view class="min-w-0 flex-1">
              <view class="text-14px text-#111827 font-600">
                {{ entry.title }}
              </view>
              <view class="mt-4px text-12px text-#6b7280" style="line-height: 20px;">
                {{ entry.description }}
              </view>
            </view>
          </view>
          <view class="i-carbon-chevron-right text-16px text-#c4c9d4" />
        </view>
      </view>

      <view class="mt-14px rounded-20px bg-white/70 px-16px py-14px text-12px text-#9a3412" style="border: 1px dashed #ffd8c7; line-height: 20px;">
        若你在使用过程中遇到定位、地图展示或页面交互问题，可以从“我的 > 设置”重新进入相关功能，或等待后续版本持续优化。
      </view>

      <view class="pb-8px pt-16px text-center text-11px text-#9ca3af" style="line-height: 18px;">
        Copyright © {{ currentYear }} {{ APP_NAME }}
      </view>
    </view>
  </scroll-view>
</template>
