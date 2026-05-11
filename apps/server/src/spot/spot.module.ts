import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { SpotController } from './spot.controller';
import { SpotService } from './spot.service';

@Module({
  imports: [PrismaModule],
  controllers: [SpotController],
  providers: [SpotService],
})
export class SpotModule {}
