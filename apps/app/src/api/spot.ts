import type {
  FavoriteSpotSummary,
  ICreateSpotDiscussionPayload,
  ICreateSpotNotePayload,
  ICreateSpotQuestionAnswerPayload,
  ICreateSpotQuestionPayload,
  ICreateSpotReviewPayload,
  IMyLikedSpotNoteItem,
  IMySpotDiscussionItem,
  IMySpotNoteItem,
  IMySpotQuestionItem,
  IMySpotReviewItem,
  ISpotDetail,
  ISpotDetailQuery,
  ISpotDiscussionItem,
  ISpotInteractionNotificationList,
  ISpotNoteItem,
  ISpotQuestionAnswerItem,
  ISpotQuestionItem,
  ISpotReviewItem,
  IToggleSpotDiscussionLikePayload,
  IToggleSpotDiscussionLikeResult,
  IToggleSpotFavoritePayload,
  IToggleSpotFavoriteResult,
  IToggleSpotNoteLikePayload,
  IToggleSpotNoteLikeResult,
} from './types/spot'
import { http } from '@/http/http'

export function getSpotDetail(params: ISpotDetailQuery) {
  return http.get<ISpotDetail>('/api/spot/detail', params)
}

export function getSpotFavoriteList() {
  return http.get<FavoriteSpotSummary[]>('/api/spot/favorite/list')
}

export function toggleSpotFavorite(data: IToggleSpotFavoritePayload) {
  return http.post<IToggleSpotFavoriteResult>('/api/spot/favorite/toggle', data)
}

export function createSpotReview(data: ICreateSpotReviewPayload) {
  return http.post<ISpotReviewItem>('/api/spot/review', data)
}

export function getMySpotReviews() {
  return http.get<IMySpotReviewItem[]>('/api/spot/review/my')
}

export function deleteMySpotReview(reviewId: number) {
  return http.delete<{ id: string }>(`/api/spot/review/${reviewId}`)
}

export function getMySpotNotes() {
  return http.get<IMySpotNoteItem[]>('/api/spot/note/my')
}

export function getMyLikedSpotNotes() {
  return http.get<IMyLikedSpotNoteItem[]>('/api/spot/note/liked/my')
}

export function createSpotNote(data: ICreateSpotNotePayload) {
  return http.post<ISpotNoteItem>('/api/spot/note', data)
}

export function toggleSpotNoteLike(data: IToggleSpotNoteLikePayload) {
  return http.post<IToggleSpotNoteLikeResult>('/api/spot/note/like/toggle', data)
}

export function deleteMySpotNote(noteId: number) {
  return http.delete<{ id: string }>(`/api/spot/note/${noteId}`)
}

export function getMySpotQuestions() {
  return http.get<IMySpotQuestionItem[]>('/api/spot/question/my')
}

export function getMySpotInteractionNotifications() {
  return http.get<ISpotInteractionNotificationList>('/api/spot/interaction-notification/my')
}

export function markAllSpotInteractionNotificationsRead() {
  return http.post<{ success: boolean }>('/api/spot/interaction-notification/read/all')
}

export function createSpotQuestion(data: ICreateSpotQuestionPayload) {
  return http.post<ISpotQuestionItem>('/api/spot/question', data)
}

export function createSpotQuestionAnswer(data: ICreateSpotQuestionAnswerPayload) {
  return http.post<ISpotQuestionAnswerItem>('/api/spot/question/answer', data)
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
