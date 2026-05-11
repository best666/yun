import { Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { UpdateUserInfoDto } from './dto/update-user-info.dto';

interface PublicSearchUser {
  userId: number
  username: string
  nickname: string
  avatar: string
  phoneMasked: string
}

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async searchUsers(keyword: string): Promise<PublicSearchUser[]> {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: trimmedKeyword } },
          { nickname: { contains: trimmedKeyword } },
          { phone: { contains: trimmedKeyword } },
        ],
      },
      orderBy: [
        { lastLoginAt: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: 12,
    });

    return users.map(user => this.serializeSearchUser(user));
  }

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

  private serializeSearchUser(user: User): PublicSearchUser {
    return {
      userId: user.id,
      username: user.username || user.phone || `user_${user.id}`,
      nickname: user.nickname || user.username || user.phone || `用户${user.id}`,
      avatar: user.avatar || '',
      phoneMasked: this.maskPhone(user.phone),
    };
  }

  private maskPhone(phone?: string | null) {
    if (!phone) {
      return '';
    }

    if (phone.length < 7) {
      return phone;
    }

    return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
  }
}
