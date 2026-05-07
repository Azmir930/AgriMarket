/**
 * Cart Service - API calls for cart operations
 */

import { apiGet, apiPost, apiDelete, buildQueryString } from '@/lib/api';

export interface CartItemData {
  product_id: string;
  quantity: number;
}

export interface CartResponse {
  success: boolean;
  data: {
    items: any[];
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
  };
}

/**
 * Add item to cart
 */
export const addToCart = async (productId: string, quantity: number) => {
  return apiPost<CartResponse>('/api/cart.php', {
    action: 'add',
    product_id: productId,
    quantity,
  });
};

/**
 * Get cart items
 */
export const getCart = async () => {
  return apiGet<CartResponse>('/api/cart.php');
};

/**
 * Update cart item quantity
 */
export const updateCartItem = async (productId: string, quantity: number) => {
  return apiPost<CartResponse>('/api/cart.php', {
    action: 'update',
    product_id: productId,
    quantity,
  });
};

/**
 * Remove item from cart
 */
export const removeFromCart = async (productId: string) => {
  return apiPost<CartResponse>('/api/cart.php', {
    action: 'remove',
    product_id: productId,
  });
};

/**
 * Clear entire cart
 */
export const clearCart = async () => {
  return apiPost<{
    success: boolean;
    message: string;
  }>('/api/cart.php', { action: 'clear' });
};

/**
 * Apply coupon code
 */
export const applyCoupon = async (code: string) => {
  return apiPost<{
    success: boolean;
    discount: number;
    message: string;
  }>('/buyer/checkout.php', {
    action: 'apply_coupon',
    coupon_code: code,
  });
};
