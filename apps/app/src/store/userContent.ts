import type { NoteItem, QAItem, ReviewItem } from "./spot";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

/** 用户发布的评价记录 */
export interface UserReview extends ReviewItem {
  spotId: number;
  spotName: string;
}

/** 用户发布的笔记记录 */
export interface UserNote extends NoteItem {
  spotId: number;
  spotName: string;
}

/** 用户发布的问答记录 */
export interface UserQA extends QAItem {
  spotId: number;
  spotName: string;
}

export const useUserContentStore = defineStore(
  "userContent",
  () => {
    const reviews = ref<UserReview[]>([]);
    const notes = ref<UserNote[]>([]);
    const questions = ref<UserQA[]>([]);

    /** 添加评价 */
    const addReview = (review: UserReview) => {
      reviews.value.unshift(review);
    };

    /** 删除评价 */
    const removeReview = (reviewId: number) => {
      const idx = reviews.value.findIndex((r) => r.id === reviewId);
      if (idx >= 0) reviews.value.splice(idx, 1);
    };

    /** 添加笔记 */
    const addNote = (note: UserNote) => {
      notes.value.unshift(note);
    };

    /** 删除笔记 */
    const removeNote = (noteId: number) => {
      const idx = notes.value.findIndex((n) => n.id === noteId);
      if (idx >= 0) notes.value.splice(idx, 1);
    };

    /** 添加提问 */
    const addQuestion = (qa: UserQA) => {
      questions.value.unshift(qa);
    };

    /** 给问答添加回复（支持系统问答和用户问答） */
    const addAnswer = (qaId: number, answer: QAItem["answers"][number]) => {
      const qa = questions.value.find((q) => q.id === qaId);
      if (qa) {
        qa.answers.push(answer);
      }
    };

    /** 获取某个地点的用户评价 */
    const getReviewsBySpot = (spotId: number) => {
      return reviews.value.filter((r) => r.spotId === spotId);
    };

    /** 获取某个地点的用户笔记 */
    const getNotesBySpot = (spotId: number) => {
      return notes.value.filter((n) => n.spotId === spotId);
    };

    /** 获取某个地点的用户问答 */
    const getQuestionsBySpot = (spotId: number) => {
      return questions.value.filter((q) => q.spotId === spotId);
    };

    const reviewCount = computed(() => reviews.value.length);
    const noteCount = computed(() => notes.value.length);
    const questionCount = computed(() => questions.value.length);

    return {
      reviews,
      notes,
      questions,
      addReview,
      removeReview,
      addNote,
      removeNote,
      addQuestion,
      addAnswer,
      getReviewsBySpot,
      getNotesBySpot,
      getQuestionsBySpot,
      reviewCount,
      noteCount,
      questionCount,
    };
  },
  {
    persist: true,
  },
);
