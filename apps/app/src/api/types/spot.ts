export interface ISpotReviewReplyItem {
  id: string
  content: string
  userName: string
  avatar: string
  time: string
  isMine: boolean
}

export interface IMySpotReviewReplyItem extends ISpotReviewReplyItem {
  reviewId: string
  reviewContent: string
  spotId: number
  spotName: string
}

export interface ISpotReviewItem {
  id: string
  userName: string
  avatar: string
  rating: number
  content: string
  images: string[]
  locationName?: string
  locationAddress?: string
  time: string
  likeCount: number
  likedByCurrentUser: boolean
  replyCount: number
  replies: ISpotReviewReplyItem[]
  isMine: boolean
}

export interface ISpotDiscussionItem {
  id: string
  userName: string
  avatar: string
  content: string
  time: string
  likeCount: number
  likedByCurrentUser: boolean
  isMine: boolean
}

export interface IMySpotReviewItem extends ISpotReviewItem {
  spotId: number
  spotName: string
}

export interface IMySpotDiscussionItem extends ISpotDiscussionItem {
  spotId: number
  spotName: string
}

export interface ISpotNoteItem {
  id: string
  title: string
  content: string
  cover: string
  userName: string
  avatar: string
  likeCount: number
  time: string
  likedByCurrentUser: boolean
  isMine: boolean
}

export interface IMySpotNoteItem extends ISpotNoteItem {
  spotId: number
  spotName: string
}

export interface IMyLikedSpotNoteItem extends ISpotNoteItem {
  spotId: number
  spotName: string
  likedAt: string
}

export interface ISpotQuestionAnswerItem {
  id: string
  content: string
  userName: string
  avatar: string
  time: string
  isMine: boolean
}

export interface ISpotQuestionItem {
  id: string
  question: string
  asker: string
  askerAvatar: string
  time: string
  isMine: boolean
  answers: ISpotQuestionAnswerItem[]
}

export interface ISpotInteractionNotificationItem {
  id: string
  type: string
  title: string
  content: string
  time: string
  isRead: boolean
  spotId?: number
  spotName?: string
  targetType?: string
  targetId?: number
  actorName: string
  actorAvatar: string
}

export interface ISpotInteractionNotificationList {
  unreadCount: number
  items: ISpotInteractionNotificationItem[]
}

export interface ISpotDetail {
  id: string
  name: string
  cover: string
  images: string[]
  address: string
  rating: number
  reviewCount: number
  favoriteCount: number
  avgPrice: number
  description: string
  phone: string
  businessStatus: string
  businessHours: string
  latitude: number
  longitude: number
  routeTip: string
  navigationLabel: string
  tags: string[]
  isFavorited: boolean
  reviews: ISpotReviewItem[]
  discussions: ISpotDiscussionItem[]
  notes: ISpotNoteItem[]
  questions: ISpotQuestionItem[]
}

export interface ISpotDetailQuery {
  id?: string
  title?: string
  address?: string
  latitude?: number
  longitude?: number
  distance?: number
  category?: string
  district?: string
  provider?: string
}

export interface ICreateSpotReviewPayload {
  spotId: number
  rating: number
  content: string
  images?: string[]
  locationName?: string
  locationAddress?: string
}

export interface ICreateSpotReviewReplyPayload {
  reviewId: number
  content: string
}

export interface IToggleSpotReviewLikePayload {
  reviewId: number
}

export interface IToggleSpotReviewLikeResult {
  reviewId: string
  liked: boolean
  likeCount: number
}

export interface ICreateSpotDiscussionPayload {
  spotId: number
  content: string
}

export interface ICreateSpotNotePayload {
  spotId: number
  title: string
  content: string
}

export interface IToggleSpotFavoritePayload {
  spotId: number
}

export interface IToggleSpotFavoriteResult {
  spotId: string
  favorited: boolean
  favoriteCount: number
  summary: FavoriteSpotSummary
}

export interface IToggleSpotDiscussionLikePayload {
  discussionId: number
}

export interface IToggleSpotDiscussionLikeResult {
  discussionId: string
  liked: boolean
  likeCount: number
}

export interface IToggleSpotNoteLikePayload {
  noteId: number
}

export interface IToggleSpotNoteLikeResult {
  noteId: string
  liked: boolean
  likeCount: number
}

export interface FavoriteSpotSummary {
  id: string
  name: string
  cover: string
  address: string
  rating: number
  avgPrice: number
  latitude?: number
  longitude?: number
  distance?: number
  category?: string
  district?: string
  provider?: string
}
