import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface AmapPlaceSearchItem {
  id?: string;
  name?: string;
  address?: string | string[];
  type?: string;
  adname?: string;
  location?: string;
  distance?: string;
}

interface AmapPlaceSearchResponse {
  status?: string;
  info?: string;
  pois?: AmapPlaceSearchItem[];
}

export interface AmapViewportPlaceItem {
  id: string;
  title: string;
  address: string;
  category: string;
  district: string;
  latitude: number;
  longitude: number;
  distance?: number;
}

interface TencentPlaceSearchItem {
  id?: string;
  title?: string;
  address?: string;
  category?: string;
  ad_info?: {
    district?: string;
  };
  location?: {
    lat?: number;
    lng?: number;
  };
  _distance?: number;
}

type MapProvider = 'amap' | 'tencent';
const AMAP_VIEWPORT_PAGE_SIZE = 25;
const AMAP_VIEWPORT_MAX_LIMIT = 200;

@Injectable()
export class MapService {
  constructor(private readonly configService: ConfigService) {}

  async searchPlaces(params: { keyword: string; latitude?: number; longitude?: number; pageSize?: number; provider?: MapProvider }) {
    const keyword = params.keyword.trim();
    if (!keyword) {
      return [];
    }

    const provider = params.provider === 'amap' ? 'amap' : 'tencent';

    return provider === 'tencent'
      ? this.searchTencentPlaces({
          keyword,
          latitude: params.latitude,
          longitude: params.longitude,
          pageSize: params.pageSize,
        })
      : this.searchAmapPlaces({
          keyword,
          latitude: params.latitude,
          longitude: params.longitude,
          pageSize: params.pageSize,
        });
  }

  async searchAmapViewportPlaces(params: {
    keyword?: string;
    minLatitude: number;
    maxLatitude: number;
    minLongitude: number;
    maxLongitude: number;
    limit?: number;
  }): Promise<AmapViewportPlaceItem[]> {
    const keyword = params.keyword?.trim() || '美食';
    const limit = Math.min(Math.max(Number(params.limit) || AMAP_VIEWPORT_MAX_LIMIT, 1), AMAP_VIEWPORT_MAX_LIMIT);
    const center = {
      latitude: (params.minLatitude + params.maxLatitude) / 2,
      longitude: (params.minLongitude + params.maxLongitude) / 2,
    };
    const radius = Math.min(
      Math.max(
        Math.ceil(this.calculateDistanceMeters(center, {
          latitude: params.maxLatitude,
          longitude: params.maxLongitude,
        })),
        1000,
      ),
      50000,
    );

    const keys = this.getAmapKeys();
    let lastErrorMessage = '高德地图范围地点搜索失败';

    for (const key of keys) {
      const places: AmapViewportPlaceItem[] = [];
      const totalPages = Math.ceil(limit / AMAP_VIEWPORT_PAGE_SIZE);
      let shouldTryNextKey = false;

      for (let page = 1; page <= totalPages; page += 1) {
        const query = new URLSearchParams({
          key,
          keywords: keyword,
          location: `${center.longitude},${center.latitude}`,
          radius: String(radius),
          sortrule: 'distance',
          offset: String(AMAP_VIEWPORT_PAGE_SIZE),
          page: String(page),
          extensions: 'base',
        });

        const response = await fetch(`https://restapi.amap.com/v3/place/around?${query.toString()}`);
        const result = await response.json() as AmapPlaceSearchResponse;

        if (!response.ok || result.status !== '1') {
          lastErrorMessage = result.info || lastErrorMessage;
          shouldTryNextKey = true;
          break;
        }

        const serializedPlaces = (result.pois || [])
          .map((item, index) => this.serializePlace(item, (page - 1) * AMAP_VIEWPORT_PAGE_SIZE + index))
          .filter((item): item is AmapViewportPlaceItem => Boolean(item))
          .filter(item => this.isInBounds(item, params));

        places.push(...serializedPlaces);

        if ((result.pois || []).length < AMAP_VIEWPORT_PAGE_SIZE) {
          break;
        }
      }

      if (!shouldTryNextKey) {
        return this.deduplicatePlaces(places).slice(0, limit);
      }
    }

    throw new BadRequestException(lastErrorMessage || '高德地图范围地点搜索失败');
  }

  private async searchAmapPlaces(params: { keyword: string; latitude?: number; longitude?: number; pageSize?: number }) {
    const keyword = params.keyword.trim();

    const keys = this.getAmapKeys();
    const pageSize = Math.min(Math.max(Number(params.pageSize) || 10, 1), 20);

    let lastErrorMessage = '高德地图地点搜索失败';

    for (const key of keys) {
      const query = new URLSearchParams({
        key,
        keywords: keyword,
        offset: String(pageSize),
        page: '1',
        extensions: 'base',
      });

      let requestUrl = 'https://restapi.amap.com/v3/place/text';

      if (typeof params.latitude === 'number' && typeof params.longitude === 'number') {
        requestUrl = 'https://restapi.amap.com/v3/place/around';
        query.set('location', `${params.longitude},${params.latitude}`);
        query.set('radius', '10000');
        query.set('sortrule', 'distance');
      }
      else {
        query.set('city', '昆明');
        query.set('citylimit', 'true');
      }

      const response = await fetch(`${requestUrl}?${query.toString()}`);
      const result = await response.json() as AmapPlaceSearchResponse;

      if (response.ok && result.status === '1') {
        return (result.pois || [])
          .map((item, index) => this.serializePlace(item, index))
          .filter((item): item is NonNullable<typeof item> => Boolean(item));
      }

      lastErrorMessage = result.info || lastErrorMessage;
    }

    throw new BadRequestException(lastErrorMessage || '高德地图地点搜索失败');
  }

