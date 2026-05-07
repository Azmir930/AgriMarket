import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_BASE_URL } from '@/lib/api';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  image?: string;
  farmerId: string;
  farmerName: string;
  stock?: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  total: number;
  itemCount: number;
  isLoading: boolean;
  error: string | null;
  loadCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart_items');
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (err) {
        console.error('Failed to parse saved cart:', err);
      }
    }
  }, []);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('cart_items', JSON.stringify(items));
  }, [items]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  };

  // Sync cart with backend
  const loadCart = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/buyer/cart.php`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success && data.data?.items) {
        // Transform backend cart format to component format
        const transformedItems: CartItem[] = data.data.items.map((item: any) => ({
          id: item.id || item.product_id,
          productId: item.product_id || item.id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: parseInt(item.quantity),
          unit: item.unit || item.unit_abbr || 'kg',
          image: item.image,
          farmerId: item.farmer_id,
          farmerName: item.farm_name || item.farmer_name,
          stock: item.available_stock || item.stock_quantity,
        }));
        setItems(transformedItems);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error('Failed to load cart:', err);
      setError('Failed to load cart');
      // Keep local items if backend fails
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = async (item: Omit<CartItem, 'id'>) => {
    try {
      setError(null);

      // First, add to local state immediately for UI feedback
      const newItem: CartItem = {
        ...item,
        id: item.productId,
      };

      setItems((prev) => {
        // Check if item already exists
        const existingIndex = prev.findIndex(i => i.productId === item.productId);
        if (existingIndex >= 0) {
          // Update quantity if exists
          const updated = [...prev];
          updated[existingIndex].quantity += item.quantity;
          return updated;
        }
        return [...prev, newItem];
      });

      // Then validate with backend
      const response = await fetch(`${API_BASE_URL}/buyer/cart.php`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'add',
          product_id: item.productId,
          quantity: item.quantity,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        // Remove from local state if backend fails
        setItems((prev) => prev.filter(i => i.productId !== item.productId));
        throw new Error(data.error || 'Failed to add item');
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
      setError(err instanceof Error ? err.message : 'Failed to add item to cart');
      throw err;
    }
  };

  const removeItem = async (id: string) => {
    try {
      setError(null);
      const product = items.find(item => item.id === id);
      if (!product) return;

      const response = await fetch(`${API_BASE_URL}/buyer/cart.php`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'remove',
          product_id: product.productId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      } else {
        throw new Error(data.message || 'Failed to remove item');
      }
    } catch (err) {
      console.error('Error removing from cart:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove item');
      throw err;
    }
  };

  const updateQuantity = async (id: string, quantity: number) => {
    try {
      setError(null);
      if (quantity <= 0) {
        await removeItem(id);
        return;
      }

      const product = items.find(item => item.id === id);
      if (!product) return;

      const response = await fetch(`${API_BASE_URL}/buyer/cart.php`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          product_id: product.productId,
          quantity,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, quantity } : item))
        );
      } else {
        throw new Error(data.error || data.message || 'Failed to update quantity');
      }
    } catch (err) {
      console.error('Error updating quantity:', err);
      setError(err instanceof Error ? err.message : 'Failed to update quantity');
      throw err;
    }
  };

  const clearCart = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/buyer/cart.php`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'clear',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setItems([]);
      } else {
        throw new Error(data.message || 'Failed to clear cart');
      }
    } catch (err) {
      console.error('Error clearing cart:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear cart');
      throw err;
    }
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total,
        itemCount,
        isLoading,
        error,
        loadCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
