<script lang="ts" setup>
import type { FavoriteSpotSummary, ISpotInteractionNotificationItem } from '@/api/types/spot'
import type { SpotDetail } from '@/store/spot'
import { useFavoriteStore, useFootprintStore, useMapSettingStore, useSpotStore, useTokenStore, useUserContentStore, useUserStore } from '@/store'
import { buildSpotDetailUrlFromFavorite } from '@/utils/spotDetail'
import { toLoginPage } from '@/utils/toLoginPage'

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
const spotStore = useSpotStore()
const footprintStore = useFootprintStore()
const userContentStore = useUserContentStore()
const tokenStore = useTokenStore()
const authUserStore = useUserStore()
const mapSettingStore = useMapSettingStore()

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

onShow(async () => {
  if (hasLogin.value && authUserStore.userInfo.userId < 0) {
    await authUserStore.fetchUserInfo()
  }

  if (hasLogin.value) {
    try {
      await favoriteStore.ensureServerFavoritesLoaded(true)
      await Promise.all([
        userContentStore.fetchMyReviews(),
        userContentStore.fetchMyDiscussions(),
        userContentStore.fetchMyNotes(),
        userContentStore.fetchMyLikedNotes(),
        userContentStore.fetchMyQuestions(),
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

/** 是否显示编辑弹窗 */
const showEditProfile = ref(false)
const editForm = reactive({
  nickname: '',
  desc: '',
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

async function handleLoginOrProfile() {
  if (!hasLogin.value) {
    toLoginPage()
    return
  }

  openEditProfile()
}

/** 收藏的地点列表 */
const favoriteSpots = computed(() => {
  return favoriteStore.favoriteSummaries
})

/** 足迹地点列表 */
const footprintSpots = computed(() => {
  return footprintStore.footprintIds
    .map(id => spotStore.getSpotById(id))
    .filter(Boolean) as SpotDetail[]
})

/** 统计 - 从实际数据获取 */
const stats = computed(() => [
  { label: '收藏', value: favoriteStore.favoriteCount },
  { label: '评价', value: userContentStore.reviewCount },
  { label: '讨论', value: userContentStore.discussionCount },
  { label: '问答', value: userContentStore.questionCount },
  { label: '足迹', value: footprintStore.footprintCount },
])

interface MenuItem {
  icon: string
  label: string
  action: string
  count?: () => number
}

/** 互动提醒分组项，避免模板里直接写复杂分类判断。 */
interface NotificationGroupItem {
  key: string
  title: string
  icon: string
  items: ISpotInteractionNotificationItem[]
}

const menuList: MenuItem[] = [
  { icon: 'i-carbon-favorite', label: '我的收藏', action: 'favorites', count: () => favoriteStore.favoriteCount },
  { icon: 'i-carbon-star', label: '我的评价', action: 'reviews', count: () => userContentStore.reviewCount },
  { icon: 'i-carbon-chat', label: '我的讨论', action: 'discussions', count: () => userContentStore.discussionCount },
  { icon: 'i-carbon-document', label: '我的笔记', action: 'notes', count: () => userContentStore.noteCount },
  { icon: 'i-carbon-thumbs-up', label: '我的点赞', action: 'liked-notes', count: () => userContentStore.likedNoteCount },
  { icon: 'i-carbon-help', label: '我的问答', action: 'questions', count: () => userContentStore.questionCount },
  { icon: 'i-carbon-notification', label: '互动提醒', action: 'notifications', count: () => userContentStore.unreadNotificationCount },
  { icon: 'i-carbon-location', label: '浏览足迹', action: 'footprint', count: () => footprintStore.footprintCount },
  { icon: 'i-carbon-settings', label: '设置', action: 'settings' },
]

/** 当前展开的菜单 */
const expandedAction = ref('')

/** 设置面板 */
const showSettings = ref(false)

/** 提醒类型标题映射，统一管理后续新增提醒类型的中文展示。 */
const notificationGroupMetaMap: Record<string, { title: string, icon: string }> = {
  discussion_like: { title: '点赞我的讨论', icon: 'i-carbon-thumbs-up' },
  note_like: { title: '点赞我的笔记', icon: 'i-carbon-favorite' },
  question_answer: { title: '回复我的问题', icon: 'i-carbon-chat' },
  favorite_spot_new_review: { title: '收藏地新评价', icon: 'i-carbon-star' },
  favorite_spot_new_discussion: { title: '收藏地新讨论', icon: 'i-carbon-chat-bot' },
  favorite_spot_new_note: { title: '收藏地新笔记', icon: 'i-carbon-document' },
  favorite_spot_new_question: { title: '收藏地新问答', icon: 'i-carbon-help' },
}

/** 将互动提醒按业务类型分组，减少列表混杂，提高扫读效率。 */
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

function onMenuTap(item: MenuItem) {
  if (item.action === 'favorites' || item.action === 'footprint' || item.action === 'reviews' || item.action === 'notes' || item.action === 'discussions' || item.action === 'liked-notes' || item.action === 'questions' || item.action === 'notifications') {
    expandedAction.value = expandedAction.value === item.action ? '' : item.action

    if (item.action === 'notifications' && expandedAction.value === 'notifications') {
      void userContentStore.markNotificationsRead()
    }

    return
  }
  if (item.action === 'settings') {
    showSettings.value = true
    return
  }
}

/** 跳转到地点详情 */
function goSpotDetail(spot: number | FavoriteSpotSummary) {
  if (typeof spot === 'number') {
    uni.navigateTo({ url: `/pages/spot/detail?id=${spot}` })
    return
  }

  uni.navigateTo({ url: buildSpotDetailUrlFromFavorite(spot) })
}

/** 取消收藏 */
async function removeFavorite(spot: FavoriteSpotSummary) {
  try {
    const result = await favoriteStore.toggleFavorite(spot)
    uni.showToast({ title: result.favorited ? '已收藏' : '已取消收藏', icon: 'none' })
  }
  catch (error) {
    console.error('取消收藏失败', error)
  }
}

/** 删除评价 */
function removeReview(reviewId: string) {
  uni.showModal({
    title: '提示',
    content: '确定要删除这条评价吗？',
    async success(res) {
      if (res.confirm) {
        try {
          await userContentStore.removeReview(Number(reviewId))
          uni.showToast({ title: '已删除', icon: 'none' })
        }
        catch (error) {
          console.error('删除评价失败', error)
        }
      }
    },
  })
}

/** 删除讨论 */
function removeDiscussion(discussionId: string) {
  uni.showModal({
    title: '提示',
    content: '确定要删除这条讨论吗？',
    async success(res) {
      if (res.confirm) {
        try {
          await userContentStore.removeDiscussion(Number(discussionId))
          uni.showToast({ title: '已删除', icon: 'none' })
        }
        catch (error) {
          console.error('删除讨论失败', error)
        }
      }
    },
  })
}

/** 删除笔记 */
function removeNote(noteId: string) {
  uni.showModal({
    title: '提示',
    content: '确定要删除这篇笔记吗？',
    async success(res) {
      if (res.confirm) {
        try {
          await userContentStore.removeNote(Number(noteId))
          uni.showToast({ title: '已删除', icon: 'none' })
        }
        catch (error) {
          console.error('删除笔记失败', error)
        }
      }
    },
  })
}

/** 渲染星星 */
function renderStars(rating: number): string {
  return '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '☆' : '')
}

function clearCache() {
  uni.showModal({
    title: '提示',
    content: '确定要清除缓存吗？',
    success(res) {
      if (res.confirm) {
        try {
          uni.clearStorageSync()
          uni.showToast({ title: '缓存已清除', icon: 'success' })
        }
        catch {
          uni.showToast({ title: '清除失败', icon: 'none' })
        }
      }
    },
  })
}

function clearFootprints() {
  uni.showModal({
    title: '提示',
    content: '确定要清空浏览足迹吗？',
    success(res) {
      if (res.confirm) {
        footprintStore.clearFootprints()
        uni.showToast({ title: '足迹已清空', icon: 'success' })
      }
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
  <view class="me-page">
    <!-- 头部用户信息 -->
    <view class="header">
      <view class="header-bg" />
      <view class="user-section">
        <image :src="displayUserInfo.avatar" class="avatar" mode="aspectFill" />
        <view class="user-info" @click="handleLoginOrProfile">
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
        <view v-if="!hasLogin" class="login-pill" @click="toLoginPage()">
          去登录
        </view>
      </view>

      <!-- 统计 -->
      <view class="stats-row">
        <view v-for="stat in stats" :key="stat.label" class="stat-item">
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
    <view class="menu-card">
      <view
        v-for="(item, index) in menuList"
        :key="item.label"
        class="menu-item"
        :class="{ 'menu-item--last': index === menuList.length - 1 }"
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
    <view v-if="expandedAction === 'favorites'" class="expand-card">
      <view v-if="favoriteSpots.length === 0" class="py-8 text-center text-13px text-gray-400">
        还没有收藏任何地点
      </view>
      <view v-for="spot in favoriteSpots" :key="spot.id" class="expand-item" @click="goSpotDetail(spot)">
        <image :src="spot.cover" class="h-60px w-60px flex-shrink-0 rounded-10px" mode="aspectFill" />
        <view class="ml-3 min-w-0 flex-1">
          <view class="truncate text-14px text-gray-800 font-medium">
            {{ spot.name }}
          </view>
          <view class="mt-1 flex items-center gap-2 text-12px text-gray-400">
            <text>★{{ spot.rating }}</text>
            <text>¥{{ spot.avgPrice }}/人</text>
          </view>
          <view class="mt-0.5 truncate text-12px text-gray-400">
            {{ spot.address }}
          </view>
        </view>
        <view class="i-carbon-close flex-shrink-0 text-16px text-gray-300" @click.stop="removeFavorite(spot)" />
      </view>
    </view>

    <!-- 足迹列表展开 -->
    <view v-if="expandedAction === 'footprint'" class="expand-card">
      <view v-if="footprintSpots.length === 0" class="py-8 text-center text-13px text-gray-400">
        还没有浏览记录
      </view>
      <view v-for="spot in footprintSpots" :key="spot.id" class="expand-item" @click="goSpotDetail(spot.id)">
        <image :src="spot.cover" class="h-60px w-60px flex-shrink-0 rounded-10px" mode="aspectFill" />
        <view class="ml-3 min-w-0 flex-1">
          <view class="truncate text-14px text-gray-800 font-medium">
            {{ spot.name }}
          </view>
          <view class="mt-1 flex items-center gap-2 text-12px text-gray-400">
            <text>★{{ spot.rating }}</text>
            <text>¥{{ spot.avgPrice }}/人</text>
          </view>
          <view class="mt-0.5 truncate text-12px text-gray-400">
            {{ spot.address }}
          </view>
        </view>
      </view>
    </view>

    <!-- 我的评价展开 -->
    <view v-if="expandedAction === 'reviews'" class="expand-card">
      <view v-if="userContentStore.reviews.length === 0" class="py-8 text-center text-13px text-gray-400">
        还没有发布评价，去地点详情页写一篇吧
      </view>
      <view v-for="review in userContentStore.reviews" :key="review.id" class="review-item">
        <view class="flex items-center justify-between">
          <view class="flex items-center gap-2" @click="goSpotDetail(review.spotId)">
            <view class="rounded-6px bg-orange-50 px-2 py-1 text-12px text-orange-500">
              {{ review.spotName }}
            </view>
            <text class="text-14px text-orange-400">{{ renderStars(review.rating) }}</text>
          </view>
          <view class="i-carbon-close flex-shrink-0 text-14px text-gray-300" @click.stop="removeReview(review.id)" />
        </view>
        <view class="mt-2 text-13px text-gray-600 leading-relaxed">
          {{ review.content }}
        </view>
        <view class="mt-1 text-11px text-gray-400">
          {{ review.time }}
        </view>
      </view>
    </view>

    <!-- 我的讨论展开 -->
    <view v-if="expandedAction === 'discussions'" class="expand-card">
      <view v-if="userContentStore.discussions.length === 0" class="py-8 text-center text-13px text-gray-400">
        还没有发布讨论，去地点详情页分享路线和体验吧
      </view>
      <view v-for="discussion in userContentStore.discussions" :key="discussion.id" class="review-item">
        <view class="flex items-center justify-between">
          <view class="flex items-center gap-2" @click="goSpotDetail(discussion.spotId)">
            <view class="rounded-6px bg-orange-50 px-2 py-1 text-12px text-orange-500">
              {{ discussion.spotName }}
            </view>
            <view class="flex items-center gap-1 text-12px" :class="discussion.likedByCurrentUser ? 'text-orange-500' : 'text-gray-400'">
              <view :class="discussion.likedByCurrentUser ? 'i-carbon-thumbs-up-filled' : 'i-carbon-thumbs-up'" class="text-12px" />
              <text>{{ discussion.likeCount }}</text>
            </view>
          </view>
          <view class="i-carbon-close flex-shrink-0 text-14px text-gray-300" @click.stop="removeDiscussion(discussion.id)" />
        </view>
        <view class="mt-2 text-13px text-gray-600 leading-relaxed">
          {{ discussion.content }}
        </view>
        <view class="mt-1 text-11px text-gray-400">
          {{ discussion.time }}
        </view>
      </view>
    </view>

    <!-- 我的笔记展开 -->
    <view v-if="expandedAction === 'notes'" class="expand-card">
      <view v-if="userContentStore.notes.length === 0" class="py-8 text-center text-13px text-gray-400">
        还没有发布笔记，去地点详情页写一篇吧
      </view>
      <view v-for="note in userContentStore.notes" :key="note.id" class="note-item">
        <view class="flex items-start gap-3" @click="goSpotDetail(note.spotId)">
          <image :src="note.cover" class="h-70px w-70px flex-shrink-0 rounded-10px" mode="aspectFill" />
          <view class="min-w-0 flex-1">
            <view class="truncate text-14px text-gray-800 font-medium">
              {{ note.title }}
            </view>
            <view class="line-clamp-2 mt-1 text-12px text-gray-500">
              {{ note.content }}
            </view>
            <view class="mt-1 flex items-center justify-between">
              <view class="rounded-6px bg-orange-50 px-2 py-0.5 text-11px text-orange-500">
                {{ note.spotName }}
              </view>
              <text class="text-11px text-gray-400">{{ note.time }}</text>
            </view>
          </view>
        </view>
        <view class="mt-2 flex justify-end">
          <view class="flex items-center gap-1 text-12px text-gray-400" @click.stop="removeNote(note.id)">
            <view class="i-carbon-trash-can text-12px" />
            <text>删除</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 我的点赞展开 -->
    <view v-if="expandedAction === 'liked-notes'" class="expand-card">
      <view v-if="userContentStore.likedNotes.length === 0" class="py-8 text-center text-13px text-gray-400">
        还没有点赞过笔记，去详情页看看大家的探店记录吧
      </view>
      <view v-for="note in userContentStore.likedNotes" :key="note.id" class="note-item" @click="goSpotDetail(note.spotId)">
        <view class="flex items-start gap-3">
          <image :src="note.cover" class="h-70px w-70px flex-shrink-0 rounded-10px" mode="aspectFill" />
          <view class="min-w-0 flex-1">
            <view class="truncate text-14px text-gray-800 font-medium">
              {{ note.title }}
            </view>
            <view class="line-clamp-2 mt-1 text-12px text-gray-500">
              {{ note.content }}
            </view>
            <view class="mt-1 flex items-center justify-between">
              <view class="rounded-6px bg-orange-50 px-2 py-0.5 text-11px text-orange-500">
                {{ note.spotName }}
              </view>
              <view class="flex items-center gap-1 text-11px text-orange-500">
                <view class="i-carbon-thumbs-up-filled text-11px" />
                <text>{{ note.likeCount }}</text>
              </view>
            </view>
            <view class="mt-1 text-11px text-gray-400">
              点赞于 {{ note.likedAt }}
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 我的问答展开 -->
    <view v-if="expandedAction === 'questions'" class="expand-card">
      <view v-if="userContentStore.questions.length === 0" class="py-8 text-center text-13px text-gray-400">
        还没有发起问答，去地点详情页提一个你关心的问题吧
      </view>
      <view v-for="question in userContentStore.questions" :key="question.id" class="review-item">
        <view class="flex items-center justify-between" @click="goSpotDetail(question.spotId)">
          <view class="rounded-6px bg-orange-50 px-2 py-1 text-12px text-orange-500">
            {{ question.spotName }}
          </view>
          <text class="text-11px text-gray-400">{{ question.time }}</text>
        </view>
        <view class="mt-2 text-14px text-gray-800 font-medium leading-relaxed">
          {{ question.question }}
        </view>
        <view v-if="question.answers.length === 0" class="mt-2 text-12px text-gray-400">
          暂无回复
        </view>
        <view v-for="answer in question.answers" :key="answer.id" class="mt-2 rounded-12px bg-gray-50 px-3 py-2">
          <view class="flex items-center justify-between text-11px text-gray-400">
            <text>{{ answer.userName }}</text>
            <text>{{ answer.time }}</text>
          </view>
          <view class="mt-1 text-12px text-gray-600 leading-relaxed">
            {{ answer.content }}
          </view>
        </view>
      </view>
    </view>

    <!-- 互动提醒展开 -->
    <view v-if="expandedAction === 'notifications'" class="expand-card">
      <view v-if="userContentStore.notifications.length === 0" class="py-8 text-center text-13px text-gray-400">
        暂时没有新的互动提醒
      </view>
      <view v-for="group in groupedNotifications" :key="group.key" class="notification-group">
        <view class="notification-group__header">
          <view class="flex items-center gap-2">
            <view :class="group.icon" class="text-14px text-orange-500" />
            <text class="notification-group__title">{{ group.title }}</text>
          </view>
          <text class="notification-group__count">{{ group.items.length }} 条</text>
        </view>
        <view v-for="notification in group.items" :key="notification.id" class="review-item" @click="notification.spotId ? goSpotDetail(notification.spotId) : undefined">
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
    <view v-if="showEditProfile" class="modal-overlay" @click="showEditProfile = false">
      <view class="modal-content" @click.stop>
        <view class="text-16px text-gray-800 font-bold">
          编辑资料
        </view>
        <view class="mt-4">
          <view class="text-13px text-gray-500">
            昵称
          </view>
          <input v-model="editForm.nickname" class="edit-input" placeholder="请输入昵称" :maxlength="20">
        </view>
        <view class="mt-3">
          <view class="text-13px text-gray-500">
            个性签名
          </view>
          <input v-model="editForm.desc" class="edit-input" placeholder="请输入个性签名" :maxlength="30">
        </view>
        <view class="mt-5 flex gap-3">
          <view class="modal-btn modal-btn--cancel" @click="showEditProfile = false">
            取消
          </view>
          <view class="modal-btn modal-btn--confirm" @click="saveProfile">
            保存
          </view>
        </view>
      </view>
    </view>

    <!-- 设置面板 -->
    <view v-if="showSettings" class="modal-overlay" @click="showSettings = false">
      <view class="settings-panel" @click.stop>
        <view class="flex items-center justify-between border-b-1px border-gray-100 pb-3">
          <view class="text-16px text-gray-800 font-bold">
            设置
          </view>
          <view class="i-carbon-close text-20px text-gray-400" @click="showSettings = false" />
        </view>
        <view class="settings-item" @click="clearFootprints">
          <view class="flex items-center gap-3">
            <view class="i-carbon-trash-can text-18px text-gray-500" />
            <text class="text-15px text-gray-700">清空浏览足迹</text>
          </view>
          <view class="i-carbon-chevron-right text-16px text-gray-300" />
        </view>
        <view class="settings-item" @click="clearCache">
          <view class="flex items-center gap-3">
            <view class="i-carbon-clean text-18px text-gray-500" />
            <text class="text-15px text-gray-700">清除缓存</text>
          </view>
          <view class="i-carbon-chevron-right text-16px text-gray-300" />
        </view>
        <view class="settings-item settings-item--column">
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
          <view class="provider-switches">
            <view
              v-for="option in navigationMapOptions"
              :key="option.value"
              class="provider-chip"
              :class="{ 'provider-chip--active': mapSettingStore.navigationMapApp === option.value }"
              @click.stop="setNavigationMapApp(option.value)"
            >
              {{ option.label }}
            </view>
          </view>
        </view>
        <view class="settings-item" @click="showAbout">
          <view class="flex items-center gap-3">
            <view class="i-carbon-information text-18px text-gray-500" />
            <text class="text-15px text-gray-700">关于</text>
          </view>
          <view class="i-carbon-chevron-right text-16px text-gray-300" />
        </view>
        <view v-if="hasLogin" class="settings-item settings-item--danger" @click="handleLogout">
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
.me-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: calc(60px + env(safe-area-inset-bottom));
}

.header {
  position: relative;
}

.header-bg {
  height: 200px;
  background: linear-gradient(135deg, #ff6633 0%, #ff8c42 100%);
  padding-top: env(safe-area-inset-top);
}

.user-section {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 20px;
  margin-top: -120px;
  position: relative;
  z-index: 10;
}

.avatar {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.user-info {
  flex: 1;
}

.login-pill {
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 13px;
  border: 1px solid rgba(255, 255, 255, 0.28);
}

.stats-row {
  display: flex;
  margin: 16px 12px 0;
  padding: 16px 0;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  position: relative;
  z-index: 10;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.menu-card {
  margin: 12px;
  background: #fff;
  border-radius: 12px;
  padding: 0 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid #f5f5f5;

  &--last {
    border-bottom: none;
  }

  &:active {
    opacity: 0.7;
  }
}

.settings-item--danger {
  border-top: 1px solid #fff1f1;
}

.expand-card {
  margin: 0 12px 12px;
  background: #fff;
  border-radius: 12px;
  padding: 8px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.expand-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f8f8f8;

  &:last-child {
    border-bottom: none;
  }

  &:active {
    opacity: 0.7;
  }
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  width: 80%;
  background: #fff;
  border-radius: 16px;
  padding: 24px;
}

.edit-input {
  margin-top: 8px;
  padding: 10px 14px;
  background: #f5f5f5;
  border-radius: 10px;
  font-size: 14px;
  color: #333;
}

.modal-btn {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  border-radius: 10px;
  font-size: 15px;

  &--cancel {
    background: #f5f5f5;
    color: #666;
  }

  &--confirm {
    background: #ff6633;
    color: #fff;
  }

  &:active {
    opacity: 0.8;
  }
}

/* 设置面板 */
.settings-panel {
  width: 80%;
  background: #fff;
  border-radius: 16px;
  padding: 20px;
}

.settings-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }

  &:active {
    opacity: 0.7;
  }
}

.settings-item--column {
  display: block;
}

.provider-switches {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.provider-chip {
  min-width: 88px;
  text-align: center;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  color: #6b7280;
  font-size: 13px;

  &--active {
    background: #fff4ed;
    border-color: #ff8c42;
    color: #ea580c;
  }
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-item {
  padding: 12px 0;
  border-bottom: 1px solid #f8f8f8;

  &:last-child {
    border-bottom: none;
  }
}

.note-item {
  padding: 12px 0;
  border-bottom: 1px solid #f8f8f8;

  &:last-child {
    border-bottom: none;
  }
}

/* 提醒分组头部，用来在长列表里快速区分提醒来源。 */
.notification-group {
  & + & {
    margin-top: 8px;
  }
}

.notification-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0 4px;
}

.notification-group__title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.notification-group__count {
  font-size: 11px;
  color: #9ca3af;
}

.line-clamp-2 {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
