import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingCart, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  category: string;
  stock: number;
  image?: string;
  rating: number;
  reviewCount: number;
  farmerId: string;
  farmerName: string;
}

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onAddToWishlist?: (product: Product) => void;
  showActions?: boolean;
  className?: string;
}

export const ProductCard = ({
  product,
  onAddToCart,
  onAddToWishlist,
  showActions = true,
  className,
}: ProductCardProps) => {
  const isOutOfStock = product.stock <= 0;

  return (
    <Card className={cn('group overflow-hidden transition-all hover:shadow-lg', className)}>
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <span className="text-4xl">🌾</span>
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <Badge variant="destructive">Out of Stock</Badge>
          </div>
        )}
        {showActions && onAddToWishlist && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => onAddToWishlist(product)}
          >
            <Heart className="h-4 w-4" />
          </Button>
        )}
        <Badge className="absolute top-2 left-2 bg-primary">{product.category}</Badge>
      </div>

      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-1">
          <Star className="h-4 w-4 fill-accent text-accent" />
          <span className="text-sm font-medium">{typeof product.rating === 'number' ? product.rating.toFixed(1) : '0.0'}</span>
          <span className="text-xs text-muted-foreground">({product.reviewCount || 0})</span>
        </div>
        <h3 className="font-semibold line-clamp-1">{product.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
        <p className="mt-2 text-xs text-muted-foreground">by {product.farmerName}</p>
      </CardContent>

      <CardFooter className="flex items-center justify-between p-4 pt-0">
        <div>
          <span className="text-lg font-bold text-primary">₹{product.price}</span>
          <span className="text-sm text-muted-foreground">/{product.unit}</span>
        </div>
        {showActions && onAddToCart && (
          <Button
            size="sm"
            disabled={isOutOfStock}
            onClick={() => onAddToCart(product)}
            className="gap-1"
          >
            <ShoppingCart className="h-4 w-4" />
            Add
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
