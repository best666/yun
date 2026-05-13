export const APP_NAME = import.meta.env.VITE_APP_TITLE || '云南美食集'
export const APP_VERSION = __APP_VERSION__
export const APP_LAST_UPDATED = __APP_BUILD_DATE__

export const APP_LEGAL_PAGES = {
  agreement: '/pages/about/agreement',
  privacy: '/pages/about/privacy',
} as const
