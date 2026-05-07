<?php
/**
 * Farmer Dashboard Analytics
 * Agriculture Product Marketplace
 */

require_once '../config/database.php';
require_once '../config/helpers.php';
require_once '../auth/middleware.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

try {
    $user = validateToken();
    if (!$user || $user['role_name'] !== 'farmer') {
        jsonResponse(['error' => 'Unauthorized or not a farmer'], 401);
    }

    $database = new Database();
    $conn = $database->getConnection();

    // Get farmer ID from user
    $stmt = $conn->prepare("SELECT id FROM farmer WHERE user_id = ?");
    $stmt->execute([$user['user_id']]);
    $farmerResult = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$farmerResult) {
        jsonResponse(['error' => 'Farmer profile not found'], 404);
    }
    
    $farmer_id = $farmerResult['id'];

    // Total Products
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM product WHERE farmer_id = ?");
    $stmt->execute([$farmer_id]);
    $total_products = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    // Total Products Last Month (for trend)
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM product WHERE farmer_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 60 DAY) AND created_at < DATE_SUB(CURDATE(), INTERVAL 30 DAY)");
    $stmt->execute([$farmer_id]);
    $total_products_last_month = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    $products_trend = 0;
    if ($total_products_last_month > 0) {
        $products_trend = round((($total_products - $total_products_last_month) / $total_products_last_month) * 100);
    }

    // Pending Orders (orders with farmer's products that are not shipped/delivered/cancelled)
    $stmt = $conn->prepare("
        SELECT COUNT(DISTINCT o.id) as count
        FROM orders o
        WHERE EXISTS (
            SELECT 1 FROM order_items oi 
            WHERE oi.order_id = o.id 
            AND oi.farmer_id = ?
        )
        AND o.status NOT IN ('delivered', 'shipped', 'cancelled')
    ");
    $stmt->execute([$farmer_id]);
    $pending_orders = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    // Pending Orders Last Month (for trend)
    $stmt = $conn->prepare("
        SELECT COUNT(DISTINCT o.id) as count
        FROM orders o
        WHERE EXISTS (
            SELECT 1 FROM order_items oi 
            WHERE oi.order_id = o.id 
            AND oi.farmer_id = ?
        )
        AND o.status NOT IN ('delivered', 'shipped', 'cancelled')
        AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)
        AND o.created_at < DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    ");
    $stmt->execute([$farmer_id]);
    $pending_orders_last_month = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    // Calculate trend
    $pending_orders_trend = 0;
    if ($pending_orders_last_month > 0) {
        $pending_orders_trend = round((($pending_orders - $pending_orders_last_month) / $pending_orders_last_month) * 100);
    }

    // Total Revenue
    $stmt = $conn->prepare("
        SELECT SUM(oi.total_price) as total
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.farmer_id = ? AND o.status IN ('delivered', 'shipped')
    ");
    $stmt->execute([$farmer_id]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $total_revenue = $result['total'] ?? 0;

    // Total Revenue Last Month (for trend)
    $stmt = $conn->prepare("
        SELECT SUM(oi.total_price) as total
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.farmer_id = ? AND o.status IN ('delivered', 'shipped')
        AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)
        AND o.created_at < DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    ");
    $stmt->execute([$farmer_id]);
    $result_last_month = $stmt->fetch(PDO::FETCH_ASSOC);
    $total_revenue_last_month = $result_last_month['total'] ?? 0;
    
    $revenue_trend = 0;
    if ($total_revenue_last_month > 0) {
        $revenue_trend = round((($total_revenue - $total_revenue_last_month) / $total_revenue_last_month) * 100);
    }

    // Average Rating
    $stmt = $conn->prepare("
        SELECT AVG(r.rating) as avg_rating
        FROM review r
        JOIN product p ON r.product_id = p.id
        WHERE p.farmer_id = ? AND r.rating IS NOT NULL
    ");
    $stmt->execute([$farmer_id]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $avg_rating = round($result['avg_rating'] ?? 0, 1);

    // Average Rating Last Month (for trend)
    $stmt = $conn->prepare("
        SELECT AVG(r.rating) as avg_rating
        FROM review r
        JOIN product p ON r.product_id = p.id
        WHERE p.farmer_id = ? AND r.rating IS NOT NULL
        AND r.created_at >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)
        AND r.created_at < DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    ");
    $stmt->execute([$farmer_id]);
    $result_last_month = $stmt->fetch(PDO::FETCH_ASSOC);
    $avg_rating_last_month = round($result_last_month['avg_rating'] ?? 0, 1);
    
    $rating_trend = 0;
    if ($avg_rating_last_month > 0) {
        $rating_trend = round(($avg_rating - $avg_rating_last_month) * 10);
    }

    jsonResponse([
        'success' => true,
        'data' => [
            'total_products' => (int)$total_products,
            'total_products_trend' => (int)$products_trend,
            'pending_orders' => (int)$pending_orders,
            'pending_orders_trend' => (int)$pending_orders_trend,
            'total_revenue' => (float)$total_revenue,
            'total_revenue_trend' => (int)$revenue_trend,
            'avg_rating' => (float)$avg_rating,
            'avg_rating_trend' => (int)$rating_trend
        ]
    ]);

} catch (Exception $e) {
    jsonResponse([
        'success' => false,
        'message' => 'Failed to fetch farmer analytics',
        'error' => $e->getMessage()
    ], 500);
}
?>
