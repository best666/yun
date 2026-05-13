<script lang="ts" setup>
import type { FavoriteSpotSummary, ISpotInteractionNotificationItem } from '@/api/types/spot'
import UCropper from 'uview-plus/components/u-cropper/u-cropper.vue'
import MeBottomSheet from '@/components/me/MeBottomSheet.vue'
import MeMenuPanel from '@/components/me/MeMenuPanel.vue'
import MeProfileDialog from '@/components/me/MeProfileDialog.vue'
import MeProfileHeader from '@/components/me/MeProfileHeader.vue'
import MeReviewItem from '@/components/me/MeReviewItem.vue'
import MeReviewReplyItem from '@/components/me/MeReviewReplyItem.vue'
import MeSectionCard from '@/components/me/MeSectionCard.vue'
import MeSettingsPanel from '@/components/me/MeSettingsPanel.vue'
import MeSpotSummaryItem from '@/components/me/MeSpotSummaryItem.vue'
import { APP_LEGAL_PAGES } from '@/config/appMeta'
import { AVATAR_TARGET_DIMENSION, resolveAvatarUploadTip } from '@/config/avatarPolicy'
import { DEFAULT_USER_SIGNATURE, GUEST_USER_INFO } from '@/config/userProfile'
import { useFavoriteStore, useFootprintStore, useMapSettingStore, useTokenStore, useUserContentStore, useUserStore } from '@/store'
import { buildSpotDetailUrlFromFavorite } from '@/utils/spotDetail'
import { fetchAndCacheSpotDetail } from '@/utils/spotDetailCache'
import { toLoginPage } from '@/utils/toLoginPage'
import { uploadFileUrl } from '@/utils/uploadFile'
import { parseUploadErrorMessage, parseUploadResponseData } from '@/utils/uploadShared'

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
type ExpandableAction = 'favorites' | 'footprint' | 'reviews' | 'review-replies' | 'notifications'
type MenuAction = ExpandableAction | 'settings'

interface AvatarCropperRef {
  chooseImage?: (index?: number, params?: Record<string, string | boolean | number>) => void
}

