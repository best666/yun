import type { ISpotDetail } from '@/api/types/spot'
import { formatDistance } from '@/utils/formatDistance'

export interface SpotDetailHeroViewModel {
  title: string
  images: string[]
  hasPhone: boolean
  summaryText: string
  categoryText: string
  businessText: string
  highlightChips: string[]
  favoriteCountText: string
  ratingStars: string
  ratingText: string
  reviewCountText: string
  addressText: string
}

export interface SpotDetailSummaryChipViewModel {
  label: string
  count: number
}

export interface SpotDetailPanelViewModel {
  title: string
  subtitle: string
  emptyText: string
  moreText: string
}

export interface SpotDetailQuickReviewViewModel {
  title: string
  subtitle: string
  actionText: string
}

export interface SpotDetailReviewComposerViewModel {
  title: string
  imageActionText: string
  locationActionText: string
  locationLabel: string
  placeholder: string
  submitText: string
}

export interface SpotDetailReplyComposerViewModel {
  title: string
  targetTitle: string
  targetContent: string
  placeholder: string
  submitText: string
}

function formatCount(count?: number) {
  if (!count) {
    return '0'
  }

  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}w`
  }

  return String(count)
}

function renderStars(rating: number) {
  return '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '☆' : '')
}

function getSpotImages(detail: ISpotDetail) {
  return Array.isArray(detail.images) ? detail.images.filter(Boolean) : []
}

function getSpotTags(detail: ISpotDetail | null | undefined) {
  return Array.isArray(detail?.tags) ? detail.tags.filter(Boolean) : []
}

export function buildSpotDetailHeroViewModel(detail: ISpotDetail, options?: { distance?: number, favoriteCount?: number, reviewCount?: number }): SpotDetailHeroViewModel {
  const images = getSpotImages(detail)
  const tags = getSpotTags(detail)
  const summaryParts = [detail.navigationLabel]

  if (options?.distance !== undefined) {
    summaryParts.push(`${formatDistance(options.distance)} 距离`)
  }

  return {
    title: detail.name || '地点详情',
    images: images.length ? images : (detail.cover ? [detail.cover] : []),
    hasPhone: Boolean(detail.phone),
    summaryText: summaryParts.filter(Boolean).join(' · '),
    categoryText: tags.slice(0, 2).join('    '),
    businessText: [detail.businessStatus, detail.businessHours].filter(Boolean).join('   '),
    highlightChips: tags.slice(2, 6),
    favoriteCountText: formatCount(options?.favoriteCount ?? detail.favoriteCount),
    ratingStars: renderStars(detail.rating),
    ratingText: detail.rating.toFixed(1),
    reviewCountText: formatCount(options?.reviewCount ?? detail.reviewCount),
    addressText: detail.address || '暂无地址信息',
  }
}

export function buildSpotDetailHeatPanelViewModel(options: {
  reviewCount: number
  hotReviewCount: number
  reviewWithImagesCount: number
  hasMore: boolean
}): { panel: SpotDetailPanelViewModel, summaryChips: SpotDetailSummaryChipViewModel[] } {
  return {
    panel: {
      title: '热门评价',
      subtitle: '优先展示点赞更高、图片更完整的真实评价，继续下滑会自动切到评价',
      emptyText: '暂无热门评价，来留下第一条到店体验吧',
      moreText: options.hasMore ? '更多热门评价' : '',
    },
    summaryChips: [
      { label: '评价', count: options.reviewCount },
      { label: '高赞评价', count: options.hotReviewCount },
      { label: '有图评价', count: options.reviewWithImagesCount },
    ].filter(item => item.count > 0),
  }
}

export function buildSpotDetailReviewPanelViewModel(hasMore: boolean): SpotDetailPanelViewModel {
  return {
    title: '用户评价',
    subtitle: '评分、图文和现场定位都会展示在这里',
    emptyText: '还没有评价，来留下第一条印象吧',
    moreText: hasMore ? '全部' : '',
  }
}

export function buildSpotDetailQuickReviewViewModel(hasNoReviews: boolean): SpotDetailQuickReviewViewModel {
  return {
    title: hasNoReviews ? '点亮评分，发布首条评价' : '现场评价',
    subtitle: hasNoReviews ? '还没有评价，点亮星星发布第一条现场评价' : '为这家店补充你的真实体验和图片',
    actionText: '去评价',
  }
}

export function buildSpotDetailReviewComposerViewModel(options: {
  isUploadingImage: boolean
  hasLocation: boolean
  locationLabel: string
}): SpotDetailReviewComposerViewModel {
  return {
    title: '现场评价',
    imageActionText: options.isUploadingImage ? '上传中...' : '添加图片',
    locationActionText: options.hasLocation ? '重新定位' : '添加定位',
    locationLabel: options.locationLabel,
    placeholder: '分享这次到店体验、路线建议或者踩坑提醒',
    submitText: '发布现场评价',
  }
}

export function buildSpotDetailReplyComposerViewModel(options: {
  targetUserName?: string
  targetContent?: string
}): SpotDetailReplyComposerViewModel {
  return {
    title: '回复评价',
    targetTitle: options.targetUserName ? `回复 ${options.targetUserName}` : '',
    targetContent: options.targetContent || '',
    placeholder: '补充路线建议、避坑提醒或到店体验',
    submitText: '发布评价回复',
  }
}
