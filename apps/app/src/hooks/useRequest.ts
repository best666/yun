import type { Ref } from 'vue'
import { ref } from 'vue'

interface IUseRequestOptions<T, P = undefined> {
  /** 是否立即执行 */
  immediate?: boolean
  /** 初始化数据 */
  initialData?: T
  /** 立即执行时传入的参数 */
  immediateArgs?: P
  /** 请求成功后的副作用 */
  onSuccess?: (data: T) => void
  /** 请求失败后的副作用 */
  onError?: (error: Error) => void
}

interface IUseRequestReturn<T, P = undefined> {
  loading: Ref<boolean>
  error: Ref<Error | null>
  data: Ref<T | undefined>
  run: (args?: P) => Promise<T | undefined>
  reset: () => void
}

/** 统一把 unknown 异常收口成 Error，避免页面处理多种错误形态。 */
function normalizeRequestError(error: unknown) {
  if (error instanceof Error) {
    return error
  }

  return new Error(typeof error === 'string' ? error : '请求失败')
}

/**
 * useRequest是一个定制化的请求钩子，用于处理异步请求和响应。
 * @param func 一个执行异步请求的函数，返回一个包含响应数据的Promise。
 * @param options 包含请求选项的对象 {immediate, initialData}。
 * @param options.immediate 是否立即执行请求，默认为false。
 * @param options.initialData 初始化数据，默认为undefined。
 * @returns 返回一个对象{loading, error, data, run}，包含请求的加载状态、错误信息、响应数据和手动触发请求的函数。
 */
export default function useRequest<T, P = undefined>(
  func: (args?: P) => Promise<T>,
  options: IUseRequestOptions<T, P> = {},
): IUseRequestReturn<T, P> {
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const data = ref<T | undefined>(options.initialData) as Ref<T | undefined>

  const reset = () => {
    loading.value = false
    error.value = null
    data.value = options.initialData
  }

  const run = async (args?: P) => {
    loading.value = true
    error.value = null

    try {
      const responseData = await func(args)
      data.value = responseData
      options.onSuccess?.(responseData)
      return responseData
    }
    catch (caughtError) {
      const normalizedError = normalizeRequestError(caughtError)
      error.value = normalizedError
      options.onError?.(normalizedError)
      throw normalizedError
    }
    finally {
      loading.value = false
    }
  }

  if (options.immediate) {
    void run(options.immediateArgs).catch(() => undefined)
  }

  return { loading, error, data, run, reset }
}
