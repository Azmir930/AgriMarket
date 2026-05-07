import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Package, TrendingUp, TrendingDown, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api';
import { getImageUrl } from '@/lib/imageUrl';

interface InventoryItem {
    product_id: string;
    product_name: string;
    category_name: string;
    unit_name: string;
    current_stock: number;
    min_stock: number;
    price: number;
    primary_image?: string;
    status: string;
}

interface InventoryLog {
    id: string;
    product_id: string;
    product_name: string;
    change_type: string;
    quantity: number;
    previous_qty: number;
    new_qty: number;
    notes: string;
    created_at: string;
}

const Inventory = () => {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [logs, setLogs] = useState<InventoryLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showLogs, setShowLogs] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async (showRefreshMessage = false) => {
        try {
            if (showRefreshMessage) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }
            setError(null);

            const token = localStorage.getItem('auth_token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const inventoryUrl = `${API_BASE_URL}/farmer/inventory.php`;
            console.log(`[Inventory] Fetching from: ${inventoryUrl}`);
            console.log(`[Inventory] Token: ${token.substring(0, 20)}...`);

            const response = await fetch(inventoryUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            console.log(`[Inventory] Response status: ${response.status}`);
            console.log(`[Inventory] Response headers:`, {
                'content-type': response.headers.get('content-type'),
                'content-length': response.headers.get('content-length'),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`[Inventory] Error response body:`, errorBody);

                // Try to parse JSON error
                let errorMessage = response.statusText;
                try {
                    const jsonError = JSON.parse(errorBody);
                    errorMessage = jsonError.error || jsonError.debug || response.statusText;
                    console.error(`[Inventory] Parsed error:`, jsonError);
                } catch (e) {
                    console.log(`[Inventory] Response is not JSON:`, errorBody.substring(0, 200));
                }

                throw new Error(`Failed to fetch inventory: ${errorMessage}`);
            }

            const data = await response.json();
            console.log(`[Inventory] Data received:`, data);

            if (data.success) {
                // Transform inventory data to ensure proper types
                const transformedInventory = (data.inventory || []).map((item: any) => ({
                    ...item,
                    price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
                    current_stock: typeof item.current_stock === 'string' ? parseInt(item.current_stock) : item.current_stock,
                    min_stock: typeof item.min_stock === 'string' ? parseInt(item.min_stock) : item.min_stock,
                }));
                setInventory(transformedInventory);
                setLogs(data.logs || []);
                console.log(`[Inventory] Loaded ${transformedInventory.length} inventory items and ${(data.logs || []).length} log entries`);
            } else {
                setInventory([]);
                setLogs([]);
                console.warn(`[Inventory] API returned success=false:`, data);
            }

            if (showRefreshMessage) {
                toast({
                    title: 'Success',
                    description: 'Inventory refreshed',
                });
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to fetch inventory';
            console.error('[Inventory] Fetch error:', errorMsg, err);
            setError(errorMsg);
            toast({
                title: 'Error',
                description: errorMsg,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleRefresh = () => {
        fetchInventory(true);
    };

    const getLowStockItems = () => inventory.filter(item => item.current_stock <= item.min_stock);
    const getOutOfStockItems = () => inventory.filter(item => item.current_stock === 0);

    const lowStockCount = getLowStockItems().length;
    const outOfStockCount = getOutOfStockItems().length;
    const totalValue = inventory.reduce((sum, item) => sum + (item.current_stock * item.price), 0);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Inventory Management</h1>
                        <p className="text-muted-foreground">Track and manage product stock levels</p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">Total Items</p>
                                <p className="text-3xl font-bold mt-2">{inventory.length}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">Stock Value</p>
                                <p className="text-3xl font-bold mt-2 text-green-600">₹{totalValue.toFixed(0)}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">Low Stock</p>
                                <p className={`text-3xl font-bold mt-2 ${lowStockCount > 0 ? 'text-orange-600' : ''}`}>
                                    {lowStockCount}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">Out of Stock</p>
                                <p className={`text-3xl font-bold mt-2 ${outOfStockCount > 0 ? 'text-red-600' : ''}`}>
                                    {outOfStockCount}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Alerts */}
                {outOfStockCount > 0 && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            You have {outOfStockCount} product{outOfStockCount !== 1 ? 's' : ''} out of stock. Consider restocking them soon!
                        </AlertDescription>
                    </Alert>
                )}

                {lowStockCount > 0 && outOfStockCount === 0 && (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            You have {lowStockCount} product{lowStockCount !== 1 ? 's' : ''} with low stock levels.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Loading State */}
                {isLoading ? (
                    <Card>
                        <CardContent className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </CardContent>
                    </Card>
                ) : error ? (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground mb-4">{error}</p>
                                <Button onClick={handleRefresh} variant="outline" className="gap-2">
                                    <RefreshCw className="h-4 w-4" />
                                    Try Again
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : inventory.length === 0 ? (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">No inventory items yet</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Tabs */}
                        <div className="flex gap-2 border-b">
                            <Button
                                variant={!showLogs ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setShowLogs(false)}
                            >
                                Current Stock
                            </Button>
                            <Button
                                variant={showLogs ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setShowLogs(true)}
                            >
                                History
                            </Button>
                        </div>

                        {/* Current Stock View */}
                        {!showLogs && (
                            <div className="space-y-4">
                                {/* Out of Stock Items */}
                                {getOutOfStockItems().length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 text-red-600 flex items-center gap-2">
                                            <AlertCircle className="h-5 w-5" />
                                            Out of Stock ({outOfStockCount})
                                        </h3>
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            {getOutOfStockItems().map((item) => (
                                                <Card key={item.product_id} className="border-red-200">
                                                    <div className="aspect-video bg-muted overflow-hidden relative">
                                                        <img
                                                            src={getImageUrl(item.primary_image)}
                                                            alt={item.product_name}
                                                            className="h-full w-full object-cover"
                                                        />
                                                        <div className="absolute top-2 right-2">
                                                            <Badge variant="destructive">Out of Stock</Badge>
                                                        </div>
                                                    </div>
                                                    <CardContent className="pt-4">
                                                        <h4 className="font-semibold">{item.product_name}</h4>
                                                        <div className="mt-2 space-y-1 text-sm">
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Category:</span>
                                                                <span>{item.category_name}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Current Stock:</span>
                                                                <span className="font-bold text-red-600">0 {item.unit_name}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Price:</span>
                                                                <span className="font-semibold">₹{typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'}</span>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Low Stock Items */}
                                {getLowStockItems().length > 0 && outOfStockCount < getLowStockItems().length && (
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 text-orange-600 flex items-center gap-2">
                                            <TrendingDown className="h-5 w-5" />
                                            Low Stock ({lowStockCount - outOfStockCount})
                                        </h3>
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            {getLowStockItems()
                                                .filter(item => item.current_stock > 0)
                                                .map((item) => (
                                                    <Card key={item.product_id} className="border-orange-200">
                                                        <div className="aspect-video bg-muted overflow-hidden relative">
                                                            <img
                                                                src={getImageUrl(item.primary_image)}
                                                                alt={item.product_name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                            <div className="absolute top-2 right-2">
                                                                <Badge variant="secondary">Low Stock</Badge>
                                                            </div>
                                                        </div>
                                                        <CardContent className="pt-4">
                                                            <h4 className="font-semibold">{item.product_name}</h4>
                                                            <div className="mt-2 space-y-1 text-sm">
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">Category:</span>
                                                                    <span>{item.category_name}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">Current Stock:</span>
                                                                    <span className="font-bold text-orange-600">
                                                                        {item.current_stock} {item.unit_name}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">Min. Stock:</span>
                                                                    <span>{item.min_stock} {item.unit_name}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">Price:</span>
                                                                    <span className="font-semibold">₹{typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'}</span>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {/* Normal Stock Items */}
                                {inventory.filter(item => item.current_stock > item.min_stock).length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 text-green-600 flex items-center gap-2">
                                            <TrendingUp className="h-5 w-5" />
                                            Healthy Stock ({inventory.filter(item => item.current_stock > item.min_stock).length})
                                        </h3>
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            {inventory
                                                .filter(item => item.current_stock > item.min_stock)
                                                .map((item) => (
                                                    <Card key={item.product_id}>
                                                        <div className="aspect-video bg-muted overflow-hidden relative">
                                                            <img
                                                                src={getImageUrl(item.primary_image)}
                                                                alt={item.product_name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                            <div className="absolute top-2 right-2">
                                                                <Badge>In Stock</Badge>
                                                            </div>
                                                        </div>
                                                        <CardContent className="pt-4">
                                                            <h4 className="font-semibold">{item.product_name}</h4>
                                                            <div className="mt-2 space-y-1 text-sm">
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">Category:</span>
                                                                    <span>{item.category_name}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">Current Stock:</span>
                                                                    <span className="font-bold text-green-600">
                                                                        {item.current_stock} {item.unit_name}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">Stock Value:</span>
                                                                    <span className="font-semibold">
                                                                        ₹{typeof item.price === 'number' ? (item.current_stock * item.price).toFixed(0) : '0'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* History View */}
                        {showLogs && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Inventory Change History</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {logs.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-8">No inventory changes recorded</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b">
                                                        <th className="text-left py-2 px-2 font-semibold">Product</th>
                                                        <th className="text-left py-2 px-2 font-semibold">Change Type</th>
                                                        <th className="text-right py-2 px-2 font-semibold">Quantity Changed</th>
                                                        <th className="text-center py-2 px-2 font-semibold">Before</th>
                                                        <th className="text-center py-2 px-2 font-semibold">After</th>
                                                        <th className="text-left py-2 px-2 font-semibold">Notes</th>
                                                        <th className="text-left py-2 px-2 font-semibold">Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {logs.map((log) => (
                                                        <tr key={log.id} className="border-b hover:bg-muted/50">
                                                            <td className="py-2 px-2 font-medium">{log.product_name}</td>
                                                            <td className="py-2 px-2">
                                                                <Badge
                                                                    variant={
                                                                        log.change_type === 'initial_stock'
                                                                            ? 'default'
                                                                            : log.change_type === 'sale'
                                                                                ? 'destructive'
                                                                                : 'secondary'
                                                                    }
                                                                >
                                                                    {log.change_type.replace('_', ' ')}
                                                                </Badge>
                                                            </td>
                                                            <td className="py-2 px-2 text-right font-semibold">
                                                                <span className={log.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                                                                    {log.quantity > 0 ? '+' : ''}{log.quantity}
                                                                </span>
                                                            </td>
                                                            <td className="py-2 px-2 text-center">{log.previous_qty}</td>
                                                            <td className="py-2 px-2 text-center font-semibold">{log.new_qty}</td>
                                                            <td className="py-2 px-2 text-muted-foreground">{log.notes}</td>
                                                            <td className="py-2 px-2 text-muted-foreground text-xs">
                                                                {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Inventory;
