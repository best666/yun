import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ok } from '@/common/api-response';
import { ExchangeOauthTicketDto } from './dto/exchange-oauth-ticket.dto';
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
  async getWeChatAuthorizeUrl(@Query('origin') origin = '', @Res() response: Response) {
    const url = await this.authService.buildOauthAuthorizeUrl('wechat', origin);
    response.redirect(url);
  }

  @Get('oauth/douyin/authorize')
  async getDouyinAuthorizeUrl(@Query('origin') origin = '', @Res() response: Response) {
    const url = await this.authService.buildOauthAuthorizeUrl('douyin', origin);
    response.redirect(url);
  }

  @Get('oauth/wechat/callback')
  async handleWeChatCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() response: Response,
  ) {
    const html = await this.authService.handleOauthCallback('wechat', code, state);
    response.type('html').send(html);
  }

  @Get('oauth/douyin/callback')
  async handleDouyinCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() response: Response,
  ) {
    const html = await this.authService.handleOauthCallback('douyin', code, state);
    response.type('html').send(html);
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
