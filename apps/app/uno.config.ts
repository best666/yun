import type { Preset } from 'unocss'
import { FileSystemIconLoader } from '@iconify/utils/lib/loader/node-loaders'

// https://www.npmjs.com/package/@uni-helper/unocss-preset-uni
import { presetUni } from '@uni-helper/unocss-preset-uni'
// @see https://unocss.dev/presets/legacy-compat
import { presetLegacyCompat } from '@unocss/preset-legacy-compat'
import {
  defineConfig,
  presetIcons,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  presets: [
    presetUni({
      attributify: false,
    }),
    presetIcons({
      scale: 1.2,
      warn: false,
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle',
      },
      collections: {
        // 注册本地 SVG 图标集合, 从本地文件系统加载图标
        // 在 './src/static/my-icons' 目录下的所有 svg 文件将被注册为图标，
        // my-icons 是图标集合名称，使用 `i-my-icons-图标名` 调用
        'my-icons': FileSystemIconLoader(
          './src/static/my-icons',
          // 可选的，你可以提供一个 transform 回调来更改每个图标
          (svg) => {
            let svgStr = svg

            // 如果 SVG 文件未定义 `fill` 属性，则默认填充 `currentColor`, 这样图标颜色会继承文本颜色，方便在不同场景下适配
            svgStr = svgStr.includes('fill="')
              ? svgStr
              : svgStr.replace(/^<svg /, '<svg fill="currentColor" ')

            // 如果 svg 有 width, 和 height 属性，将这些属性改为 1em，否则无法显示图标
            svgStr = svgStr
              .replace(/(<svg.*?width=)"(.*?)"/, '$1"1em"')
              .replace(/(<svg.*?height=)"(.*?)"/, '$1"1em"')

            return svgStr
          },
        ),
      },
    }),
    // TODO: check 是否会有别的影响
    // 处理低端安卓机的样式问题
    // 将颜色函数 (rgb()和hsl()) 从空格分隔转换为逗号分隔，更好的兼容性app端，example：
    // `rgb(255 0 0)` -> `rgb(255, 0, 0)`
    // `rgba(255 0 0 / 0.5)` -> `rgba(255, 0, 0, 0.5)`
    presetLegacyCompat({
      commaStyleColorFunction: true,
      legacyColorSpace: true, // by QQ4群-量子蔷薇
      // @菲鸽 unocss 配置中，建议在 presetLegacyCompat 中添加 legacyColorSpace: true，以去除生成的颜色样式中的 in oklch 关键字，现在发现有些渐变色生成不符合预期
    }) as Preset,
  ],
  transformers: [
    // 启用指令功能：主要用于支持 @apply、@screen 和 theme() 等 CSS 指令
    transformerDirectives(),
    // 启用 () 分组功能
    // 支持css class组合，eg: `<div class="hover:(bg-gray-400 font-medium) font-(light mono)">测试 unocss</div>`
    transformerVariantGroup(),
  ],
  shortcuts: [
    {
      'center': 'flex justify-center items-center',
      'auth-card': 'border border-[rgba(255,127,59,0.08)] rounded-20px bg-[rgba(255,255,255,0.92)] shadow-[0_16px_40px_rgba(255,102,51,0.08)] backdrop-blur-[10px]',
      'auth-primary-btn': 'mt-14px flex h-46px items-center justify-center rounded-14px border-none bg-[linear-gradient(135deg,#ff6a3d_0%,#ff8a47_100%)] text-15px text-white',
      'auth-input': 'mt-14px box-border h-46px w-full rounded-14px border border-[rgba(255,127,59,0.14)] bg-#fff8f4 px-14px text-14px text-#2b211c',
      'login-section-card': 'mt-16px auth-card p-18px',
      'spot-hero-icon-btn': 'center h-38px w-38px rounded-full border border-[rgba(255,255,255,0.24)] bg-[rgba(255,255,255,0.14)] backdrop-blur-[10px]',
      'spot-hero-side-btn': 'flex h-56px w-56px flex-col items-center justify-center gap-4px rounded-28px border border-[rgba(255,255,255,0.18)] bg-[rgba(14,23,39,0.32)] backdrop-blur-[12px]',
      'spot-detail-status-wrap': 'min-h-screen flex flex-col items-center justify-center gap-16px',
      'spot-detail-status-text': 'text-14px text-gray-500',
      'spot-detail-retry-btn': 'rounded-full bg-#ff7d45 px-18px py-10px text-13px text-white',
      'spot-review-toolbar': 'mt-16px flex gap-10px',
      'spot-review-toolbar-btn': 'flex flex-1 items-center justify-center gap-6px rounded-14px bg-#fff7f2 px-12px py-10px text-12px text-#ef5a32',
      'spot-review-star-row': 'mt-18px flex justify-center gap-10px',
      'spot-review-star': 'text-28px text-gray-300',
      'spot-review-star-active': 'text-amber-500',
      'spot-review-textarea': 'mt-14px h-140px w-full box-border rounded-16px bg-#f5f5f5 p-14px text-14px text-gray-700',
      'spot-review-submit-btn': 'mt-16px rounded-16px bg-[linear-gradient(135deg,#ff7a3c_0%,#ff9f67_100%)] py-14px text-center text-14px text-white font-600',
      'spot-detail-panel': 'rounded-b-28px border border-[rgba(255,255,255,0.74)] bg-[rgba(255,255,255,0.94)] px-18px pb-[calc(28px+env(safe-area-inset-bottom))] pt-18px shadow-[0_10px_28px_rgba(15,23,42,0.05)] backdrop-blur-[14px]',
      'spot-detail-panel-split': 'pt-4px',
      'spot-detail-panel-header': 'mb-16px flex items-start justify-between gap-14px',
      'spot-detail-panel-actions': 'flex items-center gap-8px',
      'spot-detail-panel-title': 'text-20px text-#111827 font-700',
      'spot-detail-panel-subtitle': 'mt-6px text-12px text-gray-400',
      'spot-detail-panel-action': 'flex-shrink-0 rounded-full bg-#fff3ee px-14px py-8px text-12px text-#ef5a32',
      'spot-detail-panel-link': 'inline-flex items-center gap-2px text-12px text-gray-400',
      'spot-detail-panel-link-arrow': 'text-13px leading-1',
      'spot-detail-summary-chip-row': 'mb-12px flex flex-wrap gap-10px',
      'spot-detail-summary-chip': 'rounded-14px bg-#f7f7f8 px-14px py-9px text-13px text-gray-600',
      'spot-detail-panel-empty': 'rounded-18px bg-#f8f9fb px-14px py-22px text-center text-13px text-gray-400',
      'spot-more-status-wrap': 'center min-h-70vh flex-col gap-16px',
      'spot-more-status-text': 'text-14px text-gray-500',
      'spot-more-section': 'px-14px pt-12px',
      'spot-more-empty-card': 'rounded-18px bg-white px-14px py-22px text-center text-13px text-gray-400',
      'home-map-action-btn': 'flex flex-col items-center gap-4px px-16px py-4px active:opacity-60',
      'home-search-section': 'px-0 pb-4px pt-8px',
      'home-search-section-title': 'flex items-center gap-8px px-16px py-8px text-13px text-#8a5a3b font-600',
      'home-search-section-count': 'text-12px text-#b0b0b0',
      'home-search-result-item': 'flex items-center border-b border-#f8f8f8 px-16px py-12px active:bg-#f8f8f8',
      'home-search-empty-tip': 'px-16px pb-14px pt-8px text-12px text-#b0b0b0',
    },
  ],
  // 动态图标需要在这里配置，或者写在vue页面中注释掉
  safelist: [
    'i-carbon-code',
    'i-carbon-home',
    'i-carbon-user',
    'i-carbon-ibm-watson-language-translator',
    'i-carbon-menu',
  ],
  rules: [
    [
      'p-safe',
      {
        padding:
          'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
      },
    ],
    ['pt-safe', { 'padding-top': 'env(safe-area-inset-top)' }],
    ['pb-safe', { 'padding-bottom': 'env(safe-area-inset-bottom)' }],
  ],
  theme: {
    colors: {
      /** 主题色，用法如: text-primary */
      primary: 'var(--wot-color-theme,#0957DE)',
    },
    fontSize: {
      /** 提供更小号的字体，用法如：text-2xs */
      '2xs': ['20rpx', '28rpx'],
      '3xs': ['18rpx', '26rpx'],
    },
  },
  // windows 系统会报错：[plugin:unocss:transformers:pre] Cannot overwrite a zero-length range - use append Left or prependRight instead.
  // 去掉下面的就正常了
  // content: {
  //   /**
  //    * 解决小程序报错 `./app.wxss(78:2814): unexpected unexpected at pos 5198`
  //    * 为什么同时使用include和exclude？虽然看起来多余，但同时配置两者是一种常见的 `防御性编程` 做法。
  //      1. 结构变化保障 : 如果未来项目结构发生变化，某些排除目录可能被移动到包含路径下，exclude配置可以确保它们仍被排除
  //      2. 明确性 : 明确列出要排除的目录使配置意图更加清晰
  //      3. 性能优化 : 避免处理不必要的文件，提高构建性能
  //      4. 防止冲突 : 排除第三方库和构建输出目录，避免潜在的CSS冲突
  //    */
  //   pipeline: {
  //     exclude: [
  //       'node_modules/**/*',
  //       'public/**/*',
  //       'dist/**/*',
  //     ],
  //     include: [
  //       './src/**/*',
  //     ],
  //   },
  // },
})
