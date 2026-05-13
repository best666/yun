<script lang="ts" setup>
import { computed } from 'vue'
import { AVATAR_CROPPER_GUIDE_TEXT } from '@/config/avatarPolicy'

const props = defineProps<{
  visible: boolean
  avatar: string
  nickname: string
  desc: string
  avatarTip?: string
  avatarTipTone?: 'default' | 'error' | 'success'
  uploadingAvatar?: boolean
  saving?: boolean
}>()
const emit = defineEmits<{
  close: []
  save: []
  changeAvatar: []
  nicknameChange: [value: string]
  descChange: [value: string]
}>()
const NICKNAME_MAX_LENGTH = 20
const SIGNATURE_MAX_LENGTH = 30

const nicknameLength = computed(() => Array.from(props.nickname || '').length)
const signatureLength = computed(() => Array.from(props.desc || '').length)
const isAvatarBusy = computed(() => Boolean(props.uploadingAvatar || props.saving))
const saveButtonText = computed(() => {
  if (props.uploadingAvatar) {
    return '头像上传中'
  }

  return props.saving ? '保存中...' : '保存资料'
})

function resolveCountTone(current: number, max: number) {
  if (current >= max) {
    return 'text-#d14343'
  }

  if (current >= max - 5) {
    return 'text-#ff7a45'
  }

  return 'text-#999'
}

function handleClose() {
  if (isAvatarBusy.value) {
    return
  }

  emit('close')
}

function handleChangeAvatar() {
  if (isAvatarBusy.value) {
    return
  }

  emit('changeAvatar')
}

function handleSave() {
  if (isAvatarBusy.value) {
    return
  }

  emit('save')
}
</script>

