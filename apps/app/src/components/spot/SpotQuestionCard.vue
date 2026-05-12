<script lang="ts" setup>
import type { ISpotQuestionItem } from '@/api/types/spot'

const props = defineProps<{
  question: ISpotQuestionItem
}>()
</script>

<template>
  <view class="mt-12px rounded-22px bg-white p-16px">
    <view class="flex items-start justify-between gap-12px">
      <view class="min-w-0 flex items-center gap-10px">
        <image :src="props.question.askerAvatar" class="h-42px w-42px flex-shrink-0 rounded-full" mode="aspectFill" />
        <view class="min-w-0">
          <view class="text-14px text-gray-900 font-600">
            {{ props.question.asker }}
          </view>
          <view class="mt-4px text-11px text-gray-400">
            {{ props.question.time }}
          </view>
        </view>
      </view>
    </view>

    <view class="mt-12px text-16px text-gray-900 font-600 leading-1.7">
      {{ props.question.question }}
    </view>

    <view v-if="props.question.answers.length === 0" class="mt-12px rounded-14px bg-#f8f9fb px-14px py-12px text-12px text-gray-400">
      还没有人回复，欢迎稍后回来查看
    </view>

    <view
      v-for="answer in props.question.answers"
      :key="answer.id"
      class="mt-12px flex gap-10px rounded-16px bg-#f8f9fb p-12px"
    >
      <image :src="answer.avatar" class="h-32px w-32px flex-shrink-0 rounded-full" mode="aspectFill" />
      <view class="min-w-0 flex-1">
        <view class="flex items-center justify-between gap-12px">
          <text class="text-14px text-gray-900 font-600">{{ answer.userName }}</text>
          <text class="text-11px text-gray-400">{{ answer.time }}</text>
        </view>
        <view class="mt-6px text-13px text-gray-600 leading-1.75">
          {{ answer.content }}
        </view>
      </view>
    </view>
  </view>
</template>
