import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/** 地点摘要类型，仅保留给首页选中态、足迹回显和跳转参数使用。 */
export interface FoodSpot {
  id: number
  name: string
  cover: string
  images: string[]
  address: string
  rating: number
  latitude: number
  longitude: number
  tags: string[]
  avgPrice: number
  description: string
  phone: string
  openTime: string
}

export const useSpotStore = defineStore('spot', () => {
  /** 本地点摘要集合默认为空，后续只承接真实写入的数据。 */
  const spots = ref<FoodSpot[]>([])

  /** 根据关键词搜索地点摘要。 */
  const searchSpots = (keyword: string): FoodSpot[] => {
    if (!keyword.trim()) {
      return spots.value
    }

    const normalizedKeyword = keyword.toLowerCase()

    return spots.value.filter(spot =>
      spot.name.toLowerCase().includes(normalizedKeyword)
      || spot.tags.some(tag => tag.toLowerCase().includes(normalizedKeyword))
      || spot.address.toLowerCase().includes(normalizedKeyword),
    )
  }

  /** 根据 id 获取地点摘要。 */
  const getSpotById = (id: number): FoodSpot | undefined => {
    return spots.value.find(spot => spot.id === id)
  }

  /** 暴露全部地点摘要给地图 marker 使用。 */
  const allSpots = computed(() => spots.value)

  return {
    spots,
    allSpots,
    searchSpots,
    getSpotById,
  }
})
