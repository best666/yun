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
  <view v-if="props.visible" class="fixed inset-0 z-500 bg-white">
    <view class="flex items-center gap-12px border-b border-#f0f0f0 px-16px pb-10px pt-[calc(env(safe-area-inset-top)+10px)]">
      <view class="flex flex-1 items-center rounded-20px bg-#f5f5f5 px-14px py-8px">
        <view class="i-carbon-search text-16px text-gray-400" />
        <input
          class="ml-8px flex-1 text-14px text-#333"
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

    <scroll-view scroll-y class="h-[calc(100vh-120px)]">
      <view v-if="props.keyword" class="home-search-section">
        <view class="home-search-section-title">
          地点
          <text class="home-search-section-count">{{ props.searchSpotResults.length }}</text>
        </view>
        <view v-if="props.isSearchingPlaces" class="home-search-empty-tip">
          正在搜索地点...
        </view>
        <view
          v-for="item in props.searchSpotResults"
          v-else
          :key="`spot-${item.id}`"
          class="home-search-result-item"
          @click="emit('selectSpot', item)"
        >
          <view class="h-50px w-50px center flex-shrink-0 rounded-full bg-[linear-gradient(135deg,#fff1e8_0%,#ffe4d4_100%)]">
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
        <view v-if="!props.isSearchingPlaces && props.searchSpotResults.length === 0" class="home-search-empty-tip">
          未找到相关地点
        </view>
      </view>

      <view v-if="props.keyword" class="home-search-section">
        <view class="home-search-section-title">
          用户
          <text class="home-search-section-count">{{ props.searchUserResults.length }}</text>
        </view>
        <view v-if="props.isSearchingUsers" class="home-search-empty-tip">
          正在搜索用户...
        </view>
        <view
          v-for="user in props.searchUserResults"
          v-else
          :key="`user-${user.userId}`"
          class="home-search-result-item"
          @click="emit('selectUser', user)"
        >
          <image :src="user.avatar || '/static/images/default-avatar.png'" class="h-50px w-50px flex-shrink-0 rounded-full" mode="aspectFill" />
          <view class="ml-3 min-w-0 flex-1">
            <view class="flex items-center gap-2">
              <view class="truncate text-14px text-gray-800 font-medium">
                {{ user.nickname }}
              </view>
              <view class="rounded-full bg-#fff1e8 px-8px py-2px text-11px text-#ff7b4a">
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
        <view v-if="!props.isSearchingUsers && props.searchUserResults.length === 0" class="home-search-empty-tip">
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
