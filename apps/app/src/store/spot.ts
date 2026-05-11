import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/** 美食地点 */
export interface FoodSpot {
  id: number
  name: string
  cover: string
  images: string[]
  address: string
  rating: number
  latitude: number
  longitude: number
  tags: string[]
  avgPrice: number
  description: string
  phone: string
  openTime: string
}

/** 评价 */
export interface ReviewItem {
  id: number
  userName: string
  avatar: string
  rating: number
  content: string
  images: string[]
  time: string
  likeCount?: number
}

/** 问答 */
export interface QAItem {
  id: number
  question: string
  asker: string
  askerAvatar: string
  time: string
  answers: {
    id: number
    content: string
    userName: string
    avatar: string
    time: string
  }[]
}

/** 笔记 */
export interface NoteItem {
  id: number
  title: string
  content: string
  cover: string
  userName: string
  avatar: string
  likeCount: number
  time: string
}

/** 地点完整数据（带评价/问答/笔记） */
export interface SpotDetail extends FoodSpot {
  reviews: ReviewItem[]
  qaList: QAItem[]
  notes: NoteItem[]
}

// 模拟数据
const MOCK_SPOTS: SpotDetail[] = [
  {
    id: 1,
    name: '老王烧烤',
    cover: 'https://placehold.co/400x300/ff6633/white?text=BBQ',
    images: [
      'https://placehold.co/750x400/ff6633/white?text=1',
      'https://placehold.co/750x400/e63946/white?text=2',
      'https://placehold.co/750x400/457b9d/white?text=3',
    ],
    address: '人民路88号',
    rating: 4.8,
    latitude: 39.908823,
    longitude: 116.39747,
    tags: ['烧烤', '夜宵', '聚餐'],
    avgPrice: 68,
    description:
      '正宗炭火烧烤，选用上等食材，独家秘制酱料，十年老店口碑之选。环境宽敞舒适，适合朋友聚餐、家庭聚会。',
    phone: '010-12345678',
    openTime: '17:00 - 02:00',
    reviews: [
      {
        id: 1,
        userName: '美食达人小李',
        avatar: 'https://placehold.co/80/ff6633/white?text=Li',
        rating: 5,
        content:
          '环境很好，烤串特别好吃，尤其是羊肉串和烤鱼，强烈推荐！服务态度也非常好，下次还会再来。',
        images: ['https://placehold.co/200x200/ff6633/white?text=R1'],
        time: '2026-03-08',
      },
      {
        id: 2,
        userName: '吃货王大明',
        avatar: 'https://placehold.co/80/457b9d/white?text=W',
        rating: 4,
        content:
          '味道不错，就是等位时间有点长，建议提前预约。烤茄子和五花肉是必点菜品。',
        images: [],
        time: '2026-03-05',
      },
      {
        id: 3,
        userName: '周末探店',
        avatar: 'https://placehold.co/80/2a9d8f/white?text=Z',
        rating: 5,
        content: '朋友推荐来的，果然没有失望！价格也很合理，分量十足。',
        images: [
          'https://placehold.co/200x200/e63946/white?text=R2',
          'https://placehold.co/200x200/f4a261/white?text=R3',
        ],
        time: '2026-03-01',
      },
    ],
    qaList: [
      {
        id: 1,
        question: '有包间吗？大概能坐多少人？',
        asker: '小红',
        askerAvatar: 'https://placehold.co/80/e63946/white?text=X',
        time: '2026-03-06',
        answers: [
          {
            id: 1,
            content: '有的，大包间能坐12人，小包间6人，建议提前电话预约。',
            userName: '店主回复',
            avatar: 'https://placehold.co/80/ff6633/white?text=Boss',
            time: '2026-03-06',
          },
        ],
      },
      {
        id: 2,
        question: '可以带宠物吗？',
        asker: '爱猫人士',
        askerAvatar: 'https://placehold.co/80/f4a261/white?text=M',
        time: '2026-03-03',
        answers: [
          {
            id: 2,
            content: '户外区域可以，室内暂时不行哦~',
            userName: '店主回复',
            avatar: 'https://placehold.co/80/ff6633/white?text=Boss',
            time: '2026-03-04',
          },
        ],
      },
    ],
    notes: [
      {
        id: 1,
        title: '深夜烧烤攻略！这家必须安排',
        content:
          '上周和朋友误打误撞进了这家店，没想到是隐藏宝藏！必点：秘制羊肉串、蒜蓉烤生蚝、烤鱼...',
        cover: 'https://placehold.co/400x300/ff6633/white?text=Note1',
        userName: '探店小能手',
        avatar: 'https://placehold.co/80/ff6633/white?text=T',
        likeCount: 128,
        time: '2026-03-07',
      },
      {
        id: 2,
        title: '带爸妈来吃烧烤，老人家也说好',
        content:
          '周末带爸妈过来聚餐，环境干净整洁，食材新鲜，老人家都吃得很开心...',
        cover: 'https://placehold.co/400x300/2a9d8f/white?text=Note2',
        userName: '孝顺的小明',
        avatar: 'https://placehold.co/80/2a9d8f/white?text=M',
        likeCount: 56,
        time: '2026-03-02',
      },
    ],
  },
  {
    id: 2,
    name: '川味坊',
    cover: 'https://placehold.co/400x300/e63946/white?text=Chuan',
    images: [
      'https://placehold.co/750x400/e63946/white?text=1',
      'https://placehold.co/750x400/ff6633/white?text=2',
    ],
    address: '解放大道120号',
    rating: 4.6,
    latitude: 39.915,
    longitude: 116.404,
    tags: ['川菜', '火锅', '麻辣'],
    avgPrice: 88,
    description:
      '地道川渝风味，麻辣鲜香一应俱全。招牌毛血旺、水煮鱼片深受食客喜爱，还有各式小面和抄手。',
    phone: '010-23456789',
    openTime: '11:00 - 22:00',
    reviews: [
      {
        id: 4,
        userName: '辣味爱好者',
        avatar: 'https://placehold.co/80/e63946/white?text=L',
        rating: 5,
        content: '正宗川菜味道！毛血旺太正了，辣度可以自选，服务也很周到。',
        images: ['https://placehold.co/200x200/e63946/white?text=C1'],
        time: '2026-03-09',
      },
    ],
    qaList: [
      {
        id: 3,
        question: '有不辣的菜可以选吗？',
        asker: '不吃辣星人',
        askerAvatar: 'https://placehold.co/80/457b9d/white?text=B',
        time: '2026-03-07',
        answers: [
          {
            id: 3,
            content: '有的，菜单上标了辣度，也有清淡口味的汤品和小炒。',
            userName: '店主回复',
            avatar: 'https://placehold.co/80/e63946/white?text=Boss',
            time: '2026-03-07',
          },
        ],
      },
    ],
    notes: [],
  },
  {
    id: 3,
    name: '日式拉面屋',
    cover: 'https://placehold.co/400x300/457b9d/white?text=Ramen',
    images: [
      'https://placehold.co/750x400/457b9d/white?text=1',
      'https://placehold.co/750x400/2a9d8f/white?text=2',
    ],
    address: '文化街56号',
    rating: 4.5,
    latitude: 39.905,
    longitude: 116.39,
    tags: ['日料', '拉面'],
    avgPrice: 45,
    description:
      '日式豚骨拉面专门店，汤底熬制12小时以上，面条手工制作，还原日本风味。',
    phone: '010-34567890',
    openTime: '10:30 - 21:30',
    reviews: [
      {
        id: 5,
        userName: '拉面控',
        avatar: 'https://placehold.co/80/457b9d/white?text=R',
        rating: 4,
        content: '豚骨汤底很浓郁，面条筋道。叉烧再厚一点就更好了。',
        images: [],
        time: '2026-03-04',
      },
    ],
    qaList: [],
    notes: [
      {
        id: 3,
        title: '一碗拉面的治愈力量',
        content:
          '冬日里一碗热腾腾的豚骨拉面，从胃暖到心。这家小店虽然不大，但真的很用心...',
        cover: 'https://placehold.co/400x300/457b9d/white?text=Note3',
        userName: '冬日食记',
        avatar: 'https://placehold.co/80/457b9d/white?text=D',
        likeCount: 89,
        time: '2026-03-03',
      },
    ],
  },
  {
    id: 4,
    name: '甜蜜时光',
    cover: 'https://placehold.co/400x300/f4a261/white?text=Dessert',
    images: [
      'https://placehold.co/750x400/f4a261/white?text=1',
      'https://placehold.co/750x400/ff6633/white?text=2',
    ],
    address: '新华路200号',
    rating: 4.9,
    latitude: 39.912,
    longitude: 116.395,
    tags: ['甜品', '下午茶', '咖啡'],
    avgPrice: 35,
    description:
      '精致甜品与手冲咖啡的完美搭配。招牌提拉米苏、芒果千层，每日限量供应。',
    phone: '010-45678901',
    openTime: '10:00 - 21:00',
    reviews: [
      {
        id: 6,
        userName: '甜品控小花',
        avatar: 'https://placehold.co/80/f4a261/white?text=H',
        rating: 5,
        content: '提拉米苏绝了！咖啡也很好喝，环境很适合拍照，闺蜜下午茶首选！',
        images: [
          'https://placehold.co/200x200/f4a261/white?text=D1',
          'https://placehold.co/200x200/ff6633/white?text=D2',
        ],
        time: '2026-03-10',
      },
    ],
    qaList: [],
    notes: [],
  },
  {
    id: 5,
    name: '粤式茶餐厅',
    cover: 'https://placehold.co/400x300/2a9d8f/white?text=Yue',
    images: [
      'https://placehold.co/750x400/2a9d8f/white?text=1',
      'https://placehold.co/750x400/457b9d/white?text=2',
    ],
    address: '和平广场3楼',
    rating: 4.7,
    latitude: 39.92,
    longitude: 116.41,
    tags: ['粤菜', '早茶', '点心'],
    avgPrice: 78,
    description:
      '传承正宗广式点心手艺，虾饺、烧麦、叉烧包样样精通。早茶时段尤其推荐。',
    phone: '010-56789012',
    openTime: '07:00 - 22:00',
    reviews: [
      {
        id: 7,
        userName: '早茶达人',
        avatar: 'https://placehold.co/80/2a9d8f/white?text=Z',
        rating: 5,
        content: '虾饺皮薄馅大，烧麦也很鲜。周末早茶人会比较多，建议早点来。',
        images: ['https://placehold.co/200x200/2a9d8f/white?text=Y1'],
        time: '2026-03-08',
      },
    ],
    qaList: [
      {
        id: 4,
        question: '可以外卖吗？',
        asker: '懒人一号',
        askerAvatar: 'https://placehold.co/80/f4a261/white?text=L',
        time: '2026-03-05',
        answers: [
          {
            id: 4,
            content: '支持美团和饿了么外卖哦，不过堂食体验更好~',
            userName: '店主回复',
            avatar: 'https://placehold.co/80/2a9d8f/white?text=Boss',
            time: '2026-03-05',
          },
        ],
      },
    ],
    notes: [
      {
        id: 4,
        title: '周末早茶指南：这家粤式茶餐厅必打卡',
        content:
          '作为一个广东人，对早茶要求很高。这家店的虾饺、凤爪、肠粉都很正宗...',
        cover: 'https://placehold.co/400x300/2a9d8f/white?text=Note4',
        userName: '广东老饕',
        avatar: 'https://placehold.co/80/2a9d8f/white?text=G',
        likeCount: 203,
        time: '2026-03-06',
      },
    ],
  },
]

export const useSpotStore = defineStore('spot', () => {
  const spots = ref<SpotDetail[]>(MOCK_SPOTS)

  /** 根据关键词搜索地点 */
  const searchSpots = (keyword: string): SpotDetail[] => {
    if (!keyword.trim())
      return spots.value
    const kw = keyword.toLowerCase()
    return spots.value.filter(
      s =>
        s.name.toLowerCase().includes(kw)
        || s.tags.some(t => t.toLowerCase().includes(kw))
        || s.address.toLowerCase().includes(kw),
    )
  }

  /** 根据 id 获取地点详情 */
  const getSpotById = (id: number): SpotDetail | undefined => {
    return spots.value.find(s => s.id === id)
  }

  /** 获取所有地点（用于地图标记） */
  const allSpots = computed(() => spots.value)

  return {
    spots,
    allSpots,
    searchSpots,
    getSpotById,
  }
})
