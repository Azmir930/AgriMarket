/**
 * Product Service - API calls for product-related operations
 */

import { apiGet, apiPost, buildQueryString } from '@/lib/api';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit_name: string;
  unit_abbr: string;
  category_name: string;
  stock_quantity: number;
  avg_rating: number;
  review_count: number;
  farm_name: string;
  farmer_first_name: string;
  farmer_last_name: string;
  images: ProductImage[];
  recent_reviews: Review[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  is_primary: boolean;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  parent_id: string | null;
  product_count?: number;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  sort?: 'newest' | 'price_low' | 'price_high' | 'rating' | 'relevance';
  farmer_id?: string;
}

/**
 * Fetch products list with filters
 */
export const fetchProducts = async (params: ProductListParams = {}) => {
  const queryString = buildQueryString({
    page: params.page || 1,
    limit: params.limit || 12,
    search: params.search || '',
    category: params.category || '',
    min_price: params.min_price,
    max_price: params.max_price,
    sort: params.sort || 'newest',
    farmer_id: params.farmer_id || '',
  });

  return apiGet<{
    success: boolean;
    data: Product[];
    categories?: Array<{ id: string; name: string; product_count: number }>;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  }>(`/buyer/products.php${queryString}`);
};

/**
 * Fetch single product details
 */
export const fetchProductDetails = async (productId: string) => {
  return apiGet<{
    success: boolean;
    data: Product;
  }>(`/buyer/products.php?id=${productId}`);
};

/**
 * Search products
 */
export const searchProducts = async (query: string) => {
  return apiGet<{
    success: boolean;
    data: any[];
  }>(`/api/search.php?q=${encodeURIComponent(query)}`);
};

/**
 * Fetch all categories
 */
export const fetchCategories = async (options: { includeCount?: boolean; parentOnly?: boolean; tree?: boolean } = {}) => {
  const queryString = buildQueryString({
    include_count: options.includeCount ? '1' : '',
    parent_only: options.parentOnly ? '1' : '',
    tree: options.tree ? '1' : '',
  });

  return apiGet<{
    success: boolean;
    data: Category[];
  }>(`/api/categories.php${queryString}`);
};

/**
 * Fetch single category
 */
export const fetchCategory = async (categoryId: string) => {
  return apiGet<{
    success: boolean;
    data: Category;
  }>(`/api/categories.php?id=${categoryId}`);
};

/**
 * Check product stock
 */
export const checkStock = async (productId: string, quantity: number) => {
  return apiGet<{
    success: boolean;
    available: boolean;
    stock: number;
  }>(`/api/stock.php?product_id=${productId}&quantity=${quantity}`);
};

/**
 * Submit product review
 */
export const submitReview = async (productId: string, data: { rating: number; comment: string }) => {
  return apiPost<{
    success: boolean;
    data: Review;
  }>(`/buyer/reviews.php?product_id=${productId}`, data);
};

/**
 * Fetch farmer inventory (farmer only)
 */
export const fetchFarmerInventory = async (params: { page?: number; limit?: number } = {}) => {
  const queryString = buildQueryString({
    page: params.page || 1,
    limit: params.limit || 12,
  });

  return apiGet<{
    success: boolean;
    data: any;
  }>(`/farmer/inventory.php${queryString}`);
};

/**
 * Create/update product (farmer only)
 */
export const saveProduct = async (productData: any) => {
  return apiPost<{
    success: boolean;
    data: any;
  }>('/farmer/products.php', productData);
};
