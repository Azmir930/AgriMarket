import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { OrdersTable, Order } from '@/components/dashboard/OrdersTable';
import { RecentActivity, Activity } from '@/components/dashboard/RecentActivity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Package, Truck, IndianRupee, TrendingUp, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Chart data - Static baseline data
const revenueData = [
  { month: 'Jan', revenue: 45000 },
  { month: 'Feb', revenue: 52000 },
  { month: 'Mar', revenue: 48000 },
  { month: 'Apr', revenue: 61000 },
  { month: 'May', revenue: 55000 },
  { month: 'Jun', revenue: 67000 },
];

const userDistribution = [
  { name: 'Farmers', value: 245, color: 'hsl(142, 50%, 35%)' },
  { name: 'Buyers', value: 1820, color: 'hsl(45, 85%, 55%)' },
  { name: 'Admins', value: 12, color: 'hsl(200, 85%, 45%)' },
];

const AdminDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [alertsData, setAlertsData] = useState<any[]>([]);
  const [ordersData, setOrdersData] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingMockData, setIsUsingMockData] = useState(true);

  // Load analytics data from API on mount
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          console.log('No auth token, using demo mode');
          setIsUsingMockData(true);
          setIsLoading(false);
          return;
        }

        const [analyticsResponse, alertsResponse, ordersResponse] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/admin/analytics.php?period=30`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch(`${import.meta.env.VITE_API_URL}/admin/alerts.php`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch(`${import.meta.env.VITE_API_URL}/admin/orders_recent.php?limit=5&offset=0`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
        ]);

        const analyticsJson = await analyticsResponse.json();
        const alertsJson = await alertsResponse.json();
        const ordersJson = await ordersResponse.json();
        console.log('Analytics API Response:', analyticsJson);
        console.log('Alerts API Response:', alertsJson);
        console.log('Orders API Response:', ordersJson);

        if (analyticsResponse.ok && analyticsJson.success && analyticsJson.data) {
          setAnalyticsData(analyticsJson.data);
        }

        if (alertsResponse.ok && alertsJson.success && alertsJson.data) {
          setAlertsData(alertsJson.data);
        }

        if (ordersResponse.ok && ordersJson.success && ordersJson.data) {
          const formattedOrders = ordersJson.data.map((order: any) => {
            // Map database statuses to component statuses
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

        if ((analyticsResponse.ok && analyticsJson.success) || (alertsResponse.ok && alertsJson.success) || (ordersResponse.ok && ordersJson.success)) {
          setIsUsingMockData(false);
        }
      } catch (error) {
        console.log('Failed to load data from API:', error);
        console.log('Using demo data instead');
        setIsUsingMockData(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  // Prepare data based on source
  const displayData = isUsingMockData ? { overview: null } : analyticsData;
  const overview = displayData?.overview || {};
  const revenueChartData = !isUsingMockData && displayData?.revenue_trend
    ? displayData.revenue_trend.map((item: any) => ({
      month: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: parseFloat(item.revenue) || 0
    }))
    : revenueData;

  const userDistributionData = !isUsingMockData
    ? [
      { name: 'Farmers', value: parseInt(overview.total_farmers) || 0, color: 'hsl(142, 50%, 35%)' },
      { name: 'Buyers', value: parseInt(overview.total_buyers) || 0, color: 'hsl(45, 85%, 55%)' },
      { name: 'Admins', value: parseInt(overview.total_users) - parseInt(overview.total_farmers) - parseInt(overview.total_buyers) || 0, color: 'hsl(200, 85%, 45%)' },
    ]
    : userDistribution;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">System overview and management</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin/users">Manage Users</Link>
            </Button>
            <Button asChild>
              <Link to="/admin/analytics">View Analytics</Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Users"
            value={!isUsingMockData ? (overview.total_users || '0') : "2,077"}
            icon={Users}
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Active Products"
            value={!isUsingMockData ? (overview.active_products || '0') : "856"}
            icon={Package}
            trend={{ value: 8, isPositive: true }}
          />
          <StatCard
            title="Total Orders"
            value={!isUsingMockData ? (overview.total_orders || '0') : "3,421"}
            icon={Truck}
            trend={{ value: 15, isPositive: true }}
          />
          <StatCard
            title="Revenue (MTD)"
            value={!isUsingMockData ? `₹${(parseInt(overview.total_revenue) / 100000).toFixed(1)}L` : "₹6.7L"}
            icon={IndianRupee}
            trend={{ value: 22, isPositive: true }}
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Revenue Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 50%, 35%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142, 50%, 35%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(value) => `₹${value / 1000}k`} />
                    <Tooltip
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(142, 50%, 35%)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* User Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                User Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {userDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex justify-center gap-4">
                {userDistributionData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders and Activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Orders</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/orders">View All</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <OrdersTable orders={ordersData} />
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <RecentActivity activities={ordersData.length === 0 ? [] : []} />
        </div>

        {/* Alerts Section */}
        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {alertsData.map((alert) => (
                <div key={alert.id || alert.title} className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                  <p className="font-medium">{alert.title}</p>
                  <p className="text-2xl font-bold text-warning">{alert.count}</p>
                  <Button variant="link" size="sm" className="mt-2 h-auto p-0">
                    {alert.action} →
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

export default AdminDashboard;
