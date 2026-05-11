import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { MapModule } from './map/map.module';
import { PrismaModule } from './prisma/prisma.module';
import { SpotModule } from './spot/spot.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UserModule,
    AuthModule,
    MapModule,
    SpotModule,
  ],
})
export class AppModule {}
