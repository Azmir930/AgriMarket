<?php
/**
 * Farmer Order Management
 * Agriculture Product Marketplace
 */

require_once '../config/database.php';
require_once '../config/helpers.php';
require_once '../auth/middleware.php';

setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];

try {
    $user = requireApiRole('farmer');
    $database = new Database();
    $conn = $database->getConnection();

    // Get farmer ID
    $stmt = $conn->prepare("SELECT id FROM farmer WHERE user_id = ?");
    $stmt->execute([$user['user_id']]);
    $farmer = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$farmer) {
        jsonResponse(['error' => 'Farmer profile not found'], 404);
    }

    $farmer_id = $farmer['id'];

    switch ($method) {
        case 'GET':
            // Get orders containing farmer's products
            $page = intval($_GET['page'] ?? 1);
            $limit = intval($_GET['limit'] ?? 10);
            $status = sanitize($_GET['status'] ?? '');
            $order_id = sanitize($_GET['id'] ?? '');

            if ($order_id) {
                // Get single order details
                $stmt = $conn->prepare("
                    SELECT o.*, 
                           u.first_name as buyer_first_name, u.last_name as buyer_last_name,
                           a.street, a.city, a.state, a.postal_code,
                           d.status as delivery_status, d.tracking_number
                    FROM orders o
                    JOIN buyer b ON o.buyer_id = b.id
                    JOIN user u ON b.user_id = u.id
                    LEFT JOIN address a ON o.shipping_address_id = a.id
                    LEFT JOIN delivery d ON o.id = d.order_id
                    WHERE o.id = ?
                    AND EXISTS (
                        SELECT 1 FROM order_items oi 
                        WHERE oi.order_id = o.id AND oi.farmer_id = ?
                    )
                ");
                $stmt->execute([$order_id, $farmer_id]);
                $order = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$order) {
                    jsonResponse(['error' => 'Order not found'], 404);
                }

                // Get only this farmer's items in the order
                $stmt = $conn->prepare("
                    SELECT oi.*, p.name as product_name, u.name as unit_name
                    FROM order_items oi
                    JOIN product p ON oi.product_id = p.id
                    LEFT JOIN unit_of_measure u ON p.unit_id = u.id
                    WHERE oi.order_id = ? AND oi.farmer_id = ?
                ");
                $stmt->execute([$order_id, $farmer_id]);
                $order['items'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

                jsonResponse(['success' => true, 'data' => $order]);
            }

            // List orders
            $where = "AND o.status IN ('pending', 'confirmed', 'processing')";
            $params = [];

            if ($status && $status !== 'all') {
                $where = "AND o.status = ?";
                $params[] = $status;
            }

            // Get total count
            $countParams = [$farmer_id];
            if ($status && $status !== 'all') {
                $countParams[] = $status;
            }
            
            $stmt = $conn->prepare("
                SELECT COUNT(DISTINCT o.id) as total 
                FROM orders o
                WHERE EXISTS (
                    SELECT 1 FROM order_items oi 
                    WHERE oi.order_id = o.id AND oi.farmer_id = ?
                ) $where
            ");
            $stmt->execute($countParams);
            $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            $pagination = getPagination($page, $limit, $total);

            // Get orders - build params correctly
            $orderParams = [$farmer_id, $farmer_id];
            if ($status) {
                $orderParams[] = $status;
            }

            $stmt = $conn->prepare("
                SELECT o.id, o.order_number, o.status, o.created_at, o.total_amount,
                       u.first_name as buyer_first_name, u.last_name as buyer_last_name,
                       CONCAT(u.first_name, ' ', u.last_name) as customer_name,
                       (SELECT SUM(oi.total_price) FROM order_items oi 
                        WHERE oi.order_id = o.id AND oi.farmer_id = ?) as farmer_total
                FROM orders o
                JOIN buyer b ON o.buyer_id = b.id
                JOIN user u ON b.user_id = u.id
                WHERE EXISTS (
                    SELECT 1 FROM order_items oi 
                    WHERE oi.order_id = o.id AND oi.farmer_id = ?
                ) $where
                ORDER BY o.created_at DESC
                LIMIT " . intval($limit) . " OFFSET " . intval($pagination['offset']) . "
            ");
            $stmt->execute($orderParams);
            $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

            jsonResponse([
                'success' => true,
                'data' => $orders,
                'pagination' => $pagination
            ]);
            break;

        case 'PUT':
            // Update order item status (for farmer's products only)
            $data = json_decode(file_get_contents("php://input"), true);
            
            $order_id = sanitize($data['order_id'] ?? '');
            $status = sanitize($data['status'] ?? '');

            $valid_statuses = ['confirmed', 'cancelled'];

            if (empty($order_id) || empty($status)) {
                jsonResponse(['error' => 'Order ID and status are required'], 400);
            }

            if (!in_array($status, $valid_statuses)) {
                jsonResponse(['error' => 'Invalid status. Farmers can only set: confirmed, cancelled'], 400);
            }

            // Verify order contains farmer's products
            $stmt = $conn->prepare("
                SELECT o.id FROM orders o
                WHERE o.id = ?
                AND EXISTS (
                    SELECT 1 FROM order_items oi 
                    JOIN product p ON oi.product_id = p.id 
                    WHERE oi.order_id = o.id AND p.farmer_id = ?
                )
            ");
            $stmt->execute([$order_id, $farmer_id]);

            if ($stmt->rowCount() === 0) {
                jsonResponse(['error' => 'Order not found or access denied'], 404);
            }

            // Note: In a real system, each order item might have its own status
            // For simplicity, we update the whole order status
            $stmt = $conn->prepare("UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$status, $order_id]);

            jsonResponse([
                'success' => true,
                'message' => 'Order status updated successfully'
            ]);
            break;

        default:
            jsonResponse(['error' => 'Method not allowed'], 405);
    }

} catch (Exception $e) {
    jsonResponse(['error' => 'Operation failed: ' . $e->getMessage()], 500);
}
?>
