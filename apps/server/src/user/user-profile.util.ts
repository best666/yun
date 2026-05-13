export const DEFAULT_USER_AVATAR = '/static/images/default-avatar.png';
export const DEFAULT_USER_SIGNATURE = '吃遍天下美食';
export const DEFAULT_USER_NICKNAME_PREFIX = '云游之';

interface UserNicknameSource {
  userId?: number | null;
  username?: string | null;
  phone?: string | null;
  openid?: string | null;
  wechatOpenId?: string | null;
  douyinOpenId?: string | null;
}

function normalizeIdentifier(value?: string | null) {
  if (!value) {
    return '';
  }

  return value.trim().replace(/[^0-9a-zA-Z\u4e00-\u9fa5]/g, '');
}

function resolveNicknameSuffix(source: UserNicknameSource) {
  const candidates = [
    source.phone,
    source.username,
    source.openid,
    source.wechatOpenId,
    source.douyinOpenId,
  ];

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeIdentifier(candidate);
    if (normalizedCandidate) {
      return normalizedCandidate.slice(-3).padStart(3, '0');
    }
  }

  if (typeof source.userId === 'number' && Number.isFinite(source.userId)) {
    return String(source.userId).slice(-3).padStart(3, '0');
  }

  return '001';
}

export function buildDefaultUserNickname(source: UserNicknameSource) {
  return `${DEFAULT_USER_NICKNAME_PREFIX}${resolveNicknameSuffix(source)}`;
}

export function normalizeUserNickname(nickname: string | null | undefined, source: UserNicknameSource) {
  const trimmedNickname = nickname?.trim();
  return trimmedNickname || buildDefaultUserNickname(source);
}

export function normalizeUserSignature(signature?: string | null) {
  const trimmedSignature = signature?.trim();
  return trimmedSignature || DEFAULT_USER_SIGNATURE;
}

export function normalizeUserAvatar(avatar?: string | null) {
  const trimmedAvatar = avatar?.trim();
  return trimmedAvatar || DEFAULT_USER_AVATAR;
}
