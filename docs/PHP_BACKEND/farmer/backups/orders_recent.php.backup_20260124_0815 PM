<?php
/**
 * Farmer Recent Orders
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

    // Get query parameters
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

    // Fetch PENDING orders containing this farmer's products - STRICT MODE COMPATIBLE
    $stmt = $conn->prepare("
        SELECT 
            o.id,
            o.order_number,
            o.status,
            o.total_amount as total,
            o.created_at as date,
            CONCAT(u.first_name, ' ', u.last_name) as customer_name,
            (SELECT GROUP_CONCAT(CONCAT(p2.name, ' (', oi2.quantity, ')') SEPARATOR ', ')
             FROM order_items oi2
             JOIN product p2 ON oi2.product_id = p2.id
             WHERE oi2.order_id = o.id) as products
        FROM orders o
        JOIN buyer b ON o.buyer_id = b.id
        JOIN user u ON b.user_id = u.id
        WHERE o.id IN (
            SELECT DISTINCT oi.order_id
            FROM order_items oi
            WHERE oi.farmer_id = ? AND oi.order_id IN (
                SELECT id FROM orders WHERE status IN ('pending', 'confirmed', 'processing')
            )
        )
        ORDER BY o.created_at DESC
        LIMIT :limit OFFSET :offset
    ");
    $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);
    $stmt->bindParam(1, $farmer_id);
    $stmt->execute();
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get total PENDING count
    $countStmt = $conn->prepare("
        SELECT COUNT(DISTINCT o.id) as total
        FROM orders o
        WHERE o.id IN (
            SELECT DISTINCT oi.order_id
            FROM order_items oi
            WHERE oi.farmer_id = ? AND oi.order_id IN (
                SELECT id FROM orders WHERE status IN ('pending', 'confirmed', 'processing')
            )
        )
    ");
    $countStmt->execute([$farmer_id]);
    $countResult = $countStmt->fetch(PDO::FETCH_ASSOC);
    $totalOrders = (int)$countResult['total'];

    // Format response
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
?>