<template>
  <view v-if="props.visible">
    <view class="profile-dialog-mask fixed inset-0 z-1000" style="background: rgba(15, 23, 42, 0.45);" @click="handleClose" />
    <view class="profile-dialog-sheet fixed bottom-0 left-0 right-0 z-1010 rounded-t-24px px-16px pt-12px" style="background: #fffaf7; padding-bottom: calc(20px + env(safe-area-inset-bottom));" @click.stop>
      <view class="mx-auto h-5px w-44px rounded-full bg-[rgba(148,163,184,0.42)]" />
      <view class="mt-12px flex items-start justify-between gap-12px">
        <view class="min-w-0 flex-1">
          <view class="text-18px text-#1f2937 font-700">
            编辑资料
          </view>
          <view class="mt-4px text-12px text-#7c8aa0" style="line-height: 18px;">
            在这里更新头像、昵称和个性签名。
          </view>
        </view>
        <view class="center flex-shrink-0 rounded-full" :class="isAvatarBusy ? 'opacity-50' : 'active:opacity-70'" style="width: 36px; height: 36px; background: #ffffff; color: #64748b; box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);" @click="handleClose">
          <view class="i-carbon-close text-18px" />
        </view>
      </view>

      <scroll-view scroll-y class="mt-14px" style="max-height: calc(78vh - 132px - env(safe-area-inset-bottom));">
        <view class="pb-6px">
          <view class="overflow-hidden rounded-18px bg-[linear-gradient(135deg,#fff3e8_0%,#fffaf5_55%,#fff4eb_100%)] p-16px">
            <view class="flex items-center justify-between gap-12px">
              <view class="inline-flex rounded-full bg-white/80 px-10px py-4px text-11px text-#c46a39 font-600 shadow-[0_8px_20px_rgba(255,102,51,0.08)]">
                头像上传
              </view>
              <view
                v-if="props.avatarTipTone === 'success'"
                class="inline-flex items-center rounded-full bg-#ebfff1 px-10px py-4px text-11px text-#1f8f55 font-600"
              >
                新头像已更改，保存资料后生效
              </view>
            </view>
            <view class="mt-14px flex items-center gap-14px">
              <view
                class="relative h-92px w-92px flex-shrink-0"
                :class="isAvatarBusy ? 'opacity-85' : 'active:opacity-90'"
                @click="handleChangeAvatar"
              >
                <image
                  :src="props.avatar"
                  class="h-full w-full rounded-full bg-#f5f5f5"
                  mode="aspectFill"
                  style="border: 3px solid #ffffff; box-shadow: 0 14px 28px rgba(255, 102, 51, 0.16);"
                />
                <view
                  v-if="isAvatarBusy"
                  class="absolute inset-0 center rounded-full"
                  style="background: rgba(15, 23, 42, 0.34);"
                >
                  <view class="i-carbon-circle-dash animate-spin text-22px text-white" />
                </view>
                <view
                  class="absolute"
                  style="left: 50%; bottom: -4px; transform: translateX(-50%); padding: 4px 8px; border-radius: 999px; white-space: nowrap; background: #ff6633; color: #ffffff; font-size: 10px; box-shadow: 0 8px 18px rgba(255, 102, 51, 0.22);"
                >
                  {{ isAvatarBusy ? '上传中' : '点击更换' }}
                </view>
              </view>
              <view class="min-w-0 flex-1">
                <view class="text-15px text-#333 font-600">
                  点击头像更换
                </view>
                <view class="mt-6px text-12px text-#7a7a7a" style="line-height: 18px;">
                  选择图片后会直接进入裁剪，确认后按裁剪结果压缩并上传。
                </view>
              </view>
            </view>
            <view class="mt-12px rounded-14px bg-white/88 px-12px py-10px">
              <view
                class="text-12px"
                :class="props.avatarTipTone === 'error' ? 'text-#d14343' : props.avatarTipTone === 'success' ? 'text-#1f8f55' : 'text-#666'"
                style="line-height: 18px;"
              >
                {{ props.avatarTip || '点击头像后会先选择图片，再进入裁剪。' }}
              </view>
              <view class="mt-6px text-11px text-#8b8b8b" style="line-height: 16px;">
                {{ AVATAR_CROPPER_GUIDE_TEXT }}
              </view>
            </view>
          </view>
          <view class="mt-14px rounded-16px bg-#f8f8f8 px-14px py-14px">
            <view class="flex items-center justify-between gap-12px">
              <view class="text-14px text-#333 font-600">
                昵称
              </view>
              <view class="text-11px" :class="resolveCountTone(nicknameLength, NICKNAME_MAX_LENGTH)">
                {{ nicknameLength }}/{{ NICKNAME_MAX_LENGTH }}
              </view>
            </view>
            <input
              :value="props.nickname"
              class="mt-10px rounded-12px bg-white px-14px py-12px text-14px text-#333"
              placeholder="留空将恢复默认昵称"
              :maxlength="NICKNAME_MAX_LENGTH"
              @input="emit('nicknameChange', $event.detail?.value ?? $event.target?.value ?? '')"
            >
            <view class="mt-8px text-11px" :class="nicknameLength >= NICKNAME_MAX_LENGTH ? 'text-#d14343' : 'text-#999'">
              {{ nicknameLength >= NICKNAME_MAX_LENGTH ? '已达到昵称字数上限' : '建议 4-12 个字，便于他人识别' }}
            </view>
          </view>
          <view class="mt-12px rounded-16px bg-#f8f8f8 px-14px py-14px">
            <view class="flex items-center justify-between gap-12px">
              <view class="text-14px text-#333 font-600">
                个性签名
              </view>
              <view class="text-11px" :class="resolveCountTone(signatureLength, SIGNATURE_MAX_LENGTH)">
                {{ signatureLength }}/{{ SIGNATURE_MAX_LENGTH }}
              </view>
            </view>
            <input
              :value="props.desc"
              class="mt-10px rounded-12px bg-white px-14px py-12px text-14px text-#333"
              placeholder="留空将恢复默认签名"
              :maxlength="SIGNATURE_MAX_LENGTH"
              @input="emit('descChange', $event.detail?.value ?? $event.target?.value ?? '')"
            >
            <view class="mt-8px text-11px" :class="signatureLength >= SIGNATURE_MAX_LENGTH ? 'text-#d14343' : 'text-#999'">
              {{ signatureLength >= SIGNATURE_MAX_LENGTH ? '已达到签名字数上限' : '一句轻松自然的话，会让资料页更有温度' }}
            </view>
          </view>
        </view>
      </scroll-view>

      <view class="mt-14px flex gap-10px border-t border-[rgba(226,232,240,0.7)] pt-14px">
        <view class="flex-1" :class="isAvatarBusy ? 'opacity-50' : 'active:opacity-80'" style="border: 1px solid #ececec; border-radius: 14px; background: #ffffff; padding: 12px 0; text-align: center; font-size: 15px; color: #666666;" @click="handleClose">
          取消
        </view>
        <view class="flex-1 rounded-14px bg-#ff6633 py-12px text-center text-15px text-white shadow-[0_12px_24px_rgba(255,102,51,0.2)]" :class="isAvatarBusy ? 'opacity-60' : 'active:opacity-80'" @click="handleSave">
          {{ saveButtonText }}
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.profile-dialog-mask {
  animation: profile-mask-fade 220ms ease-out;
}

.profile-dialog-sheet {
  animation: profile-sheet-rise 280ms cubic-bezier(0.22, 1, 0.36, 1);
  box-shadow: 0 -16px 34px rgba(15, 23, 42, 0.14);
}

@keyframes profile-mask-fade {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes profile-sheet-rise {
  from {
    opacity: 0.9;
    transform: translateY(48px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
