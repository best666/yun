import { Module } from '@nestjs/common';
import { MapModule } from '@/map/map.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { SpotController } from './spot.controller';
import { SpotService } from './spot.service';

@Module({
  imports: [PrismaModule, MapModule],
  controllers: [SpotController],
  providers: [SpotService],
})
export class SpotModule {}
