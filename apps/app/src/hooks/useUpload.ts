import type { Ref } from 'vue'
import { ref } from 'vue'
import { getEnvBaseUrl } from '@/utils/index'
import { formatMaxSizeText, getFileExtension, isAcceptedFile, isUploadCancelled, normalizeUploadError, parseUploadResponseData } from '@/utils/uploadShared'

const VITE_UPLOAD_BASEURL = `${getEnvBaseUrl()}/upload`

type TFileType = 'image' | 'file'
type TImage = 'png' | 'jpg' | 'jpeg' | 'webp' | '*'
type TFile = 'doc' | 'docx' | 'ppt' | 'zip' | 'xls' | 'xlsx' | 'txt' | TImage

interface SelectedUploadFile {
  tempFilePath: string
  size: number
  name?: string
}

interface TOptions<T extends TFileType, TResult = unknown> {
  formData?: Record<string, any>
  maxSize?: number
  accept?: T extends 'image' ? TImage[] : TFile[]
  fileType?: T
  success?: (params: TResult) => void
  error?: (err: Error) => void
}

/** 统一提取各平台选择结果中的首个文件，避免平台差异泄漏给页面。 */
function resolveSelectedFile(result: any): SelectedUploadFile | null {
  // #ifdef MP-WEIXIN
  const miniProgramFile = result?.tempFiles?.[0]
  if (miniProgramFile?.tempFilePath) {
    return {
      tempFilePath: miniProgramFile.tempFilePath,
      size: miniProgramFile.size || 0,
      name: miniProgramFile.name,
    }
  }
  // #endif

  const genericTempFile = result?.tempFiles?.[0]
  const genericTempFilePath = result?.tempFilePaths?.[0]
  if (!genericTempFilePath) {
    return null
  }

  return {
    tempFilePath: genericTempFilePath,
    size: genericTempFile?.size || 0,
    name: genericTempFile?.name,
  }
}

export default function useUpload<T extends TFileType, TResult = unknown>(options: TOptions<T, TResult> = {} as TOptions<T, TResult>) {
  const {
    formData = {},
    maxSize = 5 * 1024 * 1024,
    accept = ['*'],
    fileType = 'image',
    success,
    error: onError,
  } = options

  const loading = ref(false)
  const error = ref<Error | null>(null)
  const data = ref<TResult | null>(null) as Ref<TResult | null>

  const resetUploadState = () => {
    loading.value = false
    error.value = null
  }

  const validateSelectedFile = (selectedFile: SelectedUploadFile) => {
    if (selectedFile.size > maxSize) {
      uni.showToast({
        title: `文件大小不能超过 ${formatMaxSizeText(maxSize)}`,
        icon: 'none',
      })
      return false
    }

    const fileExtension = getFileExtension(selectedFile.tempFilePath, selectedFile.name)
    if (!isAcceptedFile(fileExtension, accept as string[])) {
      uni.showToast({
        title: `仅支持 ${accept.join(', ')} 格式的文件`,
        icon: 'none',
      })
      return false
    }

    return true
  }

  const handleFileChoose = (selectedFile: SelectedUploadFile | null) => {
    if (!selectedFile) {
      const resolveError = new Error('未获取到可上传的文件')
      error.value = resolveError
      onError?.(resolveError)
      return
    }

    if (!validateSelectedFile(selectedFile)) {
      return
    }

    error.value = null
    loading.value = true
    uploadFile({
      tempFilePath: selectedFile.tempFilePath,
      formData,
      onSuccess: (res) => {
        const parsedData = parseUploadResponseData<TResult>(res)
        data.value = parsedData
        success?.(parsedData)
      },
      onError: (caughtError) => {
        const normalizedError = normalizeUploadError(caughtError)
        error.value = normalizedError
        onError?.(normalizedError)
      },
      onComplete: () => {
        loading.value = false
      },
    })
  }

  const run = () => {
    // 微信小程序从基础库 2.21.0 开始， wx.chooseImage 停止维护，请使用 uni.chooseMedia 代替。
    // 微信小程序在2023年10月17日之后，使用本API需要配置隐私协议
    const chooseFileOptions = {
      count: 1,
      success: (res: any) => {
        handleFileChoose(resolveSelectedFile(res))
      },
      fail: (caughtError: unknown) => {
        if (isUploadCancelled(caughtError)) {
          return
        }

        const normalizedError = normalizeUploadError(caughtError)
        error.value = normalizedError
        onError?.(normalizedError)
      },
    }

    if (fileType === 'image') {
      // #ifdef MP-WEIXIN
      uni.chooseMedia({
        ...chooseFileOptions,
        mediaType: ['image'],
      })
      // #endif

      // #ifndef MP-WEIXIN
      uni.chooseImage(chooseFileOptions)
      // #endif
    }
    else {
      uni.chooseFile({
        ...chooseFileOptions,
        type: 'all',
      })
    }
  }

  return { loading, error, data, run, resetUploadState }
}

async function uploadFile({
  tempFilePath,
  formData,
  onSuccess,
  onError,
  onComplete,
}: {
  tempFilePath: string
  formData: Record<string, any>
  onSuccess: (data: any) => void
  onError: (err: any) => void
  onComplete: () => void
}) {
  uni.uploadFile({
    url: VITE_UPLOAD_BASEURL,
    filePath: tempFilePath,
    name: 'file',
    formData,
    success: (uploadFileRes) => {
      try {
        const data = uploadFileRes.data
        onSuccess(data)
      }
      catch (err) {
        onError(err)
      }
    },
    fail: (err) => {
      console.error('Upload failed:', err)
      onError(err)
    },
    complete: onComplete,
  })
}
