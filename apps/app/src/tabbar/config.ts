import type { TabBar } from "@uni-helper/vite-plugin-uni-pages";
import type { CustomTabBarItem, NativeTabBarItem } from "./types";

/**
 * tabbar 选择的策略
 * 0: 'NO_TABBAR'
 * 1: 'NATIVE_TABBAR'
 * 2: 'CUSTOM_TABBAR'
 */
export const TABBAR_STRATEGY_MAP = {
  NO_TABBAR: 0,
  NATIVE_TABBAR: 1,
  CUSTOM_TABBAR: 2,
};

export const selectedTabbarStrategy = TABBAR_STRATEGY_MAP.CUSTOM_TABBAR;

export const nativeTabbarList: NativeTabBarItem[] = [
  {
    iconPath: "static/tabbar/home.png",
    selectedIconPath: "static/tabbar/homeHL.png",
    pagePath: "pages/index/index",
    text: "首页",
  },
  {
    iconPath: "static/tabbar/personal.png",
    selectedIconPath: "static/tabbar/personalHL.png",
    pagePath: "pages/me/me",
    text: "我的",
  },
];

export const customTabbarList: CustomTabBarItem[] = [
  {
    text: "首页",
    pagePath: "pages/index/index",
    iconType: "unocss",
    icon: "i-carbon-location",
  },
  {
    pagePath: "pages/me/me",
    text: "我的",
    iconType: "unocss",
    icon: "i-carbon-user",
  },
];

export const tabbarCacheEnable = [
  TABBAR_STRATEGY_MAP.NATIVE_TABBAR,
  TABBAR_STRATEGY_MAP.CUSTOM_TABBAR,
].includes(selectedTabbarStrategy);

export const customTabbarEnable = [TABBAR_STRATEGY_MAP.CUSTOM_TABBAR].includes(
  selectedTabbarStrategy,
);

export const needHideNativeTabbar =
  selectedTabbarStrategy === TABBAR_STRATEGY_MAP.CUSTOM_TABBAR;

const _tabbarList = customTabbarEnable
  ? customTabbarList.map((item) => ({
      text: item.text,
      pagePath: item.pagePath,
    }))
  : nativeTabbarList;
export const tabbarList = customTabbarEnable
  ? customTabbarList
  : nativeTabbarList;

const _tabbar: TabBar = {
  // #ifdef MP-ALIPAY
  customize: !!needHideNativeTabbar,
  // #endif
  custom: selectedTabbarStrategy === TABBAR_STRATEGY_MAP.CUSTOM_TABBAR,
  color: "#999999",
  selectedColor: "#ff6633",
  backgroundColor: "#FFFFFF",
  borderStyle: "black",
  height: "50px",
  fontSize: "10px",
  iconWidth: "24px",
  spacing: "3px",
  list: _tabbarList as unknown as TabBar["list"],
};

export const tabBar = tabbarCacheEnable ? _tabbar : undefined;
