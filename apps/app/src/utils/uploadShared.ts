/** 上传接口常见的成功包裹格式。 */
interface UploadEnvelope<T> {
  data?: T
}

interface UploadErrorEnvelope {
  msg?: string
  message?: string | string[]
}

/** 兼容上传接口返回的字符串 JSON、对象包裹和原始字符串。 */
export function parseUploadResponseData<T>(rawData: unknown): T {
  const parsedData = parseUploadPayload(rawData)

  if (parsedData && typeof parsedData === 'object' && 'data' in parsedData) {
    return (parsedData as UploadEnvelope<T>).data as T
  }

  return parsedData as T
}

export function parseUploadErrorMessage(rawData: unknown, fallback = '上传失败') {
  const parsedData = parseUploadPayload(rawData)

  if (parsedData && typeof parsedData === 'object') {
    const { message, msg } = parsedData as UploadErrorEnvelope
    if (Array.isArray(message)) {
      return message.filter(Boolean).join('，') || fallback
    }

    if (typeof message === 'string' && message.trim()) {
      return message.trim()
    }

    if (typeof msg === 'string' && msg.trim()) {
      return msg.trim()
    }
  }

  if (typeof parsedData === 'string' && parsedData.trim()) {
    return parsedData.trim()
  }

  return fallback
}

function parseUploadPayload(rawData: unknown): unknown {
  if (typeof rawData === 'string') {
    const trimmedData = rawData.trim()

    if (!trimmedData) {
      return ''
    }

    try {
      return JSON.parse(trimmedData)
    }
    catch {
      return rawData
    }
  }

  return rawData
}

/** 把不同来源的异常统一成 Error，便于 hook 层稳定暴露。 */
export function normalizeUploadError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }

  if (error && typeof error === 'object' && 'errMsg' in error) {
    return new Error(String((error as { errMsg?: unknown }).errMsg || '上传失败'))
  }

  return new Error(typeof error === 'string' ? error : '上传失败')
}

/** 用户主动取消选择文件不应视为真正错误。 */
export function isUploadCancelled(error: unknown) {
  if (!error || typeof error !== 'object' || !('errMsg' in error)) {
    return false
  }

  return String((error as { errMsg?: unknown }).errMsg || '').toLowerCase().includes('cancel')
}

/** 尽量从文件名或路径推断扩展名，兼容不同平台的选择结果。 */
export function getFileExtension(filePath: string, fileName = '') {
  const normalizedSource = (fileName || filePath).split('?')[0]
  const fileSegment = normalizedSource.split('/').pop() || normalizedSource
  const extension = fileSegment.split('.').pop()
  return extension ? extension.toLowerCase() : ''
}

/** 文件类型白名单校验，* 表示跳过限制。 */
export function isAcceptedFile(fileExtension: string, acceptList: string[]) {
  if (!acceptList.length || acceptList.includes('*')) {
    return true
  }

  if (!fileExtension) {
    return false
  }

  return acceptList.map(item => item.toLowerCase()).includes(fileExtension)
}

/** 统一格式化上传大小提示，避免页面和 hook 各自拼接。 */
export function formatMaxSizeText(maxSizeInBytes: number) {
  const sizeInMb = maxSizeInBytes / 1024 / 1024
  return Number.isInteger(sizeInMb) ? `${sizeInMb}MB` : `${sizeInMb.toFixed(1)}MB`
}
