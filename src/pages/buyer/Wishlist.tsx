import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingCart, Trash2, Star, Loader2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api';

interface WishlistItem {
  wishlist_id: string;
  product_id: string;
  name: string;
  price: number;
  stock_quantity: number;
  description?: string;
  category_name?: string;
  unit_abbr?: string;
  farm_name?: string;
  image?: string;
  rating?: number;
  review_count?: number;
  added_at: string;
}

const Wishlist = () => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { addItem } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No auth token found');
        toast({
          title: 'Authentication required',
          description: 'Please log in again',
          variant: 'destructive',
        });
        return;
      }

      console.log('Loading wishlist from:', `${API_BASE_URL}/buyer/wishlist.php`);

      const response = await fetch(`${API_BASE_URL}/buyer/wishlist.php`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok && data.data) {
        // Ensure rating is a number
        const transformedItems = data.data.map((item: any) => ({
          ...item,
          rating: item.rating ? parseFloat(item.rating) : undefined,
        }));
        setWishlistItems(transformedItems);
      } else {
        console.error('API error:', data);
        toast({
          title: 'Failed to load wishlist',
          description: data.error || 'Unable to load your wishlist',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load wishlist';
      console.error('Fetch error:', errorMsg, error);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFromWishlist = async (wishlistId: string, productId: string) => {
    try {
      setRemovingId(wishlistId);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: 'Authentication required',
          description: 'Please log in again',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/buyer/wishlist.php?id=${wishlistId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setWishlistItems((prev) => prev.filter((item) => item.wishlist_id !== wishlistId));
        toast({
          title: 'Removed from wishlist',
          description: 'Item has been removed from your wishlist.',
        });
      } else {
        toast({
          title: 'Failed to remove item',
          description: data.error || 'Unable to remove from wishlist',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to remove item';
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = (item: WishlistItem) => {
    addItem({
      productId: item.product_id,
      name: item.name,
      price: item.price,
      quantity: 1,
      unit: item.unit_abbr || 'unit',
      image: item.image,
      farmerId: '',
      farmerName: item.farm_name || 'Farmer',
    });
    toast({
      title: 'Added to cart',
      description: `${item.name} has been added to your cart.`,
    });
  };

  const handleMoveAllToCart = () => {
    wishlistItems.forEach((item) => {
      addItem({
        productId: item.product_id,
        name: item.name,
        price: item.price,
        quantity: 1,
        unit: item.unit_abbr || 'unit',
        image: item.image,
        farmerId: '',
        farmerName: item.farm_name || 'Farmer',
      });
    });
    toast({
      title: 'All items added to cart',
      description: 'Your wishlist items have been moved to cart.',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Heart className="h-6 w-6 text-red-500" />
              My Wishlist
            </h1>
            <p className="text-muted-foreground">
              {wishlistItems.length} items saved for later
            </p>
          </div>
          {wishlistItems.length > 0 && (
            <Button onClick={handleMoveAllToCart} className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Add All to Cart
            </Button>
          )}
        </div>

        {isLoading ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your wishlist...</p>
            </CardContent>
          </Card>
        ) : wishlistItems.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Your wishlist is empty</h3>
              <p className="text-muted-foreground mb-4">
                Save items you like by clicking the heart icon on products
              </p>
              <Button asChild>
                <Link to="/buyer/products">Browse Products</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {wishlistItems.map((item) => (
              <Card key={item.wishlist_id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* Product Image */}
                    <Link
                      to={`/buyer/products/${item.product_id}`}
                      className="sm:w-48 aspect-video sm:aspect-square bg-muted flex-shrink-0"
                    >
                      <img
                        src={item.image || '/placeholder.svg'}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </Link>

                    {/* Product Details */}
                    <div className="flex-1 p-4 flex flex-col">
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            {item.category_name && (
                              <Badge variant="secondary" className="mb-2">
                                {item.category_name}
                              </Badge>
                            )}
                            <Link
                              to={`/buyer/products/${item.product_id}`}
                              className="hover:text-primary"
                            >
                              <h3 className="font-semibold text-lg">{item.name}</h3>
                            </Link>
                            {item.farm_name && (
                              <p className="text-sm text-muted-foreground mt-1">
                                by {item.farm_name}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-primary">
                              ₹{item.price}
                            </p>
                            {item.unit_abbr && (
                              <p className="text-sm text-muted-foreground">
                                per {item.unit_abbr}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3">
                          {item.rating !== null && item.rating !== undefined && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{typeof item.rating === 'number' ? item.rating.toFixed(1) : '0.0'}</span>
                              <span className="text-sm text-muted-foreground">
                                ({item.review_count || 0})
                              </span>
                            </div>
                          )}
                          <Badge variant={item.stock_quantity > 10 ? 'default' : 'destructive'}>
                            {item.stock_quantity > 10
                              ? 'In Stock'
                              : item.stock_quantity > 0
                                ? `Only ${item.stock_quantity} left`
                                : 'Out of Stock'}
                          </Badge>
                        </div>

                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 mt-4 pt-4 border-t">
                        <Button
                          className="flex-1 sm:flex-none gap-2"
                          onClick={() => handleAddToCart(item)}
                          disabled={item.stock_quantity === 0}
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Add to Cart
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleRemoveFromWishlist(item.wishlist_id, item.product_id)}
                          disabled={removingId === item.wishlist_id}
                          className="text-destructive hover:text-destructive"
                        >
                          {removingId === item.wishlist_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Wishlist;
