import type { IMySpotDiscussionItem, IMySpotReviewItem, IMySpotReviewReplyItem, ISpotInteractionNotificationItem } from '@/api/types/spot'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { deleteMySpotDiscussion, deleteMySpotReview, deleteMySpotReviewReply, getMySpotDiscussions, getMySpotInteractionNotifications, getMySpotReviewReplies, getMySpotReviews, markAllSpotInteractionNotificationsRead } from '@/api/spot'

/** 用户发布的评价记录 */
export interface UserReview extends IMySpotReviewItem {
}

/** 用户发布的评价回复记录 */
export interface UserReviewReply extends IMySpotReviewReplyItem {
}

/** 用户发布的讨论记录 */
export interface UserDiscussion extends IMySpotDiscussionItem {
}

/** 用户收到的互动提醒 */
export interface UserInteractionNotification extends ISpotInteractionNotificationItem {
}

export const useUserContentStore = defineStore(
  'userContent',
  () => {
    const reviews = ref<UserReview[]>([])
    const reviewReplies = ref<UserReviewReply[]>([])
    const discussions = ref<UserDiscussion[]>([])
    /** 用户收到的互动提醒列表 */
    const notifications = ref<UserInteractionNotification[]>([])
    /** 未读提醒数量需要单独维护，因为列表可能只取最近一部分数据。 */
    const unreadNotificationCount = ref(0)

    /** 添加评价 */
    const addReview = (review: UserReview) => {
      reviews.value = [review, ...reviews.value.filter(item => item.id !== review.id)]
    }

    /** 拉取我的评价 */
    const fetchMyReviews = async () => {
      reviews.value = await getMySpotReviews()
      return reviews.value
    }

    const clearServerContent = () => {
      reviews.value = []
      reviewReplies.value = []
      discussions.value = []
      notifications.value = []
      unreadNotificationCount.value = 0
    }

    /** 删除评价 */
    const removeReview = async (reviewId: number) => {
      await deleteMySpotReview(reviewId)
      const normalizedReviewId = String(reviewId)
      const idx = reviews.value.findIndex(r => r.id === normalizedReviewId)
      if (idx >= 0)
        reviews.value.splice(idx, 1)
    }

    /** 拉取我的评价回复 */
    const fetchMyReviewReplies = async () => {
      reviewReplies.value = await getMySpotReviewReplies()
      return reviewReplies.value
    }

    /** 删除评价回复 */
    const removeReviewReply = async (replyId: number) => {
      await deleteMySpotReviewReply(replyId)
      const normalizedReplyId = String(replyId)
      const idx = reviewReplies.value.findIndex(item => item.id === normalizedReplyId)
      if (idx >= 0)
        reviewReplies.value.splice(idx, 1)
    }

    /** 添加讨论 */
    const addDiscussion = (discussion: UserDiscussion) => {
      discussions.value = [discussion, ...discussions.value.filter(item => item.id !== discussion.id)]
    }

    /** 拉取我的讨论 */
    const fetchMyDiscussions = async () => {
      discussions.value = await getMySpotDiscussions()
      return discussions.value
    }

    /** 删除讨论 */
    const removeDiscussion = async (discussionId: number) => {
      await deleteMySpotDiscussion(discussionId)
      const normalizedDiscussionId = String(discussionId)
      const idx = discussions.value.findIndex(item => item.id === normalizedDiscussionId)
      if (idx >= 0)
        discussions.value.splice(idx, 1)
    }

    /** 拉取我的互动提醒，并同步未读数量。 */
    const fetchMyNotifications = async () => {
      const result = await getMySpotInteractionNotifications()
      notifications.value = result.items
      unreadNotificationCount.value = result.unreadCount
      return notifications.value
    }

    /** 展开提醒列表时统一标记已读，避免后端和本地未读数不一致。 */
    const markNotificationsRead = async () => {
      if (unreadNotificationCount.value <= 0)
        return

      await markAllSpotInteractionNotificationsRead()
      unreadNotificationCount.value = 0
      notifications.value = notifications.value.map(item => ({
        ...item,
        isRead: true,
      }))
    }

    /** 获取某个地点的用户评价 */
    const getReviewsBySpot = (spotId: number) => {
      return reviews.value.filter(r => r.spotId === spotId)
    }

    /** 获取某个地点的用户讨论 */
    const getDiscussionsBySpot = (spotId: number) => {
      return discussions.value.filter(item => item.spotId === spotId)
    }

    const reviewCount = computed(() => reviews.value.length)
    const reviewReplyCount = computed(() => reviewReplies.value.length)
    const discussionCount = computed(() => discussions.value.length)
    /** 提醒总数用于菜单角标显示。 */
    const notificationCount = computed(() => notifications.value.length)

    return {
      reviews,
      reviewReplies,
      discussions,
      notifications,
      unreadNotificationCount,
      addReview,
      fetchMyReviews,
      clearServerContent,
      removeReview,
      fetchMyReviewReplies,
      removeReviewReply,
      addDiscussion,
      fetchMyDiscussions,
      removeDiscussion,
      fetchMyNotifications,
      markNotificationsRead,
      getReviewsBySpot,
      getDiscussionsBySpot,
      reviewCount,
      reviewReplyCount,
      discussionCount,
      notificationCount,
    }
  },
)
