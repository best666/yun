export type MapApiProvider = 'amap' | 'tencent'

export interface IMapViewportBounds {
  southwest: {
    latitude: number
    longitude: number
  }
  northeast: {
    latitude: number
    longitude: number
  }
}

export interface IMapSearchPlaceItem {
  id: string
  title: string
  address: string
  category: string
  district: string
  latitude: number
  longitude: number
  distance?: number
}
