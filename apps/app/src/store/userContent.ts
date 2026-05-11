import type { IMyLikedSpotNoteItem, IMySpotDiscussionItem, IMySpotNoteItem, IMySpotQuestionItem, IMySpotReviewItem, ISpotInteractionNotificationItem, ISpotQuestionAnswerItem } from '@/api/types/spot'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { deleteMySpotDiscussion, deleteMySpotNote, deleteMySpotReview, getMyLikedSpotNotes, getMySpotDiscussions, getMySpotInteractionNotifications, getMySpotNotes, getMySpotQuestions, getMySpotReviews, markAllSpotInteractionNotificationsRead } from '@/api/spot'

/** 用户发布的评价记录 */
export interface UserReview extends IMySpotReviewItem {
}

/** 用户发布的讨论记录 */
export interface UserDiscussion extends IMySpotDiscussionItem {
}

/** 用户发布的笔记记录 */
export interface UserNote extends IMySpotNoteItem {
}

/** 用户点赞过的笔记记录 */
export interface UserLikedNote extends IMyLikedSpotNoteItem {
}

/** 用户发布的问答记录 */
export interface UserQA extends IMySpotQuestionItem {
}

/** 用户收到的互动提醒 */
export interface UserInteractionNotification extends ISpotInteractionNotificationItem {
}

export const useUserContentStore = defineStore(
  'userContent',
  () => {
    const reviews = ref<UserReview[]>([])
    const discussions = ref<UserDiscussion[]>([])
    const notes = ref<UserNote[]>([])
    /** 用户点赞过的笔记列表 */
    const likedNotes = ref<UserLikedNote[]>([])
    /** 用户发起的问题列表 */
    const questions = ref<UserQA[]>([])
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
      discussions.value = []
      notes.value = []
      likedNotes.value = []
      questions.value = []
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

    /** 添加笔记 */
    const addNote = (note: UserNote) => {
      notes.value = [note, ...notes.value.filter(item => item.id !== note.id)]
    }

    /** 拉取我的笔记 */
    const fetchMyNotes = async () => {
      notes.value = await getMySpotNotes()
      return notes.value
    }

    /** 拉取我点赞过的笔记 */
    const fetchMyLikedNotes = async () => {
      likedNotes.value = await getMyLikedSpotNotes()
      return likedNotes.value
    }

    /** 删除笔记 */
    const removeNote = async (noteId: number) => {
      await deleteMySpotNote(noteId)
      const normalizedNoteId = String(noteId)
      const idx = notes.value.findIndex(n => n.id === normalizedNoteId)
      if (idx >= 0)
        notes.value.splice(idx, 1)
    }

    /** 添加提问 */
    const addQuestion = (qa: UserQA) => {
      questions.value = [qa, ...questions.value.filter(item => item.id !== qa.id)]
    }

    /** 拉取我的问答 */
    const fetchMyQuestions = async () => {
      questions.value = await getMySpotQuestions()
      return questions.value
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

    /** 给问答添加回复，保证“我的问答”列表保持最新状态 */
    const addAnswer = (qaId: string, answer: ISpotQuestionAnswerItem) => {
      const qa = questions.value.find(item => item.id === qaId)
      if (!qa)
        return

      qa.answers = [...qa.answers, answer]
    }

    /** 获取某个地点的用户评价 */
    const getReviewsBySpot = (spotId: number) => {
      return reviews.value.filter(r => r.spotId === spotId)
    }

    /** 获取某个地点的用户讨论 */
    const getDiscussionsBySpot = (spotId: number) => {
      return discussions.value.filter(item => item.spotId === spotId)
    }

    /** 获取某个地点的用户笔记 */
    const getNotesBySpot = (spotId: number) => {
      return notes.value.filter(n => n.spotId === spotId)
    }

    /** 获取某个地点的用户问答 */
    const getQuestionsBySpot = (spotId: number) => {
      return questions.value.filter(q => q.spotId === spotId)
    }

    const reviewCount = computed(() => reviews.value.length)
    const discussionCount = computed(() => discussions.value.length)
    const noteCount = computed(() => notes.value.length)
    const questionCount = computed(() => questions.value.length)
    /** 点赞记录数量 */
    const likedNoteCount = computed(() => likedNotes.value.length)
    /** 提醒总数用于菜单角标显示。 */
    const notificationCount = computed(() => notifications.value.length)

    return {
      reviews,
      discussions,
      notes,
      likedNotes,
      questions,
      notifications,
      unreadNotificationCount,
      addReview,
      fetchMyReviews,
      clearServerContent,
      removeReview,
      addDiscussion,
      fetchMyDiscussions,
      removeDiscussion,
      addNote,
      fetchMyNotes,
      fetchMyLikedNotes,
      removeNote,
      addQuestion,
      fetchMyQuestions,
      fetchMyNotifications,
      markNotificationsRead,
      addAnswer,
      getReviewsBySpot,
      getDiscussionsBySpot,
      getNotesBySpot,
      getQuestionsBySpot,
      reviewCount,
      discussionCount,
      noteCount,
      questionCount,
      likedNoteCount,
      notificationCount,
    }
  },
  {
    persist: true,
  },
)
