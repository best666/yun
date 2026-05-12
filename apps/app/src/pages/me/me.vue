<script lang="ts" setup>
import type { FavoriteSpotSummary, ISpotInteractionNotificationItem } from '@/api/types/spot'
import MeDiscussionItem from '@/components/me/MeDiscussionItem.vue'
import MeMenuPanel from '@/components/me/MeMenuPanel.vue'
import MeProfileDialog from '@/components/me/MeProfileDialog.vue'
import MeProfileHeader from '@/components/me/MeProfileHeader.vue'
import MeReviewItem from '@/components/me/MeReviewItem.vue'
import MeReviewReplyItem from '@/components/me/MeReviewReplyItem.vue'
import MeSectionCard from '@/components/me/MeSectionCard.vue'
import MeSettingsPanel from '@/components/me/MeSettingsPanel.vue'
import MeSpotSummaryItem from '@/components/me/MeSpotSummaryItem.vue'
import { useFavoriteStore, useFootprintStore, useMapSettingStore, useTokenStore, useUserContentStore, useUserStore } from '@/store'
import { buildSpotDetailUrlFromFavorite } from '@/utils/spotDetail'
import { fetchAndCacheSpotDetail } from '@/utils/spotDetailCache'
import { toLoginPage } from '@/utils/toLoginPage'

interface FootprintSpotSummary extends FavoriteSpotSummary {
  viewedAt: string
}

interface NotificationGroupItem {
  key: string
  title: string
  icon: string
  items: ISpotInteractionNotificationItem[]
}

type NavigationMapApp = 'ask' | 'system' | 'tencent' | 'amap'
type ExpandableAction = 'favorites' | 'footprint' | 'reviews' | 'review-replies' | 'discussions' | 'notifications'
type MenuAction = ExpandableAction | 'settings'

const GUEST_USER_INFO = {
  nickname: '美食探索者',
  avatar: 'https://placehold.co/120/ff6633/white?text=Me',
  desc: '吃遍天下美食',
}
const EXPANDABLE_ACTIONS: ExpandableAction[] = ['favorites', 'footprint', 'reviews', 'review-replies', 'discussions', 'notifications']
const NOTIFICATION_GROUP_META_MAP: Record<string, { title: string, icon: string }> = {
  discussion_like: { title: '点赞我的讨论', icon: 'i-carbon-thumbs-up' },
  review_like: { title: '点赞我的评价', icon: 'i-carbon-thumbs-up-filled' },
  review_reply: { title: '回复我的评价', icon: 'i-carbon-chat' },
  question_answer: { title: '回复我的讨论', icon: 'i-carbon-chat' },
  favorite_spot_new_review: { title: '收藏地新评价', icon: 'i-carbon-star' },
  favorite_spot_new_discussion: { title: '收藏地新讨论', icon: 'i-carbon-chat-bot' },
  favorite_spot_new_question: { title: '收藏地新讨论', icon: 'i-carbon-chat-bot' },
}
const NAVIGATION_MAP_OPTIONS = [
  { label: '每次选择', value: 'ask' },
  { label: '系统地图', value: 'system' },
  { label: '腾讯地图', value: 'tencent' },
  { label: '高德地图', value: 'amap' },
] as const

definePage({
  style: {
    'navigationStyle': 'custom',
    'navigationBarTitleText': '我的',
    'mp-alipay': {
      defaultTitle: '我的',
      titleBarColor: '#ffffff',
    },
  },
})

const favoriteStore = useFavoriteStore()
const footprintStore = useFootprintStore()
const userContentStore = useUserContentStore()
const tokenStore = useTokenStore()
const authUserStore = useUserStore()
const mapSettingStore = useMapSettingStore()

const footprintSpots = ref<FootprintSpotSummary[]>([])
const isLoadingFootprints = ref(false)
const showEditProfile = ref(false)
const showSettings = ref(false)
const expandedAction = ref<ExpandableAction | ''>('')
const editForm = reactive({
  nickname: '',
  desc: '',
})

