/**
 * 前后端共享类型定义和工具函数
 */

// ==================== 通用响应类型 ====================

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export interface PaginatedResponse<T = any> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ==================== 业务类型 ====================

export interface UserInfo {
  id: number;
  nickname: string;
  avatar: string;
  phone?: string;
  gender: number;
}

export interface CategoryItem {
  id: number;
  name: string;
  icon?: string;
  sort: number;
}

export interface FoodItem {
  id: number;
  name: string;
  description?: string;
  cover?: string;
  price?: number;
  tags?: string;
  categoryId: number;
  shopId?: number;
  viewCount: number;
  likeCount: number;
}

export interface ShopItem {
  id: number;
  name: string;
  description?: string;
  cover?: string;
  address?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  rating: number;
}

export interface ReviewItem {
  id: number;
  userId: number;
  foodId: number;
  content?: string;
  rating: number;
  images?: string[];
  createdAt: string;
}
