<script lang="ts" setup>
interface UserInfoViewModel {
  nickname: string
  avatar: string
  desc: string
}

interface UserStatItem {
  label: string
  value: number | string
}

const props = defineProps<{
  userInfo: UserInfoViewModel
  hasLogin: boolean
  stats: UserStatItem[]
}>()

const emit = defineEmits<{
  editProfile: []
  login: []
}>()
</script>

<template>
  <view class="relative">
    <view class="h-200px bg-[linear-gradient(135deg,#ff6633_0%,#ff8c42_100%)] pt-safe" />
    <view class="relative z-10 mt--120px flex items-center gap-14px px-20px">
      <image :src="props.userInfo.avatar" class="h-68px w-68px border-[3px] border-white rounded-full border-solid shadow-[0_2px_8px_rgba(0,0,0,0.15)]" mode="aspectFill" />
      <view class="flex-1" @click="emit('editProfile')">
        <view class="flex items-center gap-2">
          <view class="text-18px text-white font-bold">
            {{ props.userInfo.nickname }}
          </view>
          <view class="i-carbon-edit text-14px text-white text-opacity-70" />
        </view>
        <view class="mt-1 text-13px text-white text-opacity-80">
          {{ props.userInfo.desc }}
        </view>
      </view>
      <view v-if="!props.hasLogin" class="border border-[rgba(255,255,255,0.28)] rounded-full bg-[rgba(255,255,255,0.18)] px-14px py-8px text-13px text-white" @click="emit('login')">
        去登录
      </view>
    </view>

    <view class="relative z-10 mx-12px mt-16px flex rounded-12px bg-white py-16px shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <view v-for="stat in props.stats" :key="stat.label" class="flex-1 text-center">
        <view class="text-20px text-gray-800 font-bold">
          {{ stat.value }}
        </view>
        <view class="mt-1 text-12px text-gray-500">
          {{ stat.label }}
        </view>
      </view>
    </view>
  </view>
</template>
