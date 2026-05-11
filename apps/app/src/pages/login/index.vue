<script lang="ts" setup>
import type { LoginProvider } from '@/api/types/login'
import { sendSmsCode } from '@/api/login'
import { useTokenStore } from '@/store'
import { getEnvBaseUrl } from '@/utils'

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

const tokenStore = useTokenStore()

const form = reactive({
  phone: '',
  code: '',
})

const redirectPath = ref('')
const smsCountdown = ref(0)
const isSendingCode = ref(false)
const isSubmitting = ref(false)
const oauthLoading = ref<LoginProvider | ''>('')

let smsTimer: ReturnType<typeof setInterval> | null = null
let oauthMessageHandler: ((event: MessageEvent) => void) | null = null

function getApiBaseUrl() {
  const baseUrl = getEnvBaseUrl().replace(/\/$/, '')
  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`
}

function validatePhone() {
  return /^1\d{10}$/.test(form.phone)
}

function stopSmsCountdown() {
  if (smsTimer) {
    clearInterval(smsTimer)
    smsTimer = null
  }
}

function startSmsCountdown() {
  stopSmsCountdown()
  smsCountdown.value = 60
  smsTimer = setInterval(() => {
    smsCountdown.value -= 1
    if (smsCountdown.value <= 0) {
      stopSmsCountdown()
    }
  }, 1000)
}

function navigateAfterLogin() {
  if (redirectPath.value) {
    uni.reLaunch({ url: redirectPath.value })
    return
  }

  if (getCurrentPages().length > 1) {
    uni.navigateBack()
    return
  }

  uni.switchTab({ url: '/pages/me/me' })
}

async function handleSmsLogin() {
  if (!validatePhone()) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }

  if (!form.code.trim()) {
    uni.showToast({ title: '请输入验证码', icon: 'none' })
    return
  }

  isSubmitting.value = true
  try {
    await tokenStore.login({
      phone: form.phone,
      code: form.code,
    })
    navigateAfterLogin()
  }
  finally {
    isSubmitting.value = false
  }
}

async function handleSendSmsCode() {
  if (isSendingCode.value || smsCountdown.value > 0)
    return

  if (!validatePhone()) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }

  isSendingCode.value = true
  try {
    const result = await sendSmsCode({ phone: form.phone })
    startSmsCountdown()
    if (result.debugCode) {
      form.code = result.debugCode
      uni.showToast({ title: `开发验证码 ${result.debugCode}`, icon: 'none' })
    }
    else {
      uni.showToast({ title: '验证码已发送', icon: 'success' })
    }
  }
  finally {
    isSendingCode.value = false
  }
}

async function handleMiniProgramLogin() {
  isSubmitting.value = true
  try {
    await tokenStore.wxLogin()
    navigateAfterLogin()
  }
  finally {
    isSubmitting.value = false
  }
}

async function handleOauthTicket(ticket: string, provider: LoginProvider) {
  oauthLoading.value = provider
  try {
    await tokenStore.loginWithOauthTicket(ticket)
    navigateAfterLogin()
  }
  finally {
    oauthLoading.value = ''
  }
}

function startOauthLogin(provider: LoginProvider) {
  // #ifdef H5
  if (oauthLoading.value)
    return

  oauthLoading.value = provider
  const authUrl = `${getApiBaseUrl()}/auth/oauth/${provider}/authorize?origin=${encodeURIComponent(window.location.origin)}`
  const popup = window.open(authUrl, `${provider}-login`, 'popup=1,width=560,height=720')

  if (!popup) {
    window.location.href = authUrl
    return
  }
  // #endif
}

onLoad((options) => {
  redirectPath.value = options?.redirect ? decodeURIComponent(String(options.redirect)) : ''
})

onMounted(() => {
  // #ifdef H5
  const expectedOrigin = new URL(getApiBaseUrl()).origin

  oauthMessageHandler = async (event: MessageEvent) => {
    if (event.origin !== expectedOrigin)
      return

    const data = event.data as { source?: string, success?: boolean, ticket?: string, message?: string, provider?: LoginProvider }
    if (data?.source !== 'yun-auth')
      return

    if (!data.success || !data.ticket) {
      oauthLoading.value = ''
      uni.showToast({ title: data.message || '第三方登录失败', icon: 'none' })
      return
    }

    await handleOauthTicket(data.ticket, (data.provider as LoginProvider) || 'wechat')
  }

  window.addEventListener('message', oauthMessageHandler)
  // #endif
})

onUnmounted(() => {
  stopSmsCountdown()
  // #ifdef H5
  if (oauthMessageHandler) {
    window.removeEventListener('message', oauthMessageHandler)
  }
  // #endif
})
</script>

<template>
  <view class="login-page">
    <view class="hero-card">
      <view class="eyebrow">
        云南美食地图
      </view>
      <view class="title">
        登录后同步你的收藏、足迹与偏好
      </view>
      <view class="subtitle">
        小程序使用微信快捷登录，H5 支持手机验证码和第三方账号登录。
      </view>
    </view>

    <!-- #ifdef MP-WEIXIN -->
    <view class="panel-card">
      <view class="panel-title">
        微信小程序登录
      </view>
      <view class="panel-desc">
        授权后将自动创建或绑定你的账号。
      </view>
      <button class="primary-btn" :loading="isSubmitting" @click="handleMiniProgramLogin">
        微信一键登录
      </button>
    </view>
    <!-- #endif -->

    <!-- #ifdef H5 -->
    <view class="panel-card">
      <view class="panel-title">
        手机验证码登录
      </view>
      <input v-model="form.phone" class="login-input" type="number" :maxlength="11" placeholder="请输入手机号">
      <view class="code-row">
        <input v-model="form.code" class="login-input code-input" type="number" :maxlength="6" placeholder="请输入验证码">
        <button class="ghost-btn" :disabled="smsCountdown > 0 || isSendingCode" @click="handleSendSmsCode">
          {{ smsCountdown > 0 ? `${smsCountdown}s` : '获取验证码' }}
        </button>
      </view>
      <button class="primary-btn" :loading="isSubmitting" @click="handleSmsLogin">
        手机号登录
      </button>
    </view>

    <view class="panel-card">
      <view class="panel-title">
        第三方账号登录
      </view>
      <view class="oauth-grid">
        <button class="oauth-btn oauth-btn--wechat" :loading="oauthLoading === 'wechat'" @click="startOauthLogin('wechat')">
          微信登录
        </button>
        <button class="oauth-btn oauth-btn--douyin" :loading="oauthLoading === 'douyin'" @click="startOauthLogin('douyin')">
          抖音登录
        </button>
      </view>
      <view class="hint-text">
        需要先在服务端配置对应平台的 AppId / Secret。
      </view>
    </view>
    <!-- #endif -->

    <view v-if="redirectPath" class="redirect-tip">
      登录成功后将返回原页面
    </view>
    <view v-else class="redirect-tip">
      登录成功后将进入“我的”页面
    </view>
  </view>
</template>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  padding: calc(env(safe-area-inset-top) + 24px) 18px calc(env(safe-area-inset-bottom) + 24px);
  background:
    radial-gradient(circle at top right, rgba(255, 170, 118, 0.28), transparent 32%),
    linear-gradient(180deg, #fff7f2 0%, #fff 46%, #fff5ed 100%);
}

.hero-card,
.panel-card {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 127, 59, 0.08);
  border-radius: 20px;
  box-shadow: 0 16px 40px rgba(255, 102, 51, 0.08);
}

.hero-card {
  padding: 24px 20px;
}

.eyebrow {
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #ff7b4a;
}

.title {
  margin-top: 12px;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.35;
  color: #2b211c;
}

.subtitle {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.7;
  color: #7a675d;
}

.panel-card {
  margin-top: 16px;
  padding: 18px;
}

.panel-title {
  font-size: 17px;
  font-weight: 700;
  color: #2b211c;
}

.panel-desc,
.hint-text,
.redirect-tip {
  font-size: 13px;
  line-height: 1.7;
  color: #8a7569;
}

.panel-desc,
.hint-text {
  margin-top: 8px;
}

.redirect-tip {
  margin-top: 18px;
  text-align: center;
}

.login-input {
  width: 100%;
  height: 46px;
  margin-top: 14px;
  padding: 0 14px;
  border-radius: 14px;
  background: #fff8f4;
  border: 1px solid rgba(255, 127, 59, 0.14);
  font-size: 14px;
  color: #2b211c;
  box-sizing: border-box;
}

.code-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.code-input {
  flex: 1;
}

.primary-btn,
.ghost-btn,
.oauth-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 14px;
  font-size: 15px;
}

.primary-btn,
.oauth-btn {
  height: 46px;
}

.primary-btn {
  margin-top: 14px;
  background: linear-gradient(135deg, #ff6a3d 0%, #ff8a47 100%);
  color: #fff;
}

.ghost-btn {
  width: 112px;
  height: 46px;
  margin-top: 14px;
  background: #fff1e8;
  color: #ff6a3d;
}

.oauth-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 14px;
}

.oauth-btn {
  color: #fff;
}

.oauth-btn--wechat {
  background: linear-gradient(135deg, #17b65a 0%, #34d273 100%);
}

.oauth-btn--douyin {
  background: linear-gradient(135deg, #121723 0%, #2a3244 100%);
}
</style>
