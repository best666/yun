import { defineStore } from "pinia";
import { computed, ref } from "vue";

export interface FootprintRecord {
  spotId: number;
  time: string; // ISO date string
}

export const useFootprintStore = defineStore(
  "footprint",
  () => {
    const footprints = ref<FootprintRecord[]>([]);

    /** 添加浏览记录（去重，最新在前） */
    const addFootprint = (spotId: number) => {
      const idx = footprints.value.findIndex((f) => f.spotId === spotId);
      if (idx >= 0) {
        footprints.value.splice(idx, 1);
      }
      footprints.value.unshift({
        spotId,
        time: new Date().toISOString(),
      });
    };

    /** 清空浏览记录 */
    const clearFootprints = () => {
      footprints.value = [];
    };

    /** 浏览记录数量 */
    const footprintCount = computed(() => footprints.value.length);

    /** 浏览的地点 id 列表 */
    const footprintIds = computed(() => footprints.value.map((f) => f.spotId));

    return {
      footprints,
      addFootprint,
      clearFootprints,
      footprintCount,
      footprintIds,
    };
  },
  {
    persist: true,
  },
);