const hasLogin = computed(() => tokenStore.updateNowTime().hasLogin)
const displayUserInfo = computed(() => {
  if (!hasLogin.value) {
    return GUEST_USER_INFO
  }

  const phone = authUserStore.userInfo.phone
  const desc = phone ? `已绑定手机号 ${phone.slice(0, 3)}****${phone.slice(-4)}` : '登录后可同步收藏与足迹'

  return {
    nickname: authUserStore.userInfo.nickname || authUserStore.userInfo.username || GUEST_USER_INFO.nickname,
    avatar: authUserStore.userInfo.avatar || GUEST_USER_INFO.avatar,
    desc,
  }
})

const favoriteSpots = computed(() => favoriteStore.favoriteSummaries)
const stats = computed(() => [
  { label: '收藏', value: favoriteStore.favoriteCount },
  { label: '评价', value: userContentStore.reviewCount },
  { label: '回复', value: userContentStore.reviewReplyCount },
  { label: '讨论', value: userContentStore.discussionCount },
  { label: '足迹', value: footprintStore.footprintCount },
])

const menuItems = computed(() => [
  { icon: 'i-carbon-favorite', label: '我的收藏', action: 'favorites' as const, count: favoriteStore.favoriteCount, expanded: isExpandedSection('favorites') },
  { icon: 'i-carbon-star', label: '我的评价', action: 'reviews' as const, count: userContentStore.reviewCount, expanded: isExpandedSection('reviews') },
  { icon: 'i-carbon-chat', label: '我的回复', action: 'review-replies' as const, count: userContentStore.reviewReplyCount, expanded: isExpandedSection('review-replies') },
  { icon: 'i-carbon-chat', label: '我的讨论', action: 'discussions' as const, count: userContentStore.discussionCount, expanded: isExpandedSection('discussions') },
  { icon: 'i-carbon-notification', label: '互动提醒', action: 'notifications' as const, count: userContentStore.unreadNotificationCount, expanded: isExpandedSection('notifications') },
  { icon: 'i-carbon-location', label: '浏览足迹', action: 'footprint' as const, count: footprintStore.footprintCount, expanded: isExpandedSection('footprint') },
  { icon: 'i-carbon-settings', label: '设置', action: 'settings' as const, expanded: false },
])

const groupedNotifications = computed<NotificationGroupItem[]>(() => {
  const groupedMap = new Map<string, NotificationGroupItem>()

  userContentStore.notifications.forEach((notification) => {
    const meta = NOTIFICATION_GROUP_META_MAP[notification.type] || {
      title: '其他提醒',
      icon: 'i-carbon-notification',
    }

    if (!groupedMap.has(notification.type)) {
      groupedMap.set(notification.type, {
        key: notification.type,
        title: meta.title,
        icon: meta.icon,
        items: [],
      })
    }

    groupedMap.get(notification.type)!.items.push(notification)
  })

  return Array.from(groupedMap.values())
})

onShow(async () => {
  await syncMePageData()
})

async function syncUserContent() {
  if (!hasLogin.value) {
    userContentStore.clearServerContent()
    return
  }

  try {
    await favoriteStore.ensureServerFavoritesLoaded(true)
    await Promise.all([
      userContentStore.fetchMyReviews(),
      userContentStore.fetchMyReviewReplies(),
      userContentStore.fetchMyDiscussions(),
      userContentStore.fetchMyNotifications(),
    ])
  }
  catch (error) {
    console.error('同步个人内容失败', error)
  }
}

async function syncMePageData() {
  await syncFootprintSpots()

  if (hasLogin.value && authUserStore.userInfo.userId < 0) {
    await authUserStore.fetchUserInfo()
  }

  await syncUserContent()
}

function confirmThenRun(content: string, action: () => void | Promise<void>) {
  uni.showModal({
    title: '提示',
    content,
    async success(res) {
      if (!res.confirm) {
        return
      }

      await action()
    },
  })
}

function openEditProfile() {
  if (!hasLogin.value) {
    toLoginPage()
    return
  }

  editForm.nickname = displayUserInfo.value.nickname
  editForm.desc = displayUserInfo.value.desc
  showEditProfile.value = true
}

