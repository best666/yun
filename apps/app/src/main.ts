import uviewPlus from 'uview-plus'
import { createSSRApp } from 'vue'
import App from './App.vue'
import { requestInterceptor } from './http/interceptor'
import { routeInterceptor } from './router/interceptor'
import store from './store'
import { isPageTabbar } from './tabbar/store'
import '@/style/index.scss'
import 'virtual:uno.css'

function normalizePagePath(path: string) {
  const normalizedPath = path.split('?')[0].replace(/^(#|\/)+/, '')
  return normalizedPath ? `/${normalizedPath}` : '/'
}

function getCurrentPagePath() {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  const currentPage = pages[pages.length - 1]

  if (currentPage?.route) {
    return normalizePagePath(currentPage.route)
  }

  // #ifdef H5
  if (typeof window !== 'undefined') {
    const hashPath = window.location.hash.replace(/^#/, '')
    const browserPath = hashPath || window.location.pathname
    return normalizePagePath(browserPath)
  }
  // #endif

  return ''
}

function installSafeTabBarApisForH5() {
  // #ifdef H5
  const tabBarApiNames = [
    'setTabBarStyle',
    'setTabBarItem',
    'showTabBar',
    'hideTabBar',
    'setTabBarBadge',
    'removeTabBarBadge',
    'showTabBarRedDot',
    'hideTabBarRedDot',
  ] as const

  tabBarApiNames.forEach((apiName) => {
    const rawApi = uni[apiName]
    if (typeof rawApi !== 'function') {
      return
    }

    uni[apiName] = ((options?: any) => {
      const currentPagePath = getCurrentPagePath()

      if (!currentPagePath || !isPageTabbar(currentPagePath)) {
        return Promise.resolve({ errMsg: `${apiName}:ok` }) as any
      }

      return rawApi.call(uni, options)
    }) as typeof rawApi
  })
  // #endif
}

export function createApp() {
  installSafeTabBarApisForH5()

  const app = createSSRApp(App)
  app.use(store)
  app.use(routeInterceptor)
  app.use(requestInterceptor)
  app.use(uviewPlus)

  return {
    app,
  }
}
