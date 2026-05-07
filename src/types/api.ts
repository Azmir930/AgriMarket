/**
 * API Response Types and Interfaces
 * Centralized type definitions for all backend responses
 */

// Generic API Response Wrapper
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Auth Responses
export interface AuthResponse {
  token: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    role_name: string;
    is_active: boolean;
  };
}

// User Types
export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
}

export interface BuyerProfile extends UserProfile {
  company_name?: string;
  gst_number?: string;
  is_verified: boolean;
}

export interface FarmerProfile extends UserProfile {
  farm_name: string;
  farm_location: string;
  farming_type: string;
  farm_size?: number;
  bio?: string;
  is_verified: boolean;
}

// Product Types
export interface ProductData {
  id: string;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  min_order_qty: number;
  is_organic: boolean;
  harvest_date: string;
  status: 'active' | 'inactive' | 'out_of_stock';
  category_id: string;
  category_name: string;
  unit_id: string;
  unit_name: string;
  unit_abbr: string;
  farmer_id: string;
  farm_name: string;
  farm_location: string;
  farmer_first_name: string;
  farmer_last_name: string;
  avg_rating: number;
  review_count: number;
  images: ProductImageData[];
  recent_reviews: ReviewData[];
  created_at: string;
  updated_at: string;
}

export interface ProductImageData {
  id: string;
  product_id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
}

export interface ProductListResponse {
  products: ProductData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Category Types
export interface CategoryData {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  parent_id?: string;
  product_count?: number;
  subcategories?: CategoryData[];
  is_active: boolean;
}

// Order Types
export interface OrderData {
  id: string;
  buyer_id: string;
  order_date: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  tax_amount: number;
  shipping_amount: number;
  subtotal: number;
  items: OrderItemData[];
  delivery_address?: AddressData;
  created_at: string;
  updated_at: string;
}

export interface OrderItemData {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  farmer_id: string;
  farm_name: string;
}

// Cart Types
export interface CartData {
  items: CartItemData[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  item_count: number;
}

export interface CartItemData {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  farmer_id: string;
  farm_name: string;
  image_url: string;
}

// Review Types
export interface ReviewData {
  id: string;
  product_id: string;
  buyer_id: string;
  rating: number;
  comment: string;
  first_name: string;
  last_name: string;
  created_at: string;
  helpful_count: number;
}

// Address Types
export interface AddressData {
  id: string;
  user_id: string;
  address_type: 'home' | 'work' | 'other';
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

// Wishlist Types
export interface WishlistItemData {
  id: string;
  user_id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  farmer_name: string;
  image_url: string;
  added_at: string;
}

// Inventory Types (Farmer)
export interface InventoryData {
  id: string;
  product_id: string;
  quantity: number;
  updated_at: string;
}

export interface InventoryLogData {
  id: string;
  product_id: string;
  change_type: 'added' | 'sold' | 'adjusted' | 'returned';
  quantity: number;
  previous_qty: number;
  new_qty: number;
  notes: string;
  created_at: string;
}

// Admin Types
export interface DashboardStats {
  total_users: number;
  total_farmers: number;
  total_buyers: number;
  total_products: number;
  active_products: number;
  total_orders: number;
  pending_orders: number;
  total_revenue: number;
  monthly_growth: number;
}

export interface UserManagementData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role_name: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  last_login?: string;
}

// Payment Types
export interface PaymentData {
  id: string;
  order_id: string;
  amount: number;
  payment_method: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  transaction_id: string;
  created_at: string;
  updated_at: string;
}

// Search Types
export interface SearchResult {
  products: ProductData[];
  farmers: FarmerProfile[];
  categories: CategoryData[];
}

// Pagination Types
export interface PaginationMeta {
  current_page: number;
  total_pages: number;
  total_items: number;
  items_per_page: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

// Error Response
export interface ErrorResponse {
  error: string;
  message?: string;
  details?: Record<string, string[]>;
}
