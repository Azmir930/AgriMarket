import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star, Loader2, AlertCircle, Trash2, Edit2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api';

interface BuyerReview {
    id: string;
    product_id: string;
    product_name: string;
    product_image?: string;
    rating: number;
    comment: string;
    created_at: string;
}

interface ApiResponse {
    success: boolean;
    data: BuyerReview[];
    pagination: {
        total: number;
        pages: number;
        current_page: number;
    };
}

const BuyerReviews = () => {
    const [reviews, setReviews] = useState<BuyerReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        fetchReviews();
    }, [page]);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('auth_token');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const response = await fetch(`${API_BASE_URL}/buyer/reviews.php?page=${page}&limit=10`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const data: ApiResponse = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to fetch reviews');
            }

            setReviews(data.data || []);
            setTotalPages(data.pagination?.pages || 1);
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to load reviews';
            setError(errorMessage);
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteReview = async (reviewId: string) => {
        if (!window.confirm('Are you sure you want to delete this review?')) {
            return;
        }

        try {
            setDeletingId(reviewId);
            const token = localStorage.getItem('auth_token');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const response = await fetch(`${API_BASE_URL}/buyer/reviews.php?id=${reviewId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to delete review');
            }

            setReviews(reviews.filter((r) => r.id !== reviewId));
            toast({
                title: 'Success',
                description: 'Review deleted successfully',
            });
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to delete review';
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setDeletingId(null);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const renderStars = (rating: number) => {
        return (
            <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`h-4 w-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                            }`}
                    />
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">My Reviews</h1>
                    <p className="text-muted-foreground">
                        {reviews.length} review{reviews.length !== 1 ? 's' : ''} written
                    </p>
                </div>

                {error && (
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="pt-6 flex gap-3">
                            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-red-900">Error</p>
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {reviews.length === 0 ? (
                    <Card>
                        <CardContent className="pt-6 text-center py-12">
                            <p className="text-muted-foreground mb-4">You haven't written any reviews yet</p>
                            <Button asChild>
                                <Link to="/buyer/products">Browse Products</Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {reviews.map((review) => (
                            <Card key={review.id}>
                                <CardContent className="pt-6">
                                    <div className="flex gap-4">
                                        {/* Product Image */}
                                        <Link
                                            to={`/buyer/products/${review.product_id}`}
                                            className="h-20 w-20 bg-muted rounded-lg flex-shrink-0"
                                        >
                                            <img
                                                src={review.product_image || '/placeholder.svg'}
                                                alt={review.product_name}
                                                className="h-full w-full object-cover rounded-lg"
                                            />
                                        </Link>

                                        {/* Review Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <Link
                                                        to={`/buyer/products/${review.product_id}`}
                                                        className="font-semibold hover:text-primary text-lg"
                                                    >
                                                        {review.product_name}
                                                    </Link>

                                                    {/* Rating */}
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {renderStars(review.rating)}
                                                        <span className="text-sm font-medium">{review.rating}.0</span>
                                                    </div>

                                                    {/* Review Text */}
                                                    <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                                                        {review.comment}
                                                    </p>

                                                    {/* Date */}
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        {formatDate(review.created_at)}
                                                    </p>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex gap-2 flex-shrink-0">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        disabled={true}
                                                        title="Edit functionality coming soon"
                                                        className="opacity-50 cursor-not-allowed"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => handleDeleteReview(review.id)}
                                                        disabled={deletingId === review.id}
                                                        className="text-destructive hover:text-destructive"
                                                    >
                                                        {deletingId === review.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center gap-2 mt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1}
                                >
                                    Previous
                                </Button>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm">
                                        Page {page} of {totalPages}
                                    </span>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                                    disabled={page === totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default BuyerReviews;
