<?php
/**
 * Admin Analytics Dashboard
 * Agriculture Product Marketplace
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once '../config/database.php';
require_once '../config/helpers.php';
require_once '../auth/middleware.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

try {
    $user = requireApiRole('admin');
    $database = new Database();
    $conn = $database->getConnection();

    $period = intval($_GET['period'] ?? 30);

    // Overview stats (lowercase table names)
    $stmt = $conn->prepare("
        SELECT 
            (SELECT COUNT(*) FROM user) as total_users,
            (SELECT COUNT(*) FROM user WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)) as new_users,
            (SELECT COUNT(*) FROM farmer) as total_farmers,
            (SELECT COUNT(*) FROM buyer) as total_buyers,
            (SELECT COUNT(*) FROM product WHERE status = 'active') as active_products,
            (SELECT COUNT(*) FROM orders) as total_orders,
            (SELECT COUNT(*) FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)) as recent_orders,
            (SELECT COALESCE(SUM(amount), 0) FROM payment WHERE status = 'completed') as total_revenue,
            (SELECT COALESCE(SUM(amount), 0) FROM payment WHERE status = 'completed' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)) as recent_revenue
    ");
    $stmt->execute([$period, $period, $period]);
    $overview = $stmt->fetch(PDO::FETCH_ASSOC);

    // Orders by status
    $stmt = $conn->prepare("
        SELECT status, COUNT(*) as count
        FROM orders
        GROUP BY status
    ");
    $stmt->execute();
    $orders_by_status = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Revenue trend (daily for last N days)
    $stmt = $conn->prepare("
        SELECT DATE(o.created_at) as date, 
               COUNT(DISTINCT o.id) as order_count,
               COALESCE(SUM(p.amount), 0) as revenue
        FROM orders o
        LEFT JOIN payment p ON o.id = p.order_id AND p.status = 'completed'
        WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND o.status != 'cancelled'
        GROUP BY DATE(o.created_at)
        ORDER BY date
    ");
    $stmt->execute([$period]);
    $revenue_trend = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Top selling products
    $stmt = $conn->prepare("
        SELECT p.id, p.name, f.farm_name,
               SUM(oi.quantity) as total_sold,
               COALESCE(SUM(py.amount), 0) as total_revenue
        FROM order_items oi
        JOIN product p ON oi.product_id = p.id
        JOIN farmer f ON p.farmer_id = f.id
        JOIN orders o ON oi.order_id = o.id
        LEFT JOIN payment py ON o.id = py.order_id AND py.status = 'completed'
        WHERE o.status != 'cancelled' AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY p.id, p.name, f.farm_name
        ORDER BY total_sold DESC
        LIMIT 10
    ");
    $stmt->execute([$period]);
    $top_products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Top farmers by revenue
    $stmt = $conn->prepare("
        SELECT f.id, f.farm_name, u.first_name, u.last_name,
               COUNT(DISTINCT o.id) as order_count,
               COALESCE(SUM(py.amount), 0) as total_revenue
        FROM farmer f
        JOIN user u ON f.user_id = u.id
        JOIN product p ON f.id = p.farmer_id
        JOIN order_items oi ON p.id = oi.product_id
        JOIN orders o ON oi.order_id = o.id
        LEFT JOIN payment py ON o.id = py.order_id AND py.status = 'completed'
        WHERE o.status != 'cancelled'
        GROUP BY f.id, f.farm_name, u.first_name, u.last_name
        ORDER BY total_revenue DESC
        LIMIT 10
    ");
    $stmt->execute();
    $top_farmers = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Category distribution
    $stmt = $conn->prepare("
        SELECT c.name as category,
               COUNT(DISTINCT p.id) as product_count,
               COALESCE(SUM(py.amount), 0) as revenue
        FROM category c
        LEFT JOIN product p ON c.id = p.category_id AND p.status = 'active'
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
        LEFT JOIN payment py ON o.id = py.order_id AND py.status = 'completed'
        WHERE c.is_active = TRUE
        GROUP BY c.id, c.name
        ORDER BY revenue DESC
    ");
    $stmt->execute();
    $category_stats = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Recent activity
    $stmt = $conn->prepare("
        SELECT al.*, u.first_name, u.last_name
        FROM user_activity_log al
        JOIN user u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT 20
    ");
    $stmt->execute();
    $recent_activity = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Payment stats
    $stmt = $conn->prepare("
        SELECT payment_method,
               COUNT(*) as count,
               SUM(amount) as total
        FROM payment
        WHERE status = 'completed'
        GROUP BY payment_method
    ");
    $stmt->execute();
    $payment_stats = $stmt->fetchAll(PDO::FETCH_ASSOC);

    jsonResponse([
        'success' => true,
        'data' => [
            'overview' => $overview,
            'orders_by_status' => $orders_by_status,
            'revenue_trend' => $revenue_trend,
            'top_products' => $top_products,
            'top_farmers' => $top_farmers,
            'category_stats' => $category_stats,
            'recent_activity' => $recent_activity,
            'payment_stats' => $payment_stats
        ],
        'period_days' => $period
    ]);

} catch (Exception $e) {
    error_log("Analytics error: " . $e->getMessage());
    jsonResponse(['error' => 'Operation failed: ' . $e->getMessage()], 500);
}
?>
