import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ProfileSettings from "./pages/profile/ProfileSettings";
import FarmerDashboard from "./pages/farmer/FarmerDashboard";
import FarmerProducts from "./pages/farmer/FarmerProducts";
import FarmerInventory from "./pages/farmer/Inventory";
import ProductForm from "./pages/farmer/ProductForm";
import FarmerOrders from "./pages/farmer/FarmerOrders";
import FarmerReviews from "./pages/farmer/FarmerReviews";
import BuyerDashboard from "./pages/buyer/BuyerDashboard";
import Products from "./pages/buyer/Products";
import ProductDetails from "./pages/buyer/ProductDetails";
import Cart from "./pages/buyer/Cart";
import Checkout from "./pages/buyer/Checkout";
import Wishlist from "./pages/buyer/Wishlist";
import Orders from "./pages/buyer/Orders";
import OrderDetail from "./pages/buyer/OrderDetail";
import WriteReview from "./pages/buyer/WriteReview";
import BuyerReviews from "./pages/buyer/BuyerReviews";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminProductApproval from "./pages/admin/AdminProductApproval";
import AdminAnalytics from "./pages/admin/AdminAnalytics";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) return <Navigate to={`/${user.role}`} replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to={`/${user?.role}`} replace /> : <Index />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to={`/${user?.role}`} replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to={`/${user?.role}`} replace /> : <Register />} />
      <Route path="/forgot-password" element={isAuthenticated ? <Navigate to={`/${user?.role}`} replace /> : <ForgotPassword />} />
      <Route path="/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />

      {/* Buyer Routes */}
      <Route path="/buyer" element={<ProtectedRoute allowedRoles={['buyer']}><BuyerDashboard /></ProtectedRoute>} />
      <Route path="/buyer/products" element={<ProtectedRoute allowedRoles={['buyer']}><Products /></ProtectedRoute>} />
      <Route path="/buyer/products/:id" element={<ProtectedRoute allowedRoles={['buyer']}><ProductDetails /></ProtectedRoute>} />
      <Route path="/buyer/cart" element={<ProtectedRoute allowedRoles={['buyer']}><Cart /></ProtectedRoute>} />
      <Route path="/buyer/checkout" element={<ProtectedRoute allowedRoles={['buyer']}><Checkout /></ProtectedRoute>} />
      <Route path="/buyer/wishlist" element={<ProtectedRoute allowedRoles={['buyer']}><Wishlist /></ProtectedRoute>} />
      <Route path="/buyer/orders" element={<ProtectedRoute allowedRoles={['buyer']}><Orders /></ProtectedRoute>} />
      <Route path="/buyer/orders/:id" element={<ProtectedRoute allowedRoles={['buyer']}><OrderDetail /></ProtectedRoute>} />
      <Route path="/buyer/reviews" element={<ProtectedRoute allowedRoles={['buyer']}><BuyerReviews /></ProtectedRoute>} />
      <Route path="/buyer/review/:productId" element={<ProtectedRoute allowedRoles={['buyer']}><WriteReview /></ProtectedRoute>} />

      {/* Farmer Routes */}
      <Route path="/farmer" element={<ProtectedRoute allowedRoles={['farmer']}><FarmerDashboard /></ProtectedRoute>} />
      <Route path="/farmer/products" element={<ProtectedRoute allowedRoles={['farmer']}><FarmerProducts /></ProtectedRoute>} />
      <Route path="/farmer/products/new" element={<ProtectedRoute allowedRoles={['farmer']}><ProductForm /></ProtectedRoute>} />
      <Route path="/farmer/products/:id/edit" element={<ProtectedRoute allowedRoles={['farmer']}><ProductForm /></ProtectedRoute>} />
      <Route path="/farmer/inventory" element={<ProtectedRoute allowedRoles={['farmer']}><FarmerInventory /></ProtectedRoute>} />
      <Route path="/farmer/orders" element={<ProtectedRoute allowedRoles={['farmer']}><FarmerOrders /></ProtectedRoute>} />
      <Route path="/farmer/reviews" element={<ProtectedRoute allowedRoles={['farmer']}><FarmerReviews /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/products" element={<ProtectedRoute allowedRoles={['admin']}><AdminProducts /></ProtectedRoute>} />
      <Route path="/admin/product-approval" element={<ProtectedRoute allowedRoles={['admin']}><AdminProductApproval /></ProtectedRoute>} />
      <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={['admin']}><AdminOrders /></ProtectedRoute>} />
      <Route path="/admin/payments" element={<ProtectedRoute allowedRoles={['admin']}><AdminPayments /></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><AdminAnalytics /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
