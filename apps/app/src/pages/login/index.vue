<script lang="ts" setup>
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
  smsCountdown,
  isSendingCode,
  isSubmitting,
  oauthLoading,
  handleSmsLogin,
  handleSendSmsCode,
  handleMiniProgramLogin,
  startOauthLogin,
} = useLoginPage()
</script>

<template>
  <view class="login-shell">
    <view class="auth-card p-[24px_20px]">
      <view class="login-eyebrow">
        云南美食地图
      </view>
      <view class="mt-12px text-24px text-#2b211c font-700 leading-1.35">
        登录后同步你的收藏、足迹与偏好
      </view>
      <view class="mt-10px text-14px text-#7a675d leading-1.7">
        小程序使用微信快捷登录，H5 支持手机验证码和第三方账号登录。
      </view>
    </view>

    <!-- #ifdef MP-WEIXIN -->
    <view class="mt-16px auth-card p-18px">
      <view class="text-17px text-#2b211c font-700">
        微信小程序登录
      </view>
      <view class="mt-8px text-13px text-#8a7569 leading-1.7">
        授权后将自动创建或绑定你的账号。
      </view>
      <button class="auth-primary-btn" :loading="isSubmitting" @click="handleMiniProgramLogin">
        微信一键登录
      </button>
    </view>
    <!-- #endif -->

    <!-- #ifdef H5 -->
    <view class="mt-16px auth-card p-18px">
      <view class="text-17px text-#2b211c font-700">
        手机验证码登录
      </view>
      <input v-model="form.phone" class="auth-input" type="number" :maxlength="11" placeholder="请输入手机号">
      <view class="flex items-center gap-10px">
        <input v-model="form.code" class="auth-input min-w-0 flex-1" type="number" :maxlength="6" placeholder="请输入验证码">
        <button class="login-code-btn" :disabled="smsCountdown > 0 || isSendingCode" @click="handleSendSmsCode">
          {{ smsCountdown > 0 ? `${smsCountdown}s` : '获取验证码' }}
        </button>
      </view>
      <button class="auth-primary-btn" :loading="isSubmitting" @click="handleSmsLogin">
        手机号登录
      </button>
    </view>

    <view class="mt-16px auth-card p-18px">
      <view class="text-17px text-#2b211c font-700">
        第三方账号登录
      </view>
      <view class="login-oauth-grid">
        <button class="login-oauth-wechat-btn" :loading="oauthLoading === 'wechat'" @click="startOauthLogin('wechat')">
          微信登录
        </button>
        <button class="login-oauth-douyin-btn" :loading="oauthLoading === 'douyin'" @click="startOauthLogin('douyin')">
          抖音登录
        </button>
      </view>
      <view class="mt-8px text-13px text-#8a7569 leading-1.7">
        需要先在服务端配置对应平台的 AppId / Secret。
      </view>
    </view>
    <!-- #endif -->

    <view v-if="redirectPath" class="mt-18px text-center text-13px text-#8a7569 leading-1.7">
      登录成功后将返回原页面
    </view>
    <view v-else class="mt-18px text-center text-13px text-#8a7569 leading-1.7">
      登录成功后将进入“我的”页面
    </view>
  </view>
</template>

<style lang="scss" scoped>
.login-shell {
  min-height: 100vh;
  padding: calc(env(safe-area-inset-top) + 24px) 18px calc(env(safe-area-inset-bottom) + 24px);
  background:
    radial-gradient(circle at top right, rgba(255, 170, 118, 0.28), transparent 32%),
    linear-gradient(180deg, #fff7f2 0%, #fff 46%, #fff5ed 100%);
}

.login-eyebrow {
  font-size: 12px;
  color: #ff7b4a;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.login-code-btn,
.login-oauth-wechat-btn,
.login-oauth-douyin-btn {
  display: flex;
  height: 46px;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  color: #fff;
}

.login-code-btn {
  width: 112px;
  margin-top: 14px;
  background: #fff1e8;
  color: #ff6a3d;
}

.login-oauth-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.login-oauth-wechat-btn {
  background: linear-gradient(135deg, #17b65a 0%, #34d273 100%);
}

.login-oauth-douyin-btn {
  background: linear-gradient(135deg, #121723 0%, #2a3244 100%);
}
</style>
