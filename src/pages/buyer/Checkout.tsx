import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  MapPin,
  CreditCard,
  Truck,
  ShieldCheck,
  ChevronLeft,
  Plus,
  Check,
  Loader2,
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api';

interface Address {
  id: string;
  address_type: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

const paymentMethods = [
  { id: 'upi', name: 'UPI', description: 'Pay using UPI apps' },
  { id: 'card', name: 'Credit/Debit Card', description: 'Visa, Mastercard, RuPay' },
  { id: 'netbanking', name: 'Net Banking', description: 'All major banks' },
  { id: 'cod', name: 'Cash on Delivery', description: 'Pay when you receive' },
];

const Checkout = () => {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCart();
  const { toast } = useToast();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState('cod');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [showAddAddressDialog, setShowAddAddressDialog] = useState(false);
  const [newAddress, setNewAddress] = useState({
    address_type: 'shipping',
    street: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
  });

  // Load addresses on mount
  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: 'Authentication required',
          description: 'Please log in again',
          variant: 'destructive',
        });
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/buyer/addresses.php`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (response.ok && data.addresses) {
        setAddresses(data.addresses);
        // Auto-select first address
        if (data.addresses.length > 0) {
          setSelectedAddress(data.addresses[0].id);
        }
      } else {
        toast({
          title: 'Failed to load addresses',
          description: data.error || 'Please try again',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error loading addresses',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const handleAddAddress = async () => {
    try {
      if (!newAddress.street || !newAddress.city || !newAddress.state || !newAddress.postal_code) {
        toast({
          title: 'Missing required fields',
          description: 'Please fill in all required address fields',
          variant: 'destructive',
        });
        return;
      }

      const token = localStorage.getItem('auth_token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/buyer/addresses.php`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAddress),
      });

      const data = await response.json();
      if (response.ok && data.address) {
        setAddresses([...addresses, data.address]);
        setSelectedAddress(data.address.id);
        setShowAddAddressDialog(false);
        setNewAddress({
          address_type: 'shipping',
          street: '',
          city: '',
          state: '',
          postal_code: '',
          country: 'India',
        });
        toast({
          title: 'Address added',
          description: 'Your new address has been saved',
        });
      } else {
        toast({
          title: 'Failed to add address',
          description: data.error || 'Please try again',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error adding address',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const deliveryFee = total >= 500 ? 0 : 40;
  const discount = promoApplied ? Math.round(total * 0.1) : 0;
  const grandTotal = total + deliveryFee - discount;

  if (items.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">Your cart is empty</p>
          <Button asChild>
            <Link to="/buyer/products">Browse Products</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleApplyPromo = () => {
    if (promoCode.toUpperCase() === 'FRESH10') {
      setPromoApplied(true);
      toast({
        title: 'Promo code applied!',
        description: '10% discount has been applied to your order.',
      });
    } else {
      toast({
        title: 'Invalid promo code',
        description: 'Please enter a valid promo code.',
        variant: 'destructive',
      });
    }
  };

  const handlePlaceOrder = async () => {
    setIsProcessing(true);

    try {
      // Validate selected address
      if (!selectedAddress) {
        toast({
          title: 'Address required',
          description: 'Please select a shipping address',
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }

      // Get auth token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: 'Authentication required',
          description: 'Please log in again',
          variant: 'destructive',
        });
        navigate('/login');
        return;
      }

      // Prepare checkout data
      const checkoutData = {
        items: items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
        })),
        shipping_address_id: selectedAddress,
        payment_method: selectedPayment,
      };

      // Call backend checkout endpoint
      const response = await fetch(`${API_BASE_URL}/buyer/checkout.php`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Checkout failed');
      }

      // Success
      clearCart();

      toast({
        title: 'Order placed successfully!',
        description: `Your order ${data.order.order_number} has been confirmed.`,
      });

      navigate('/buyer/orders');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to place order';
      toast({
        title: 'Order failed',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Checkout</h1>
            <p className="text-muted-foreground">{items.length} items in your order</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Address & Payment */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <CardTitle>Delivery Address</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingAddresses ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No addresses saved yet. Add one to continue.
                    </p>
                    <Button onClick={() => setShowAddAddressDialog(true)} className="w-full" variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Address
                    </Button>
                  </div>
                ) : (
                  <>
                    <RadioGroup value={selectedAddress} onValueChange={setSelectedAddress}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {addresses.map((address) => (
                          <Label
                            key={address.id}
                            htmlFor={address.id}
                            className={`flex cursor-pointer flex-col rounded-lg border-2 p-4 transition-all ${selectedAddress === address.id
                              ? 'border-primary bg-primary/5'
                              : 'border-muted hover:border-primary/50'
                              }`}
                          >
                            <RadioGroupItem value={address.id} id={address.id} className="sr-only" />
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium capitalize">{address.address_type}</span>
                                {address.is_default && (
                                  <Badge variant="secondary" className="text-xs">Default</Badge>
                                )}
                              </div>
                              {selectedAddress === address.id && (
                                <Check className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            {address.label && <p className="text-sm font-medium">{address.label}</p>}
                            <p className="text-sm text-muted-foreground">{address.street}</p>
                            <p className="text-sm text-muted-foreground">
                              {address.city}, {address.state} - {address.postal_code}
                            </p>
                          </Label>
                        ))}
                      </div>
                    </RadioGroup>
                    <Button
                      onClick={() => setShowAddAddressDialog(true)}
                      variant="outline"
                      className="mt-4 w-full gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add New Address
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <CardTitle>Payment Method</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <RadioGroup value={selectedPayment} onValueChange={setSelectedPayment}>
                  <div className="grid gap-3">
                    {paymentMethods.map((method) => (
                      <Label
                        key={method.id}
                        htmlFor={method.id}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border-2 p-4 transition-all ${selectedPayment === method.id
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-primary/50'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={method.id} id={method.id} />
                          <div>
                            <p className="font-medium">{method.name}</p>
                            <p className="text-sm text-muted-foreground">{method.description}</p>
                          </div>
                        </div>
                      </Label>
                    ))}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.productId} className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded bg-muted flex-shrink-0">
                        <img
                          src={item.image || '/placeholder.svg'}
                          alt={item.name}
                          className="h-full w-full object-cover rounded"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} {item.unit} × ₹{item.price}
                        </p>
                      </div>
                      <p className="font-medium">₹{item.price * item.quantity}</p>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Promo Code */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    disabled={promoApplied}
                  />
                  <Button
                    variant="outline"
                    onClick={handleApplyPromo}
                    disabled={promoApplied || !promoCode}
                  >
                    {promoApplied ? 'Applied' : 'Apply'}
                  </Button>
                </div>
                {!promoApplied && (
                  <p className="text-xs text-muted-foreground">Try: FRESH10 for 10% off</p>
                )}

                <Separator />

                {/* Price Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className={deliveryFee === 0 ? 'text-primary' : ''}>
                      {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                    </span>
                  </div>
                  {promoApplied && (
                    <div className="flex justify-between text-sm text-primary">
                      <span>Discount (10%)</span>
                      <span>-₹{discount}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>₹{grandTotal}</span>
                  </div>
                </div>

                {/* Place Order Button */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePlaceOrder}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : `Pay ₹${grandTotal}`}
                </Button>

                {/* Trust Badges */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>Secure Payment</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Truck className="h-4 w-4 text-primary" />
                    <span>Fast Delivery</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Address Dialog */}
      <Dialog open={showAddAddressDialog} onOpenChange={setShowAddAddressDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Address Type</Label>
              <select
                value={newAddress.address_type}
                onChange={(e) =>
                  setNewAddress((prev) => ({ ...prev, address_type: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="shipping">Shipping</option>
                <option value="billing">Billing</option>
                <option value="farm">Farm</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Street Address *</Label>
              <Input
                placeholder="Street address"
                value={newAddress.street}
                onChange={(e) =>
                  setNewAddress((prev) => ({ ...prev, street: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Apartment/Suite (Optional)</Label>
              <Input
                placeholder="Apartment, suite, etc."
                value={newAddress.apartment}
                onChange={(e) =>
                  setNewAddress((prev) => ({ ...prev, apartment: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City *</Label>
                <Input
                  placeholder="City"
                  value={newAddress.city}
                  onChange={(e) =>
                    setNewAddress((prev) => ({ ...prev, city: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>State *</Label>
                <Input
                  placeholder="State"
                  value={newAddress.state}
                  onChange={(e) =>
                    setNewAddress((prev) => ({ ...prev, state: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>PIN Code *</Label>
              <Input
                placeholder="PIN code"
                value={newAddress.postal_code}
                onChange={(e) =>
                  setNewAddress((prev) => ({ ...prev, postal_code: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddAddressDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAddress}>
              Save Address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Checkout;
