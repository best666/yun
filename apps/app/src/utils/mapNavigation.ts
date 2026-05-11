export type NavigationMapApp = 'ask' | 'system' | 'tencent' | 'amap'

export interface NavigationLocation {
  latitude: number
  longitude: number
  name: string
  address?: string
}

const TENCENT_REFERER = 'yun-food'
const AMAP_SOURCE = 'yun-food'

export async function openNavigationWithPreference(location: NavigationLocation, preferredMapApp: NavigationMapApp) {
  if (preferredMapApp === 'ask') {
    await showNavigationMapSelector(location)
    return
  }

  await openNavigationByMapApp(location, preferredMapApp)
}

export async function showNavigationMapSelector(location: NavigationLocation) {
  const tapIndex = await selectNavigationMapApp()
  const selectedMapApp: Exclude<NavigationMapApp, 'ask'>[] = ['system', 'tencent', 'amap']
  const mapApp = selectedMapApp[tapIndex]

  if (!mapApp) {
    return
  }

  await openNavigationByMapApp(location, mapApp)
}

async function selectNavigationMapApp() {
  return await new Promise<number>((resolve, reject) => {
    uni.showActionSheet({
      itemList: ['系统地图', '腾讯地图', '高德地图'],
      success(res) {
        resolve(res.tapIndex)
      },
      fail(error) {
        reject(error)
      },
    })
  })
}

async function openNavigationByMapApp(location: NavigationLocation, mapApp: Exclude<NavigationMapApp, 'ask'>) {
  if (mapApp === 'system') {
    openSystemLocation(location)
    return
  }

  // #ifdef MP-WEIXIN
  uni.showToast({
    title: '微信小程序内将使用系统地图打开导航',
    icon: 'none',
  })
  openSystemLocation(location)
  return
  // #endif

  const uri = mapApp === 'tencent'
    ? buildTencentNavigationUri(location)
    : buildAmapNavigationUri(location)

  // #ifdef APP-PLUS
  const plusRuntime = (globalThis as any).plus
  plusRuntime?.runtime?.openURL?.(uri)
  return
  // #endif

  // #ifdef H5
  if (typeof window !== 'undefined') {
    window.location.href = uri
    return
  }
  // #endif

  openSystemLocation(location)
}

function openSystemLocation(location: NavigationLocation) {
  uni.openLocation({
    latitude: location.latitude,
    longitude: location.longitude,
    name: location.name,
    address: location.address,
  })
}

function buildTencentNavigationUri(location: NavigationLocation) {
  const query = new URLSearchParams({
    type: 'drive',
    to: location.name,
    tocoord: `${location.latitude},${location.longitude}`,
    referer: TENCENT_REFERER,
  })

  return `https://apis.map.qq.com/uri/v1/routeplan?${query.toString()}`
}

function buildAmapNavigationUri(location: NavigationLocation) {
  const query = new URLSearchParams({
    to: `${location.longitude},${location.latitude},${location.name}`,
    mode: 'car',
    policy: '1',
    src: AMAP_SOURCE,
    coordinate: 'gaode',
    callnative: '1',
  })

  return `https://uri.amap.com/navigation?${query.toString()}`
}
