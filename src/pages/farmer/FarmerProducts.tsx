import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Package, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api';
import { getImageUrl } from '@/lib/imageUrl';

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  category_name: string;
  unit_name: string;
  primary_image?: string;
  status: string;
}

const FarmerProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async (showRefreshMessage = false) => {
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

      const response = await fetch(`${API_BASE_URL}/farmer/products.php`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setProducts(data.data);
      } else if (Array.isArray(data.data)) {
        setProducts(data.data);
      } else {
        setProducts([]);
      }

      if (showRefreshMessage) {
        toast({
          title: 'Success',
          description: 'Products list refreshed',
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch products';
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
    fetchProducts(true);
  };

  const handleDelete = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    setDeletingId(productId);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const deleteUrl = `${API_BASE_URL}/farmer/products.php?id=${productId}`;
      console.log(`[DELETE] URL: ${deleteUrl}`);
      console.log(`[DELETE] Token: ${token.substring(0, 20)}...`);

      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`[DELETE] Response Status: ${response.status} ${response.statusText}`);
      console.log(`[DELETE] Content-Type: ${response.headers.get('content-type')}`);

      // Always try to parse as JSON first
      let data: any = {};
      const contentType = response.headers.get('content-type');
      const responseText = await response.text();

      console.log(`[DELETE] Response Body (first 500 chars): ${responseText.substring(0, 500)}`);

      if (contentType && contentType.includes('application/json')) {
        try {
          data = JSON.parse(responseText);
          console.log(`[DELETE] Parsed JSON:`, data);
        } catch (parseErr) {
          console.error(`[DELETE] Failed to parse JSON:`, parseErr);
          data = { error: 'Invalid JSON response from server' };
        }
      } else {
        console.log(`[DELETE] Response is not JSON, content-type:`, contentType);
        if (responseText) {
          data = { error: responseText || 'Empty response' };
        }
      }

      if (!response.ok) {
        const errorMsg = data.error || data.message || `Server error (HTTP ${response.status})`;
        console.error(`[DELETE] Error Response:`, errorMsg);
        throw new Error(errorMsg);
      }

      console.log(`[DELETE] Success response:`, data);
      toast({
        title: 'Success',
        description: data.message || 'Product deleted successfully',
      });

      console.log('[DELETE] Refreshing product list...');
      await fetchProducts();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete product';
      console.error('[DELETE] Exception caught:', errorMsg);
      console.error('[DELETE] Full error:', err);

      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Products</h1>
            <p className="text-muted-foreground">{products.length} products listed</p>
          </div>
          <div className="flex gap-2">
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
            <Button asChild className="gap-2">
              <Link to="/farmer/products/new">
                <Plus className="h-4 w-4" />
                Add Product
              </Link>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
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
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No products yet. Add your first product!</p>
                <Button asChild className="mt-4 gap-2">
                  <Link to="/farmer/products/new">
                    <Plus className="h-4 w-4" />
                    Add Product
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Card key={product.id}>
                <div className="aspect-video bg-muted overflow-hidden relative">
                  <img
                    src={getImageUrl(product.primary_image)}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                  {product.status && (
                    <div className="absolute top-2 right-2">
                      <Badge
                        variant={
                          product.status === 'active'
                            ? 'default'
                            : product.status === 'pending'
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <Badge variant="secondary" className="mb-2">{product.category_name}</Badge>
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-primary font-bold">₹{parseFloat(product.price).toFixed(2)}/{product.unit_name}</p>
                    </div>
                    <Badge variant={product.stock_quantity > 10 ? 'default' : product.stock_quantity > 0 ? 'secondary' : 'destructive'}>
                      {product.stock_quantity} in stock
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1 gap-1" asChild>
                      <Link to={`/farmer/products/${product.id}/edit`}>
                        <Edit className="h-3 w-3" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleDelete(product.id)}
                      disabled={deletingId === product.id}
                    >
                      {deletingId === product.id ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-3 w-3" />
                        </>
                      )}
                    </Button>
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

export default FarmerProducts;
