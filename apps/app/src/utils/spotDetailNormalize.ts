import type { ISpotDetail, ISpotDetailQuery, ISpotDiscussionItem, ISpotNoteItem, ISpotQuestionAnswerItem, ISpotQuestionItem, ISpotReviewItem, ISpotReviewReplyItem } from '@/api/types/spot'

function toRecord(value: unknown) {
  return typeof value === 'object' && value !== null ? value as Record<string, any> : null
}

function toStringValue(value: unknown, fallback = '') {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}

function toNumberValue(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsedValue = Number(value)
    if (Number.isFinite(parsedValue)) {
      return parsedValue
    }
  }

  return fallback
}

function toBooleanValue(value: unknown, fallback = false) {
  if (typeof value === 'boolean') {
    return value
  }

  if (value === 'true' || value === '1' || value === 1) {
    return true
  }

  if (value === 'false' || value === '0' || value === 0) {
    return false
  }

  return fallback
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[]
  }

  return value
    .map(item => toStringValue(item))
    .filter(Boolean)
}

export function normalizeSpotReviewReply(reply: unknown): ISpotReviewReplyItem {
  const source = toRecord(reply)

  return {
    id: toStringValue(source?.id),
    content: toStringValue(source?.content),
    userName: toStringValue(source?.userName, '游客'),
    avatar: toStringValue(source?.avatar),
    time: toStringValue(source?.time),
    isMine: toBooleanValue(source?.isMine),
  }
}

export function normalizeSpotReview(review: unknown): ISpotReviewItem {
  const source = toRecord(review)
  const replies = Array.isArray(source?.replies)
    ? source!.replies.map(item => normalizeSpotReviewReply(item))
    : []

  return {
    id: toStringValue(source?.id),
    userName: toStringValue(source?.userName, '美食探索者'),
    avatar: toStringValue(source?.avatar),
    rating: toNumberValue(source?.rating),
    content: toStringValue(source?.content),
    images: toStringArray(source?.images),
    locationName: toStringValue(source?.locationName),
    locationAddress: toStringValue(source?.locationAddress),
    time: toStringValue(source?.time),
    likeCount: toNumberValue(source?.likeCount),
    likedByCurrentUser: toBooleanValue(source?.likedByCurrentUser),
    replyCount: Math.max(toNumberValue(source?.replyCount), replies.length),
    replies,
    isMine: toBooleanValue(source?.isMine),
  }
}

function normalizeSpotDiscussion(discussion: unknown): ISpotDiscussionItem {
  const source = toRecord(discussion)

  return {
    id: toStringValue(source?.id),
    userName: toStringValue(source?.userName, '美食探索者'),
    avatar: toStringValue(source?.avatar),
    content: toStringValue(source?.content),
    time: toStringValue(source?.time),
    likeCount: toNumberValue(source?.likeCount),
    likedByCurrentUser: toBooleanValue(source?.likedByCurrentUser),
    isMine: toBooleanValue(source?.isMine),
  }
}

function normalizeSpotNote(note: unknown): ISpotNoteItem {
  const source = toRecord(note)

  return {
    id: toStringValue(source?.id),
    title: toStringValue(source?.title),
    content: toStringValue(source?.content),
    cover: toStringValue(source?.cover),
    userName: toStringValue(source?.userName, '美食探索者'),
    avatar: toStringValue(source?.avatar),
    likeCount: toNumberValue(source?.likeCount),
    time: toStringValue(source?.time),
    likedByCurrentUser: toBooleanValue(source?.likedByCurrentUser),
    isMine: toBooleanValue(source?.isMine),
  }
}

function normalizeSpotQuestionAnswer(answer: unknown): ISpotQuestionAnswerItem {
  const source = toRecord(answer)

  return {
    id: toStringValue(source?.id),
    content: toStringValue(source?.content),
    userName: toStringValue(source?.userName, '美食探索者'),
    avatar: toStringValue(source?.avatar),
    time: toStringValue(source?.time),
    isMine: toBooleanValue(source?.isMine),
  }
}

function normalizeSpotQuestion(question: unknown): ISpotQuestionItem {
  const source = toRecord(question)

  return {
    id: toStringValue(source?.id),
    question: toStringValue(source?.question),
    asker: toStringValue(source?.asker, '美食探索者'),
    askerAvatar: toStringValue(source?.askerAvatar),
    time: toStringValue(source?.time),
    isMine: toBooleanValue(source?.isMine),
    answers: Array.isArray(source?.answers)
      ? source!.answers.map(item => normalizeSpotQuestionAnswer(item))
      : [],
  }
}

export function normalizeSpotDetail(detail: unknown, query?: ISpotDetailQuery): ISpotDetail {
  const source = toRecord(detail)
  const images = toStringArray(source?.images)
  const cover = toStringValue(source?.cover, images[0] || '')

  return {
    id: toStringValue(source?.id, toStringValue(query?.id)),
    name: toStringValue(source?.name, toStringValue(query?.title, '地点详情')),
    cover,
    images: images.length ? images : (cover ? [cover] : []),
    address: toStringValue(source?.address, toStringValue(query?.address)),
    rating: toNumberValue(source?.rating),
    reviewCount: toNumberValue(source?.reviewCount),
    favoriteCount: toNumberValue(source?.favoriteCount),
    avgPrice: toNumberValue(source?.avgPrice),
    description: toStringValue(source?.description),
    phone: toStringValue(source?.phone),
    businessStatus: toStringValue(source?.businessStatus),
    businessHours: toStringValue(source?.businessHours),
    latitude: toNumberValue(source?.latitude, toNumberValue(query?.latitude)),
    longitude: toNumberValue(source?.longitude, toNumberValue(query?.longitude)),
    routeTip: toStringValue(source?.routeTip),
    navigationLabel: toStringValue(source?.navigationLabel, toStringValue(source?.name, toStringValue(query?.title))),
    tags: toStringArray(source?.tags),
    isFavorited: toBooleanValue(source?.isFavorited),
    reviews: Array.isArray(source?.reviews)
      ? source!.reviews.map(item => normalizeSpotReview(item))
      : [],
    discussions: Array.isArray(source?.discussions)
      ? source!.discussions.map(item => normalizeSpotDiscussion(item))
      : [],
    notes: Array.isArray(source?.notes)
      ? source!.notes.map(item => normalizeSpotNote(item))
      : [],
    questions: Array.isArray(source?.questions)
      ? source!.questions.map(item => normalizeSpotQuestion(item))
      : [],
  }
}
