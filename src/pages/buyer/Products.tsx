import React, { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProductCard, Product } from '@/components/dashboard/ProductCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, SlidersHorizontal, X, Loader2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { fetchProducts, fetchCategories } from '@/services/ProductService';
import { categories as defaultCategories } from '@/data/mockProducts';
import { getImageUrl } from '@/lib/imageUrl';
import { API_BASE_URL } from '@/lib/api';

const Products = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [sortBy, setSortBy] = useState<'relevance' | 'price_low' | 'price_high' | 'rating' | 'newest'>('newest');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedFarmers, setSelectedFarmers] = useState<string[]>([]);

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { addItem } = useCart();
  const { toast } = useToast();

  // Load products and categories on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch from backend - no fallback to mock data
      const response = await fetchProducts({
        page: 1,
        limit: 100,
        sort: sortBy,
      });

      // Handle both response formats
      let productsData = [];
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          // Direct array format from endpoint
          productsData = response.data;
        } else if (response.data?.products && Array.isArray(response.data.products)) {
          // Nested products format
          productsData = response.data.products;
        }
      }

      if (productsData.length > 0) {
        // Transform backend product format to match component format
        const transformedProducts = productsData.map((p: any) => {
          // Convert relative image URLs to absolute URLs using utility
          const imageUrl = getImageUrl(p.primary_image || p.images?.[0]?.image_url);
          return {
            id: p.id, // Use UUID from database
            name: p.name,
            description: p.description || `${p.name} - Fresh from farm`,
            price: parseFloat(p.price) || 0,
            unit: p.unit_abbr || p.unit_name || 'kg',
            category: p.category_name || 'Uncategorized',
            stock: p.stock_quantity || 0,
            rating: p.avg_rating ? parseFloat(p.avg_rating) : 0,
            reviewCount: p.review_count || 0,
            farmerId: p.farmer_id || '',
            farmerName: p.farm_name || '',
            image: imageUrl,
          };
        });
        setProducts(transformedProducts);
      } else {
        // No products available
        setProducts([]);
        setError('No products available at this time');
      }

      // Try to fetch categories
      try {
        const catResponse = await fetchCategories({ includeCount: true });
        if (catResponse.success && catResponse.data) {
          const categoryNames = ['All', ...catResponse.data.map((c: any) => c.name)];
          setCategories(categoryNames);
        }
      } catch (catError) {
        console.warn('Category fetch failed, using mock categories:', catError);
      }
    } catch (err) {
      console.error('Data loading error:', err);
      setError('Failed to load products. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const farmers = useMemo(() => {
    const farmerSet = new Set(products.map((p) => p.farmerName).filter(Boolean));
    return Array.from(farmerSet);
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.farmerName.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== 'All') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Price filter
    result = result.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);

    // Stock filter
    if (inStockOnly) {
      result = result.filter((p) => p.stock > 0);
    }

    // Farmer filter
    if (selectedFarmers.length > 0) {
      result = result.filter((p) => selectedFarmers.includes(p.farmerName));
    }

    // Sorting
    switch (sortBy) {
      case 'price_low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      default:
        break;
    }

    return result;
  }, [searchQuery, selectedCategory, priceRange, sortBy, inStockOnly, selectedFarmers, products]);

  const handleAddToCart = (product: Product) => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      unit: product.unit,
      image: product.image,
      farmerId: product.farmerId,
      farmerName: product.farmerName,
    });
    toast({
      title: 'Added to cart',
      description: `${product.name} has been added to your cart.`,
    });
  };

  const handleAddToWishlist = async (product: Product) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to add items to wishlist',
          variant: 'destructive',
        });
        return;
      }

      console.log('Adding product to wishlist:', product.id);
      const response = await fetch(`${API_BASE_URL}/buyer/wishlist.php`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: product.id,
        }),
      });

      console.log('Wishlist add response status:', response.status);
      const data = await response.json();
      console.log('Wishlist add response:', data);

      if (response.ok) {
        // Trigger dashboard refresh via custom event
        window.dispatchEvent(new Event('wishlist_updated'));
        toast({
          title: 'Added to wishlist',
          description: `${product.name} has been added to your wishlist.`,
        });
      } else if (response.status === 409) {
        toast({
          title: 'Already in wishlist',
          description: `${product.name} is already in your wishlist.`,
        });
      } else {
        toast({
          title: 'Failed to add to wishlist',
          description: data.error || 'Unable to add item to wishlist',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to add to wishlist';
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setPriceRange([0, 500]);
    setInStockOnly(false);
    setSelectedFarmers([]);
    setSortBy('newest');
  };

  const toggleFarmer = (farmer: string) => {
    setSelectedFarmers((prev) =>
      prev.includes(farmer) ? prev.filter((f) => f !== farmer) : [...prev, farmer]
    );
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Price Range */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Price Range</Label>
        <Slider
          value={priceRange}
          onValueChange={(value) => setPriceRange(value as [number, number])}
          max={500}
          step={10}
          className="mt-2"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>₹{priceRange[0]}</span>
          <span>₹{priceRange[1]}</span>
        </div>
      </div>

      {/* In Stock */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="in-stock"
          checked={inStockOnly}
          onCheckedChange={(checked) => setInStockOnly(!!checked)}
        />
        <Label htmlFor="in-stock" className="text-sm cursor-pointer">
          In stock only
        </Label>
      </div>

      {/* Farmers */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Farmers</Label>
        {farmers.map((farmer) => (
          <div key={farmer} className="flex items-center space-x-2">
            <Checkbox
              id={farmer}
              checked={selectedFarmers.includes(farmer)}
              onCheckedChange={() => toggleFarmer(farmer)}
            />
            <Label htmlFor={farmer} className="text-sm cursor-pointer">
              {farmer}
            </Label>
          </div>
        ))}
      </div>

      <Button variant="outline" className="w-full" onClick={clearFilters}>
        Clear Filters
      </Button>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Browse Products</h1>
          <p className="text-muted-foreground">
            {filteredProducts.length} products available
          </p>
        </div>

        {/* Search and Sort Bar */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products, farmers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
              </SelectContent>
            </Select>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="flex-wrap h-auto gap-2 bg-transparent p-0">
            {categories.map((cat) => (
              <TabsTrigger
                key={cat}
                value={cat}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4"
              >
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Desktop Filters Sidebar */}
          <Card className="hidden lg:block h-fit">
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <FilterContent />
            </CardContent>
          </Card>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading products...</span>
              </div>
            ) : error ? (
              <Card className="py-12">
                <CardContent className="text-center">
                  <p className="text-red-500">{error}</p>
                  <Button onClick={loadData} className="mt-2">
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            ) : filteredProducts.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                    onAddToWishlist={handleAddToWishlist}
                  />
                ))}
              </div>
            ) : (
              <Card className="py-12">
                <CardContent className="text-center">
                  <p className="text-muted-foreground">No products found matching your criteria.</p>
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear all filters
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Products;
