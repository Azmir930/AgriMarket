<?php
/**
 * Farmer Recent Activity
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

    // Get farmer ID
    $stmt = $conn->prepare("SELECT id FROM farmer WHERE user_id = ?");
    $stmt->execute([$user['user_id']]);
    $farmerResult = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$farmerResult) {
        jsonResponse(['error' => 'Farmer profile not found'], 404);
    }
    
    $farmer_id = $farmerResult['id'];

    $activities = [];

    // New orders received
    $stmt = $conn->prepare("
        SELECT CONCAT(u.first_name, ' ', u.last_name) as customer_name, o.created_at
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN buyer b ON o.buyer_id = b.id
        JOIN user u ON b.user_id = u.id
        WHERE oi.farmer_id = ? AND o.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ORDER BY o.created_at DESC
        LIMIT 5
    ");
    $stmt->execute([$farmer_id]);
    $newOrders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($newOrders as $order) {
        $activities[] = [
            'id' => md5($order['customer_name'] . $order['created_at']),
            'type' => 'order',
            'message' => 'New order received from ' . $order['customer_name'],
            'time' => formatTimeAgo($order['created_at'])
        ];
    }

    // New reviews
    $stmt = $conn->prepare("
        SELECT CONCAT(u.first_name, ' ', u.last_name) as reviewer_name, r.rating, p.name as product_name, r.created_at
        FROM review r
        JOIN product p ON r.product_id = p.id
        JOIN buyer b ON r.buyer_id = b.id
        JOIN user u ON b.user_id = u.id
        WHERE p.farmer_id = ? AND r.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ORDER BY r.created_at DESC
        LIMIT 5
    ");
    $stmt->execute([$farmer_id]);
    $newReviews = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($newReviews as $review) {
        $activities[] = [
            'id' => md5($review['reviewer_name'] . $review['created_at']),
            'type' => 'review',
            'message' => $review['reviewer_name'] . ' left a ' . $review['rating'] . '-star review on ' . $review['product_name'],
            'time' => formatTimeAgo($review['created_at'])
        ];
    }

    // Low stock alerts
    $stmt = $conn->prepare("
        SELECT name, stock_quantity FROM product
        WHERE farmer_id = ? AND stock_quantity < 10 AND stock_quantity > 0
        ORDER BY stock_quantity ASC
        LIMIT 5
    ");
    $stmt->execute([$farmer_id]);
    $lowStock = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($lowStock as $product) {
        $activities[] = [
            'id' => md5($product['name'] . 'stock'),
            'type' => 'product',
            'message' => 'Low stock alert: ' . $product['name'] . ' (' . $product['stock_quantity'] . ' remaining)',
            'time' => 'Active'
        ];
    }

    // Payment received
    $stmt = $conn->prepare("
        SELECT o.id, o.total_amount, p.created_at
        FROM payment p
        JOIN orders o ON p.order_id = o.id
        JOIN order_items oi ON o.id = oi.order_id
        WHERE oi.farmer_id = ? AND p.status = 'completed' AND p.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ORDER BY p.created_at DESC
        LIMIT 5
    ");
    $stmt->execute([$farmer_id]);
    $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($payments as $payment) {
        $activities[] = [
            'id' => md5('payment' . $payment['id']),
            'type' => 'payment',
            'message' => 'Payment of ₹' . number_format($payment['total_amount'], 2) . ' received',
            'time' => formatTimeAgo($payment['created_at'])
        ];
    }

    // Sort by time and take most recent 10
    usort($activities, function($a, $b) {
        return strcmp($b['time'], $a['time']);
    });
    $activities = array_slice($activities, 0, 10);

    jsonResponse([
        'success' => true,
        'data' => $activities
    ]);

} catch (Exception $e) {
    jsonResponse([
        'success' => false,
        'message' => 'Failed to fetch activities',
        'error' => $e->getMessage()
    ], 500);
}

function formatTimeAgo($datetime) {
    $time = strtotime($datetime);
    $diff = time() - $time;
    
    if ($diff < 60) return 'Just now';
    if ($diff < 3600) return floor($diff / 60) . ' minutes ago';
    if ($diff < 86400) return floor($diff / 3600) . ' hours ago';
    if ($diff < 604800) return floor($diff / 86400) . ' days ago';
    return date('M j', $time);
}
?>
