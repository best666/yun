<script lang="ts" setup>
import { APP_NAME } from '@/config/appMeta'

definePage({
  style: {
    navigationBarTitleText: '隐私政策',
    navigationBarBackgroundColor: '#f7fafc',
    navigationBarTextStyle: 'black',
    backgroundColor: '#f7fafc',
  },
})

const privacySectionList = [
  {
    title: '一、我们收集的信息',
    content: [
      '当你使用登录、收藏、评价、回复等功能时，我们会处理必要的账号标识、互动记录和操作日志。',
      '当你主动使用定位、地图搜索、导航等功能时，我们会在取得相应授权后处理位置信息。',
    ],
  },
  {
    title: '二、信息的使用方式',
    content: [
      '收集的信息主要用于实现地图展示、地点搜索、账号登录、内容互动和服务安全保障。',
      '我们不会将你的个人信息用于与当前服务无关的用途，除非获得你的明确同意或符合法律要求。',
    ],
  },
  {
    title: '三、信息共享与公开',
    content: [
      '除法律法规要求、服务履行所必需或获得你授权的情况外，我们不会向无关第三方共享你的个人信息。',
      '部分地图、登录、短信等能力由第三方提供，相关数据处理将遵循其对应规则。',
    ],
  },
  {
    title: '四、你的权利',
    content: [
      '你可以通过产品内功能管理收藏、足迹、互动内容及部分账号信息。',
      '你也可以停止授权定位、停止使用相关能力，或通过退出登录降低账号数据关联。',
    ],
  },
  {
    title: '五、政策更新',
    content: [
      '若隐私政策发生重大调整，我们会通过页面更新等方式向你说明。',
      '继续使用服务即表示你理解并接受更新后的隐私政策。',
    ],
  },
] as const
</script>

<template>
  <scroll-view scroll-y class="min-h-screen bg-#f7fafc">
    <view class="px-16px pb-[calc(24px+env(safe-area-inset-bottom))] pt-16px">
      <view class="rounded-24px bg-[linear-gradient(135deg,#ffffff_0%,#edf7ff_100%)] px-18px py-18px shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
        <view class="flex items-center gap-10px">
          <view class="h-42px w-42px flex items-center justify-center rounded-16px bg-#e0f2fe text-20px text-#0284c7">
            <view class="i-carbon-security" />
          </view>
          <view>
            <view class="text-20px text-#0f172a font-700">
              隐私政策
            </view>
            <view class="mt-4px text-12px text-#64748b">
              {{ APP_NAME }} 如何处理你的信息
            </view>
          </view>
        </view>
        <view class="mt-10px text-13px text-#64748b" style="line-height: 24px;">
          我们重视你的个人信息与使用数据安全，并尽量以最小必要范围提供地图、美食发现和互动服务。
        </view>
      </view>

      <view
        v-for="section in privacySectionList"
        :key="section.title"
        class="mt-12px rounded-20px bg-white px-16px py-16px shadow-[0_12px_28px_rgba(15,23,42,0.05)]"
      >
        <view class="text-15px text-#111827 font-600">
          {{ section.title }}
        </view>
        <view
          v-for="paragraph in section.content"
          :key="paragraph"
          class="mt-8px text-13px text-#6b7280"
          style="line-height: 24px;"
        >
          {{ paragraph }}
        </view>
      </view>
    </view>
  </scroll-view>
</template>
