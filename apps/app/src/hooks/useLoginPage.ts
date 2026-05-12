import type { LoginProvider } from '@/api/types/login'
import { sendSmsCode } from '@/api/login'
import { useTokenStore } from '@/store'
import { getEnvBaseUrl } from '@/utils'

interface OauthMessagePayload {
  source?: string
  success?: boolean
  ticket?: string
  message?: string
  provider?: LoginProvider
}

/** 登录页组合式逻辑：页面只负责展示，登录状态机与 H5 OAuth 交给 hook 维护。 */
export function useLoginPage() {
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

  const getApiBaseUrl = () => {
    const baseUrl = getEnvBaseUrl().replace(/\/$/, '')
    return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`
  }

  const validatePhone = () => /^1\d{10}$/.test(form.phone)

  const stopSmsCountdown = () => {
    if (smsTimer) {
      clearInterval(smsTimer)
      smsTimer = null
    }
  }

  const startSmsCountdown = () => {
    stopSmsCountdown()
    smsCountdown.value = 60
    smsTimer = setInterval(() => {
      smsCountdown.value -= 1
      if (smsCountdown.value <= 0) {
        stopSmsCountdown()
      }
    }, 1000)
  }

  const navigateAfterLogin = () => {
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

  const handleSmsLogin = async () => {
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

  const handleSendSmsCode = async () => {
    if (isSendingCode.value || smsCountdown.value > 0) {
      return
    }

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

  const handleMiniProgramLogin = async () => {
    isSubmitting.value = true
    try {
      await tokenStore.wxLogin()
      navigateAfterLogin()
    }
    finally {
      isSubmitting.value = false
    }
  }

  const handleOauthTicket = async (ticket: string, provider: LoginProvider) => {
    oauthLoading.value = provider
    try {
      await tokenStore.loginWithOauthTicket(ticket)
      navigateAfterLogin()
    }
    finally {
      oauthLoading.value = ''
    }
  }

  const startOauthLogin = (provider: LoginProvider) => {
    // #ifdef H5
    if (oauthLoading.value) {
      return
    }

    oauthLoading.value = provider
    const authUrl = `${getApiBaseUrl()}/auth/oauth/${provider}/authorize?origin=${encodeURIComponent(window.location.origin)}`
    const popup = window.open(authUrl, `${provider}-login`, 'popup=1,width=560,height=720')

    if (!popup) {
      window.location.href = authUrl
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
      if (event.origin !== expectedOrigin) {
        return
      }

      const data = event.data as OauthMessagePayload
      if (data?.source !== 'yun-auth') {
        return
      }

      if (!data.success || !data.ticket) {
        oauthLoading.value = ''
        uni.showToast({ title: data.message || '第三方登录失败', icon: 'none' })
        return
      }

      await handleOauthTicket(data.ticket, data.provider || 'wechat')
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

  return {
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
  }
}