function saveProfile() {
  if (!editForm.nickname.trim()) {
    uni.showToast({ title: '昵称不能为空', icon: 'none' })
    return
  }

  authUserStore.setUserInfo({
    ...authUserStore.userInfo,
    nickname: editForm.nickname.trim(),
  })
  showEditProfile.value = false
  uni.showToast({ title: '修改成功', icon: 'success' })
}

function handleLoginOrProfile() {
  if (!hasLogin.value) {
    toLoginPage()
    return
  }

  openEditProfile()
}

async function syncFootprintSpots() {
  const footprintRecords = [...footprintStore.footprints]

  if (footprintRecords.length === 0) {
    footprintSpots.value = []
    return
  }

  isLoadingFootprints.value = true

  try {
    const detailTaskMap = new Map<number, Promise<FootprintSpotSummary | null>>()

    const spotSummaries = await Promise.all(
      footprintRecords.map(async (record) => {
        if (!detailTaskMap.has(record.spotId)) {
          detailTaskMap.set(record.spotId, fetchAndCacheSpotDetail({ id: String(record.spotId) })
            .then(detail => ({
              id: detail.id,
              name: detail.name,
              cover: detail.cover,
              address: detail.address,
              rating: detail.rating,
              avgPrice: detail.avgPrice,
              latitude: detail.latitude,
              longitude: detail.longitude,
              viewedAt: '',
            } satisfies FootprintSpotSummary))
            .catch((error) => {
              console.error(`加载足迹地点失败: ${record.spotId}`, error)
              return null
            }))
        }

        const summary = await detailTaskMap.get(record.spotId)
        if (!summary) {
          return null
        }

        return {
          ...summary,
          viewedAt: record.time,
        } satisfies FootprintSpotSummary
      }),
    )

    footprintSpots.value = spotSummaries.filter(Boolean) as FootprintSpotSummary[]
  }
  finally {
    isLoadingFootprints.value = false
  }
}

