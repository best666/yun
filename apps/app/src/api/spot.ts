import type {
  FavoriteSpotSummary,
  ICreateSpotDiscussionPayload,
  ICreateSpotReviewPayload,
  ICreateSpotReviewReplyPayload,
  IMySpotDiscussionItem,
  IMySpotReviewItem,
  IMySpotReviewReplyItem,
  ISpotDetail,
  ISpotDetailQuery,
  ISpotDiscussionItem,
  ISpotInteractionNotificationList,
  ISpotReviewItem,
  ISpotReviewReplyItem,
  IToggleSpotDiscussionLikePayload,
  IToggleSpotDiscussionLikeResult,
  IToggleSpotFavoritePayload,
  IToggleSpotFavoriteResult,
  IToggleSpotReviewLikePayload,
  IToggleSpotReviewLikeResult,
} from './types/spot'
import { http } from '@/http/http'
import { normalizeSpotDetail, normalizeSpotReview, normalizeSpotReviewReply } from '@/utils/spotDetailNormalize'

export function getSpotDetail(params: ISpotDetailQuery) {
  return http.get<ISpotDetail>('/api/spot/detail', params).then(detail => normalizeSpotDetail(detail, params))
}

export function getSpotFavoriteList() {
  return http.get<FavoriteSpotSummary[]>('/api/spot/favorite/list')
}

export function toggleSpotFavorite(data: IToggleSpotFavoritePayload) {
  return http.post<IToggleSpotFavoriteResult>('/api/spot/favorite/toggle', data)
}

export function createSpotReview(data: ICreateSpotReviewPayload) {
  return http.post<ISpotReviewItem>('/api/spot/review', data).then(review => normalizeSpotReview(review))
}

export function createSpotReviewReply(data: ICreateSpotReviewReplyPayload) {
  return http.post<ISpotReviewReplyItem>('/api/spot/review/reply', data).then(reply => normalizeSpotReviewReply(reply))
}

export function getMySpotReviews() {
  return http.get<IMySpotReviewItem[]>('/api/spot/review/my')
}

export function getMySpotReviewReplies() {
  return http.get<IMySpotReviewReplyItem[]>('/api/spot/review/reply/my')
}

export function deleteMySpotReview(reviewId: number) {
  return http.delete<{ id: string }>(`/api/spot/review/${reviewId}`)
}

export function deleteMySpotReviewReply(replyId: number) {
  return http.delete<{ id: string }>(`/api/spot/review/reply/${replyId}`)
}

export function toggleSpotReviewLike(data: IToggleSpotReviewLikePayload) {
  return http.post<IToggleSpotReviewLikeResult>('/api/spot/review/like/toggle', data)
}

export function getMySpotInteractionNotifications() {
  return http.get<ISpotInteractionNotificationList>('/api/spot/interaction-notification/my')
}

export function markAllSpotInteractionNotificationsRead() {
  return http.post<{ success: boolean }>('/api/spot/interaction-notification/read/all')
}

export function createSpotDiscussion(data: ICreateSpotDiscussionPayload) {
  return http.post<ISpotDiscussionItem>('/api/spot/discussion', data)
}

export function getMySpotDiscussions() {
  return http.get<IMySpotDiscussionItem[]>('/api/spot/discussion/my')
}

export function toggleSpotDiscussionLike(data: IToggleSpotDiscussionLikePayload) {
  return http.post<IToggleSpotDiscussionLikeResult>('/api/spot/discussion/like/toggle', data)
}

export function deleteMySpotDiscussion(discussionId: number) {
  return http.delete<{ id: string }>(`/api/spot/discussion/${discussionId}`)
}
