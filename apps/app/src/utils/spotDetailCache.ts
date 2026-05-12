import type { ISpotDetail, ISpotDetailQuery } from '@/api/types/spot'
import { getSpotDetail } from '@/api/spot'
import { normalizeSpotDetail } from './spotDetailNormalize'

const spotDetailCache = new Map<string, ISpotDetail>()
const pendingSpotDetailRequests = new Map<string, Promise<ISpotDetail>>()

function normalizeSpotDetailQueryValue(value: string | number | undefined) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  return String(value)
}

export function buildSpotDetailCacheKey(query: ISpotDetailQuery) {
  const normalizedEntries = Object.entries(query)
    .map(([key, value]) => [key, normalizeSpotDetailQueryValue(value as string | number | undefined)] as const)
    .filter(([, value]) => value !== undefined)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))

  return JSON.stringify(normalizedEntries)
}

export function getCachedSpotDetail(query: ISpotDetailQuery) {
  return spotDetailCache.get(buildSpotDetailCacheKey(query)) || null
}

export function setCachedSpotDetail(query: ISpotDetailQuery, detail: ISpotDetail) {
  const normalizedDetail = normalizeSpotDetail(detail, query)
  const cacheKeys = new Set<string>([
    buildSpotDetailCacheKey(query),
    buildSpotDetailCacheKey({ id: normalizedDetail.id }),
  ])

  cacheKeys.forEach((cacheKey) => {
    spotDetailCache.set(cacheKey, normalizedDetail)
  })

  return normalizedDetail
}

export async function fetchAndCacheSpotDetail(query: ISpotDetailQuery, force = false) {
  const cacheKey = buildSpotDetailCacheKey(query)
  if (!force) {
    const cachedDetail = spotDetailCache.get(cacheKey)
    if (cachedDetail) {
      return cachedDetail
    }
  }

  const pendingRequest = pendingSpotDetailRequests.get(cacheKey)
  if (pendingRequest) {
    return pendingRequest
  }

  const request = getSpotDetail(query)
    .then(detail => setCachedSpotDetail(query, detail))
    .finally(() => {
      pendingSpotDetailRequests.delete(cacheKey)
    })

  pendingSpotDetailRequests.set(cacheKey, request)
  return request
}
