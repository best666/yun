import { Controller, Get, Query } from '@nestjs/common';
import { ok } from '@/common/api-response';
import { MapService } from './map.service';

type MapProvider = 'amap' | 'tencent';

@Controller('map')
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get('search')
  async searchPlaces(
    @Query('keyword') keyword = '',
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('pageSize') pageSize?: string,
    @Query('provider') provider?: string,
  ) {
    const places = await this.mapService.searchPlaces({
      keyword,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      provider: provider === 'amap' ? 'amap' : 'tencent' as MapProvider,
    });

    return ok(places);
  }
}
