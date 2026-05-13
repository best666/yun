<script lang="ts" setup>
import { APP_NAME } from '@/config/appMeta'

definePage({
  style: {
    navigationBarTitleText: '用户协议',
    navigationBarBackgroundColor: '#fffaf6',
    navigationBarTextStyle: 'black',
    backgroundColor: '#fffaf6',
  },
})

const sectionList = [
  {
    title: '一、服务说明',
    content: [
      `${APP_NAME} 提供基于地图的美食地点发现、收藏、足迹、评价与互动等功能。`,
      '我们会持续优化服务内容，但不承诺所有平台、网络环境或第三方能力始终无中断。',
    ],
  },
  {
    title: '二、账号与使用规范',
    content: [
      '你应确保登录、发布和互动时提供的信息真实、合法，不冒用他人身份。',
      '不得利用本服务发布违法、侵权、虚假营销、骚扰或其他不当内容。',
      '若存在异常登录、刷评、恶意攻击等行为，平台有权限制相关功能或终止服务。',
    ],
  },
  {
    title: '三、内容发布与处理',
    content: [
      '你发布的评价、回复、讨论等内容，应对其合法性和真实性负责。',
      '为保证社区质量，平台可对明显违规、失实或破坏体验的内容进行审核、隐藏或删除。',
    ],
  },
  {
    title: '四、第三方能力',
    content: [
      '地图、登录、定位、短信等能力可能由第三方平台提供，其可用性受第三方服务状态影响。',
      '当你使用相关功能时，也应同时遵守对应第三方平台的服务条款与规则。',
    ],
  },
  {
    title: '五、协议更新',
    content: [
      '当业务能力、法律要求或平台规则发生变化时，本协议可能更新。',
      '更新后的协议发布后即生效，你继续使用服务视为接受更新内容。',
    ],
  },
] as const
</script>

<template>
  <scroll-view scroll-y class="min-h-screen bg-#fffaf6">
    <view class="px-16px pb-[calc(24px+env(safe-area-inset-bottom))] pt-16px">
      <view class="rounded-24px bg-white px-18px py-18px shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
        <view class="text-22px text-#1f2937 font-700">
          用户协议
        </view>
        <view class="mt-8px text-13px text-#6b7280" style="line-height: 24px;">
          请在使用 {{ APP_NAME }} 前阅读本协议。继续使用即表示你已理解并同意协议中的主要约定。
        </view>
      </view>

      <view
        v-for="section in sectionList"
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
