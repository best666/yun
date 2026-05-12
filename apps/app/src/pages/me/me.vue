<script lang="ts" setup>
import type { FavoriteSpotSummary, ISpotInteractionNotificationItem } from '@/api/types/spot'
import { getSpotDetail } from '@/api/spot'
import MeDiscussionItem from '@/components/me/MeDiscussionItem.vue'
import MeReviewItem from '@/components/me/MeReviewItem.vue'
import MeReviewReplyItem from '@/components/me/MeReviewReplyItem.vue'
import MeSpotSummaryItem from '@/components/me/MeSpotSummaryItem.vue'
import { useFavoriteStore, useFootprintStore, useMapSettingStore, useTokenStore, useUserContentStore, useUserStore } from '@/store'
import { buildSpotDetailUrlFromFavorite } from '@/utils/spotDetail'
import { toLoginPage } from '@/utils/toLoginPage'

interface FootprintSpotSummary extends FavoriteSpotSummary {
  viewedAt: string
}

interface MenuItem {
  icon: string
  label: string
  action: string
  count?: () => number
}

interface NotificationGroupItem {
  key: string
  title: string
  icon: string
  items: ISpotInteractionNotificationItem[]
}

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
const expandedAction = ref('')
const editForm = reactive({
  nickname: '',
  desc: '',
})

const guestUserInfo = reactive({
  nickname: '美食探索者',
  avatar: 'https://placehold.co/120/ff6633/white?text=Me',
  desc: '吃遍天下美食',
})

