import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export interface FavoriteRecord {
  spotId: number
  time: string // ISO date string
}

export const useFavoriteStore = defineStore(
  'favorite',
  () => {
    const favorites = ref<FavoriteRecord[]>([])

    /** 是否已收藏 */
    const isFavorited = (spotId: number): boolean => {
      return favorites.value.some(f => f.spotId === spotId)
    }

    /** 切换收藏状态 */
    const toggleFavorite = (spotId: number) => {
      const idx = favorites.value.findIndex(f => f.spotId === spotId)
      if (idx >= 0) {
        favorites.value.splice(idx, 1)
        return false // 取消收藏
      }
      else {
        favorites.value.push({
          spotId,
          time: new Date().toISOString(),
        })
        return true // 添加收藏
      }
    }

    /** 收藏数量 */
    const favoriteCount = computed(() => favorites.value.length)

    /** 收藏的地点 id 列表 */
    const favoriteIds = computed(() => favorites.value.map(f => f.spotId))

    return {
      favorites,
      isFavorited,
      toggleFavorite,
      favoriteCount,
      favoriteIds,
    }
  },
  {
    persist: true,
  },
)
