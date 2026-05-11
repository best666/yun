import type { Request } from 'express';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: { userId: number } }>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('未登录或登录已失效');
    }

    const token = authHeader.slice(7);
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: number }>(token, {
        secret: this.configService.get<string>('JWT_SECRET') || 'yun-food-secret',
      });
      request.user = { userId: payload.sub };
      return true;
    }
    catch {
      throw new UnauthorizedException('未登录或登录已失效');
    }
  }
}
