import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Check, X, Package, Loader2, Search } from 'lucide-react';
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
    farm_name: string;
    first_name: string;
    last_name: string;
    created_at: string;
}

const AdminProductApproval = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchPendingProducts();
    }, [search]);

    const fetchPendingProducts = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const token = localStorage.getItem('auth_token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const url = new URL(`${API_BASE_URL}/admin/product_approval.php`);
            url.searchParams.set('status', 'pending');
            if (search) url.searchParams.set('search', search);

            const response = await fetch(url.toString(), {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch pending products');
            }

            const data = await response.json();
            setProducts(data.data || []);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to fetch products';
            setError(msg);
            toast({ title: 'Error', description: msg, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (productId: string) => {
        if (!selectedProduct) return;
        await processApproval(productId, 'approve');
    };

    const handleReject = async (productId: string) => {
        if (!selectedProduct) return;
        await processApproval(productId, 'reject');
    };

    const processApproval = async (productId: string, action: 'approve' | 'reject') => {
        try {
            setIsSubmitting(true);
            const token = localStorage.getItem('auth_token');

            const response = await fetch(`${API_BASE_URL}/admin/product_approval.php`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: productId,
                    action,
                    notes: notes || undefined
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to process approval');
            }

            toast({
                title: 'Success',
                description: action === 'approve' ? 'Product approved successfully' : 'Product rejected',
            });

            setSelectedProduct(null);
            setNotes('');
            fetchPendingProducts();
        } catch (err) {
            toast({
                title: 'Error',
                description: err instanceof Error ? err.message : 'Failed to process approval',
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Product Approvals</h1>
                    <p className="text-muted-foreground">Review and approve farmer products</p>
                </div>

                <div className="flex gap-2">
                    <Input
                        placeholder="Search by product name or farm..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="max-w-sm"
                        icon={<Search className="h-4 w-4" />}
                    />
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
                                <p className="text-muted-foreground">{error}</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : products.length === 0 ? (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">No pending products for approval</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {products.map((product) => (
                            <Card key={product.id}>
                                <CardContent className="pt-6">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-5 md:gap-6">
                                        {/* Image */}
                                        <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                                            <img
                                                src={getImageUrl(product.primary_image)}
                                                alt={product.name}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>

                                        {/* Product details */}
                                        <div className="space-y-2">
                                            <h3 className="font-semibold text-lg">{product.name}</h3>
                                            <Badge>{product.category_name}</Badge>
                                            <p className="text-sm text-muted-foreground">
                                                {product.unit_name && `${product.unit_name} • `}
                                                Stock: {product.stock_quantity}
                                            </p>
                                            <p className="text-lg font-bold text-primary">₹{parseFloat(product.price).toFixed(2)}</p>
                                        </div>

                                        {/* Farm details */}
                                        <div className="space-y-2">
                                            <p className="text-sm font-semibold text-muted-foreground">Farm</p>
                                            <p className="font-semibold">{product.farm_name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {product.first_name} {product.last_name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Submitted: {new Date(product.created_at).toLocaleDateString()}
                                            </p>
                                        </div>

                                        {/* Status */}
                                        <div className="flex items-center">
                                            <Badge variant="outline" className="h-fit">
                                                {product.status}
                                            </Badge>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col gap-2 justify-center">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        className="gap-2 bg-green-600 hover:bg-green-700"
                                                        onClick={() => {
                                                            setSelectedProduct(product);
                                                            setNotes('');
                                                        }}
                                                    >
                                                        <Check className="h-4 w-4" />
                                                        Approve
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogTitle>Approve Product</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to approve "{product.name}" from {product.farm_name}?
                                                    </AlertDialogDescription>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="notes">Notes (optional)</Label>
                                                        <Textarea
                                                            id="notes"
                                                            placeholder="Add approval notes..."
                                                            value={notes}
                                                            onChange={(e) => setNotes(e.target.value)}
                                                            rows={3}
                                                        />
                                                    </div>
                                                    <div className="flex gap-3 justify-end">
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            className="bg-green-600 hover:bg-green-700"
                                                            onClick={() => handleApprove(product.id)}
                                                            disabled={isSubmitting}
                                                        >
                                                            {isSubmitting ? 'Processing...' : 'Approve'}
                                                        </AlertDialogAction>
                                                    </div>
                                                </AlertDialogContent>
                                            </AlertDialog>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="destructive"
                                                        className="gap-2"
                                                        onClick={() => {
                                                            setSelectedProduct(product);
                                                            setNotes('');
                                                        }}
                                                    >
                                                        <X className="h-4 w-4" />
                                                        Reject
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogTitle>Reject Product</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to reject "{product.name}" from {product.farm_name}?
                                                    </AlertDialogDescription>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="reject-notes">Rejection Reason</Label>
                                                        <Textarea
                                                            id="reject-notes"
                                                            placeholder="Explain why you're rejecting this product..."
                                                            value={notes}
                                                            onChange={(e) => setNotes(e.target.value)}
                                                            rows={3}
                                                        />
                                                    </div>
                                                    <div className="flex gap-3 justify-end">
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            className="bg-destructive hover:bg-destructive/90"
                                                            onClick={() => handleReject(product.id)}
                                                            disabled={isSubmitting}
                                                        >
                                                            {isSubmitting ? 'Processing...' : 'Reject'}
                                                        </AlertDialogAction>
                                                    </div>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
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

export default AdminProductApproval;
