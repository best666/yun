import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ok } from '@/common/api-response';
import { CurrentUser, type CurrentAuthUser } from '@/auth/current-user.decorator';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { UpdateUserInfoDto } from './dto/update-user-info.dto';
import { UserService } from './user.service';

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

  @Post('updatePassword')
  updatePassword() {
    return {
      code: 400,
      msg: '当前版本未启用密码登录，不支持修改密码',
      data: null,
    };
  }
}
