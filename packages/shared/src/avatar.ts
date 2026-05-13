const BYTES_PER_MB = 1024 * 1024;

export const AVATAR_ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AVATAR_ACCEPTED_FORMAT_LABEL = 'JPG、PNG、WEBP';
export const AVATAR_MAX_FILE_SIZE = 3 * BYTES_PER_MB;
export const AVATAR_MAX_FILE_SIZE_MB = AVATAR_MAX_FILE_SIZE / BYTES_PER_MB;
export const AVATAR_MIN_DIMENSION = 200;
export const AVATAR_MAX_DIMENSION = 2048;
export const AVATAR_TARGET_DIMENSION = 480;
export const AVATAR_RATIO_TEXT = '1:1';
export const AVATAR_UPLOAD_RULE_TEXT = `支持 ${AVATAR_ACCEPTED_FORMAT_LABEL}，需裁成 ${AVATAR_RATIO_TEXT} 正方形，尺寸 ${AVATAR_MIN_DIMENSION}-${AVATAR_MAX_DIMENSION}px，大小不超过 ${formatAvatarFileSizeLimit(AVATAR_MAX_FILE_SIZE)}`;

export function formatAvatarFileSizeLimit(fileSizeInBytes: number) {
  const sizeInMb = fileSizeInBytes / BYTES_PER_MB;
  return Number.isInteger(sizeInMb) ? `${sizeInMb}MB` : `${sizeInMb.toFixed(1)}MB`;
}
