<script lang="ts" setup>
import type { IMapSearchPlaceItem } from '@/api/types/map'
import type { ISearchUserItem } from '@/api/types/search'
import { formatDistance } from '@/utils/formatDistance'

const props = defineProps<{
  visible: boolean
  keyword: string
  searchSpotResults: IMapSearchPlaceItem[]
  searchUserResults: ISearchUserItem[]
  isSearchingPlaces: boolean
  isSearchingUsers: boolean
}>()

const emit = defineEmits<{
  close: []
  keywordChange: [keyword: string]
  confirm: []
  selectSpot: [place: IMapSearchPlaceItem]
  selectUser: [user: ISearchUserItem]
}>()
</script>

<template>
  <view v-if="props.visible" class="search-panel">
    <view class="search-panel-header">
      <view class="search-panel-input-wrap">
        <view class="i-carbon-search text-16px text-gray-400" />
        <input
          class="search-panel-input"
          :value="props.keyword"
          placeholder="搜索地点、地址、用户昵称或手机号"
          focus
          confirm-type="search"
          @input="emit('keywordChange', $event.detail?.value ?? $event.target?.value ?? '')"
          @confirm="emit('confirm')"
        >
      </view>
      <text class="text-14px text-orange-500" @click="emit('close')">取消</text>
    </view>

    <scroll-view scroll-y class="search-results">
      <view v-if="props.keyword" class="search-section">
        <view class="search-section-title">
          地点
          <text class="search-section-count">{{ props.searchSpotResults.length }}</text>
        </view>
        <view v-if="props.isSearchingPlaces" class="search-empty-tip">
          正在搜索地点...
        </view>
        <view
          v-for="item in props.searchSpotResults"
          v-else
          :key="`spot-${item.id}`"
          class="search-result-item"
          @click="emit('selectSpot', item)"
        >
          <view class="search-place-avatar">
            <view class="i-carbon-location-filled text-18px text-orange-500" />
          </view>
          <view class="ml-3 min-w-0 flex-1">
            <view class="truncate text-14px text-gray-800 font-medium">
              {{ item.title }}
            </view>
            <view class="mt-1 flex items-center gap-2 text-12px text-gray-400">
              <text>{{ item.category || '地图地点' }}</text>
              <text v-if="item.distance">{{ formatDistance(item.distance) }}</text>
            </view>
            <view class="mt-0.5 truncate text-12px text-gray-400">
              {{ item.district }}{{ item.address }}
            </view>
          </view>
        </view>
        <view v-if="!props.isSearchingPlaces && props.searchSpotResults.length === 0" class="search-empty-tip">
          未找到相关地点
        </view>
      </view>

      <view v-if="props.keyword" class="search-section">
        <view class="search-section-title">
          用户
          <text class="search-section-count">{{ props.searchUserResults.length }}</text>
        </view>
        <view v-if="props.isSearchingUsers" class="search-empty-tip">
          正在搜索用户...
        </view>
        <view
          v-for="user in props.searchUserResults"
          v-else
          :key="`user-${user.userId}`"
          class="search-result-item"
          @click="emit('selectUser', user)"
        >
          <image :src="user.avatar || '/static/images/default-avatar.png'" class="h-50px w-50px flex-shrink-0 rounded-full" mode="aspectFill" />
          <view class="ml-3 min-w-0 flex-1">
            <view class="flex items-center gap-2">
              <view class="truncate text-14px text-gray-800 font-medium">
                {{ user.nickname }}
              </view>
              <view class="search-user-badge">
                用户
              </view>
            </view>
            <view class="mt-1 truncate text-12px text-gray-500">
              账号：{{ user.username }}
            </view>
            <view class="mt-0.5 truncate text-12px text-gray-400">
              手机号：{{ user.phoneMasked || '未绑定手机号' }}
            </view>
          </view>
        </view>
        <view v-if="!props.isSearchingUsers && props.searchUserResults.length === 0" class="search-empty-tip">
          未找到相关用户
        </view>
      </view>

      <view
        v-if="props.keyword && !props.isSearchingPlaces && !props.isSearchingUsers && props.searchSpotResults.length === 0 && props.searchUserResults.length === 0"
        class="py-10 text-center text-13px text-gray-400"
      >
        未找到相关地点或用户
      </view>
      <view v-if="!props.keyword" class="py-10 text-center text-13px text-gray-300">
        输入关键词搜索地图上的地点或用户
      </view>
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.search-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  z-index: 500;
}

.search-panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: calc(env(safe-area-inset-top) + 10px) 16px 10px;
  border-bottom: 1px solid #f0f0f0;
}

.search-panel-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 8px 14px;
  background: #f5f5f5;
  border-radius: 20px;
}

.search-panel-input {
  flex: 1;
  margin-left: 8px;
  font-size: 14px;
  color: #333;
}

.search-results {
  height: calc(100vh - 120px);
}

.search-section {
  padding: 8px 0 4px;
}

.search-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #8a5a3b;
}

.search-section-count {
  font-size: 12px;
  color: #b0b0b0;
}

.search-result-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f8f8f8;

  &:active {
    background: #f8f8f8;
  }
}

.search-place-avatar {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, #fff1e8 0%, #ffe4d4 100%);
}

.search-empty-tip {
  padding: 8px 16px 14px;
  font-size: 12px;
  color: #b0b0b0;
}

.search-user-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: #fff1e8;
  font-size: 11px;
  color: #ff7b4a;
}
</style>
