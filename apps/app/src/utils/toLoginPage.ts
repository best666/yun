import { getLastPage } from '@/utils'
import { debounce } from '@/utils/debounce'

interface ToLoginPageOptions {
  /**
   * 跳转模式, uni.navigateTo | uni.reLaunch
   * @default 'navigateTo'
   */
  mode?: 'navigateTo' | 'reLaunch'
  /**
   * 查询参数
   * @example '?redirect=/pages/home/index'
   */
  queryString?: string
}

// TODO: 自己增加登录页
const LOGIN_PAGE = '/pages/login/index'

/**
 * 跳转到登录页, 带防抖处理
 *
 * 如果要立即跳转，不做延时，可以使用 `toLoginPage.flush()` 方法
 */
export const toLoginPage = debounce((options: ToLoginPageOptions = {}) => {
  const { mode = 'navigateTo', queryString = '' } = options

  // 获取当前页面路径
  const currentPage = getLastPage()
  const currentPath = `/${currentPage.route}`
  const currentFullPath = currentPage.$page?.fullPath || currentPath
  // 如果已经在登录页，则不跳转
  if (currentPath === LOGIN_PAGE) {
    return
  }

  const params = new URLSearchParams(queryString.replace(/^\?/, ''))
  if (!params.has('redirect')) {
    params.set('redirect', currentFullPath)
  }
  const url = `${LOGIN_PAGE}${params.toString() ? `?${params.toString()}` : ''}`

  if (mode === 'navigateTo') {
    uni.navigateTo({ url })
  }
  else {
    uni.reLaunch({ url })
  }
}, 500)
