<script lang="ts" setup>
const props = defineProps<{
  visible: boolean
  nickname: string
  desc: string
}>()

const emit = defineEmits<{
  close: []
  save: []
  nicknameChange: [value: string]
  descChange: [value: string]
}>()
</script>

<template>
  <view v-if="props.visible" class="fixed inset-0 z-1000 center bg-[rgba(0,0,0,0.5)]" @click="emit('close')">
    <view class="w-80% rounded-16px bg-white p-24px" @click.stop>
      <view class="text-16px text-gray-800 font-bold">
        编辑资料
      </view>
      <view class="mt-4">
        <view class="text-13px text-gray-500">
          昵称
        </view>
        <input
          :value="props.nickname"
          class="mt-8px rounded-10px bg-#f5f5f5 px-14px py-10px text-14px text-#333"
          placeholder="请输入昵称"
          :maxlength="20"
          @input="emit('nicknameChange', $event.detail?.value ?? $event.target?.value ?? '')"
        >
      </view>
      <view class="mt-3">
        <view class="text-13px text-gray-500">
          个性签名
        </view>
        <input
          :value="props.desc"
          class="mt-8px rounded-10px bg-#f5f5f5 px-14px py-10px text-14px text-#333"
          placeholder="请输入个性签名"
          :maxlength="30"
          @input="emit('descChange', $event.detail?.value ?? $event.target?.value ?? '')"
        >
      </view>
      <view class="mt-5 flex gap-3">
        <view class="flex-1 rounded-10px bg-#f5f5f5 py-12px text-center text-15px text-#666 active:opacity-80" @click="emit('close')">
          取消
        </view>
        <view class="flex-1 rounded-10px bg-#ff6633 py-12px text-center text-15px text-white active:opacity-80" @click="emit('save')">
          保存
        </view>
      </view>
    </view>
  </view>
</template>
