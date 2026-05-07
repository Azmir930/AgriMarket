import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Package,
    Truck,
    CheckCircle,
    Clock,
    XCircle,
    MapPin,
    ChevronLeft,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface OrderItem {
    id: string;
    name?: string;
    quantity: number;
    unit?: string;
    price: number;
    image?: string;
}

interface Order {
    id: string;
    order_number?: string;
    orderNumber?: string;
    date?: string;
    created_at?: string;
    status: OrderStatus;
    items?: OrderItem[];
    item_count?: number;
    total?: number;
    total_amount?: number;
    deliveryAddress?: string;
    estimatedDelivery?: string;
    trackingId?: string;
    delivery_status?: string;
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    tracking_number?: string;
    estimated_delivery_date?: string;
    actual_delivery_date?: string;
}

const statusConfig: Record<OrderStatus, { label: string; icon: React.ElementType; color: string }> = {
    pending: { label: 'Pending', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
    processing: { label: 'Processing', icon: Package, color: 'bg-blue-100 text-blue-800' },
    shipped: { label: 'Shipped', icon: Truck, color: 'bg-purple-100 text-purple-800' },
    delivered: { label: 'Delivered', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
    cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-red-100 text-red-800' },
};

const OrderDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCancelling, setIsCancelling] = useState(false);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');

    useEffect(() => {
        loadOrderDetail();
    }, [id]);

    const loadOrderDetail = async () => {
        try {
            setIsLoading(true);
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

            const response = await fetch(`${API_BASE_URL}/buyer/orders.php?id=${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();
            if (response.ok && data.data) {
                setOrder(data.data);
            } else {
                toast({
                    title: 'Failed to load order',
                    description: data.error || 'Unable to load order details',
                    variant: 'destructive',
                });
                navigate('/buyer/orders');
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to load order';
            toast({
                title: 'Error',
                description: errorMsg,
                variant: 'destructive',
            });
            navigate('/buyer/orders');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!order) return;

        try {
            setIsCancelling(true);
            const token = localStorage.getItem('auth_token');
            if (!token) {
                toast({
                    title: 'Authentication required',
                    description: 'Please log in again',
                    variant: 'destructive',
                });
                return;
            }

            const response = await fetch(`${API_BASE_URL}/buyer/orders.php`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order_id: order.id,
                    status: 'cancelled',
                    cancellation_reason: cancellationReason,
                }),
            });

            const data = await response.json();
            if (response.ok) {
                toast({
                    title: 'Success',
                    description: 'Order cancelled successfully',
                });
                setShowCancelDialog(false);
                setCancellationReason('');
                // Reload order details
                loadOrderDetail();
            } else {
                toast({
                    title: 'Failed to cancel order',
                    description: data.error || 'Unable to cancel your order',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to cancel order';
            toast({
                title: 'Error',
                description: errorMsg,
                variant: 'destructive',
            });
        } finally {
            setIsCancelling(false);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <Card className="py-12">
                    <CardContent className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Loading order details...</p>
                    </CardContent>
                </Card>
            </DashboardLayout>
        );
    }

    if (!order) {
        return (
            <DashboardLayout>
                <Card className="py-12">
                    <CardContent className="text-center">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Order not found</h3>
                        <p className="text-muted-foreground mb-4">
                            The order you're looking for doesn't exist.
                        </p>
                        <Button onClick={() => navigate('/buyer/orders')}>
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Back to Orders
                        </Button>
                    </CardContent>
                </Card>
            </DashboardLayout>
        );
    }

    const orderNumber = order.order_number || order.orderNumber || 'N/A';
    const orderStatus = (order.status || 'pending') as OrderStatus;
    const StatusIcon = statusConfig[orderStatus].icon;
    const orderDate = order.created_at || order.date || new Date().toISOString();

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    onClick={() => navigate('/buyer/orders')}
                    className="gap-2"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to Orders
                </Button>

                {/* Order Header */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3">
                                    <CardTitle>{orderNumber}</CardTitle>
                                    <Badge className={statusConfig[orderStatus].color}>
                                        <StatusIcon className="h-3 w-3 mr-1" />
                                        {statusConfig[orderStatus].label}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Placed on {new Date(orderDate).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-bold">₹{order.total_amount || order.total || 0}</p>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Order Items */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Order Items</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {order.items && order.items.length > 0 ? (
                                order.items.map((item) => (
                                    <div key={item.id} className="flex gap-4 pb-4 border-b last:border-b-0">
                                        <div className="h-20 w-20 bg-muted rounded flex-shrink-0">
                                            <img
                                                src={item.image || '/placeholder.svg'}
                                                alt={item.name || 'Product'}
                                                className="h-full w-full object-cover rounded"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold">{item.name || 'Product'}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {item.quantity} {item.unit || 'unit'}
                                            </p>
                                            <p className="text-sm font-semibold mt-1">₹{item.price}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold">₹{item.price * item.quantity}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">{order.item_count || 0} items in this order</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Delivery & Order Info */}
                    <div className="space-y-4">
                        {/* Delivery Info */}
                        {(orderStatus === 'shipped' || order.delivery_status === 'pending') && order.estimated_delivery_date && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Truck className="h-4 w-4" />
                                        Delivery Status
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <p className="text-sm">
                                        Expected delivery by{' '}
                                        <strong>
                                            {new Date(order.estimated_delivery_date).toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric',
                                            })}
                                        </strong>
                                    </p>
                                    {order.tracking_number && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">Tracking ID</p>
                                            <p className="font-mono text-sm font-semibold">{order.tracking_number}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Delivery Address */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    Delivery Address
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm">
                                    {order.deliveryAddress ||
                                        [order.street, order.city, order.state, order.postal_code, order.country]
                                            .filter(Boolean)
                                            .join(', ') ||
                                        'No address provided'}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Order Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Order Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>₹{order.total_amount || order.total || 0}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Shipping</span>
                                    <span>Free</span>
                                </div>
                                <div className="border-t pt-2 flex justify-between font-semibold">
                                    <span>Total</span>
                                    <span>₹{order.total_amount || order.total || 0}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Actions */}
                {orderStatus === 'pending' && (
                    <Card className="border-yellow-200 bg-yellow-50">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold">Want to cancel this order?</p>
                                    <p className="text-sm text-muted-foreground">
                                        You can cancel this order as it's still pending
                                    </p>
                                </div>
                                <Button
                                    variant="destructive"
                                    onClick={() => setShowCancelDialog(true)}
                                >
                                    Cancel Order
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Cancel Order Dialog */}
            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Order</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to cancel this order? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Reason for cancellation (optional)</label>
                            <Input
                                placeholder="Tell us why you're cancelling..."
                                value={cancellationReason}
                                onChange={(e) => setCancellationReason(e.target.value)}
                                className="mt-2"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-4">
                        <AlertDialogCancel>Keep Order</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancelOrder}
                            disabled={isCancelling}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isCancelling ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Cancelling...
                                </>
                            ) : (
                                'Cancel Order'
                            )}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </DashboardLayout>
    );
};

export default OrderDetail;
