import { randomInt } from 'node:crypto';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';

export type OauthProvider = 'wechat' | 'douyin';

interface AppTokenResult {
  token: string;
  expiresIn: number;
}

interface OauthStatePayload {
  provider: OauthProvider;
  origin: string;
  type: 'oauth_state';
}

interface OauthTicketPayload {
  provider: OauthProvider;
  sub: number;
  type: 'oauth_ticket';
}

interface WeChatMpSessionResult {
  openid: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

interface WeChatOauthTokenResult {
  access_token?: string;
  openid?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async sendSmsCode(phone: string) {
    const fixedCode = this.getDevFixedSmsCode(phone);
    if (fixedCode) {
      const expiresIn = 300;
      return {
        sent: true,
        expiresIn,
        debugCode: fixedCode,
      };
    }

    const code = String(randomInt(100000, 999999));
    const expiresIn = 300;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await this.prisma.smsCode.updateMany({
      where: {
        phone,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    await this.prisma.smsCode.create({
      data: {
        phone,
        code,
        expiresAt,
      },
    });

    const debugReturnCode = this.configService.get<string>('SMS_DEBUG_RETURN_CODE') === 'true';
    console.log(`[auth] sms code for ${phone}: ${code}`);

    return {
      sent: true,
      expiresIn,
      debugCode: debugReturnCode ? code : undefined,
    };
  }

  async loginWithSmsCode(phone: string, code: string): Promise<AppTokenResult> {
    if (this.isDevFixedSmsCode(phone, code)) {
      const user = await this.findOrCreateUserByPhone(phone);
      return this.issueAppToken(user.id);
    }

    const smsCode = await this.prisma.smsCode.findFirst({
      where: {
        phone,
        code,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!smsCode) {
      throw new UnauthorizedException('验证码错误或已过期');
    }

    await this.prisma.smsCode.update({
      where: { id: smsCode.id },
      data: { usedAt: new Date() },
    });

    const user = await this.findOrCreateUserByPhone(phone);
    return this.issueAppToken(user.id);
  }

  async loginWithWeChatMiniProgram(code: string): Promise<AppTokenResult> {
    const appId = this.getRequiredConfig('WECHAT_MP_APPID');
    const secret = this.getRequiredConfig('WECHAT_MP_SECRET');

    const searchParams = new URLSearchParams({
      appid: appId,
      secret,
      js_code: code,
      grant_type: 'authorization_code',
    });

    const response = await fetch(`https://api.weixin.qq.com/sns/jscode2session?${searchParams.toString()}`);
    const result = await response.json() as WeChatMpSessionResult;

    if (!response.ok || result.errcode || !result.openid) {
      throw new UnauthorizedException(result.errmsg || '微信小程序登录失败');
    }

    const user = await this.findOrCreateUserByWeChatMp(result.openid, result.unionid);
    return this.issueAppToken(user.id);
  }

  async buildOauthAuthorizeUrl(provider: OauthProvider, origin: string) {
    if (!origin) {
      throw new BadRequestException('缺少登录来源 origin');
    }

    const normalizedOrigin = this.normalizeOrigin(origin);
    const callbackUrl = this.getOauthCallbackUrl(provider);
    const state = await this.jwtService.signAsync({
      provider,
      origin: normalizedOrigin,
      type: 'oauth_state',
    } satisfies OauthStatePayload, {
      secret: this.getJwtSecret(),
      expiresIn: 10 * 60,
    });

    if (provider === 'wechat') {
      const appId = this.getRequiredConfig('WECHAT_OAUTH_APPID');
      const query = new URLSearchParams({
        appid: appId,
        redirect_uri: callbackUrl,
        response_type: 'code',
        scope: 'snsapi_login',
        state,
      });
      return `https://open.weixin.qq.com/connect/qrconnect?${query.toString()}#wechat_redirect`;
    }

    const clientKey = this.getRequiredConfig('DOUYIN_CLIENT_KEY');
    const query = new URLSearchParams({
      client_key: clientKey,
      response_type: 'code',
      scope: 'user_info',
      redirect_uri: callbackUrl,
      state,
    });
    return `https://open.douyin.com/platform/oauth/connect/?${query.toString()}`;
  }

  async handleOauthCallback(provider: OauthProvider, code: string, state: string) {
    if (!code || !state) {
      return this.renderOauthResultPage({
        success: false,
        origin: '*',
        message: '第三方登录参数不完整',
      });
    }

    try {
      const statePayload = await this.jwtService.verifyAsync<OauthStatePayload>(state, {
        secret: this.getJwtSecret(),
      });

      if (statePayload.type !== 'oauth_state' || statePayload.provider !== provider) {
        throw new UnauthorizedException('无效的登录状态');
      }

      const user = provider === 'wechat'
        ? await this.loginByWeChatOauth(code)
        : await this.loginByDouyinOauth(code);

      const ticket = await this.jwtService.signAsync({
        sub: user.id,
        provider,
        type: 'oauth_ticket',
      } satisfies OauthTicketPayload, {
        secret: this.getJwtSecret(),
        expiresIn: 2 * 60,
      });

      return this.renderOauthResultPage({
        success: true,
        origin: statePayload.origin,
        provider,
        ticket,
      });
    }
    catch (error) {
      const message = error instanceof Error ? error.message : '第三方登录失败';
      return this.renderOauthResultPage({
        success: false,
        origin: '*',
        message,
      });
    }
  }

  async exchangeOauthTicket(ticket: string): Promise<AppTokenResult> {
    const payload = await this.jwtService.verifyAsync<OauthTicketPayload>(ticket, {
      secret: this.getJwtSecret(),
    });

    if (payload.type !== 'oauth_ticket') {
      throw new UnauthorizedException('无效的登录票据');
    }

    return this.issueAppToken(payload.sub);
  }

  private async loginByWeChatOauth(code: string) {
    const appId = this.getRequiredConfig('WECHAT_OAUTH_APPID');
    const secret = this.getRequiredConfig('WECHAT_OAUTH_SECRET');
    const tokenQuery = new URLSearchParams({
      appid: appId,
      secret,
      code,
      grant_type: 'authorization_code',
    });

    const tokenResponse = await fetch(`https://api.weixin.qq.com/sns/oauth2/access_token?${tokenQuery.toString()}`);
    const tokenResult = await tokenResponse.json() as WeChatOauthTokenResult;

    if (!tokenResponse.ok || tokenResult.errcode || !tokenResult.openid || !tokenResult.access_token) {
      throw new UnauthorizedException(tokenResult.errmsg || '微信网页登录失败');
    }

    const userInfoQuery = new URLSearchParams({
      access_token: tokenResult.access_token,
      openid: tokenResult.openid,
      lang: 'zh_CN',
    });
    const userInfoResponse = await fetch(`https://api.weixin.qq.com/sns/userinfo?${userInfoQuery.toString()}`);
    const userInfoResult = await userInfoResponse.json() as Record<string, any>;

    return this.findOrCreateUserByWeChatOauth({
      openId: tokenResult.openid,
      unionId: tokenResult.unionid,
      nickname: typeof userInfoResult.nickname === 'string' ? userInfoResult.nickname : undefined,
      avatar: typeof userInfoResult.headimgurl === 'string' ? userInfoResult.headimgurl : undefined,
    });
  }

  private async loginByDouyinOauth(code: string) {
    const clientKey = this.getRequiredConfig('DOUYIN_CLIENT_KEY');
    const clientSecret = this.getRequiredConfig('DOUYIN_CLIENT_SECRET');

    const tokenResponse = await fetch('https://open.douyin.com/oauth/access_token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });
    const tokenResult = await tokenResponse.json() as Record<string, any>;
    const tokenData = (tokenResult.data || tokenResult) as Record<string, any>;

    if (!tokenResponse.ok || !tokenData.access_token || !tokenData.open_id) {
      throw new UnauthorizedException(tokenData.error_description || tokenData.description || '抖音登录失败');
    }

    const profileResponse = await fetch(`https://open.douyin.com/oauth/userinfo/?access_token=${encodeURIComponent(String(tokenData.access_token))}&open_id=${encodeURIComponent(String(tokenData.open_id))}`);
    const profileResult = await profileResponse.json() as Record<string, any>;
    const profileData = (profileResult.data || profileResult) as Record<string, any>;

    return this.findOrCreateUserByDouyinOauth({
      openId: String(tokenData.open_id),
      unionId: typeof profileData.union_id === 'string' ? profileData.union_id : undefined,
      nickname: typeof profileData.display_name === 'string' ? profileData.display_name : undefined,
      avatar: typeof profileData.avatar === 'string' ? profileData.avatar : undefined,
    });
  }

  private async findOrCreateUserByPhone(phone: string) {
    const existingUser = await this.prisma.user.findFirst({
      where: { phone },
    });

    if (existingUser) {
      return this.touchUserLogin(existingUser.id);
    }

    const user = await this.prisma.user.create({
      data: {
        phone,
        username: phone,
        nickname: `手机用户${phone.slice(-4)}`,
        lastLoginAt: new Date(),
      },
    });
    return user;
  }

  private async findOrCreateUserByWeChatMp(openId: string, unionId?: string) {
    const existingUser = await this.prisma.user.findFirst({
      where: { openid: openId },
    });

    if (existingUser) {
      return this.touchUserLogin(existingUser.id);
    }

    return this.prisma.user.create({
      data: {
        openid: openId,
        unionId,
        username: `wxmp_${openId.slice(-10)}`,
        nickname: `微信用户${openId.slice(-4)}`,
        lastLoginAt: new Date(),
      },
    });
  }

  private async findOrCreateUserByWeChatOauth(data: { openId: string; unionId?: string; nickname?: string; avatar?: string }) {
    const existingUser = await this.prisma.user.findFirst({
      where: { wechatOpenId: data.openId },
    });

    if (existingUser) {
      return this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          unionId: data.unionId || existingUser.unionId,
          nickname: data.nickname || existingUser.nickname,
          avatar: data.avatar || existingUser.avatar,
          lastLoginAt: new Date(),
        },
      });
    }

    return this.prisma.user.create({
      data: {
        wechatOpenId: data.openId,
        unionId: data.unionId,
        username: `wechat_${data.openId.slice(-10)}`,
        nickname: data.nickname || `微信用户${data.openId.slice(-4)}`,
        avatar: data.avatar,
        lastLoginAt: new Date(),
      },
    });
  }

  private async findOrCreateUserByDouyinOauth(data: { openId: string; unionId?: string; nickname?: string; avatar?: string }) {
    const existingUser = await this.prisma.user.findFirst({
      where: { douyinOpenId: data.openId },
    });

    if (existingUser) {
      return this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          unionId: data.unionId || existingUser.unionId,
          nickname: data.nickname || existingUser.nickname,
          avatar: data.avatar || existingUser.avatar,
          lastLoginAt: new Date(),
        },
      });
    }

    return this.prisma.user.create({
      data: {
        douyinOpenId: data.openId,
        unionId: data.unionId,
        username: `douyin_${data.openId.slice(-10)}`,
        nickname: data.nickname || `抖音用户${data.openId.slice(-4)}`,
        avatar: data.avatar,
        lastLoginAt: new Date(),
      },
    });
  }

