<script lang="ts" setup>
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

const userInfo = reactive({
  nickname: '美食探索者',
  avatar: 'https://placehold.co/120/ff6633/white?text=Me',
  desc: '吃遍天下美食',
})

const stats = reactive([
  { label: '收藏', value: 12 },
  { label: '评价', value: 8 },
  { label: '笔记', value: 3 },
])

interface MenuItem {
  icon: string
  label: string
  path?: string
}

const menuList: MenuItem[] = [
  { icon: 'i-carbon-favorite', label: '我的收藏' },
  { icon: 'i-carbon-document', label: '我的笔记' },
  { icon: 'i-carbon-star', label: '我的评价' },
  { icon: 'i-carbon-help', label: '我的问答' },
  { icon: 'i-carbon-location', label: '浏览足迹' },
  { icon: 'i-carbon-settings', label: '设置' },
]

function onMenuTap(item: MenuItem) {
  uni.showToast({ title: item.label, icon: 'none' })
}
</script>

<template>
  <view class="me-page">
    <!-- 头部用户信息 -->
    <view class="header">
      <view class="header-bg" />
      <view class="user-section">
        <image :src="userInfo.avatar" class="avatar" mode="aspectFill" />
        <view class="user-info">
          <view class="text-18px font-bold text-white">{{ userInfo.nickname }}</view>
          <view class="mt-1 text-13px text-white text-opacity-80">{{ userInfo.desc }}</view>
        </view>
      </view>

      <!-- 统计 -->
      <view class="stats-row">
        <view v-for="stat in stats" :key="stat.label" class="stat-item">
          <view class="text-20px font-bold text-gray-800">{{ stat.value }}</view>
          <view class="mt-1 text-12px text-gray-500">{{ stat.label }}</view>
        </view>
      </view>
    </view>

    <!-- 菜单列表 -->
    <view class="menu-card">
      <view v-for="(item, index) in menuList" :key="item.label" class="menu-item"
        :class="{ 'menu-item--last': index === menuList.length - 1 }" @click="onMenuTap(item)">
        <view class="flex items-center gap-3">
          <view :class="item.icon" class="text-20px text-orange-500" />
          <text class="text-15px text-gray-700">{{ item.label }}</text>
        </view>
        <view class="i-carbon-chevron-right text-16px text-gray-300" />
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
</style>
