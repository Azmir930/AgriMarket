import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  ChevronLeft,
  Truck,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';

const Cart = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, total, itemCount, clearCart, isLoading, error, loadCart } = useCart();
  const { toast } = useToast();
  const [operationLoading, setOperationLoading] = useState<string | null>(null);

  const deliveryFee = total >= 500 ? 0 : 40;
  const grandTotal = total + deliveryFee;

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    try {
      setOperationLoading(productId);
      await updateQuantity(productId, quantity);
      toast({
        title: 'Updated',
        description: 'Quantity updated successfully',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update quantity',
        variant: 'destructive',
      });
    } finally {
      setOperationLoading(null);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    try {
      setOperationLoading(productId);
      await removeItem(productId);
      toast({
        title: 'Removed',
        description: 'Item removed from cart',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to remove item',
        variant: 'destructive',
      });
    } finally {
      setOperationLoading(null);
    }
  };

  const handleClearCart = async () => {
    try {
      await clearCart();
      toast({
        title: 'Cleared',
        description: 'Cart has been cleared',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to clear cart',
        variant: 'destructive',
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading your cart...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Empty cart state
  if (items.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-4">Add some fresh products to get started!</p>
          <Button asChild>
            <Link to="/buyer/products">Browse Products</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Shopping Cart</h1>
              <p className="text-muted-foreground">{itemCount} items in your cart</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={handleClearCart} 
            className="text-destructive"
            disabled={operationLoading === 'clear'}
          >
            {operationLoading === 'clear' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Clearing...
              </>
            ) : (
              'Clear Cart'
            )}
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-900 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={loadCart}
                  className="text-red-700 p-0 h-auto mt-1"
                >
                  Try again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card key={item.productId}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <Link
                      to={`/buyer/products/${item.productId}`}
                      className="h-24 w-24 bg-muted rounded-lg flex-shrink-0"
                    >
                      <img
                        src={item.image || '/placeholder.svg'}
                        alt={item.name}
                        className="h-full w-full object-cover rounded-lg"
                      />
                    </Link>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Link
                            to={`/buyer/products/${item.productId}`}
                            className="font-semibold hover:text-primary"
                          >
                            {item.name}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            by {item.farmerName}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            ₹{item.price} per {item.unit}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.productId)}
                          className="text-destructive hover:text-destructive"
                          disabled={operationLoading === item.productId}
                        >
                          {operationLoading === item.productId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {/* Quantity & Price */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleUpdateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                            disabled={item.quantity <= 1 || operationLoading === item.productId}
                          >
                            {operationLoading === item.productId ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Minus className="h-3 w-3" />
                            )}
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                            disabled={operationLoading === item.productId}
                          >
                            {operationLoading === item.productId ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                          </Button>
                          <span className="text-sm text-muted-foreground ml-1">{item.unit}</span>
                        </div>
                        <p className="font-bold text-lg">₹{item.price * item.quantity}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal ({itemCount} items)</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className={deliveryFee === 0 ? 'text-primary' : ''}>
                      {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                    </span>
                  </div>
                  {deliveryFee > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Add ₹{500 - total} more for free delivery
                    </p>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>₹{grandTotal}</span>
                </div>

                <Button className="w-full" size="lg" asChild>
                  <Link to="/buyer/checkout">Proceed to Checkout</Link>
                </Button>

                <Button variant="outline" className="w-full" asChild>
                  <Link to="/buyer/products">Continue Shopping</Link>
                </Button>

                {/* Trust Badges */}
                <div className="pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>Secure checkout</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Truck className="h-4 w-4 text-primary" />
                    <span>Fast & reliable delivery</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Cart;
