import type { FavoriteSpotSummary } from '@/api/types/spot'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getSpotFavoriteList, toggleSpotFavorite } from '@/api/spot'
import { useTokenStore } from './token'
import { useUserStore } from './user'

export interface FavoriteRecord {
  spotId: string
  time: string // ISO date string
  summary: FavoriteSpotSummary
}

function normalizeSpotId(spotId: string | number) {
  return String(spotId)
}

export const useFavoriteStore = defineStore(
  'favorite',
  () => {
    const guestFavorites = ref<FavoriteRecord[]>([])
    const serverFavorites = ref<FavoriteRecord[]>([])
    const syncedUserId = ref<number | null>(null)
    const hasLoadedServerFavorites = ref(false)

    const tokenStore = useTokenStore()
    const userStore = useUserStore()

    const activeFavorites = computed(() => {
      return tokenStore.hasLogin ? serverFavorites.value : guestFavorites.value
    })

    const toFavoriteRecord = (summary: FavoriteSpotSummary): FavoriteRecord => ({
      spotId: normalizeSpotId(summary.id),
      time: new Date().toISOString(),
      summary: {
        ...summary,
        id: normalizeSpotId(summary.id),
      },
    })

    const setServerFavorites = (summaries: FavoriteSpotSummary[]) => {
      serverFavorites.value = summaries.map(toFavoriteRecord)
    }

    const setGuestFavorites = (records: FavoriteRecord[]) => {
      guestFavorites.value = records
    }

    const ensureServerFavoritesLoaded = async (force = false) => {
      if (!tokenStore.updateNowTime().hasLogin) {
        serverFavorites.value = []
        syncedUserId.value = null
        hasLoadedServerFavorites.value = false
        return []
      }

      const currentUserId = userStore.userInfo.userId
      if (!force && hasLoadedServerFavorites.value && syncedUserId.value === currentUserId) {
        return serverFavorites.value
      }

      const summaries = await getSpotFavoriteList()
      setServerFavorites(summaries)
      syncedUserId.value = currentUserId
      hasLoadedServerFavorites.value = true
      return serverFavorites.value
    }

    /** 是否已收藏 */
    const isFavorited = (spotId: string | number): boolean => {
      return activeFavorites.value.some(f => f.spotId === normalizeSpotId(spotId))
    }

    /** 切换收藏状态 */
    const toggleFavorite = async (summary: FavoriteSpotSummary) => {
      const normalizedSpotId = normalizeSpotId(summary.id)

      if (tokenStore.updateNowTime().hasLogin) {
        await ensureServerFavoritesLoaded()
        const result = await toggleSpotFavorite({
          spotId: Number(normalizedSpotId),
        })

        if (result.favorited) {
          const mergedSummary: FavoriteSpotSummary = {
            ...summary,
            ...result.summary,
            id: result.summary.id,
          }

          serverFavorites.value = serverFavorites.value.filter(item => item.spotId !== result.spotId)
          serverFavorites.value.unshift(toFavoriteRecord(mergedSummary))
        }
        else {
          serverFavorites.value = serverFavorites.value.filter(item => item.spotId !== result.spotId)
        }

        return {
          favorited: result.favorited,
          favoriteCount: result.favoriteCount,
          summary: {
            ...summary,
            ...result.summary,
            id: result.summary.id,
          },
        }
      }

      const idx = guestFavorites.value.findIndex(f => f.spotId === normalizedSpotId)
      if (idx >= 0) {
        guestFavorites.value.splice(idx, 1)
        return {
          favorited: false,
          summary: {
            ...summary,
            id: normalizedSpotId,
          },
        }
      }

      guestFavorites.value.unshift(toFavoriteRecord(summary))
      return {
        favorited: true,
        summary: {
          ...summary,
          id: normalizedSpotId,
        },
      }
    }

    const clearFavorites = () => {
      serverFavorites.value = []
      syncedUserId.value = null
      hasLoadedServerFavorites.value = false
    }

    /** 收藏数量 */
    const favoriteCount = computed(() => activeFavorites.value.length)

    /** 收藏的地点 id 列表 */
    const favoriteIds = computed(() => activeFavorites.value.map(f => f.spotId))
    const favoriteSummaries = computed(() => activeFavorites.value.map(f => f.summary))

    return {
      favorites: activeFavorites,
      guestFavorites,
      serverFavorites,
      isFavorited,
      toggleFavorite,
      ensureServerFavoritesLoaded,
      setGuestFavorites,
      clearFavorites,
      favoriteCount,
      favoriteIds,
      favoriteSummaries,
    }
  },
  {
    persist: true,
  },
)
