<?php
/**
 * Admin Recent Orders
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
    // Validate token if provided, but allow anonymous access for demo
    $user = validateToken();
    if ($user && $user['role_name'] !== 'admin') {
        jsonResponse(['error' => 'Forbidden: Admin access required'], 403);
    }

    $database = new Database();
    $conn = $database->getConnection();

    // Get query parameters
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

    // Fetch recent orders with related data
    $stmt = $conn->prepare("
        SELECT 
            o.id,
            o.order_number,
            o.status,
            o.total_amount as total,
            o.created_at as date,
            CONCAT(u.first_name, ' ', u.last_name) as customer_name,
            u.email as customer_email,
            GROUP_CONCAT(CONCAT(p.name, ' (', oi.quantity, ')') SEPARATOR ', ') as products
        FROM orders o
        JOIN buyer b ON o.buyer_id = b.id
        JOIN user u ON b.user_id = u.id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN product p ON oi.product_id = p.id
        GROUP BY o.id, o.order_number, o.status, o.total_amount, o.created_at, u.first_name, u.last_name, u.email
        ORDER BY o.created_at DESC
        LIMIT :limit OFFSET :offset
    ");
    $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get total count
    $countStmt = $conn->prepare("SELECT COUNT(DISTINCT o.id) as total FROM orders o");
    $countStmt->execute();
    $countResult = $countStmt->fetch(PDO::FETCH_ASSOC);
    $totalOrders = (int)$countResult['total'];

    // Format the response
    $formattedOrders = array_map(function($order) {
        return [
            'id' => $order['id'],
            'orderNumber' => $order['order_number'],
            'customerName' => $order['customer_name'],
            'products' => $order['products'],
            'total' => (float)$order['total'],
            'status' => $order['status'],
            'date' => date('Y-m-d', strtotime($order['date']))
        ];
    }, $orders);

    jsonResponse([
        'success' => true,
        'data' => $formattedOrders,
        'pagination' => [
            'total' => $totalOrders,
            'limit' => $limit,
            'offset' => $offset,
            'pages' => ceil($totalOrders / $limit)
        ]
    ]);

} catch (Exception $e) {
    jsonResponse([
        'success' => false,
        'message' => 'Failed to fetch orders',
        'error' => $e->getMessage()
    ], 500);
}
