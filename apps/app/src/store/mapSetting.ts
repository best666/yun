import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type NavigationMapApp = 'ask' | 'system' | 'tencent' | 'amap'

export const useMapSettingStore = defineStore(
  'mapSetting',
  () => {
    const navigationMapApp = ref<NavigationMapApp>('ask')

    const navigationMapAppLabel = computed(() => {
      switch (navigationMapApp.value) {
        case 'system':
          return '系统地图'
        case 'tencent':
          return '腾讯地图'
        case 'amap':
          return '高德地图'
        default:
          return '每次选择'
      }
    })

    function setNavigationMapApp(mapApp: NavigationMapApp) {
      navigationMapApp.value = mapApp
    }

    return {
      navigationMapApp,
      navigationMapAppLabel,
      setNavigationMapApp,
    }
  },
  {
    persist: true,
  },
)
