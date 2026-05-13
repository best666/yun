<script lang="ts" setup>
import { APP_LEGAL_PAGES, APP_NAME } from '@/config/appMeta'
import { useLoginPage } from '@/hooks/useLoginPage'

defineOptions({
  name: 'Login',
})

definePage({
  excludeLoginPath: true,
  style: {
    navigationBarTitleText: '登录',
    navigationStyle: 'custom',
  },
})

const {
  form,
  redirectPath,
  smsCodeButtonText,
  isSendingCode,
  isSmsCodeButtonDisabled,
  isSmsLoginDisabled,
  isMiniProgramLoginDisabled,
  isOauthLoginDisabled,
  isSubmitting,
  oauthLoading,
  handleSmsLogin,
  handleSendSmsCode,
  handleMiniProgramLogin,
  startOauthLogin,
} = useLoginPage()

function openLegalPage(url: string) {
  uni.navigateTo({ url })
}
</script>

<template>
  <view class="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(255,170,118,0.28),transparent_32%),linear-gradient(180deg,#fff7f2_0%,#fff_46%,#fff5ed_100%)] px-18px pb-[calc(env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+24px)]">
    <view class="auth-card p-[24px_20px]">
      <view class="text-12px text-#ff7b4a tracking-[0.16em] uppercase">
        {{ APP_NAME }}
      </view>
      <view class="mt-12px text-24px text-#2b211c font-700 leading-1.35">
        登录后同步你的收藏、足迹与偏好
      </view>
      <view class="mt-10px text-14px text-#7a675d" style="line-height: 24px;">
        小程序使用微信快捷登录，H5 支持手机验证码和第三方账号登录。
      </view>
    </view>

    <!-- #ifdef MP-WEIXIN -->
    <view class="login-section-card">
      <view class="text-17px text-#2b211c font-700">
        微信小程序登录
      </view>
      <view class="mt-8px text-13px text-#8a7569" style="line-height: 22px;">
        授权后将自动创建或绑定你的账号。
      </view>
      <button class="auth-primary-btn" :loading="isSubmitting" :disabled="isMiniProgramLoginDisabled" @click="handleMiniProgramLogin">
        微信一键登录
      </button>
    </view>
    <!-- #endif -->

    <!-- #ifdef H5 -->
    <view class="login-section-card">
      <view class="text-17px text-#2b211c font-700">
        手机验证码登录
      </view>
      <input v-model="form.phone" class="auth-input" type="number" :maxlength="11" placeholder="请输入手机号">
      <view class="flex items-center gap-10px">
        <input v-model="form.code" class="auth-input min-w-0 flex-1" type="number" :maxlength="6" placeholder="请输入验证码">
        <button class="mt-14px h-46px w-112px flex items-center justify-center rounded-14px border-none bg-#fff1e8 text-15px text-#ff6a3d" :disabled="isSmsCodeButtonDisabled" @click="handleSendSmsCode">
          {{ smsCodeButtonText }}
        </button>
      </view>
      <button class="auth-primary-btn" :loading="isSubmitting" :disabled="isSmsLoginDisabled" @click="handleSmsLogin">
        手机号登录
      </button>
    </view>

    <view class="login-section-card">
      <view class="text-17px text-#2b211c font-700">
        第三方账号登录
      </view>
      <view class="grid grid-cols-2 mt-14px gap-12px">
        <button class="h-46px flex items-center justify-center rounded-14px border-none bg-[linear-gradient(135deg,#17b65a_0%,#34d273_100%)] text-15px text-white" :loading="oauthLoading === 'wechat'" :disabled="isOauthLoginDisabled" @click="startOauthLogin('wechat')">
          微信登录
        </button>
        <button class="h-46px flex items-center justify-center rounded-14px border-none bg-[linear-gradient(135deg,#121723_0%,#2a3244_100%)] text-15px text-white" :loading="oauthLoading === 'douyin'" :disabled="isOauthLoginDisabled" @click="startOauthLogin('douyin')">
          抖音登录
        </button>
      </view>
      <view class="mt-8px text-13px text-#8a7569" style="line-height: 22px;">
        需要先在服务端配置对应平台的 AppId / Secret。
      </view>
    </view>
    <!-- #endif -->

    <view class="mt-18px rounded-18px bg-white/80 px-16px py-14px shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <view class="text-center text-12px text-#8a7569" style="line-height: 20px;">
        登录即表示你已阅读并同意以下说明
      </view>
      <view class="mt-10px flex items-center justify-center gap-12px text-13px text-#ff7b4a">
        <view class="active:opacity-70" @tap="openLegalPage(APP_LEGAL_PAGES.agreement)">
          用户协议
        </view>
        <view class="h-10px w-1px bg-#fed7aa" />
        <view class="active:opacity-70" @tap="openLegalPage(APP_LEGAL_PAGES.privacy)">
          隐私政策
        </view>
      </view>
    </view>

    <view v-if="redirectPath" class="mt-18px text-center text-13px text-#8a7569" style="line-height: 22px;">
      登录成功后将返回原页面
    </view>
    <view v-else class="mt-18px text-center text-13px text-#8a7569" style="line-height: 22px;">
      登录成功后将进入“我的”页面
    </view>
  </view>
</template>