const EXPANDABLE_ACTIONS: ExpandableAction[] = ['favorites', 'footprint', 'reviews', 'review-replies', 'notifications']
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
const SHEET_CLOSE_DURATION_MS = 280
const AVATAR_CROPPER_OPTIONS = {
  areaWidth: '520rpx',
  areaHeight: '520rpx',
  exportWidth: String(AVATAR_TARGET_DIMENSION),
  exportHeight: String(AVATAR_TARGET_DIMENSION),
  quality: '0.9',
  canRotate: true,
  canScale: true,
} as const
const MENU_ACTIONS = [...EXPANDABLE_ACTIONS, 'settings'] as const satisfies readonly MenuAction[]
const PANEL_META_MAP: Record<MenuAction, { title: string, description: string }> = {
  'favorites': { title: '我的收藏', description: '集中查看收藏过的地点，快速跳回详情或取消收藏。' },
  'footprint': { title: '浏览足迹', description: '这里保留你最近看过的地点记录，方便继续浏览。' },
  'reviews': { title: '我的评价', description: '查看自己发布过的评价内容，并可继续前往地点详情。' },
  'review-replies': { title: '我的回复', description: '统一查看你参与过的评价回复和互动内容。' },
  'notifications': { title: '互动提醒', description: '点赞、回复和收藏动态都会从这里统一查看。' },
  'settings': { title: '设置', description: '管理地图偏好、缓存、足迹和账号相关操作。' },
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
const isSavingProfile = ref(false)
const sheetAction = ref<MenuAction | ''>('')
const sheetVisible = ref(false)
const avatarCropperRef = ref<AvatarCropperRef | null>(null)
const avatarTipMessage = ref(resolveAvatarUploadTip())
const avatarTipTone = ref<'default' | 'error' | 'success'>('default')
const isUploadingAvatar = ref(false)
const pendingAvatarFilePath = ref('')
const editForm = reactive({
  avatar: '',
  nickname: '',
  desc: '',
})

const isProfileBusy = computed(() => isSavingProfile.value || isUploadingAvatar.value)

let closeSheetTimer: ReturnType<typeof setTimeout> | null = null

const hasLogin = computed(() => tokenStore.updateNowTime().hasLogin)
function avatarUploadHeaders() {
  const validToken = tokenStore.updateNowTime().validToken
  return validToken
    ? { Authorization: `Bearer ${validToken}` }
    : {}
}

async function compressAvatarImage(filePath: string) {
  try {
    const compressedResult = await uni.compressImage({
      src: filePath,
      quality: 80,
      compressedWidth: AVATAR_TARGET_DIMENSION,
      compressedHeight: AVATAR_TARGET_DIMENSION,
    })

    return compressedResult.tempFilePath || filePath
  }
  catch (error) {
    console.warn('压缩头像失败，回退使用裁剪结果', error)
    return filePath
  }
}

async function handleAvatarCropConfirm(event: { path?: string }) {
  const croppedFilePath = event.path || ''
  if (!croppedFilePath) {
    avatarTipTone.value = 'error'
    avatarTipMessage.value = '裁剪结果未生成，请重新选择图片。'
    uni.showToast({ title: '裁剪结果异常', icon: 'none' })
    return
  }

  avatarTipTone.value = 'default'
  avatarTipMessage.value = '裁剪已确认，正在压缩图片并回到编辑页。'
  const compressedFilePath = await compressAvatarImage(croppedFilePath)
  pendingAvatarFilePath.value = compressedFilePath
  editForm.avatar = compressedFilePath
  avatarTipTone.value = 'success'
  avatarTipMessage.value = '头像裁剪完成，点击保存后才会正式上传。'
}

async function uploadPendingAvatar(filePath: string) {
  isUploadingAvatar.value = true
  try {
    avatarTipTone.value = 'default'
    avatarTipMessage.value = '正在上传头像，请稍候。'

    const uploadResult = await new Promise<UniApp.UploadFileSuccessCallbackResult>((resolve, reject) => {
      uni.uploadFile({
        url: uploadFileUrl.USER_AVATAR,
        filePath,
        name: 'file',
        header: {
          // #ifndef H5
          'Content-Type': 'multipart/form-data',
          // #endif
          ...avatarUploadHeaders(),
        },
        success: resolve,
        fail: reject,
      })
    })

    if (uploadResult.statusCode < 200 || uploadResult.statusCode >= 300) {
      throw new Error(parseUploadErrorMessage(uploadResult.data, '上传头像失败'))
    }

    const parsedResult = parseUploadResponseData<{ url?: string }>(uploadResult.data)
    const uploadedAvatarUrl = typeof parsedResult.url === 'string' ? parsedResult.url : ''

    if (!uploadedAvatarUrl) {
      throw new Error('头像上传结果异常')
    }

    pendingAvatarFilePath.value = ''
    return uploadedAvatarUrl
  }
  catch (error) {
    console.error('上传头像失败', error)
    const resolvedMessage = error instanceof Error ? error.message : '上传头像失败'
    avatarTipTone.value = 'error'
    avatarTipMessage.value = resolveAvatarUploadTip(resolvedMessage)
    throw error instanceof Error ? error : new Error(resolvedMessage)
  }
  finally {
    isUploadingAvatar.value = false
  }
}

const displayUserInfo = computed(() => {
  if (!hasLogin.value) {
    return GUEST_USER_INFO
  }

  return {
    nickname: authUserStore.userInfo.nickname || authUserStore.userInfo.username || GUEST_USER_INFO.nickname,
    avatar: authUserStore.userInfo.avatar || GUEST_USER_INFO.avatar,
    desc: authUserStore.userInfo.signature || DEFAULT_USER_SIGNATURE,
  }
})

const favoriteSpots = computed(() => favoriteStore.favoriteSummaries)
const stats = computed(() => [
  { label: '收藏', value: favoriteStore.favoriteCount },
  { label: '评价', value: userContentStore.reviewCount },
  { label: '回复', value: userContentStore.reviewReplyCount },
  { label: '足迹', value: footprintStore.footprintCount },
])

const menuItems = computed(() => [
  { icon: 'i-carbon-favorite', label: '我的收藏', action: 'favorites' as const, count: favoriteStore.favoriteCount, expanded: isPanelOpen('favorites') },
  { icon: 'i-carbon-star', label: '我的评价', action: 'reviews' as const, count: userContentStore.reviewCount, expanded: isPanelOpen('reviews') },
  { icon: 'i-carbon-chat', label: '我的回复', action: 'review-replies' as const, count: userContentStore.reviewReplyCount, expanded: isPanelOpen('review-replies') },
  { icon: 'i-carbon-notification', label: '互动提醒', action: 'notifications' as const, count: userContentStore.unreadNotificationCount, expanded: isPanelOpen('notifications') },
  { icon: 'i-carbon-location', label: '浏览足迹', action: 'footprint' as const, count: footprintStore.footprintCount, expanded: isPanelOpen('footprint') },
  { icon: 'i-carbon-settings', label: '设置', action: 'settings' as const, expanded: isPanelOpen('settings') },
])

const activeSheetMeta = computed(() => {
  if (!sheetAction.value) {
    return {
      title: '',
      description: '',
    }
  }

  return PANEL_META_MAP[sheetAction.value]
})

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

onUnmounted(() => {
  if (closeSheetTimer) {
    clearTimeout(closeSheetTimer)
  }
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

  editForm.avatar = displayUserInfo.value.avatar
  editForm.nickname = displayUserInfo.value.nickname
  editForm.desc = displayUserInfo.value.desc
  pendingAvatarFilePath.value = ''
  avatarTipTone.value = 'default'
  avatarTipMessage.value = '点击头像选择图片，确认裁剪后回到编辑页，保存时才会上传。'
  showEditProfile.value = true
}

async function saveProfile() {
  if (isUploadingAvatar.value) {
    uni.showToast({ title: '头像上传中，请稍候', icon: 'none' })
    return
  }

  isSavingProfile.value = true

  try {
    let avatar = editForm.avatar

    if (pendingAvatarFilePath.value) {
      avatar = await uploadPendingAvatar(pendingAvatarFilePath.value)
      editForm.avatar = avatar
    }

    await authUserStore.updateProfile({
      avatar,
      nickname: editForm.nickname.trim(),
      signature: editForm.desc.trim(),
    })
    avatarTipTone.value = 'success'
    avatarTipMessage.value = '资料已保存成功。'
    showEditProfile.value = false
    uni.showToast({ title: '资料已更新', icon: 'success' })
  }
  catch (error) {
    console.error('更新个人资料失败', error)
    uni.showToast({ title: '更新失败，请重试', icon: 'none' })
  }
  finally {
    isSavingProfile.value = false
  }
}

function changeAvatar() {
  if (isUploadingAvatar.value || isProfileBusy.value) {
    return
  }

  avatarTipTone.value = 'default'
  avatarTipMessage.value = '已选择更换头像，下一步将进入裁剪。'
  avatarCropperRef.value?.chooseImage?.(0, AVATAR_CROPPER_OPTIONS)
}

function closeEditProfile() {
  if (isUploadingAvatar.value || isProfileBusy.value) {
    uni.showToast({ title: '资料处理中，请稍候', icon: 'none' })
    return
  }

  showEditProfile.value = false
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

function onMenuTap(action: string) {
  if (!isMenuAction(action)) {
    return
  }

  if (sheetAction.value === action && sheetVisible.value) {
    closeSheet()
    return
  }

  openPanel(action)
}

function isMenuAction(action: string): action is MenuAction {
  return MENU_ACTIONS.includes(action as MenuAction)
}

function isPanelOpen(action: MenuAction) {
  return sheetVisible.value && sheetAction.value === action
}

function openPanel(action: MenuAction) {
  if (closeSheetTimer) {
    clearTimeout(closeSheetTimer)
    closeSheetTimer = null
  }

  sheetAction.value = action
  sheetVisible.value = true

  if (action === 'footprint') {
    void syncFootprintSpots()
  }

  if (action === 'notifications') {
    void userContentStore.markNotificationsRead()
  }
}

function closeSheet() {
  sheetVisible.value = false

  if (closeSheetTimer) {
    clearTimeout(closeSheetTimer)
  }

  closeSheetTimer = setTimeout(() => {
    sheetAction.value = ''
    closeSheetTimer = null
  }, SHEET_CLOSE_DURATION_MS)
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
  closeSheet()
  uni.navigateTo({ url: '/pages/about/about' })
}

function showAgreement() {
  closeSheet()
  uni.navigateTo({ url: APP_LEGAL_PAGES.agreement })
}

function showPrivacy() {
  closeSheet()
  uni.navigateTo({ url: APP_LEGAL_PAGES.privacy })
}

async function handleLogout() {
  await tokenStore.logout()
  closeSheet()
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

    <MeMenuPanel :items="menuItems" @itemtap="onMenuTap" />

    <MeBottomSheet
      :rendered="Boolean(sheetAction)"
      :visible="sheetVisible"
      :title="activeSheetMeta.title"
      :description="activeSheetMeta.description"
      @close="closeSheet"
    >
      <MeSectionCard v-if="sheetAction === 'favorites'">
        <view v-if="favoriteSpots.length === 0" class="min-h-180px flex items-center justify-center py-8 text-center text-13px text-gray-400 leading-1.8">
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

      <MeSectionCard v-if="sheetAction === 'footprint'">
        <view v-if="isLoadingFootprints" class="min-h-180px flex items-center justify-center py-8 text-center text-13px text-gray-400 leading-1.8">
          正在加载浏览记录...
        </view>
        <view v-else-if="footprintSpots.length === 0" class="min-h-180px flex items-center justify-center py-8 text-center text-13px text-gray-400 leading-1.8">
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

      <MeSectionCard v-if="sheetAction === 'reviews'">
        <view v-if="userContentStore.reviews.length === 0" class="min-h-180px flex items-center justify-center py-8 text-center text-13px text-gray-400 leading-1.8">
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

      <MeSectionCard v-if="sheetAction === 'review-replies'">
        <view v-if="userContentStore.reviewReplies.length === 0" class="min-h-180px flex items-center justify-center py-8 text-center text-13px text-gray-400 leading-1.8">
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

      <MeSectionCard v-if="sheetAction === 'notifications'">
        <view v-if="userContentStore.notifications.length === 0" class="min-h-180px flex items-center justify-center py-8 text-center text-13px text-gray-400 leading-1.8">
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

      <MeSettingsPanel
        v-if="sheetAction === 'settings'"
        :has-login="hasLogin"
        :selected-map-app="mapSettingStore.navigationMapApp"
        :selected-map-app-label="mapSettingStore.navigationMapAppLabel"
        :navigation-map-options="NAVIGATION_MAP_OPTIONS"
        @clear-footprints="clearFootprints"
        @clear-cache="clearCache"
        @select-map-app="setNavigationMapApp"
        @show-about="showAbout"
        @show-agreement="showAgreement"
        @show-privacy="showPrivacy"
        @logout="handleLogout"
      />
    </MeBottomSheet>

    <MeProfileDialog
      :visible="showEditProfile"
      :avatar="editForm.avatar"
      :nickname="editForm.nickname"
      :desc="editForm.desc"
      :avatar-tip="avatarTipMessage"
      :avatar-tip-tone="avatarTipTone"
      :uploading-avatar="isUploadingAvatar"
      :saving="isProfileBusy"
      @close="closeEditProfile"
      @change-avatar="changeAvatar"
      @save="saveProfile"
      @nickname-change="editForm.nickname = $event"
      @desc-change="editForm.desc = $event"
    />

    <UCropper
      ref="avatarCropperRef"
      quality="0.9"
      @confirm="handleAvatarCropConfirm"
    >
      <view class="hidden h-0 w-0 overflow-hidden" />
    </UCropper>
  </view>
</template>

<style scoped>
:deep(.u-cropper .btn-wrapper > view:nth-child(4)) {
  display: none !important;
}

:deep(.u-cropper .clr-wrapper) {
  display: none !important;
}
</style>
