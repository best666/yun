import { Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { UpdateUserInfoDto } from './dto/update-user-info.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return this.serializeUser(user);
  }

  async updateInfo(userId: number, dto: UpdateUserInfoDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        nickname: dto.nickname,
        avatar: dto.avatar,
        gender: dto.gender,
      },
    });

    return this.serializeUser(user);
  }

  serializeUser(user: User) {
    return {
      userId: user.id,
      username: user.username || user.phone || `user_${user.id}`,
      nickname: user.nickname || user.username || user.phone || `用户${user.id}`,
      avatar: user.avatar || '',
      phone: user.phone || '',
      gender: user.gender,
    };
  }
}
