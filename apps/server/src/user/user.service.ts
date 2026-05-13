import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { UpdateUserInfoDto } from './dto/update-user-info.dto';
import type { AvatarImageMeta } from './user-avatar.util';
import { buildDefaultUserNickname, DEFAULT_USER_AVATAR, normalizeUserAvatar, normalizeUserNickname, normalizeUserSignature } from './user-profile.util';

interface PublicSearchUser {
  userId: number
  username: string
  nickname: string
  avatar: string
  phoneMasked: string
}

interface UploadedAvatarFile {
  buffer: Buffer
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
    const updatePayload: Record<string, string | number> = {};

    if (Object.prototype.hasOwnProperty.call(dto, 'nickname')) {
      updatePayload.nickname = normalizeUserNickname(dto.nickname, { userId });
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'avatar')) {
      updatePayload.avatar = normalizeUserAvatar(dto.avatar);
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'signature')) {
      updatePayload.signature = normalizeUserSignature(dto.signature);
    }

    if (typeof dto.gender === 'number') {
      updatePayload.gender = dto.gender;
    }

    if (!Object.keys(updatePayload).length) {
      return this.findById(userId);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updatePayload,
    });

    return this.serializeUser(user);
  }

  async saveAvatar(userId: number, file: UploadedAvatarFile, origin: string, avatarMeta: AvatarImageMeta) {
    const extension = avatarMeta.extension;
    const avatarDirectory = join(process.cwd(), 'uploads', 'avatars');
    const fileName = `${userId}-${Date.now()}-${randomUUID().slice(0, 8)}${extension}`;
    const filePath = join(avatarDirectory, fileName);
    const relativeUrl = `/uploads/avatars/${fileName}`;

    await mkdir(avatarDirectory, { recursive: true });
    await writeFile(filePath, file.buffer);

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    if (currentUser?.avatar?.includes('/uploads/avatars/')) {
      const previousFileName = currentUser.avatar.split('/uploads/avatars/')[1];
      if (previousFileName) {
        void unlink(join(avatarDirectory, previousFileName)).catch(() => undefined);
      }
    }

    return {
      url: `${origin}${relativeUrl}`,
    };
  }

  serializeUser(user: User) {
    return {
      userId: user.id,
      username: user.username || user.phone || `user_${user.id}`,
      nickname: normalizeUserNickname(user.nickname, user),
      avatar: normalizeUserAvatar(user.avatar),
      signature: normalizeUserSignature(user.signature),
      phone: user.phone || '',
      gender: user.gender,
    };
  }

  private serializeSearchUser(user: User): PublicSearchUser {
    return {
      userId: user.id,
      username: user.username || user.phone || `user_${user.id}`,
      nickname: normalizeUserNickname(user.nickname, user),
      avatar: normalizeUserAvatar(user.avatar),
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
