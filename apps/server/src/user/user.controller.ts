import { BadRequestException, Body, Controller, Get, Post, Query, Req, UploadedFile, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { ok } from '@/common/api-response';
import { AvatarUploadExceptionFilter } from '@/common/avatar-upload-exception.filter';
import { CurrentUser, type CurrentAuthUser } from '@/auth/current-user.decorator';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { UpdateUserInfoDto } from './dto/update-user-info.dto';
import { AVATAR_ACCEPTED_MIME_TYPES, AVATAR_ACCEPTED_FORMAT_LABEL, AVATAR_MAX_FILE_SIZE } from './avatar-policy';
import { validateAvatarUpload } from './user-avatar.util';
import { UserService } from './user.service';

interface UploadedAvatarFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size?: number;
}

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('search')
  async searchUsers(@Query('keyword') keyword = '') {
    const users = await this.userService.searchUsers(keyword);
    return ok(users);
  }

  @UseGuards(JwtAuthGuard)
  @Get('info')
  async getUserInfo(@CurrentUser() currentUser: CurrentAuthUser) {
    const user = await this.userService.findById(currentUser.userId);
    return ok(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('updateInfo')
  async updateInfo(
    @CurrentUser() currentUser: CurrentAuthUser,
    @Body() dto: UpdateUserInfoDto,
  ) {
    const user = await this.userService.updateInfo(currentUser.userId, dto);
    return ok(user, '更新成功');
  }

  @UseGuards(JwtAuthGuard)
  @Post('avatar')
  @UseFilters(AvatarUploadExceptionFilter)
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: AVATAR_MAX_FILE_SIZE,
    },
    fileFilter: (_req, file, callback) => {
      if (!AVATAR_ACCEPTED_MIME_TYPES.includes(file.mimetype as (typeof AVATAR_ACCEPTED_MIME_TYPES)[number])) {
        callback(new BadRequestException(`头像仅支持 ${AVATAR_ACCEPTED_FORMAT_LABEL} 格式`), false);
        return;
      }

      callback(null, true);
    },
  }))
  async uploadAvatar(
    @CurrentUser() currentUser: CurrentAuthUser,
    @UploadedFile() file: UploadedAvatarFile | undefined,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('请先选择头像图片');
    }

    let avatarMeta;
    try {
      avatarMeta = validateAvatarUpload(file);
    }
    catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : '头像校验失败');
    }

    const origin = `${req.protocol}://${req.get('host')}`;
    const result = await this.userService.saveAvatar(currentUser.userId, file, origin, avatarMeta);
    return ok(result, '上传成功');
  }

  @Post('updatePassword')
  updatePassword() {
    return {
      code: 400,
      msg: '当前版本未启用密码登录，不支持修改密码',
      data: null,
    };
  }
}