  private async touchUserLogin(userId: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }

  private async issueAppToken(userId: number): Promise<AppTokenResult> {
    const expiresIn = Number(this.configService.get('JWT_EXPIRES_IN_SECONDS') || 7 * 24 * 60 * 60);
    const token = await this.jwtService.signAsync(
      { sub: userId, type: 'access_token' },
      {
        secret: this.getJwtSecret(),
        expiresIn,
      },
    );

    return {
      token,
      expiresIn,
    };
  }

  private getOauthCallbackUrl(provider: OauthProvider) {
    const serverBaseUrl = this.getRequiredConfig('SERVER_BASE_URL');
    const normalizedBaseUrl = serverBaseUrl.replace(/\/$/, '');
    return `${normalizedBaseUrl}/api/auth/oauth/${provider}/callback`;
  }

  private getRequiredConfig(key: string) {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new BadRequestException(`服务端缺少配置 ${key}`);
    }
    return value;
  }

  private getJwtSecret() {
    return this.configService.get<string>('JWT_SECRET') || 'yun-food-secret';
  }

  private getDevFixedSmsCode(phone: string) {
    const fixedCode = this.configService.get<string>('DEV_FIXED_SMS_CODE')?.trim();
    if (!fixedCode) {
      return '';
    }

    const phones = this.configService
      .get<string>('DEV_FIXED_SMS_PHONES')
      ?.split(',')
      .map(item => item.trim())
      .filter(Boolean) || [];

    if (phones.length > 0 && !phones.includes(phone)) {
      return '';
    }

    return fixedCode;
  }