function formatDateTime(value: string) {
  if (!value) {
    return '--'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '--'
  }

  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function onMenuTap(action: MenuAction) {
  if (isExpandableAction(action)) {
    toggleExpandedSection(action)
    return
  }

  if (action === 'settings') {
    showSettings.value = true
  }
}

function isExpandableAction(action: MenuAction): action is ExpandableAction {
  return EXPANDABLE_ACTIONS.includes(action as ExpandableAction)
}

function isExpandedSection(action: ExpandableAction) {
  return expandedAction.value === action
}

function toggleExpandedSection(action: ExpandableAction) {
  const nextAction = isExpandedSection(action) ? '' : action
  expandedAction.value = nextAction

  if (nextAction === 'footprint') {
    void syncFootprintSpots()
  }

  if (nextAction === 'notifications') {
    void userContentStore.markNotificationsRead()
  }
}
function removeReviewReply(replyId: string) {
  confirmThenRun('确定要删除这条回复吗？', async () => {
    try {
      await userContentStore.removeReviewReply(Number(replyId))
      uni.showToast({ title: '已删除', icon: 'none' })
    }
    catch (error) {
      console.error('删除评价回复失败', error)
    }
  })
}

function goNotificationTarget(notification: ISpotInteractionNotificationItem) {
  if (!notification.spotId) {
    return
  }

  const queryList = [`id=${notification.spotId}`]

  if (notification.targetType === 'review' || notification.targetType === 'review_reply' || notification.type === 'review_like') {
    queryList.push('tab=reviews')

    if (notification.targetId) {
      queryList.push(`reviewId=${notification.targetId}`)
    }
  }

  uni.navigateTo({
    url: `/pages/spot/detail?${queryList.join('&')}`,
  })
}

function goSpotDetail(spot: number | FavoriteSpotSummary) {
  if (typeof spot === 'number') {
    uni.navigateTo({ url: `/pages/spot/detail?id=${spot}` })
    return
  }

  uni.navigateTo({ url: buildSpotDetailUrlFromFavorite(spot) })
}

async function removeFavorite(spot: FavoriteSpotSummary) {
  try {
    const result = await favoriteStore.toggleFavorite(spot)
    uni.showToast({ title: result.favorited ? '已收藏' : '已取消收藏', icon: 'none' })
  }
  catch (error) {
    console.error('取消收藏失败', error)
  }
}

function removeReview(reviewId: string) {
  confirmThenRun('确定要删除这条评价吗？', async () => {
    try {
      await userContentStore.removeReview(Number(reviewId))
      uni.showToast({ title: '已删除', icon: 'none' })
    }
    catch (error) {
      console.error('删除评价失败', error)
    }
  })
}

function removeDiscussion(discussionId: string) {
  confirmThenRun('确定要删除这条讨论吗？', async () => {
    try {
      await userContentStore.removeDiscussion(Number(discussionId))
      uni.showToast({ title: '已删除', icon: 'none' })
    }
    catch (error) {
      console.error('删除讨论失败', error)
    }
  })
}

function clearCache() {
  confirmThenRun('确定要清除缓存吗？', () => {
    try {
      uni.clearStorageSync()
      uni.showToast({ title: '缓存已清除', icon: 'success' })
    }
    catch {
      uni.showToast({ title: '清除失败', icon: 'none' })
    }
  })
}

function clearFootprints() {
  confirmThenRun('确定要清空浏览足迹吗？', () => {
    footprintStore.clearFootprints()
    footprintSpots.value = []
    uni.showToast({ title: '足迹已清空', icon: 'success' })
  })
}

function showAbout() {
  uni.navigateTo({ url: '/pages/about/about' })
}

async function handleLogout() {
  await tokenStore.logout()
  showSettings.value = false
  uni.showToast({ title: '已退出登录', icon: 'success' })
}

function setNavigationMapApp(mapApp: NavigationMapApp) {
  if (mapSettingStore.navigationMapApp === mapApp) {
    return
  }

  mapSettingStore.setNavigationMapApp(mapApp)
  uni.showToast({
    title: `导航默认已切换为${mapSettingStore.navigationMapAppLabel}`,
    icon: 'none',
  })
}
</script>

<template>
  <view class="min-h-screen bg-#f5f5f5 pb-[calc(60px+env(safe-area-inset-bottom))]">
    <MeProfileHeader
      :user-info="displayUserInfo"
      :has-login="hasLogin"
      :stats="stats"
      @edit-profile="handleLoginOrProfile"
      @login="toLoginPage()"
    />

    <MeMenuPanel :items="menuItems" @select="onMenuTap" />

    <MeSectionCard v-if="isExpandedSection('favorites')">
      <view v-if="favoriteSpots.length === 0" class="py-8 text-center text-13px text-gray-400">
        还没有收藏任何地点
      </view>
      <MeSpotSummaryItem
        v-for="spot in favoriteSpots"
        :key="spot.id"
        :spot="spot"
        removable
        @select="goSpotDetail"
        @remove="removeFavorite"
      />
    </MeSectionCard>

    <MeSectionCard v-if="isExpandedSection('footprint')">
      <view v-if="isLoadingFootprints" class="py-8 text-center text-13px text-gray-400">
        正在加载浏览记录...
      </view>
      <view v-else-if="footprintSpots.length === 0" class="py-8 text-center text-13px text-gray-400">
        还没有浏览记录
      </view>
      <MeSpotSummaryItem
        v-for="spot in footprintSpots"
        v-else
        :key="`${spot.id}-${spot.viewedAt}`"
        :spot="spot"
        :timestamp-label="`浏览于 ${formatDateTime(spot.viewedAt)}`"
        @select="goSpotDetail"
      />
    </MeSectionCard>

    <MeSectionCard v-if="isExpandedSection('reviews')">
      <view v-if="userContentStore.reviews.length === 0" class="py-8 text-center text-13px text-gray-400">
        还没有发布评价，去地点详情页写一篇吧
      </view>
      <MeReviewItem
        v-for="review in userContentStore.reviews"
        :key="review.id"
        :review="review"
        @open-spot="goSpotDetail"
        @remove="removeReview"
      />
    </MeSectionCard>

    <MeSectionCard v-if="isExpandedSection('review-replies')">
      <view v-if="userContentStore.reviewReplies.length === 0" class="py-8 text-center text-13px text-gray-400">
        还没有发布评价回复，去评价区参与讨论吧
      </view>
      <MeReviewReplyItem
        v-for="reply in userContentStore.reviewReplies"
        :key="reply.id"
        :reply="reply"
        @open-spot="goSpotDetail"
        @remove="removeReviewReply"
      />
    </MeSectionCard>

    <MeSectionCard v-if="isExpandedSection('discussions')">
      <view v-if="userContentStore.discussions.length === 0" class="py-8 text-center text-13px text-gray-400">
        还没有发布讨论，去地点详情页分享路线和体验吧
      </view>
      <MeDiscussionItem
        v-for="discussion in userContentStore.discussions"
        :key="discussion.id"
        :discussion="discussion"
        @open-spot="goSpotDetail"
        @remove="removeDiscussion"
      />
    </MeSectionCard>

    <MeSectionCard v-if="isExpandedSection('notifications')">
      <view v-if="userContentStore.notifications.length === 0" class="py-8 text-center text-13px text-gray-400">
        暂时没有新的互动提醒
      </view>
      <view v-for="(group, index) in groupedNotifications" :key="group.key" :class="index === 0 ? '' : 'mt-8px'">
        <view class="flex items-center justify-between py-[10px_0_4px]">
          <view class="flex items-center gap-2">
            <view :class="group.icon" class="text-14px text-orange-500" />
            <text class="text-13px text-gray-700 font-600">{{ group.title }}</text>
          </view>
          <text class="text-11px text-gray-400">{{ group.items.length }} 条</text>
        </view>
        <view v-for="notification in group.items" :key="notification.id" class="border-b border-#f8f8f8 py-12px last:border-b-0" @click="goNotificationTarget(notification)">
          <view class="flex items-start justify-between gap-3">
            <view class="min-w-0 flex flex-1 items-start gap-3">
              <image :src="notification.actorAvatar" class="h-42px w-42px flex-shrink-0 rounded-full" mode="aspectFill" />
              <view class="min-w-0 flex-1">
                <view class="flex items-center gap-2">
                  <view class="truncate text-14px text-gray-800 font-medium">
                    {{ notification.title }}
                  </view>
                  <view v-if="!notification.isRead" class="h-8px w-8px flex-shrink-0 rounded-full bg-red-500" />
                </view>
                <view class="mt-1 text-12px text-gray-500 leading-relaxed">
                  {{ notification.actorName }} {{ notification.content }}
                </view>
                <view v-if="notification.spotName" class="mt-2 inline-flex rounded-999px bg-orange-50 px-2 py-1 text-11px text-orange-500">
                  {{ notification.spotName }}
                </view>
              </view>
            </view>
            <text class="flex-shrink-0 text-11px text-gray-400">{{ notification.time }}</text>
          </view>
        </view>
      </view>
    </MeSectionCard>

    <MeProfileDialog
      :visible="showEditProfile"
      :nickname="editForm.nickname"
      :desc="editForm.desc"
      @close="showEditProfile = false"
      @save="saveProfile"
      @nickname-change="editForm.nickname = $event"
      @desc-change="editForm.desc = $event"
    />

    <MeSettingsPanel
      :visible="showSettings"
      :has-login="hasLogin"
      :selected-map-app="mapSettingStore.navigationMapApp"
      :selected-map-app-label="mapSettingStore.navigationMapAppLabel"
      :navigation-map-options="NAVIGATION_MAP_OPTIONS"
      @close="showSettings = false"
      @clear-footprints="clearFootprints"
      @clear-cache="clearCache"
      @select-map-app="setNavigationMapApp"
      @show-about="showAbout"
      @logout="handleLogout"
    />
  </view>
</template>
