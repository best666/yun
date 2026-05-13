const BYTES_PER_MB = 1024 * 1024

export const AVATAR_MAX_FILE_SIZE = 3 * BYTES_PER_MB
export const AVATAR_MAX_FILE_SIZE_MB = AVATAR_MAX_FILE_SIZE / BYTES_PER_MB
export const AVATAR_TARGET_DIMENSION = 480
export const AVATAR_UPLOAD_RULE_TEXT = '支持 JPG、PNG、WEBP，需裁成 1:1 正方形，尺寸 200-2048px，大小不超过 3MB'
export const AVATAR_CROPPER_GUIDE_TEXT = '进入裁剪后可拖动照片、双指缩放，让头像完整落在方框内。'
export const AVATAR_CROPPER_HINTS = ['拖动定位', '双指缩放', '保留完整头像'] as const

export type AvatarTipTone = 'default' | 'error' | 'success'

export function resolveAvatarUploadTip(message?: string) {
  const normalizedMessage = message?.trim() || ''

  if (!normalizedMessage) {
    return '选择图片后会先裁剪并压缩，再上传为头像。'
  }

  if (normalizedMessage.includes('不能超过 3MB')) {
    return '图片体积过大，建议换一张更小的照片，或继续裁剪后再上传。'
  }

  if (normalizedMessage.includes('尺寸不能小于')) {
    return '图片分辨率偏低，建议更换更清晰的原图。'
  }

  if (normalizedMessage.includes('尺寸不能超过')) {
    return '图片分辨率过高，重新裁剪后再上传会更稳定。'
  }

  if (normalizedMessage.includes('正方形')) {
    return '请在裁剪框内保留完整头像区域，再确认上传。'
  }

  if (normalizedMessage.includes('格式')) {
    return '请改用 JPG、PNG 或 WEBP 图片后重新上传。'
  }

  if (normalizedMessage.includes('网络') || normalizedMessage.includes('request') || normalizedMessage.includes('timeout')) {
    return '网络状态异常，稍后重试即可。'
  }

  return normalizedMessage
}
