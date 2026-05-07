import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { OrdersTable, Order } from '@/components/dashboard/OrdersTable';
import { RecentActivity, Activity } from '@/components/dashboard/RecentActivity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Truck, IndianRupee, Star, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';

const FarmerDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [ordersData, setOrdersData] = useState<Order[]>([]);
  const [activitiesData, setActivitiesData] = useState<Activity[]>([]);
  const [inventoryAlertsData, setInventoryAlertsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setError('Authentication required');
          setIsLoading(false);
          return;
        }

        const [analyticsResponse, ordersResponse, activityResponse, inventoryResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/farmer/analytics.php`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch(`${API_BASE_URL}/farmer/orders_recent.php?limit=5&offset=0`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch(`${API_BASE_URL}/farmer/activity.php`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch(`${API_BASE_URL}/farmer/inventory_alerts.php`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
        ]);

        const analyticsJson = await analyticsResponse.json();
        const ordersJson = await ordersResponse.json();
        const activityJson = await activityResponse.json();
        const inventoryJson = await inventoryResponse.json();

        if (analyticsResponse.ok && analyticsJson.success && analyticsJson.data) {
          setAnalyticsData(analyticsJson.data);
        }

        if (ordersResponse.ok && ordersJson.success && ordersJson.data) {
          const formattedOrders = ordersJson.data.map((order: any) => {
            let mappedStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' = 'pending';
            const dbStatus = order.status?.toLowerCase();
            if (dbStatus === 'confirmed') mappedStatus = 'processing';
            else if (dbStatus === 'processing') mappedStatus = 'processing';
            else if (dbStatus === 'shipped') mappedStatus = 'shipped';
            else if (dbStatus === 'delivered') mappedStatus = 'delivered';
            else if (dbStatus === 'cancelled') mappedStatus = 'cancelled';
            else if (dbStatus === 'pending') mappedStatus = 'pending';

            return {
              id: order.id,
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              products: [{ name: order.products, quantity: 1 }],
              total: order.total,
              status: mappedStatus,
              date: order.date
            };
          });
          setOrdersData(formattedOrders);
        }

        if (activityResponse.ok && activityJson.success && activityJson.data) {
          setActivitiesData(activityJson.data);
        }

        if (inventoryResponse.ok && inventoryJson.success && inventoryJson.data) {
          setInventoryAlertsData(inventoryJson.data);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Farmer Dashboard</h1>
            <p className="text-muted-foreground">Manage your farm products and orders</p>
          </div>
          <Button asChild className="gap-2">
            <Link to="/farmer/products/new">
              <Plus className="h-4 w-4" />
              Add New Product
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Products"
            value={analyticsData?.total_products || '0'}
            icon={Package}
            trend={{ value: analyticsData?.total_products_trend || 0, isPositive: (analyticsData?.total_products_trend || 0) >= 0 }}
          />
          <StatCard
            title="Pending Orders"
            value={analyticsData?.pending_orders || '0'}
            icon={Truck}
            trend={{ value: analyticsData?.pending_orders_trend || 0, isPositive: (analyticsData?.pending_orders_trend || 0) >= 0 }}
          />
          <StatCard
            title="Total Revenue"
            value={`₹${(analyticsData?.total_revenue || 0).toLocaleString()}`}
            icon={IndianRupee}
            trend={{ value: analyticsData?.total_revenue_trend || 0, isPositive: (analyticsData?.total_revenue_trend || 0) >= 0 }}
          />
          <StatCard
            title="Avg. Rating"
            value={analyticsData?.avg_rating || '0'}
            icon={Star}
            trend={{ value: analyticsData?.avg_rating_trend || 0, isPositive: (analyticsData?.avg_rating_trend || 0) >= 0 }}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Orders Table */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Orders</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/farmer/orders">View All</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <OrdersTable orders={ordersData} />
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <RecentActivity activities={activitiesData} />
        </div>

        {/* Inventory Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {inventoryAlertsData.map((item) => (
                <div
                  key={item.name || item.id}
                  className={`rounded-lg border p-4 ${item.status === 'critical' || item.status === 'out'
                    ? 'border-destructive/50 bg-destructive/5'
                    : item.status === 'low'
                      ? 'border-warning/50 bg-warning/5'
                      : 'border-border'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.name}</span>
                    <span
                      className={`text-sm font-medium ${item.status === 'critical' || item.status === 'out'
                        ? 'text-destructive'
                        : item.status === 'low'
                          ? 'text-warning'
                          : 'text-muted-foreground'
                        }`}
                    >
                      {item.stock} {item.unit}
                    </span>
                  </div>
                  <Button variant="link" size="sm" className="mt-2 h-auto p-0" asChild>
                    <Link to="/farmer/inventory">Update Stock →</Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default FarmerDashboard;

