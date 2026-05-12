import type { IMapSearchPlaceItem, MapApiProvider } from '@/api/types/map'
import type { ISearchUserItem } from '@/api/types/search'
import { searchUsers } from '@/api/login'
import { searchMapPlaces } from '@/api/map'

interface CoordinatePoint {
  latitude: number
  longitude: number
}

interface UseHomeMapSearchOptions {
  currentMapProvider: MapApiProvider
  currentMapProviderLabel: string
  mapCenter: CoordinatePoint
}

const SEARCH_DEBOUNCE_MS = 300

export function useHomeMapSearch(options: UseHomeMapSearchOptions) {
  const searchKeyword = ref('')
  const showSearchPanel = ref(false)
  const searchSpotResults = ref<IMapSearchPlaceItem[]>([])
  const searchUserResults = ref<ISearchUserItem[]>([])
  const isSearchingPlaces = ref(false)
  const isSearchingUsers = ref(false)

  let searchRequestId = 0
  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

  function resetSearchState() {
    searchKeyword.value = ''
    searchSpotResults.value = []
    searchUserResults.value = []
    isSearchingPlaces.value = false
    isSearchingUsers.value = false
    searchRequestId += 1
  }

  async function performSearch(keyword: string) {
    const trimmedKeyword = keyword.trim()

    if (!trimmedKeyword) {
      searchSpotResults.value = []
      searchUserResults.value = []
      isSearchingPlaces.value = false
      isSearchingUsers.value = false
      searchRequestId += 1
      return
    }

    const currentRequestId = ++searchRequestId
    isSearchingPlaces.value = true
    isSearchingUsers.value = true

    try {
      const [placeResult, userResult] = await Promise.allSettled([
        searchMapPlaces({
          keyword: trimmedKeyword,
          latitude: options.mapCenter.latitude,
          longitude: options.mapCenter.longitude,
          pageSize: 10,
          provider: options.currentMapProvider,
        }),
        searchUsers(trimmedKeyword),
      ])

      if (currentRequestId !== searchRequestId) {
        return
      }

      if (placeResult.status === 'fulfilled') {
        searchSpotResults.value = placeResult.value
      }
      else {
        searchSpotResults.value = []
        uni.showToast({
          title: `${options.currentMapProviderLabel}搜索暂不可用，请稍后重试`,
          icon: 'none',
        })
        console.error(`${options.currentMapProviderLabel}地点搜索失败`, placeResult.reason)
      }

      if (userResult.status === 'fulfilled') {
        searchUserResults.value = userResult.value
      }
      else {
        searchUserResults.value = []
        console.error('搜索用户失败', userResult.reason)
      }
    }
    catch (error) {
      if (currentRequestId !== searchRequestId) {
        return
      }

      searchSpotResults.value = []
      searchUserResults.value = []
      console.error('搜索失败', error)
    }
    finally {
      if (currentRequestId === searchRequestId) {
        isSearchingPlaces.value = false
        isSearchingUsers.value = false
      }
    }
  }

  function clearPendingSearch() {
    if (searchDebounceTimer !== null) {
      clearTimeout(searchDebounceTimer)
      searchDebounceTimer = null
    }
  }

  function triggerDebouncedSearch(keyword: string) {
    clearPendingSearch()

    if (!keyword.trim()) {
      void performSearch(keyword)
      return
    }

    searchDebounceTimer = setTimeout(() => {
      searchDebounceTimer = null
      void performSearch(keyword)
    }, SEARCH_DEBOUNCE_MS)
  }

  function setSearchKeyword(keyword: string) {
    searchKeyword.value = keyword
    triggerDebouncedSearch(keyword)
  }

  function confirmSearch() {
    clearPendingSearch()
    void performSearch(searchKeyword.value)
  }

  function openSearch() {
    showSearchPanel.value = true
  }

  function closeSearch() {
    clearPendingSearch()
    showSearchPanel.value = false
    resetSearchState()
  }

  onScopeDispose(() => {
    clearPendingSearch()
    searchRequestId += 1
  })

  return {
    searchKeyword,
    showSearchPanel,
    searchSpotResults,
    searchUserResults,
    isSearchingPlaces,
    isSearchingUsers,
    setSearchKeyword,
    confirmSearch,
    openSearch,
    closeSearch,
  }
}
