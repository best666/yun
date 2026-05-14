import type { Spot, SpotDiscussion, SpotExternalSource, SpotInteractionNotification, SpotNote, SpotQuestion, SpotQuestionAnswer, SpotReview, SpotReviewReply } from '@prisma/client';
import { ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { MapService, type AmapViewportPlaceItem } from '@/map/map.service';
import { PrismaService } from '@/prisma/prisma.service';
import { normalizeUserAvatar, normalizeUserNickname } from '@/user/user-profile.util';
import { CreateSpotDiscussionDto } from './dto/create-spot-discussion.dto';
import { CreateSpotReviewDto } from './dto/create-spot-review.dto';
import { CreateSpotReviewReplyDto } from './dto/create-spot-review-reply.dto';

interface SpotReviewReplyItem {
  id: string;
  content: string;
  userName: string;
  avatar: string;
  time: string;
  isMine: boolean;
}

interface MySpotReviewReplyItem extends SpotReviewReplyItem {
  reviewId: string;
  reviewContent: string;
  spotId: number;
  spotName: string;
}

interface SpotReviewItem {
  id: string;
  userName: string;
  avatar: string;
  rating: number;
  content: string;
  images: string[];
  locationName?: string;
  locationAddress?: string;
  time: string;
  likeCount: number;
  likedByCurrentUser: boolean;
  replyCount: number;
  replies: SpotReviewReplyItem[];
  isMine: boolean;
}

interface SpotDiscussionItem {
  id: string;
  userName: string;
  avatar: string;
  content: string;
  time: string;
  likeCount: number;
  likedByCurrentUser: boolean;
  isMine: boolean;
}

interface MySpotReviewItem extends SpotReviewItem {
  spotId: number;
  spotName: string;
}

interface MySpotDiscussionItem extends SpotDiscussionItem {
  spotId: number;
  spotName: string;
}

interface SpotNoteItem {
  id: string;
  title: string;
  content: string;
  cover: string;
  userName: string;
  avatar: string;
  likeCount: number;
  time: string;
  likedByCurrentUser: boolean;
  isMine: boolean;
}

interface SpotQuestionAnswerItem {
  id: string;
  content: string;
  userName: string;
  avatar: string;
  time: string;
  isMine: boolean;
}

interface SpotQuestionItem {
  id: string;
  question: string;
  asker: string;
  askerAvatar: string;
  time: string;
  isMine: boolean;
  answers: SpotQuestionAnswerItem[];
}

interface SpotInteractionNotificationItem {
  id: string;
  type: string;
  title: string;
  content: string;
  time: string;
  isRead: boolean;
  spotId?: number;
  spotName?: string;
  targetType?: string;
  targetId?: number;
  actorName: string;
  actorAvatar: string;
}

interface ToggleSpotReviewLikeResult {
  reviewId: string;
  liked: boolean;
  likeCount: number;
}

interface SpotInteractionNotificationListItem {
  unreadCount: number;
  items: SpotInteractionNotificationItem[];
}

interface SpotDetailItem {
  id: string;
  name: string;
  cover: string;
  images: string[];
  address: string;
  rating: number;
  reviewCount: number;
  favoriteCount: number;
  avgPrice: number;
  description: string;
  phone: string;
  businessStatus: string;
  businessHours: string;
  latitude: number;
  longitude: number;
  routeTip: string;
  navigationLabel: string;
  tags: string[];
  isFavorited: boolean;
  reviews: SpotReviewItem[];
  discussions: SpotDiscussionItem[];
  notes: SpotNoteItem[];
  questions: SpotQuestionItem[];
}

interface FavoriteSpotSummaryItem {
  id: string;
  name: string;
  cover: string;
  address: string;
  rating: number;
  avgPrice: number;
  latitude?: number;
  longitude?: number;
  provider?: string;
}

interface SpotDetailQuery {
  id?: string;
  title?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
  category?: string;
  district?: string;
  provider?: string;
}

interface SpotMapViewportQuery {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
  keyword?: string;
}

interface SeedSpot {
  name: string;
  cover: string;
  images: string[];
  address: string;
  rating: number;
  favoriteCount: number;
  avgPrice: number;
  description: string;
  phone: string;
  businessStatus: string;
  businessHours: string;
  latitude: number;
  longitude: number;
  routeTip: string;
  navigationLabel: string;
  tags: string[];
  reviews: Array<Omit<SpotReviewItem, 'isMine' | 'likedByCurrentUser' | 'replyCount' | 'replies'> & { replyCount?: number; replies?: SpotReviewReplyItem[] }>;
  discussions: Array<Omit<SpotDiscussionItem, 'isMine'>>;
  notes: Array<Omit<SpotNoteItem, 'isMine' | 'likedByCurrentUser'>>;
  questions: Array<Omit<SpotQuestionItem, 'isMine'>>;
}

interface SeedIdentity {
  userName: string;
  avatar: string;
}

function createSeedIdentity(suffix: string, color: string): SeedIdentity {
  return {
    userName: `云游之${suffix}`,
    avatar: `https://placehold.co/80/${color}/white?text=YY${suffix}`,
  };
}

const SEED_IDENTITIES = {
  y101: createSeedIdentity('101', 'ff6633'),
  y102: createSeedIdentity('102', '2a9d8f'),
  y103: createSeedIdentity('103', '1d3557'),
  y104: createSeedIdentity('104', 'e63946'),
  y105: createSeedIdentity('105', '457b9d'),
  y106: createSeedIdentity('106', 'f4a261'),
  y107: createSeedIdentity('107', 'f28482'),
  y108: createSeedIdentity('108', '8ecae6'),
  y109: createSeedIdentity('109', '14b8a6'),
  y110: createSeedIdentity('110', '4f46e5'),
  y111: createSeedIdentity('111', '6366f1'),
  y112: createSeedIdentity('112', '0ea5e9'),
} as const;

const MAP_SPOT_CACHE_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const MAP_SPOT_VIEW_LIMIT = 200;

const DEFAULT_SPOTS: SeedSpot[] = [
  {
    name: '老王烧烤',
    cover: 'https://placehold.co/400x300/ff6633/white?text=BBQ',
    images: [
      'https://placehold.co/960x540/ff6633/white?text=BBQ+1',
      'https://placehold.co/960x540/f08a5d/white?text=BBQ+2',
      'https://placehold.co/960x540/b83b5e/white?text=BBQ+3',
    ],
    address: '人民路88号昆明老街南入口旁',
    rating: 4.8,
    favoriteCount: 356,
    avgPrice: 68,
    description: '主打夜宵烧烤和朋友聚餐，炭火现烤，羊肉串、烤鱼和蒜香茄子是店里的招牌。',
    phone: '010-12345678',
    businessStatus: '营业中',
    businessHours: '17:00 - 02:00',
    latitude: 39.908823,
    longitude: 116.39747,
    routeTip: '距地铁站步行约6分钟，门口可临停',
    navigationLabel: '进入导航后沿人民路东行即可到达',
    tags: ['烧烤', '夜宵', '聚餐'],
    reviews: [
      {
        id: 'seed-r-1',
        ...SEED_IDENTITIES.y101,
        rating: 5,
        content: '羊肉串和烤鱼都很稳，炭火香特别明显，朋友聚餐氛围很好。',
        images: ['https://placehold.co/200x200/ff6633/white?text=BBQ+Review'],
        time: '2026-05-08',
        likeCount: 96,
      },
      {
        id: 'seed-r-2',
        ...SEED_IDENTITIES.y102,
        rating: 4,
        content: '排队会久一点，但出品稳定，适合晚上和朋友一起来。',
        images: [],
        time: '2026-05-05',
        likeCount: 48,
      },
    ],
    discussions: [
      {
        id: 'seed-d-1',
        ...SEED_IDENTITIES.y103,
        content: '22:00 后人最多，建议提前占位，烤鱼和五花肉几乎桌桌必点。',
        time: '2026-05-09',
        likeCount: 72,
        likedByCurrentUser: false,
      },
    ],
    notes: [
      {
        id: 'seed-n-1',
        title: '老街夜宵不踩雷攻略',
        content: '适合晚上和朋友一起去，推荐先点羊肉串和烤鱼，22 点后人会明显变多，最好提前到。',
        cover: 'https://placehold.co/400x300/ff6633/white?text=Note+1',
        ...SEED_IDENTITIES.y101,
        likeCount: 38,
        time: '2026-05-06',
      },
    ],
    questions: [
      {
        id: 'seed-q-1',
        question: '晚上 10 点后还需要排队吗？',
        asker: SEED_IDENTITIES.y102.userName,
        askerAvatar: SEED_IDENTITIES.y102.avatar,
        time: '2026-05-07',
        answers: [
          {
            id: 'seed-qa-1',
            content: '22 点左右人会更多，建议 9 点半前到或者先线上排位。',
            ...SEED_IDENTITIES.y103,
            time: '2026-05-07',
            isMine: false,
          },
        ],
      },
    ],
  },
  {
    name: '川味坊',
    cover: 'https://placehold.co/400x300/e63946/white?text=Chuan',
    images: [
      'https://placehold.co/960x540/e63946/white?text=Chuan+1',
      'https://placehold.co/960x540/d62828/white?text=Chuan+2',
    ],
    address: '解放大道120号二层临街铺面',
    rating: 4.6,
    favoriteCount: 204,
    avgPrice: 88,
    description: '主打川渝风味和多人聚餐，辣度可调，毛血旺和水煮鱼是高频推荐菜。',
    phone: '010-23456789',
    businessStatus: '营业中',
    businessHours: '11:00 - 22:00',
    latitude: 39.915,
    longitude: 116.404,
    routeTip: '附近商圈步行可达，晚高峰较拥堵',
    navigationLabel: '从解放大道北侧入口进入更方便',
    tags: ['川菜', '火锅', '麻辣'],
    reviews: [
      {
        id: 'seed-r-3',
        ...SEED_IDENTITIES.y104,
        rating: 5,
        content: '毛血旺很到位，香辣但不呛，服务效率也不错。',
        images: [],
        time: '2026-05-03',
        likeCount: 61,
      },
    ],
    discussions: [
      {
        id: 'seed-d-2',
        ...SEED_IDENTITIES.y105,
        content: '午市套餐性价比更高，工作日中午会比晚餐轻松很多。',
        time: '2026-05-02',
        likeCount: 18,
        likedByCurrentUser: false,
      },
    ],
    notes: [],
    questions: [
      {
        id: 'seed-q-2',
        question: '不太能吃辣的话推荐点什么？',
        asker: SEED_IDENTITIES.y108.userName,
        askerAvatar: SEED_IDENTITIES.y108.avatar,
        time: '2026-05-04',
        answers: [
          {
            id: 'seed-qa-2',
            content: '可以点小炒黄牛肉和菌汤，辣度都能调。',
            ...SEED_IDENTITIES.y105,
            time: '2026-05-04',
            isMine: false,
          },
        ],
      },
    ],
  },
  {
    name: '日式拉面屋',
    cover: 'https://placehold.co/400x300/457b9d/white?text=Ramen',
    images: [
      'https://placehold.co/960x540/457b9d/white?text=Ramen+1',
      'https://placehold.co/960x540/1d3557/white?text=Ramen+2',
    ],
    address: '文化街56号创意园北门旁',
    rating: 4.5,
    favoriteCount: 182,
    avgPrice: 45,
    description: '豚骨拉面和小食组合很受欢迎，适合一个人快吃，也适合周末随手打卡。',
    phone: '010-34567890',
    businessStatus: '营业中',
    businessHours: '10:30 - 21:30',
    latitude: 39.905,
    longitude: 116.39,
    routeTip: '创意园北门进来后右转约80米',
    navigationLabel: '建议从文化街路侧步行进入园区',
    tags: ['日料', '拉面'],
    reviews: [
      {
        id: 'seed-r-4',
        ...SEED_IDENTITIES.y105,
        rating: 4,
        content: '汤底浓郁，面条筋道，叉烧的火候也合适。',
        images: [],
        time: '2026-05-01',
        likeCount: 34,
      },
    ],
    discussions: [
      {
        id: 'seed-d-3',
        ...SEED_IDENTITIES.y102,
        content: '工作日晚上 7 点后排队会少很多，想安静吃饭可以错峰。',
        time: '2026-04-29',
        likeCount: 22,
        likedByCurrentUser: false,
      },
    ],
    notes: [],
    questions: [],
  },
  {
    name: '甜蜜时光',
    cover: 'https://placehold.co/400x300/f4a261/white?text=Dessert',
    images: [
      'https://placehold.co/960x540/f4a261/white?text=Dessert+1',
      'https://placehold.co/960x540/e76f51/white?text=Dessert+2',
    ],
    address: '新华路200号独栋玻璃房',
    rating: 4.9,
    favoriteCount: 422,
    avgPrice: 35,
    description: '适合下午茶和拍照，甜品更新快，提拉米苏和千层蛋糕出镜率很高。',
    phone: '010-45678901',
    businessStatus: '营业中',
    businessHours: '10:00 - 21:00',
    latitude: 39.912,
    longitude: 116.395,
    routeTip: '门口有少量路侧车位，周末建议步行或打车',
    navigationLabel: '导航到新华路200号后沿玻璃外立面即可找到',
    tags: ['甜品', '下午茶', '咖啡'],
    reviews: [
      {
        id: 'seed-r-5',
        ...SEED_IDENTITIES.y106,
        rating: 5,
        content: '甜品颜值高而且不齁，适合约会和闺蜜拍照。',
        images: ['https://placehold.co/200x200/f4a261/white?text=Dessert+Review'],
        time: '2026-05-07',
        likeCount: 103,
      },
    ],
    discussions: [
      {
        id: 'seed-d-4',
        ...SEED_IDENTITIES.y107,
        content: '下午 4 点左右自然光最好，靠窗位比二层更适合拍照。',
        time: '2026-05-04',
        likeCount: 59,
        likedByCurrentUser: false,
      },
    ],
    notes: [
      {
        id: 'seed-n-2',
        title: '下午茶拍照位记录',
        content: '靠窗位置更适合拍甜品，建议工作日下午 4 点左右去，光线最稳定。',
        cover: 'https://placehold.co/400x300/f4a261/white?text=Note+2',
        ...SEED_IDENTITIES.y106,
        likeCount: 27,
        time: '2026-05-08',
      },
    ],
    questions: [
      {
        id: 'seed-q-3',
        question: '周末几点去拍照比较好？',
        asker: SEED_IDENTITIES.y107.userName,
        askerAvatar: SEED_IDENTITIES.y107.avatar,
        time: '2026-05-08',
        answers: [
          {
            id: 'seed-qa-3',
            content: '下午四点到五点的自然光最好，靠窗位更出片。',
            ...SEED_IDENTITIES.y106,
            time: '2026-05-08',
            isMine: false,
          },
        ],
      },
    ],
  },
  {
    name: '粤式茶餐厅',
    cover: 'https://placehold.co/400x300/2a9d8f/white?text=Yue',
    images: [
      'https://placehold.co/960x540/2a9d8f/white?text=Yue+1',
      'https://placehold.co/960x540/264653/white?text=Yue+2',
    ],
    address: '和平广场3楼中庭侧',
    rating: 4.7,
    favoriteCount: 268,
    avgPrice: 78,
    description: '适合周末早茶和家庭聚餐，点心种类多，口味偏传统广式。',
    phone: '010-56789012',
    businessStatus: '营业中',
    businessHours: '07:00 - 22:00',
    latitude: 39.92,
    longitude: 116.41,
    routeTip: '商场停车方便，周末高峰建议早点到',
    navigationLabel: '到和平广场后乘扶梯到三层中庭侧',
    tags: ['粤菜', '早茶', '点心'],
    reviews: [
      {
        id: 'seed-r-6',
        ...SEED_IDENTITIES.y102,
        rating: 5,
        content: '虾饺和叉烧包都很稳，长辈也会喜欢。',
        images: [],
        time: '2026-05-10',
        likeCount: 88,
      },
    ],
    discussions: [
      {
        id: 'seed-d-5',
        ...SEED_IDENTITIES.y108,
        content: '早上 9 点前到基本不用等位，带老人孩子会舒服很多。',
        time: '2026-05-08',
        likeCount: 41,
        likedByCurrentUser: false,
      },
    ],
    notes: [],
    questions: [],
  },
];

@Injectable()
export class SpotService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapService: MapService,
  ) {}

  async onModuleInit() {
    await this.ensureSeedData();
  }

  async getSpotDetail(query: SpotDetailQuery, currentUserId?: number): Promise<SpotDetailItem> {
    const resolvedSpot = await this.resolveSpot(query);
    return await this.toSpotDetailItem(resolvedSpot, currentUserId);
  }

  async getMapViewportSpots(query: SpotMapViewportQuery) {
    const bounds = this.normalizeViewportBounds(query);
    const cachedSpots = await this.findViewportSpotsFromCache(bounds, true);

    if (cachedSpots.length > 0) {
      return cachedSpots;
    }

    await this.syncViewportSpots(bounds);

    return await this.findViewportSpotsFromCache(bounds, false);
  }

  async getFavoriteList(userId: number) {
    const favorites = await this.prisma.spotFavorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        spot: {
          include: {
            externalSources: true,
          },
        },
      },
    });

    return favorites.map(favorite => this.toFavoriteSummary(favorite.spot));
  }

  private normalizeViewportBounds(query: SpotMapViewportQuery) {
    const minLatitude = Number(query.minLatitude);
    const maxLatitude = Number(query.maxLatitude);
    const minLongitude = Number(query.minLongitude);
    const maxLongitude = Number(query.maxLongitude);

    if (![minLatitude, maxLatitude, minLongitude, maxLongitude].every(value => Number.isFinite(value))) {
      throw new NotFoundException('地图范围参数无效');
    }

    return {
      minLatitude: Math.min(minLatitude, maxLatitude),
      maxLatitude: Math.max(minLatitude, maxLatitude),
      minLongitude: Math.min(minLongitude, maxLongitude),
      maxLongitude: Math.max(minLongitude, maxLongitude),
      keyword: query.keyword?.trim() || '美食',
    };
  }

  private async findViewportSpotsFromCache(
    bounds: ReturnType<SpotService['normalizeViewportBounds']>,
    onlyFresh: boolean,
  ) {
    const cacheCutoff = new Date(Date.now() - MAP_SPOT_CACHE_TTL_MS);
    const externalSources = await this.prisma.spotExternalSource.findMany({
      where: {
        provider: 'amap',
        latitude: {
          gte: bounds.minLatitude,
          lte: bounds.maxLatitude,
        },
        longitude: {
          gte: bounds.minLongitude,
          lte: bounds.maxLongitude,
        },
        ...(onlyFresh
          ? {
              updatedAt: {
                gte: cacheCutoff,
              },
            }
          : {}),
      },
      include: {
        spot: true,
      },
      take: MAP_SPOT_VIEW_LIMIT,
    });

    const center = {
      latitude: (bounds.minLatitude + bounds.maxLatitude) / 2,
      longitude: (bounds.minLongitude + bounds.maxLongitude) / 2,
    };

    return externalSources
      .filter(source => Boolean(source.spot))
      .map((source) => {
        const spot = source.spot!;
        return {
          id: String(spot.id),
          title: spot.name,
          address: source.address || spot.address || '',
          category: source.category || spot.tags || '',
          district: source.district || '',
          latitude: Number(source.latitude || spot.latitude || 0),
          longitude: Number(source.longitude || spot.longitude || 0),
          distance: this.calculateDistanceMeters(center, {
            latitude: Number(source.latitude || spot.latitude || 0),
            longitude: Number(source.longitude || spot.longitude || 0),
          }),
        };
      })
      .sort((left, right) => (left.distance || 0) - (right.distance || 0))
      .slice(0, MAP_SPOT_VIEW_LIMIT);
  }

  private async syncViewportSpots(bounds: ReturnType<SpotService['normalizeViewportBounds']>) {
    const places = await this.mapService.searchAmapViewportPlaces({
      keyword: bounds.keyword,
      minLatitude: bounds.minLatitude,
      maxLatitude: bounds.maxLatitude,
      minLongitude: bounds.minLongitude,
      maxLongitude: bounds.maxLongitude,
      limit: MAP_SPOT_VIEW_LIMIT,
    });

    for (const place of places) {
      await this.upsertViewportSpot(place);
    }
  }

  private async upsertViewportSpot(place: AmapViewportPlaceItem) {
    const existingSource = await this.prisma.spotExternalSource.findUnique({
      where: {
        provider_externalId: {
          provider: 'amap',
          externalId: place.id,
        },
      },
      select: {
        spotId: true,
      },
    });

    if (existingSource?.spotId) {
      await this.prisma.spot.update({
        where: { id: existingSource.spotId },
        data: {
          name: place.title,
          address: `${place.district || ''}${place.address || ''}`,
          latitude: place.latitude,
          longitude: place.longitude,
          description: `${place.title}位于${place.district || '附近区域'}，已同步为首页地图点位，可继续查看详情、收藏和社区内容。`,
          routeTip: place.distance ? `${this.formatDistance(place.distance)} · ${place.district || '附近区域'}` : (place.district || '附近区域'),
          navigationLabel: '可直接使用导航前往，建议到店前再次确认营业状态',
          tags: this.normalizeTags(place.category).join(','),
          sourceType: 'map',
        },
      });

      await this.prisma.spotExternalSource.update({
        where: {
          provider_externalId: {
            provider: 'amap',
            externalId: place.id,
          },
        },
        data: {
          title: place.title,
          address: place.address,
          category: place.category,
          district: place.district,
          latitude: place.latitude,
          longitude: place.longitude,
        },
      });

      return;
    }

    await this.prisma.spot.create({
      data: {
        name: place.title,
        description: `${place.title}位于${place.district || '附近区域'}，已同步为首页地图点位，可继续查看详情、收藏和社区内容。`,
        cover: 'https://placehold.co/400x300/ea580c/white?text=MAP',
        images: JSON.stringify([]),
        address: `${place.district || ''}${place.address || ''}`,
        latitude: place.latitude,
        longitude: place.longitude,
        rating: 0,
        avgPrice: 0,
        favoriteCount: 0,
        businessStatus: '地图收录',
        businessHours: '以商家实际营业时间为准',
        routeTip: place.distance ? `${this.formatDistance(place.distance)} · ${place.district || '附近区域'}` : (place.district || '附近区域'),
        navigationLabel: '可直接使用导航前往，建议到店前再次确认营业状态',
        tags: this.normalizeTags(place.category).join(','),
        sourceType: 'map',
        externalSources: {
          create: {
            provider: 'amap',
            externalId: place.id,
            title: place.title,
            address: place.address,
            category: place.category,
            district: place.district,
            latitude: place.latitude,
            longitude: place.longitude,
          },
        },
      },
    });
  }

  async getMyReviews(userId: number) {
    const reviews = await this.prisma.spotReview.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        spot: true,
        likes: {
          select: {
            userId: true,
          },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return reviews.map(review => ({
      ...this.toReviewItem(review, userId),
      spotId: review.spotId,
      spotName: review.spot?.name || '未知地点',
    } satisfies MySpotReviewItem));
  }

  async getMyReviewReplies(userId: number) {
    const replies = await this.prisma.spotReviewReply.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        review: {
          include: {
            spot: true,
          },
        },
      },
    });

    return replies.map(reply => ({
      ...this.toReviewReplyItem(reply, userId),
      reviewId: String(reply.reviewId),
      reviewContent: reply.review?.content || '评价内容已不可见',
      spotId: reply.review?.spotId || 0,
      spotName: reply.review?.spot?.name || '未知地点',
    } satisfies MySpotReviewReplyItem));
  }

  async getMyInteractionNotifications(userId: number): Promise<SpotInteractionNotificationListItem> {
    const notifications = await this.prisma.spotInteractionNotification.findMany({
      where: { recipientUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        actorUser: true,
        spot: true,
      },
    });

    const unreadCount = await this.prisma.spotInteractionNotification.count({
      where: {
        recipientUserId: userId,
        isRead: false,
      },
    });

    return {
      unreadCount,
      items: notifications.map(notification => this.toInteractionNotificationItem(notification)),
    };
  }

  async markAllInteractionNotificationsRead(userId: number) {
    await this.prisma.spotInteractionNotification.updateMany({
      where: {
        recipientUserId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  }

  async deleteReview(reviewId: number, userId: number) {
    const review = await this.prisma.spotReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('评价不存在');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('无权删除该评价');
    }

    await this.prisma.spotReview.delete({
      where: { id: reviewId },
    });

    await this.refreshSpotRating(review.spotId);

    return { id: String(reviewId) };
  }

  async deleteReviewReply(replyId: number, userId: number) {
    const reply = await this.prisma.spotReviewReply.findUnique({
      where: { id: replyId },
    });

    if (!reply) {
      throw new NotFoundException('评价回复不存在');
    }

    if (reply.userId !== userId) {
      throw new ForbiddenException('无权删除该评价回复');
    }

    await this.prisma.spotReviewReply.delete({
      where: { id: replyId },
    });

    return { id: String(replyId) };
  }

  async toggleFavorite(spotId: number, userId: number) {
    const spot = await this.prisma.spot.findUnique({
      where: { id: spotId },
      include: {
        externalSources: true,
      },
    });

    if (!spot) {
      throw new NotFoundException('地点不存在');
    }

    const existingFavorite = await this.prisma.spotFavorite.findUnique({
      where: {
        userId_spotId: {
          userId,
          spotId,
        },
      },
    });

    const favorited = !existingFavorite;

    if (existingFavorite) {
      await this.prisma.spotFavorite.delete({
        where: {
          userId_spotId: {
            userId,
            spotId,
          },
        },
      });
    }
    else {
      await this.prisma.spotFavorite.create({
        data: {
          userId,
          spotId,
        },
      });
    }

    const favoriteCount = await this.refreshSpotFavoriteCount(spotId);

    return {
      spotId: String(spotId),
      favorited,
      favoriteCount,
      summary: this.toFavoriteSummary(spot),
    };
  }

  async createReview(dto: CreateSpotReviewDto, userId: number) {
    const user = await this.findUserOrThrow(userId);
    const spot = await this.findSpotOrThrow(dto.spotId);

    const review = await this.prisma.spotReview.create({
      data: {
        spotId: dto.spotId,
        userId,
        userName: this.resolveDisplayUserName(user),
        avatar: this.resolveDisplayAvatar(user.avatar),
        content: dto.content.trim(),
        rating: dto.rating,
        images: JSON.stringify((dto.images || []).filter(Boolean)),
        locationName: dto.locationName?.trim() || null,
        locationAddress: dto.locationAddress?.trim() || null,
      },
    });

    await this.refreshSpotRating(dto.spotId);
    await this.notifyFavoriteFollowersOnSpotUpdate({
      actorUserId: userId,
      actorName: this.resolveDisplayUserName(user),
      spotId: spot.id,
      spotName: spot.name,
      type: 'favorite_spot_new_review',
      title: '你收藏的地点有新评价',
      content: `在${spot.name}发布了新评价：${this.truncateText(review.content, 24)}`,
      targetType: 'review',
      targetId: review.id,
    });

    return this.toReviewItem(review);
  }

  async createReviewReply(dto: CreateSpotReviewReplyDto, userId: number) {
    const user = await this.findUserOrThrow(userId);
    const review = await this.prisma.spotReview.findUnique({
      where: { id: dto.reviewId },
    });

    if (!review) {
      throw new NotFoundException('评价不存在');
    }

    const reply = await this.prisma.spotReviewReply.create({
      data: {
        reviewId: dto.reviewId,
        userId,
        userName: this.resolveDisplayUserName(user),
        avatar: this.resolveDisplayAvatar(user.avatar),
        content: dto.content.trim(),
      },
    });

    await this.createInteractionNotification({
      recipientUserId: review.userId,
      actorUserId: userId,
      spotId: review.spotId,
      type: 'review_reply',
      title: '你的评价收到了新回复',
      content: `回复了你的评价：${this.truncateText(review.content, 26)}`,
      targetType: 'review',
      targetId: review.id,
    });

    return this.toReviewReplyItem(reply, userId);
  }

  async toggleReviewLike(reviewId: number, userId: number): Promise<ToggleSpotReviewLikeResult> {
    const review = await this.prisma.spotReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('评价不存在');
    }

    const existingLike = await this.prisma.spotReviewLike.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId,
        },
      },
    });

    const liked = !existingLike;

    if (existingLike) {
      await this.prisma.spotReviewLike.delete({
        where: {
          reviewId_userId: {
            reviewId,
            userId,
          },
        },
      });
    }
    else {
      await this.prisma.spotReviewLike.create({
        data: {
          reviewId,
          userId,
        },
      });

      await this.createInteractionNotification({
        recipientUserId: review.userId,
        actorUserId: userId,
        spotId: review.spotId,
        type: 'review_like',
        title: '你的评价收到了点赞',
        content: `点赞了你的评价：${this.truncateText(review.content, 26)}`,
        targetType: 'review',
        targetId: review.id,
      });
    }

    const likeCount = await this.refreshReviewLikeCount(reviewId);

    return {
      reviewId: String(reviewId),
      liked,
      likeCount,
    };
  }

  async createDiscussion(dto: CreateSpotDiscussionDto, userId: number) {
    const user = await this.findUserOrThrow(userId);
    const spot = await this.findSpotOrThrow(dto.spotId);

    const discussion = await this.prisma.spotDiscussion.create({
      data: {
        spotId: dto.spotId,
        userId,
        userName: this.resolveDisplayUserName(user),
        avatar: this.resolveDisplayAvatar(user.avatar),
        content: dto.content.trim(),
      },
    });

    await this.notifyFavoriteFollowersOnSpotUpdate({
      actorUserId: userId,
      actorName: this.resolveDisplayUserName(user),
      spotId: spot.id,
      spotName: spot.name,
      type: 'favorite_spot_new_discussion',
      title: '你收藏的地点有新讨论',
      content: `在${spot.name}发布了新讨论：${this.truncateText(discussion.content, 24)}`,
      targetType: 'discussion',
      targetId: discussion.id,
    });

    return this.toDiscussionItem(discussion, false, userId);
  }

  async getMyDiscussions(userId: number) {
    const discussions = await this.prisma.spotDiscussion.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        spot: true,
      },
    });

    const discussionIds = discussions.map(discussion => discussion.id);
    const likedDiscussionIds = discussionIds.length > 0
      ? await this.prisma.spotDiscussionLike.findMany({
          where: {
            userId,
            discussionId: { in: discussionIds },
          },
          select: {
            discussionId: true,
          },
        })
      : [];

    const likedDiscussionIdSet = new Set(likedDiscussionIds.map(item => item.discussionId));

    return discussions.map(discussion => ({
      ...this.toDiscussionItem(discussion, likedDiscussionIdSet.has(discussion.id), userId),
      spotId: discussion.spotId,
      spotName: discussion.spot?.name || '未知地点',
    } satisfies MySpotDiscussionItem));
  }

  async deleteDiscussion(discussionId: number, userId: number) {
    const discussion = await this.prisma.spotDiscussion.findUnique({
      where: { id: discussionId },
    });

    if (!discussion) {
      throw new NotFoundException('讨论不存在');
    }

    if (discussion.userId !== userId) {
      throw new ForbiddenException('无权删除该讨论');
    }

    await this.prisma.spotDiscussion.delete({
      where: { id: discussionId },
    });

    return { id: String(discussionId) };
  }

  async toggleDiscussionLike(discussionId: number, userId: number) {
    const discussion = await this.prisma.spotDiscussion.findUnique({
      where: { id: discussionId },
    });

    if (!discussion) {
      throw new NotFoundException('讨论不存在');
    }

    const existingLike = await this.prisma.spotDiscussionLike.findUnique({
      where: {
        discussionId_userId: {
          discussionId,
          userId,
        },
      },
    });

    const liked = !existingLike;

    if (existingLike) {
      await this.prisma.spotDiscussionLike.delete({
        where: {
          discussionId_userId: {
            discussionId,
            userId,
          },
        },
      });
    }
    else {
      await this.prisma.spotDiscussionLike.create({
        data: {
          discussionId,
          userId,
        },
      });

      await this.createInteractionNotification({
        recipientUserId: discussion.userId,
        actorUserId: userId,
        spotId: discussion.spotId,
        type: 'discussion_like',
        title: '你的讨论收到了点赞',
        content: `点赞了你的讨论：${this.truncateText(discussion.content, 26)}`,
        targetType: 'discussion',
        targetId: discussion.id,
      });
    }

    const likeCount = await this.refreshDiscussionLikeCount(discussionId);

    return {
      discussionId: String(discussionId),
      liked,
      likeCount,
    };
  }

  private async ensureSeedData() {
    const spotCount = await this.prisma.spot.count();
    if (spotCount > 0) {
      return;
    }

    for (const spot of DEFAULT_SPOTS) {
      await this.prisma.spot.create({
        data: {
          name: spot.name,
          description: spot.description,
          cover: spot.cover,
          images: JSON.stringify(spot.images),
          address: spot.address,
          phone: spot.phone,
          latitude: spot.latitude,
          longitude: spot.longitude,
          rating: spot.rating,
          avgPrice: spot.avgPrice,
          favoriteCount: spot.favoriteCount,
          businessStatus: spot.businessStatus,
          businessHours: spot.businessHours,
          routeTip: spot.routeTip,
          navigationLabel: spot.navigationLabel,
          tags: spot.tags.join(','),
          sourceType: 'manual',
          reviews: {
            create: spot.reviews.map(review => ({
              userName: review.userName,
              avatar: review.avatar,
              content: review.content,
              rating: review.rating,
              images: JSON.stringify(review.images),
              likeCount: review.likeCount,
              createdAt: new Date(review.time),
              replies: review.replies?.length
                ? {
                    create: review.replies.map(reply => ({
                      userName: reply.userName,
                      avatar: reply.avatar,
                      content: reply.content,
                      createdAt: new Date(reply.time),
                    })),
                  }
                : undefined,
            })),
          },
          discussions: {
            create: spot.discussions.map(discussion => ({
              userName: discussion.userName,
              avatar: discussion.avatar,
              content: discussion.content,
              likeCount: discussion.likeCount,
              createdAt: new Date(discussion.time),
            })),
          },
          notes: {
            create: spot.notes.map(note => ({
              userName: note.userName,
              avatar: note.avatar,
              title: note.title,
              content: note.content,
              cover: note.cover,
              likeCount: note.likeCount,
              createdAt: new Date(note.time),
            })),
          },
          questions: {
            create: spot.questions.map(question => ({
              userName: question.asker,
              avatar: question.askerAvatar,
              question: question.question,
              createdAt: new Date(question.time),
              answers: {
                create: question.answers.map(answer => ({
                  userName: answer.userName,
                  avatar: answer.avatar,
                  content: answer.content,
                  createdAt: new Date(answer.time),
                })),
              },
            })),
          },
        },
      });
    }
  }

  private async resolveSpot(query: SpotDetailQuery) {
    const rawId = query.id?.trim();

    if (rawId && /^\d+$/.test(rawId)) {
      const spot = await this.findSpotById(Number(rawId));
      if (!spot) {
        throw new NotFoundException('未找到地点详情');
      }
      return spot;
    }

    const provider = query.provider?.trim() || 'unknown';
    if (rawId) {
      const mappedSpot = await this.findSpotByExternalId(rawId, provider);
      if (mappedSpot) {
        return mappedSpot;
      }
    }

    if (!query.title?.trim() || typeof query.latitude !== 'number' || typeof query.longitude !== 'number') {
      throw new NotFoundException('未找到地点详情');
    }

    return await this.createMapSpot(query, rawId, provider);
  }

  private async findSpotById(id: number) {
    return await this.prisma.spot.findUnique({
      where: { id },
      include: this.spotInclude(),
    });
  }

  private async findSpotByExternalId(externalId: string, provider: string) {
    const mapped = await this.prisma.spotExternalSource.findFirst({
      where: provider === 'unknown'
        ? { externalId }
        : { provider, externalId },
      include: {
        spot: {
          include: this.spotInclude(),
        },
      },
    });

    return mapped?.spot || null;
  }

  private async createMapSpot(query: SpotDetailQuery, externalId?: string, provider = 'unknown') {
    const tags = this.normalizeTags(query.category);
    const distanceText = typeof query.distance === 'number' && Number.isFinite(query.distance)
      ? this.formatDistance(query.distance)
      : '步行可达';

    return await this.prisma.spot.create({
      data: {
        name: query.title!.trim(),
        description: `${query.title!.trim()}位于${query.district || '附近区域'}，当前通过地图搜索命中，适合作为附近就餐或打卡候选地点。`,
        cover: 'https://placehold.co/400x300/4f46e5/white?text=MAP',
        images: JSON.stringify([
          'https://placehold.co/960x540/4f46e5/white?text=Map+Spot',
          'https://placehold.co/960x540/0ea5e9/white?text=Nearby+Route',
        ]),
        address: `${query.district || ''}${query.address || ''}`,
        latitude: query.latitude,
        longitude: query.longitude,
        rating: 4.6,
        avgPrice: 58,
        favoriteCount: 84,
        businessStatus: '待确认',
        businessHours: '以商家实际营业时间为准',
        routeTip: `${distanceText} · ${query.district || '附近区域'}`,
        navigationLabel: '可直接使用导航前往，建议到店前再次确认营业状态',
        tags: tags.join(','),
        sourceType: 'map',
        reviews: {
          create: [
            {
              ...SEED_IDENTITIES.y110,
              content: `${query.title!.trim()}位置好找，${distanceText}左右可到，适合临时起意来吃一顿。`,
              rating: 5,
              images: JSON.stringify([]),
              likeCount: 19,
              replies: {
                create: [
                  {
                    ...SEED_IDENTITIES.y111,
                    content: '我晚饭点过去过一次，门口挺好找，进店速度也还可以。',
                  },
                ],
              },
            },
            {
              ...SEED_IDENTITIES.y112,
              content: `${query.category || '地图地点'}氛围不错，地址就在${query.address || '附近'}，第一次来也比较容易找到。`,
              rating: 4,
              images: JSON.stringify([]),
              likeCount: 12,
            },
          ],
        },
        discussions: {
          create: [
            {
              ...SEED_IDENTITIES.y111,
              content: `从当前位置导航过去比较顺，${distanceText}内通常能到。`,
              likeCount: 14,
            },
            {
              ...SEED_IDENTITIES.y109,
              content: `${query.district || '附近区域'}同类店不少，这家更适合想先看位置再决定的人。`,
              likeCount: 9,
            },
          ],
        },
        questions: {
          create: [
            {
              ...SEED_IDENTITIES.y110,
              question: `${query.title!.trim()}晚上高峰期大概需要等多久？`,
              answers: {
                create: [
                  {
                    ...SEED_IDENTITIES.y111,
                    content: '一般饭点会稍微排队，建议先导航过来再看现场情况。',
                  },
                ],
              },
            },
          ],
        },
        externalSources: externalId
          ? {
              create: {
                provider,
                externalId,
                title: query.title,
                address: query.address,
                category: query.category,
                district: query.district,
                latitude: query.latitude,
                longitude: query.longitude,
              },
            }
          : undefined,
      },
      include: this.spotInclude(),
    });
  }

  private async refreshSpotRating(spotId: number) {
    const aggregate = await this.prisma.spotReview.aggregate({
      where: { spotId },
      _avg: { rating: true },
    });

    await this.prisma.spot.update({
      where: { id: spotId },
      data: {
        rating: Number((aggregate._avg.rating || 0).toFixed(1)),
      },
    });
  }

  private async refreshSpotFavoriteCount(spotId: number) {
    const favoriteCount = await this.prisma.spotFavorite.count({
      where: { spotId },
    });

    await this.prisma.spot.update({
      where: { id: spotId },
      data: {
        favoriteCount,
      },
    });

    return favoriteCount;
  }

  private async refreshDiscussionLikeCount(discussionId: number) {
    const likeCount = await this.prisma.spotDiscussionLike.count({
      where: { discussionId },
    });

    await this.prisma.spotDiscussion.update({
      where: { id: discussionId },
      data: {
        likeCount,
      },
    });

    return likeCount;
  }

  private async refreshReviewLikeCount(reviewId: number) {
    const likeCount = await this.prisma.spotReviewLike.count({
      where: { reviewId },
    });

    await this.prisma.spotReview.update({
      where: { id: reviewId },
      data: {
        likeCount,
      },
    });

    return likeCount;
  }

  private async refreshNoteLikeCount(noteId: number) {
    const likeCount = await this.prisma.spotNoteLike.count({
      where: { noteId },
    });

    await this.prisma.spotNote.update({
      where: { id: noteId },
      data: {
        likeCount,
      },
    });

    return likeCount;
  }

  private spotInclude() {
    return {
      reviews: {
        orderBy: { createdAt: 'desc' as const },
        include: {
          likes: {
            select: {
              userId: true,
            },
          },
          replies: {
            orderBy: { createdAt: 'asc' as const },
          },
        },
      },
      discussions: {
        orderBy: { createdAt: 'desc' as const },
      },
      notes: {
        orderBy: { createdAt: 'desc' as const },
      },
      questions: {
        orderBy: { createdAt: 'desc' as const },
        include: {
          answers: {
            orderBy: { createdAt: 'asc' as const },
          },
        },
      },
      externalSources: true,
    };
  }

  private async toSpotDetailItem(
    spot: Spot & { reviews: (SpotReview & { replies: SpotReviewReply[]; likes: Array<{ userId: number }> })[]; discussions: SpotDiscussion[]; notes: SpotNote[]; questions: (SpotQuestion & { answers: SpotQuestionAnswer[] })[]; externalSources: SpotExternalSource[] },
    currentUserId?: number,
  ): Promise<SpotDetailItem> {
    const discussionIds = spot.discussions.map(discussion => discussion.id);
    const noteIds = spot.notes.map(note => note.id);
    const likedDiscussionIds = currentUserId && discussionIds.length > 0
      ? await this.prisma.spotDiscussionLike.findMany({
          where: {
            userId: currentUserId,
            discussionId: { in: discussionIds },
          },
          select: {
            discussionId: true,
          },
        })
      : [];

    const likedNoteIds = currentUserId && noteIds.length > 0
      ? await this.prisma.spotNoteLike.findMany({
          where: {
            userId: currentUserId,
            noteId: { in: noteIds },
          },
          select: {
            noteId: true,
          },
        })
      : [];

    const likedDiscussionIdSet = new Set(likedDiscussionIds.map(item => item.discussionId));
    const likedNoteIdSet = new Set(likedNoteIds.map(item => item.noteId));
    const isFavorited = currentUserId
      ? !!await this.prisma.spotFavorite.findUnique({
          where: {
            userId_spotId: {
              userId: currentUserId,
              spotId: spot.id,
            },
          },
        })
      : false;

    return {
      id: String(spot.id),
      name: spot.name,
      cover: spot.cover || 'https://placehold.co/400x300/ff6633/white?text=Spot',
      images: this.parseStringArray(spot.images),
      address: spot.address || '',
      rating: Number(spot.rating),
      reviewCount: spot.reviews.length,
      favoriteCount: spot.favoriteCount,
      avgPrice: spot.avgPrice,
      description: spot.description || '',
      phone: spot.phone || '',
      businessStatus: spot.businessStatus || '待确认',
      businessHours: spot.businessHours || '以商家实际营业时间为准',
      latitude: Number(spot.latitude || 0),
      longitude: Number(spot.longitude || 0),
      routeTip: spot.routeTip || '可直接导航前往',
      navigationLabel: spot.navigationLabel || '可直接使用导航前往',
      tags: this.parseTags(spot.tags),
      isFavorited,
      reviews: spot.reviews.map(review => this.toReviewItem(review, currentUserId)),
      discussions: spot.discussions.map(discussion => this.toDiscussionItem(discussion, likedDiscussionIdSet.has(discussion.id), currentUserId)),
      notes: spot.notes.map(note => this.toNoteItem(note, currentUserId, likedNoteIdSet.has(note.id))),
      questions: spot.questions.map(question => this.toQuestionItem(question, currentUserId)),
    };
  }

  private toReviewItem(review: SpotReview & { replies?: SpotReviewReply[]; likes?: Array<{ userId: number }> }, currentUserId?: number): SpotReviewItem {
    const reviewReplies = review.replies || [];
    const likedByCurrentUser = !!currentUserId && (review.likes || []).some(item => item.userId === currentUserId);

    return {
      id: String(review.id),
      userName: review.userName,
      avatar: review.avatar || '/static/images/default-avatar.png',
      rating: review.rating,
      content: review.content,
      images: this.parseStringArray(review.images),
      locationName: review.locationName || undefined,
      locationAddress: review.locationAddress || undefined,
      time: review.createdAt.toISOString().slice(0, 10),
      likeCount: review.likeCount,
      likedByCurrentUser,
      replyCount: reviewReplies.length,
      replies: reviewReplies.map(reply => this.toReviewReplyItem(reply, currentUserId)),
      isMine: !!currentUserId && review.userId === currentUserId,
    };
  }

  private toReviewReplyItem(reply: SpotReviewReply, currentUserId?: number): SpotReviewReplyItem {
    return {
      id: String(reply.id),
      content: reply.content,
      userName: reply.userName,
      avatar: reply.avatar || '/static/images/default-avatar.png',
      time: reply.createdAt.toISOString().slice(0, 10),
      isMine: !!currentUserId && reply.userId === currentUserId,
    };
  }

  private toDiscussionItem(discussion: SpotDiscussion, likedByCurrentUser: boolean, currentUserId?: number): SpotDiscussionItem {
    return {
      id: String(discussion.id),
      userName: discussion.userName,
      avatar: discussion.avatar || '/static/images/default-avatar.png',
      content: discussion.content,
      time: discussion.createdAt.toISOString().slice(0, 10),
      likeCount: discussion.likeCount,
      likedByCurrentUser,
      isMine: !!currentUserId && discussion.userId === currentUserId,
    };
  }

  private toNoteItem(note: SpotNote, currentUserId?: number, likedByCurrentUser = false): SpotNoteItem {
    return {
      id: String(note.id),
      title: note.title,
      content: note.content,
      cover: note.cover || 'https://placehold.co/400x300/ff6633/white?text=Spot+Note',
      userName: note.userName,
      avatar: note.avatar || '/static/images/default-avatar.png',
      likeCount: note.likeCount,
      time: note.createdAt.toISOString().slice(0, 10),
      likedByCurrentUser,
      isMine: !!currentUserId && note.userId === currentUserId,
    };
  }

  private toQuestionItem(question: SpotQuestion & { answers: SpotQuestionAnswer[] }, currentUserId?: number): SpotQuestionItem {
    return {
      id: String(question.id),
      question: question.question,
      asker: question.userName,
      askerAvatar: question.avatar || '/static/images/default-avatar.png',
      time: question.createdAt.toISOString().slice(0, 10),
      isMine: !!currentUserId && question.userId === currentUserId,
      answers: question.answers.map(answer => this.toQuestionAnswerItem(answer, currentUserId)),
    };
  }

  private toQuestionAnswerItem(answer: SpotQuestionAnswer, currentUserId?: number): SpotQuestionAnswerItem {
    return {
      id: String(answer.id),
      content: answer.content,
      userName: answer.userName,
      avatar: answer.avatar || '/static/images/default-avatar.png',
      time: answer.createdAt.toISOString().slice(0, 10),
      isMine: !!currentUserId && answer.userId === currentUserId,
    };
  }

  /** 将互动提醒转换成前端可直接展示的结构，避免页面再做二次映射。 */
  private toInteractionNotificationItem(
    notification: SpotInteractionNotification & { actorUser?: { nickname: string | null; username: string | null; phone: string | null; avatar: string | null } | null; spot?: Spot | null },
  ): SpotInteractionNotificationItem {
    return {
      id: String(notification.id),
      type: notification.type,
      title: notification.title,
      content: notification.content,
      time: notification.createdAt.toISOString().slice(0, 16).replace('T', ' '),
      isRead: notification.isRead,
      spotId: notification.spotId || undefined,
      spotName: notification.spot?.name || undefined,
      targetType: notification.targetType || undefined,
      targetId: notification.targetId || undefined,
      actorName: this.resolveDisplayUserName(notification.actorUser || {}),
      actorAvatar: this.resolveDisplayAvatar(notification.actorUser?.avatar),
    };
  }

  private resolveDisplayUserName(user: { id?: number | null; nickname?: string | null; username?: string | null; phone?: string | null; openid?: string | null; wechatOpenId?: string | null; douyinOpenId?: string | null }) {
    return normalizeUserNickname(user.nickname, {
      userId: user.id,
      username: user.username,
      phone: user.phone,
      openid: user.openid,
      wechatOpenId: user.wechatOpenId,
      douyinOpenId: user.douyinOpenId,
    });
  }

  private resolveDisplayAvatar(avatar?: string | null) {
    return normalizeUserAvatar(avatar);
  }

  /** 统一写入互动提醒，集中处理空接收者、自我互动和文案边界，减少业务方法重复判断。 */
  private async createInteractionNotification(params: {
    recipientUserId?: number | null;
    actorUserId: number;
    spotId?: number | null;
    type: string;
    title: string;
    content: string;
    targetType?: string;
    targetId?: number;
  }) {
    if (!params.recipientUserId || params.recipientUserId === params.actorUserId) {
      return;
    }

    await this.prisma.spotInteractionNotification.create({
      data: {
        recipientUserId: params.recipientUserId,
        actorUserId: params.actorUserId,
        spotId: params.spotId || null,
        type: params.type,
        title: params.title,
        content: params.content,
        targetType: params.targetType,
        targetId: params.targetId,
      },
    });
  }

  /** 收藏后的上新提醒会面向多个用户，这里统一批量写入，避免在各个创建方法里重复拼接列表。 */
  private async notifyFavoriteFollowersOnSpotUpdate(params: {
    actorUserId: number;
    actorName: string;
    spotId: number;
    spotName: string;
    type: string;
    title: string;
    content: string;
    targetType: string;
    targetId: number;
  }) {
    const favorites = await this.prisma.spotFavorite.findMany({
      where: {
        spotId: params.spotId,
        userId: {
          not: params.actorUserId,
        },
      },
      select: {
        userId: true,
      },
    });

    if (favorites.length === 0) {
      return;
    }

    await this.prisma.spotInteractionNotification.createMany({
      data: favorites.map(favorite => ({
        recipientUserId: favorite.userId,
        actorUserId: params.actorUserId,
        spotId: params.spotId,
        type: params.type,
        title: params.title,
        content: `${params.actorName}${params.content}`,
        targetType: params.targetType,
        targetId: params.targetId,
      })),
    });
  }

  /** 互动提醒文案会出现在列表里，这里做统一截断，避免长内容把布局撑坏。 */
  private truncateText(content: string, maxLength: number) {
    return content.length > maxLength ? `${content.slice(0, maxLength)}...` : content;
  }

  private toFavoriteSummary(spot: Spot & { externalSources: SpotExternalSource[] }): FavoriteSpotSummaryItem {
    const externalSource = spot.externalSources[0];

    return {
      id: String(spot.id),
      name: spot.name,
      cover: spot.cover || 'https://placehold.co/400x300/ff6633/white?text=Spot',
      address: spot.address || '',
      rating: Number(spot.rating),
      avgPrice: spot.avgPrice,
      latitude: spot.latitude ? Number(spot.latitude) : undefined,
      longitude: spot.longitude ? Number(spot.longitude) : undefined,
      provider: externalSource?.provider,
    };
  }

  private async findUserOrThrow(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  private async findSpotOrThrow(spotId: number) {
    const spot = await this.prisma.spot.findUnique({
      where: { id: spotId },
    });

    if (!spot) {
      throw new NotFoundException('地点不存在');
    }

    return spot;
  }

  private parseStringArray(value?: string | null) {
    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(value) as string[];
      return Array.isArray(parsed) ? parsed : [];
    }
    catch {
      return [];
    }
  }

  private parseTags(value?: string | null) {
    if (!value) {
      return [];
    }

    return value.split(',').map(tag => tag.trim()).filter(Boolean);
  }

  private normalizeTags(category?: string) {
    return (category || '地图地点')
      .split(/[\/|、]/)
      .map(tag => tag.trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  private formatDistance(distance: number) {
    if (distance >= 1000) {
      return `${(distance / 1000).toFixed(1)}km`;
    }

    return `${Math.round(distance)}m`;
  }

  private calculateDistanceMeters(
    start: { latitude: number; longitude: number },
    end: { latitude: number; longitude: number },
  ) {
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadius = 6371000;
    const latitudeDelta = toRadians(end.latitude - start.latitude);
    const longitudeDelta = toRadians(end.longitude - start.longitude);
    const startLatitude = toRadians(start.latitude);
    const endLatitude = toRadians(end.latitude);

    const haversine = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;

    return 2 * earthRadius * Math.asin(Math.sqrt(haversine));
  }
}