  private async searchTencentPlaces(params: { keyword: string; latitude?: number; longitude?: number; pageSize?: number }) {
    const keyword = params.keyword.trim();
    const keys = this.getTencentMapKeys();
    const pageSize = Math.min(Math.max(Number(params.pageSize) || 10, 1), 20);

    let lastErrorMessage = '腾讯地图地点搜索失败';

    for (const key of keys) {
      const query = new URLSearchParams({
        key,
        keyword,
        page_size: String(pageSize),
        orderby: '_distance',
      });

      if (typeof params.latitude === 'number' && typeof params.longitude === 'number') {
        query.set('boundary', `nearby(${params.latitude},${params.longitude},10000)`);
      }
      else {
        query.set('boundary', 'region(昆明,1)');
      }

      const response = await fetch(`https://apis.map.qq.com/ws/place/v1/search?${query.toString()}`);
      const result = await response.json() as {
        status?: number;
        message?: string;
        data?: TencentPlaceSearchItem[];
      };

      if (response.ok && result.status === 0) {
        return (result.data || [])
          .filter(item => item.location?.lat && item.location?.lng && item.title)
          .map((item, index) => ({
            id: item.id || `poi-${index}`,
            title: item.title || '未知地点',
            address: item.address || '',
            category: item.category || '',
            district: item.ad_info?.district || '',
            latitude: Number(item.location?.lat),
            longitude: Number(item.location?.lng),
            distance: typeof item._distance === 'number' ? item._distance : undefined,
          }));
      }

      lastErrorMessage = result.message || lastErrorMessage;

      if (!this.shouldTryNextTencentKey(lastErrorMessage)) {
        break;
      }
    }

    throw new BadRequestException(lastErrorMessage || '腾讯地图地点搜索失败');
  }

  private getAmapKeys() {
    const keys = [
      this.configService.get<string>('AMAP_KEY'),
      this.configService.get<string>('AMAP_KEY_BACKUP'),
      this.configService.get<string>('VITE_AMAP_KEY_H5'),
      this.configService.get<string>('VITE_AMAP_KEY_MP_WEIXIN'),
      this.configService.get<string>('VITE_AMAP_KEY'),
    ]
      .map(key => key?.trim())
      .filter((key): key is string => Boolean(key));

    if (keys.length === 0) {
      throw new BadRequestException('服务端缺少配置 AMAP_KEY');
    }

    return [...new Set(keys)];
  }

  private getTencentMapKeys() {
    const keys = [
      this.configService.get<string>('TENCENT_MAP_KEY'),
      this.configService.get<string>('TENCENT_MAP_KEY_BACKUP'),
      this.configService.get<string>('VITE_TENCENT_MAP_KEY_H5'),
      this.configService.get<string>('VITE_TENCENT_MAP_KEY_MP_WEIXIN'),
      this.configService.get<string>('VITE_TENCENT_MAP_KEY'),
    ]
      .map(key => key?.trim())
      .filter((key): key is string => Boolean(key));

    if (keys.length === 0) {
      throw new BadRequestException('服务端缺少配置 TENCENT_MAP_KEY');
    }

    return [...new Set(keys)];
  }

  private serializePlace(item: AmapPlaceSearchItem, index: number): AmapViewportPlaceItem | null {
    const coordinates = this.parseLocation(item.location);
    if (!coordinates || !item.name) {
      return null;
    }

    const address = Array.isArray(item.address)
      ? item.address.join('')
      : item.address || '';
    const distance = Number(item.distance);

    return {
      id: item.id || `poi-${index}`,
      title: item.name,
      address,
      category: item.type || '',
      district: item.adname || '',
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      distance: Number.isFinite(distance) ? distance : undefined,
    };
  }

  private parseLocation(location?: string) {
    if (!location) {
      return null;
    }

    const [longitudeText, latitudeText] = location.split(',');
    const longitude = Number(longitudeText);
    const latitude = Number(latitudeText);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return {
      latitude,
      longitude,
    };
  }

  private isInBounds(
    place: { latitude: number; longitude: number },
    bounds: { minLatitude: number; maxLatitude: number; minLongitude: number; maxLongitude: number },
  ) {
    return place.latitude >= bounds.minLatitude
      && place.latitude <= bounds.maxLatitude
      && place.longitude >= bounds.minLongitude
      && place.longitude <= bounds.maxLongitude;
  }

  private deduplicatePlaces(places: AmapViewportPlaceItem[]) {
    const uniquePlaces = new Map<string, AmapViewportPlaceItem>();

    places.forEach((place) => {
      if (!uniquePlaces.has(place.id)) {
        uniquePlaces.set(place.id, place);
      }
    });

    return Array.from(uniquePlaces.values());
  }

  private calculateDistanceMeters(
    start: { latitude: number; longitude: number },
    end: { latitude: number; longitude: number },
  ) {
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadius = 6371000;
    const latitudeDelta = toRadians(end.latitude - start.latitude);
    const longitudeDelta = toRadians(end.longitude - start.longitude);
    const startLatitude = toRadians(start.latitude);
    const endLatitude = toRadians(end.latitude);

    const haversine = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;

    return 2 * earthRadius * Math.asin(Math.sqrt(haversine));
  }

  private shouldTryNextTencentKey(message: string) {
    return message.includes('调用量已达到上限') || message.includes('配额') || message.includes('quota');
  }
}
