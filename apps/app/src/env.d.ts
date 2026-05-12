/// <reference types="vite/client" />
/// <reference types="vite-svg-loader" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  /** 网站标题，应用名称 */
  readonly VITE_APP_TITLE: string
  /** 服务端口号 */
  readonly VITE_SERVER_PORT: string
  /** 后台接口地址 */
  readonly VITE_SERVER_BASEURL: string
  /** 微信小程序 develop 环境接口地址 */
  readonly VITE_SERVER_BASEURL_WEIXIN_DEVELOP?: string
  /** 微信小程序 trial 环境接口地址 */
  readonly VITE_SERVER_BASEURL_WEIXIN_TRIAL?: string
  /** 微信小程序 release 环境接口地址 */
  readonly VITE_SERVER_BASEURL_WEIXIN_RELEASE?: string
  /** H5 高德 JS API Key，仅用于浏览器地图 SDK */
  readonly VITE_AMAP_JS_KEY_H5?: string
  /** 高德地图通用 Key */
  readonly VITE_AMAP_KEY?: string
  /** H5 / App 高德地图 Key */
  readonly VITE_AMAP_KEY_H5?: string
  /** 微信小程序高德 Key */
  readonly VITE_AMAP_KEY_MP_WEIXIN?: string
  /** 腾讯地图通用 Key */
  readonly VITE_TENCENT_MAP_KEY?: string
  /** H5 腾讯地图 Key */
  readonly VITE_TENCENT_MAP_KEY_H5?: string
  /** 微信小程序腾讯地图 Key */
  readonly VITE_TENCENT_MAP_KEY_MP_WEIXIN?: string
  /** H5是否需要代理 */
  readonly VITE_APP_PROXY_ENABLE: 'true' | 'false'
  /** H5是否需要代理，需要的话有个前缀 */
  readonly VITE_APP_PROXY_PREFIX: string
  /** 后端是否有统一前缀 /api */
  readonly VITE_SERVER_HAS_API_PREFIX: 'true' | 'false'
  /** 认证模式，'single' | 'double' ==> 单token | 双token */
  readonly VITE_AUTH_MODE: 'single' | 'double'
  /** 是否清除console */
  readonly VITE_DELETE_CONSOLE: string
  /** 是否开启 rollup visualizer 打包分析 */
  readonly VITE_VISUALIZER_ENABLE: 'true' | 'false'
  // 更多环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __VITE_APP_PROXY__: 'true' | 'false'