  private isDevFixedSmsCode(phone: string, code: string) {
    const fixedCode = this.getDevFixedSmsCode(phone);
    return Boolean(fixedCode) && fixedCode === code;
  }

  private normalizeOrigin(origin: string) {
    try {
      return new URL(origin).origin;
    }
    catch {
      throw new BadRequestException('无效的登录来源 origin');
    }
  }

  private renderOauthResultPage(params: {
    success: boolean;
    origin: string;
    provider?: OauthProvider;
    ticket?: string;
    message?: string;
  }) {
    const payload = JSON.stringify({
      source: 'yun-auth',
      success: params.success,
      provider: params.provider,
      ticket: params.ticket,
      message: params.message,
    });

    const targetOrigin = params.origin === '*' ? '*' : params.origin;

    return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>登录处理中</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#fff7f2; color:#333; }
      .card { padding:24px 28px; border-radius:16px; background:white; box-shadow:0 12px 32px rgba(0,0,0,.08); text-align:center; max-width:320px; }
      h1 { font-size:18px; margin:0 0 10px; }
      p { font-size:14px; color:#666; margin:0; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${params.success ? '登录成功，正在返回' : '登录失败'}</h1>
      <p>${params.success ? '如果窗口未自动关闭，请返回原页面继续。' : (params.message || '请关闭窗口后重试。')}</p>
    </div>
    <script>
      (function () {
        var payload = ${JSON.stringify(payload)};
        try {
          if (window.opener) {
            window.opener.postMessage(JSON.parse(payload), ${JSON.stringify(targetOrigin)});
          }
        } catch (error) {
          console.error(error);
        }
        setTimeout(function () {
          window.close();
        }, 300);
      })();
    </script>
  </body>
</html>`;
  }
}
