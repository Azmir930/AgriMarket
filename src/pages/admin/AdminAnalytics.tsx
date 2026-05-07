import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Users, Package, ShoppingCart, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api';

interface AnalyticsData {
    overview: {
        total_users: number;
        new_users: number;
        total_farmers: number;
        total_buyers: number;
        active_products: number;
        total_orders: number;
        recent_orders: number;
        total_revenue: number;
        recent_revenue: number;
    };
    orders_by_status: Array<{ status: string; count: number }>;
    revenue_trend: Array<{ date: string; order_count: number; revenue: number }>;
    top_products: Array<{
        id: string;
        name: string;
        farm_name: string;
        total_sold: number;
        total_revenue: number;
    }>;
    top_farmers: Array<{
        id: string;
        farm_name: string;
        first_name: string;
        last_name: string;
        order_count: number;
        total_revenue: number;
    }>;
    category_stats: Array<{
        category: string;
        product_count: number;
        revenue: number;
    }>;
    payment_stats: Array<{
        payment_method: string;
        count: number;
        total: number;
    }>;
}

const AdminAnalytics = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState('30');
    const { toast } = useToast();

    useEffect(() => {
        fetchAnalytics();
    }, [period]);

    const fetchAnalytics = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const token = localStorage.getItem('auth_token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${API_BASE_URL}/admin/analytics.php?period=${period}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to fetch analytics: ${response.statusText}`);
            }

            const result = await response.json();
            if (result.success && result.data) {
                setData(result.data);
            } else {
                throw new Error('Invalid analytics response');
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to fetch analytics';
            setError(msg);
            toast({ title: 'Error', description: msg, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </DashboardLayout>
        );
    }

    if (error || !data) {
        return (
            <DashboardLayout>
                <Card className="border-destructive">
                    <CardContent className="pt-6">
                        <p className="text-destructive">{error || 'Failed to load analytics'}</p>
                    </CardContent>
                </Card>
            </DashboardLayout>
        );
    }

    const StatCard = ({ icon: Icon, label, value, trend }: any) => (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="text-2xl font-bold">
                            {typeof value === 'number' ? value.toLocaleString() : value}
                        </p>
                    </div>
                    <Icon className="h-8 w-8 text-muted-foreground opacity-50" />
                </div>
                {trend && (
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> {trend}
                    </p>
                )}
            </CardContent>
        </Card>
    );

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                        <p className="text-muted-foreground">Performance metrics and insights</p>
                    </div>
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Last 7 days</SelectItem>
                            <SelectItem value="30">Last 30 days</SelectItem>
                            <SelectItem value="90">Last 90 days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Overview Stats */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <StatCard
                        icon={Users}
                        label="Total Users"
                        value={data.overview.total_users}
                        trend={`+${data.overview.new_users} new`}
                    />
                    <StatCard icon={Users} label="Farmers" value={data.overview.total_farmers} />
                    <StatCard icon={Users} label="Buyers" value={data.overview.total_buyers} />
                    <StatCard icon={Package} label="Active Products" value={data.overview.active_products} />
                    <StatCard
                        icon={ShoppingCart}
                        label="Total Orders"
                        value={data.overview.total_orders}
                        trend={`+${data.overview.recent_orders} recent`}
                    />
                    <StatCard
                        icon={CreditCard}
                        label="Total Revenue"
                        value={`₹${data.overview.total_revenue.toLocaleString('en-IN', {
                            maximumFractionDigits: 0
                        })}`}
                        trend={`+₹${data.overview.recent_revenue.toLocaleString('en-IN', {
                            maximumFractionDigits: 0
                        })} recent`}
                    />
                </div>

                {/* Orders by Status */}
                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Orders by Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {data.orders_by_status.map((item) => (
                                    <div key={item.status} className="flex items-center justify-between">
                                        <Badge variant="outline">{item.status}</Badge>
                                        <span className="font-semibold">{item.count}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment Methods */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment Methods</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {data.payment_stats.map((item) => (
                                    <div key={item.payment_method} className="flex items-center justify-between">
                                        <span className="text-sm">{item.payment_method}</span>
                                        <div className="text-right">
                                            <p className="font-semibold">{item.count} transactions</p>
                                            <p className="text-xs text-muted-foreground">
                                                ₹{item.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Top Products */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Selling Products</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.top_products.length > 0 ? (
                                data.top_products.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                                        <div className="flex-1">
                                            <p className="font-semibold">{item.name}</p>
                                            <p className="text-sm text-muted-foreground">{item.farm_name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold">{item.total_sold} sold</p>
                                            <p className="text-sm text-muted-foreground">
                                                ₹{item.total_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted-foreground">No sales data yet</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Farmers */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Farmers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.top_farmers.length > 0 ? (
                                data.top_farmers.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                                        <div className="flex-1">
                                            <p className="font-semibold">{item.farm_name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {item.first_name} {item.last_name}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold">{item.order_count} orders</p>
                                            <p className="text-sm text-muted-foreground">
                                                ₹{item.total_revenue.toLocaleString('en-IN', {
                                                    maximumFractionDigits: 0
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted-foreground">No farmer data yet</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Category Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Category Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.category_stats.length > 0 ? (
                                data.category_stats.map((item) => (
                                    <div key={item.category} className="flex items-center justify-between border-b pb-4 last:border-0">
                                        <div className="flex-1">
                                            <p className="font-semibold">{item.category}</p>
                                            <p className="text-sm text-muted-foreground">{item.product_count} products</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-muted-foreground">
                                                ₹{item.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted-foreground">No category data yet</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default AdminAnalytics;
