import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentAuthUser {
  userId: number;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentAuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as CurrentAuthUser;
  },
);