const hasLogin = computed(() => tokenStore.updateNowTime().hasLogin)
const displayUserInfo = computed(() => {
  if (!hasLogin.value) {
    return guestUserInfo
  }

  const phone = authUserStore.userInfo.phone
  const desc = phone ? `已绑定手机号 ${phone.slice(0, 3)}****${phone.slice(-4)}` : '登录后可同步收藏与足迹'

  return {
    nickname: authUserStore.userInfo.nickname || authUserStore.userInfo.username || guestUserInfo.nickname,
    avatar: authUserStore.userInfo.avatar || guestUserInfo.avatar,
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

const menuList: MenuItem[] = [
  { icon: 'i-carbon-favorite', label: '我的收藏', action: 'favorites', count: () => favoriteStore.favoriteCount },
  { icon: 'i-carbon-star', label: '我的评价', action: 'reviews', count: () => userContentStore.reviewCount },
  { icon: 'i-carbon-chat', label: '我的回复', action: 'review-replies', count: () => userContentStore.reviewReplyCount },
  { icon: 'i-carbon-chat', label: '我的讨论', action: 'discussions', count: () => userContentStore.discussionCount },
  { icon: 'i-carbon-notification', label: '互动提醒', action: 'notifications', count: () => userContentStore.unreadNotificationCount },
  { icon: 'i-carbon-location', label: '浏览足迹', action: 'footprint', count: () => footprintStore.footprintCount },
  { icon: 'i-carbon-settings', label: '设置', action: 'settings' },
]

const notificationGroupMetaMap: Record<string, { title: string, icon: string }> = {
  discussion_like: { title: '点赞我的讨论', icon: 'i-carbon-thumbs-up' },
  review_like: { title: '点赞我的评价', icon: 'i-carbon-thumbs-up-filled' },
  review_reply: { title: '回复我的评价', icon: 'i-carbon-chat' },
  question_answer: { title: '回复我的讨论', icon: 'i-carbon-chat' },
  favorite_spot_new_review: { title: '收藏地新评价', icon: 'i-carbon-star' },
  favorite_spot_new_discussion: { title: '收藏地新讨论', icon: 'i-carbon-chat-bot' },
  favorite_spot_new_question: { title: '收藏地新讨论', icon: 'i-carbon-chat-bot' },
}

const groupedNotifications = computed<NotificationGroupItem[]>(() => {
  const groupedMap = new Map<string, NotificationGroupItem>()

  userContentStore.notifications.forEach((notification) => {
    const meta = notificationGroupMetaMap[notification.type] || {
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

const navigationMapOptions = [
  { label: '每次选择', value: 'ask' },
  { label: '系统地图', value: 'system' },
  { label: '腾讯地图', value: 'tencent' },
  { label: '高德地图', value: 'amap' },
] as const

onShow(async () => {
  await syncFootprintSpots()

  if (hasLogin.value && authUserStore.userInfo.userId < 0) {
    await authUserStore.fetchUserInfo()
  }

  if (hasLogin.value) {
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
  else {
    userContentStore.clearServerContent()
  }
})

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
    const spotSummaries = await Promise.all(
      footprintRecords.map(async (record) => {
        try {
          const detail = await getSpotDetail({ id: String(record.spotId) })

          return {
            id: detail.id,
            name: detail.name,
            cover: detail.cover,
            address: detail.address,
            rating: detail.rating,
            avgPrice: detail.avgPrice,
            latitude: detail.latitude,
            longitude: detail.longitude,
            viewedAt: record.time,
          } satisfies FootprintSpotSummary
        }
        catch (error) {
          console.error(`加载足迹地点失败: ${record.spotId}`, error)
          return null
        }
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

function onMenuTap(item: MenuItem) {
  if (['favorites', 'footprint', 'reviews', 'review-replies', 'discussions', 'notifications'].includes(item.action)) {
    expandedAction.value = expandedAction.value === item.action ? '' : item.action

    if (item.action === 'footprint' && expandedAction.value === 'footprint') {
      void syncFootprintSpots()
    }

    if (item.action === 'notifications' && expandedAction.value === 'notifications') {
      void userContentStore.markNotificationsRead()
    }

    return
  }

  if (item.action === 'settings') {
    showSettings.value = true
  }
}

function removeReviewReply(replyId: string) {
  uni.showModal({
    title: '提示',
    content: '确定要删除这条回复吗？',
    async success(res) {
      if (!res.confirm) {
        return
      }

      try {
        await userContentStore.removeReviewReply(Number(replyId))
        uni.showToast({ title: '已删除', icon: 'none' })
      }
      catch (error) {
        console.error('删除评价回复失败', error)
      }
    },
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
  uni.showModal({
    title: '提示',
    content: '确定要删除这条评价吗？',
    async success(res) {
      if (!res.confirm) {
        return
      }

      try {
        await userContentStore.removeReview(Number(reviewId))
        uni.showToast({ title: '已删除', icon: 'none' })
      }
      catch (error) {
        console.error('删除评价失败', error)
      }
    },
  })
}

function removeDiscussion(discussionId: string) {
  uni.showModal({
    title: '提示',
    content: '确定要删除这条讨论吗？',
    async success(res) {
      if (!res.confirm) {
        return
      }

      try {
        await userContentStore.removeDiscussion(Number(discussionId))
        uni.showToast({ title: '已删除', icon: 'none' })
      }
      catch (error) {
        console.error('删除讨论失败', error)
      }
    },
  })
}

function clearCache() {
  uni.showModal({
    title: '提示',
    content: '确定要清除缓存吗？',
    success(res) {
      if (!res.confirm) {
        return
      }

      try {
        uni.clearStorageSync()
        uni.showToast({ title: '缓存已清除', icon: 'success' })
      }
      catch {
        uni.showToast({ title: '清除失败', icon: 'none' })
      }
    },
  })
}

function clearFootprints() {
  uni.showModal({
    title: '提示',
    content: '确定要清空浏览足迹吗？',
    success(res) {
      if (!res.confirm) {
        return
      }

      footprintStore.clearFootprints()
      footprintSpots.value = []
      uni.showToast({ title: '足迹已清空', icon: 'success' })
    },
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

function setNavigationMapApp(mapApp: 'ask' | 'system' | 'tencent' | 'amap') {
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
    <!-- 头部用户信息 -->
    <view class="relative">
      <view class="h-200px bg-[linear-gradient(135deg,#ff6633_0%,#ff8c42_100%)] pt-safe" />
      <view class="relative z-10 mt--120px flex items-center gap-14px px-20px">
        <image :src="displayUserInfo.avatar" class="me-avatar h-68px w-68px" mode="aspectFill" />
        <view class="flex-1" @click="handleLoginOrProfile">
          <view class="flex items-center gap-2">
            <view class="text-18px text-white font-bold">
              {{ displayUserInfo.nickname }}
            </view>
            <view class="i-carbon-edit text-14px text-white text-opacity-70" />
          </view>
          <view class="mt-1 text-13px text-white text-opacity-80">
            {{ displayUserInfo.desc }}
          </view>
        </view>
        <view v-if="!hasLogin" class="me-login-pill" @click="toLoginPage()">
          去登录
        </view>
      </view>

      <!-- 统计 -->
      <view class="relative z-10 mx-12px mt-16px flex rounded-12px bg-white py-16px shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <view v-for="stat in stats" :key="stat.label" class="flex-1 text-center">
          <view class="text-20px text-gray-800 font-bold">
            {{ stat.value }}
          </view>
          <view class="mt-1 text-12px text-gray-500">
            {{ stat.label }}
          </view>
        </view>
      </view>
    </view>

    <!-- 菜单列表 -->
    <view class="mx-12px mt-12px rounded-12px bg-white px-16px shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <view
        v-for="(item, index) in menuList"
        :key="item.label"
        class="flex items-center justify-between border-b border-#f5f5f5 py-16px active:opacity-70"
        :class="{ 'border-b-0': index === menuList.length - 1 }"
        @click="onMenuTap(item)"
      >
        <view class="flex items-center gap-3">
          <view :class="item.icon" class="text-20px text-orange-500" />
          <text class="text-15px text-gray-700">{{ item.label }}</text>
          <text v-if="item.count && item.count() > 0" class="text-12px text-gray-400">
            ({{ item.count() }})
          </text>
        </view>
        <view
          class="text-16px text-gray-300"
          :class="expandedAction === item.action ? 'i-carbon-chevron-down' : 'i-carbon-chevron-right'"
        />
      </view>
    </view>

    <!-- 收藏列表展开 -->
    <view v-if="expandedAction === 'favorites'" class="mx-12px mb-12px rounded-12px bg-white px-16px py-8px shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
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
    </view>

    <!-- 足迹列表展开 -->
    <view v-if="expandedAction === 'footprint'" class="mx-12px mb-12px rounded-12px bg-white px-16px py-8px shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
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
    </view>

    <!-- 我的评价展开 -->
    <view v-if="expandedAction === 'reviews'" class="mx-12px mb-12px rounded-12px bg-white px-16px py-8px shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
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
    </view>

    <!-- 我的评价回复展开 -->
    <view v-if="expandedAction === 'review-replies'" class="mx-12px mb-12px rounded-12px bg-white px-16px py-8px shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
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
    </view>

    <!-- 我的讨论展开 -->
    <view v-if="expandedAction === 'discussions'" class="mx-12px mb-12px rounded-12px bg-white px-16px py-8px shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
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
    </view>

    <!-- 互动提醒展开 -->
    <view v-if="expandedAction === 'notifications'" class="mx-12px mb-12px rounded-12px bg-white px-16px py-8px shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <view v-if="userContentStore.notifications.length === 0" class="py-8 text-center text-13px text-gray-400">
        暂时没有新的互动提醒
      </view>
      <view v-for="group in groupedNotifications" :key="group.key" :class="groupedNotifications[0]?.key !== group.key ? 'mt-8px' : ''">
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
    </view>

    <!-- 编辑资料弹窗 -->
    <view v-if="showEditProfile" class="fixed inset-0 z-1000 center bg-[rgba(0,0,0,0.5)]" @click="showEditProfile = false">
      <view class="w-80% rounded-16px bg-white p-24px" @click.stop>
        <view class="text-16px text-gray-800 font-bold">
          编辑资料
        </view>
        <view class="mt-4">
          <view class="text-13px text-gray-500">
            昵称
          </view>
          <input v-model="editForm.nickname" class="mt-8px rounded-10px bg-#f5f5f5 px-14px py-10px text-14px text-#333" placeholder="请输入昵称" :maxlength="20">
        </view>
        <view class="mt-3">
          <view class="text-13px text-gray-500">
            个性签名
          </view>
          <input v-model="editForm.desc" class="mt-8px rounded-10px bg-#f5f5f5 px-14px py-10px text-14px text-#333" placeholder="请输入个性签名" :maxlength="30">
        </view>
        <view class="mt-5 flex gap-3">
          <view class="flex-1 rounded-10px bg-#f5f5f5 py-12px text-center text-15px text-#666 active:opacity-80" @click="showEditProfile = false">
            取消
          </view>
          <view class="flex-1 rounded-10px bg-#ff6633 py-12px text-center text-15px text-white active:opacity-80" @click="saveProfile">
            保存
          </view>
        </view>
      </view>
    </view>

    <!-- 设置面板 -->
    <view v-if="showSettings" class="fixed inset-0 z-1000 center bg-[rgba(0,0,0,0.5)]" @click="showSettings = false">
      <view class="w-80% rounded-16px bg-white p-20px" @click.stop>
        <view class="flex items-center justify-between border-b-1px border-gray-100 pb-3">
          <view class="text-16px text-gray-800 font-bold">
            设置
          </view>
          <view class="i-carbon-close text-20px text-gray-400" @click="showSettings = false" />
        </view>
        <view class="flex items-center justify-between border-b border-#f5f5f5 py-16px active:opacity-70" @click="clearFootprints">
          <view class="flex items-center gap-3">
            <view class="i-carbon-trash-can text-18px text-gray-500" />
            <text class="text-15px text-gray-700">清空浏览足迹</text>
          </view>
          <view class="i-carbon-chevron-right text-16px text-gray-300" />
        </view>
        <view class="flex items-center justify-between border-b border-#f5f5f5 py-16px active:opacity-70" @click="clearCache">
          <view class="flex items-center gap-3">
            <view class="i-carbon-clean text-18px text-gray-500" />
            <text class="text-15px text-gray-700">清除缓存</text>
          </view>
          <view class="i-carbon-chevron-right text-16px text-gray-300" />
        </view>
        <view class="border-b border-#f5f5f5 py-16px">
          <view class="flex items-center justify-between">
            <view class="flex items-center gap-3">
              <view class="i-carbon-map text-18px text-gray-500" />
              <view>
                <view class="text-15px text-gray-700">
                  导航地图
                </view>
                <view class="mt-1 text-12px text-gray-400">
                  地点详情点击导航时，可按这里的偏好直接打开或每次选择
                </view>
              </view>
            </view>
            <view class="text-12px text-orange-500">
              当前：{{ mapSettingStore.navigationMapAppLabel }}
            </view>
          </view>
          <view class="mt-14px flex gap-10px">
            <view
              v-for="option in navigationMapOptions"
              :key="option.value"
              class="map-provider-chip"
              :class="{ '!border-#ff8c42 !bg-#fff4ed !text-#ea580c': mapSettingStore.navigationMapApp === option.value }"
              @click.stop="setNavigationMapApp(option.value)"
            >
              {{ option.label }}
            </view>
          </view>
        </view>
        <view class="flex items-center justify-between border-b border-#f5f5f5 py-16px active:opacity-70" @click="showAbout">
          <view class="flex items-center gap-3">
            <view class="i-carbon-information text-18px text-gray-500" />
            <text class="text-15px text-gray-700">关于</text>
          </view>
          <view class="i-carbon-chevron-right text-16px text-gray-300" />
        </view>
        <view v-if="hasLogin" class="flex items-center justify-between border-t border-#fff1f1 py-16px active:opacity-70" @click="handleLogout">
          <view class="flex items-center gap-3">
            <view class="i-carbon-logout text-18px text-red-400" />
            <text class="text-15px text-red-400">退出登录</text>
          </view>
          <view class="i-carbon-chevron-right text-16px text-red-200" />
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.me-avatar {
  border: 3px solid #fff;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.me-login-pill {
  padding: 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  font-size: 13px;
  color: #fff;
}

.map-provider-chip {
  min-width: 88px;
  padding: 8px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #f9fafb;
  font-size: 13px;
  color: #6b7280;
  text-align: center;
}
</style>
