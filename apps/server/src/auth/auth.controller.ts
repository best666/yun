import { Body, Controller, Get, Header, Post, Query, Redirect } from '@nestjs/common';
import { ok } from '@/common/api-response';
import { ExchangeOauthTicketDto } from './dto/exchange-oauth-ticket.dto';
import { OauthAuthorizeQueryDto } from './dto/oauth-authorize-query.dto';
import { OauthCallbackQueryDto } from './dto/oauth-callback-query.dto';
import { SendSmsCodeDto } from './dto/send-sms-code.dto';
import { SmsLoginDto } from './dto/sms-login.dto';
import { WxLoginDto } from './dto/wx-login.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sms-code')
  async sendSmsCode(@Body() dto: SendSmsCodeDto) {
    const result = await this.authService.sendSmsCode(dto.phone);
    return ok(result, '验证码已发送');
  }

  @Post('login')
  async login(@Body() dto: SmsLoginDto) {
    const tokenInfo = await this.authService.loginWithSmsCode(dto.phone, dto.code);
    return ok(tokenInfo, '登录成功');
  }

  @Post('wxLogin')
  async wxLogin(@Body() dto: WxLoginDto) {
    const tokenInfo = await this.authService.loginWithWeChatMiniProgram(dto.code);
    return ok(tokenInfo, '登录成功');
  }

  @Get('oauth/wechat/authorize')
  @Redirect()
  async getWeChatAuthorizeUrl(@Query() query: OauthAuthorizeQueryDto) {
    const url = await this.authService.buildOauthAuthorizeUrl('wechat', query.origin);
    return { url };
  }

  @Get('oauth/douyin/authorize')
  @Redirect()
  async getDouyinAuthorizeUrl(@Query() query: OauthAuthorizeQueryDto) {
    const url = await this.authService.buildOauthAuthorizeUrl('douyin', query.origin);
    return { url };
  }

  @Get('oauth/wechat/callback')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async handleWeChatCallback(
    @Query() query: OauthCallbackQueryDto,
  ) {
    return this.authService.handleOauthCallback('wechat', query.code, query.state);
  }

  @Get('oauth/douyin/callback')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async handleDouyinCallback(
    @Query() query: OauthCallbackQueryDto,
  ) {
    return this.authService.handleOauthCallback('douyin', query.code, query.state);
  }

  @Post('oauth/exchange')
  async exchangeOauthTicket(@Body() dto: ExchangeOauthTicketDto) {
    const tokenInfo = await this.authService.exchangeOauthTicket(dto.ticket);
    return ok(tokenInfo, '登录成功');
  }

  @Post('refreshToken')
  refreshToken() {
    return {
      code: 400,
      msg: '当前后端使用单 token 模式，未启用 refreshToken',
      data: null,
    };
  }

  @Get('logout')
  logout() {
    return ok(true, '退出成功');
  }
}
