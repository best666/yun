import {
  AVATAR_ACCEPTED_FORMAT_LABEL,
  AVATAR_MAX_DIMENSION,
  AVATAR_MIN_DIMENSION,
} from './avatar-policy';

const JPEG_SOI_MARKER = 0xFFD8;
const PNG_SIGNATURE = '89504e470d0a1a0a';
const RIFF_SIGNATURE = '52494646';
const WEBP_SIGNATURE = '57454250';

export interface UploadedAvatarValidationFile {
  buffer: Buffer;
  mimetype: string;
  size?: number;
}

export interface AvatarImageMeta {
  extension: '.jpg' | '.png' | '.webp';
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  width: number;
  height: number;
}

export function validateAvatarUpload(file: UploadedAvatarValidationFile): AvatarImageMeta {
  if (!file.buffer?.length) {
    throw new Error('头像文件内容不能为空');
  }

  const imageMeta = parseAvatarImageMeta(file.buffer);

  if (!imageMeta) {
    throw new Error(`头像仅支持 ${AVATAR_ACCEPTED_FORMAT_LABEL} 格式`);
  }

  if (file.mimetype !== imageMeta.mimeType) {
    throw new Error('头像文件格式异常，请重新选择图片');
  }

  if (imageMeta.width < AVATAR_MIN_DIMENSION || imageMeta.height < AVATAR_MIN_DIMENSION) {
    throw new Error(`头像尺寸不能小于 ${AVATAR_MIN_DIMENSION}x${AVATAR_MIN_DIMENSION}`);
  }

  if (imageMeta.width > AVATAR_MAX_DIMENSION || imageMeta.height > AVATAR_MAX_DIMENSION) {
    throw new Error(`头像尺寸不能超过 ${AVATAR_MAX_DIMENSION}x${AVATAR_MAX_DIMENSION}`);
  }

  if (imageMeta.width !== imageMeta.height) {
    throw new Error('头像必须为 1:1 的正方形图片');
  }

  return imageMeta;
}

function parseAvatarImageMeta(buffer: Buffer): AvatarImageMeta | null {
  const pngMeta = parsePngMeta(buffer);
  if (pngMeta) {
    return pngMeta;
  }

  const jpegMeta = parseJpegMeta(buffer);
  if (jpegMeta) {
    return jpegMeta;
  }

  const webpMeta = parseWebpMeta(buffer);
  if (webpMeta) {
    return webpMeta;
  }

  return null;
}

function parsePngMeta(buffer: Buffer): AvatarImageMeta | null {
  if (buffer.length < 24) {
    return null;
  }

  if (buffer.subarray(0, 8).toString('hex') !== PNG_SIGNATURE) {
    return null;
  }

  const chunkType = buffer.subarray(12, 16).toString('ascii');
  if (chunkType !== 'IHDR') {
    return null;
  }

  return {
    extension: '.png',
    mimeType: 'image/png',
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function parseJpegMeta(buffer: Buffer): AvatarImageMeta | null {
  if (buffer.length < 4 || buffer.readUInt16BE(0) !== JPEG_SOI_MARKER) {
    return null;
  }

  let offset = 2;

  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xFF) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];

    if (marker === 0xD8 || marker === 0xD9) {
      offset += 2;
      continue;
    }

    if (marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
      offset += 2;
      continue;
    }

    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2) {
      return null;
    }

    if (isJpegStartOfFrameMarker(marker)) {
      return {
        extension: '.jpg',
        mimeType: 'image/jpeg',
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + segmentLength;
  }

  return null;
}

function isJpegStartOfFrameMarker(marker: number) {
  return marker >= 0xC0 && marker <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(marker);
}

function parseWebpMeta(buffer: Buffer): AvatarImageMeta | null {
  if (buffer.length < 16) {
    return null;
  }

  if (buffer.subarray(0, 4).toString('hex') !== RIFF_SIGNATURE || buffer.subarray(8, 12).toString('hex') !== WEBP_SIGNATURE) {
    return null;
  }

  const chunkType = buffer.subarray(12, 16).toString('ascii');

  if (chunkType === 'VP8 ') {
    return parseWebpLossyMeta(buffer);
  }

  if (chunkType === 'VP8L') {
    return parseWebpLosslessMeta(buffer);
  }

  if (chunkType === 'VP8X') {
    return parseWebpExtendedMeta(buffer);
  }

  return null;
}

function parseWebpLossyMeta(buffer: Buffer): AvatarImageMeta | null {
  if (buffer.length < 30) {
    return null;
  }

  const frameStart = 20;
  if (buffer[frameStart + 3] !== 0x9D || buffer[frameStart + 4] !== 0x01 || buffer[frameStart + 5] !== 0x2A) {
    return null;
  }

  return {
    extension: '.webp',
    mimeType: 'image/webp',
    width: buffer.readUInt16LE(frameStart + 6) & 0x3FFF,
    height: buffer.readUInt16LE(frameStart + 8) & 0x3FFF,
  };
}

function parseWebpLosslessMeta(buffer: Buffer): AvatarImageMeta | null {
  if (buffer.length < 25) {
    return null;
  }

  const frameStart = 20;
  const b0 = buffer[frameStart + 1];
  const b1 = buffer[frameStart + 2];
  const b2 = buffer[frameStart + 3];
  const b3 = buffer[frameStart + 4];

  return {
    extension: '.webp',
    mimeType: 'image/webp',
    width: 1 + (((b1 & 0x3F) << 8) | b0),
    height: 1 + (((b3 & 0x0F) << 10) | (b2 << 2) | ((b1 & 0xC0) >> 6)),
  };
}

function parseWebpExtendedMeta(buffer: Buffer): AvatarImageMeta | null {
  if (buffer.length < 30) {
    return null;
  }

  return {
    extension: '.webp',
    mimeType: 'image/webp',
    width: 1 + buffer.readUIntLE(24, 3),
    height: 1 + buffer.readUIntLE(27, 3),
  };
}
