import { ArgumentsHost, Catch, ExceptionFilter, PayloadTooLargeException } from '@nestjs/common';
import type { Response } from 'express';
import { AVATAR_MAX_FILE_SIZE, formatAvatarFileSizeLimit } from '@/user/avatar-policy';

@Catch(PayloadTooLargeException)
export class AvatarUploadExceptionFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    response.status(413).json({
      statusCode: 413,
      message: `头像图片不能超过 ${formatAvatarFileSizeLimit(AVATAR_MAX_FILE_SIZE)}`,
      error: 'Payload Too Large',
    });
  }
}
