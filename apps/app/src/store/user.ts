import type { IUserInfoRes } from '@/api/types/login'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getUserInfo,
  updateInfo,
} from '@/api/login'
import { DEFAULT_USER_AVATAR, DEFAULT_USER_SIGNATURE } from '@/config/userProfile'

// 初始化状态
const userInfoState: IUserInfoRes = {
  userId: -1,
  username: '',
  nickname: '',
  avatar: DEFAULT_USER_AVATAR,
  signature: DEFAULT_USER_SIGNATURE,
}

export const useUserStore = defineStore(
  'user',
  () => {
    const userInfo = ref<IUserInfoRes>({ ...userInfoState })

    const setUserInfo = (val: IUserInfoRes) => {
      userInfo.value = {
        ...userInfoState,
        ...val,
        avatar: val.avatar || userInfoState.avatar,
        signature: val.signature || userInfoState.signature,
      }
    }

    const setUserAvatar = (avatar: string) => {
      userInfo.value.avatar = avatar
    }

    const updateProfile = async (payload: Parameters<typeof updateInfo>[0]) => {
      const res = await updateInfo(payload)
      setUserInfo(res)
      return res
    }

    const clearUserInfo = () => {
      userInfo.value = { ...userInfoState }
      uni.removeStorageSync('user')
    }

    const fetchUserInfo = async () => {
      const res = await getUserInfo()
      setUserInfo(res)
      return res
    }

    return {
      userInfo,
      clearUserInfo,
      fetchUserInfo,
      setUserInfo,
      setUserAvatar,
      updateProfile,
    }
  },
  {
    persist: true,
  },
)
