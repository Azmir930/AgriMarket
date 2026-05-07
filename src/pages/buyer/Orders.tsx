import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  ChevronRight,
  MapPin,
  Star,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api';

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
}

const statusConfig: Record<OrderStatus, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  processing: { label: 'Processing', icon: Package, color: 'bg-blue-100 text-blue-800' },
  shipped: { label: 'Shipped', icon: Truck, color: 'bg-purple-100 text-purple-800' },
  delivered: { label: 'Delivered', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-red-100 text-red-800' },
};

const Orders = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
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

      console.log('Loading orders from:', `${API_BASE_URL}/buyer/orders.php`);

      const response = await fetch(`${API_BASE_URL}/buyer/orders.php`, {
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
        setOrders(data.data);
      } else {
        console.error('API error:', data);
        toast({
          title: 'Failed to load orders',
          description: data.error || 'Unable to load your orders',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load orders';
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

  const filteredOrders = orders.filter((order) => {
    const orderNumber = order.order_number || order.orderNumber || '';
    const matchesSearch = orderNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const status = (order.status || 'pending') as OrderStatus;
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'active' && ['pending', 'processing', 'shipped'].includes(status)) ||
      (activeTab === 'completed' && status === 'delivered') ||
      (activeTab === 'cancelled' && status === 'cancelled');

    return matchesSearch && matchesTab;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Orders</h1>
          <p className="text-muted-foreground">Track and manage your orders</p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Orders</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <Card className="py-12">
                <CardContent className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading your orders...</p>
                </CardContent>
              </Card>
            ) : filteredOrders.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No orders found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery
                      ? 'Try a different search term'
                      : "You haven't placed any orders yet"}
                  </p>
                  <Button asChild>
                    <Link to="/buyer/products">Start Shopping</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const orderNumber = order.order_number || order.orderNumber || 'N/A';
                  let orderStatus: OrderStatus = (order.status as OrderStatus) || 'pending';

                  // Validate status is in statusConfig, default to pending if not
                  if (!statusConfig[orderStatus]) {
                    console.warn(`Unknown order status: ${orderStatus}, defaulting to pending`);
                    orderStatus = 'pending';
                  }

                  const StatusIcon = statusConfig[orderStatus].icon;
                  const orderDate = order.created_at || order.date || new Date().toISOString();

                  return (
                    <Card key={order.id}>
                      <CardContent className="pt-6">
                        {/* Order Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold">{orderNumber}</h3>
                              <Badge className={statusConfig[orderStatus].color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig[orderStatus].label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Placed on {new Date(orderDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">₹{order.total_amount || order.total || 0}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.item_count || order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} items
                            </p>
                          </div>
                        </div>

                        {/* Order Items */}
                        {order.items && order.items.length > 0 ? (
                          <div className="flex gap-3 overflow-x-auto pb-2">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-3 min-w-fit border rounded-lg p-2"
                              >
                                <div className="h-12 w-12 bg-muted rounded flex-shrink-0">
                                  <img
                                    src={item.image || '/placeholder.svg'}
                                    alt={item.name || 'Product'}
                                    className="h-full w-full object-cover rounded"
                                  />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{item.name || 'Product'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.quantity} {item.unit || 'unit'} × ₹{item.price}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">{order.item_count || 0} items in this order</p>
                        )}

                        {/* Delivery Info */}
                        {(orderStatus === 'shipped' || order.delivery_status === 'pending') && order.estimatedDelivery && (
                          <div className="mt-4 p-3 bg-primary/5 rounded-lg">
                            <div className="flex items-center gap-2 text-sm">
                              <Truck className="h-4 w-4 text-primary" />
                              <span>
                                Expected delivery by{' '}
                                <strong>
                                  {new Date(order.estimatedDelivery).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'long',
                                  })}
                                </strong>
                              </span>
                            </div>
                            {order.trackingId && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Tracking ID: {order.trackingId}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Delivery Address */}
                        <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <span>{order.deliveryAddress}</span>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/buyer/orders/${order.id}`}>
                              View Details
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                          </Button>
                          {order.status === 'delivered' && (
                            <Button variant="outline" size="sm" className="gap-1">
                              <Star className="h-4 w-4" />
                              Rate Order
                            </Button>
                          )}
                          {order.status === 'delivered' && (
                            <Button variant="outline" size="sm">
                              Reorder
                            </Button>
                          )}
                          {order.status === 'pending' && (
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" asChild>
                              <Link to={`/buyer/orders/${order.id}`}>
                                Cancel Order
                              </Link>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Orders;
