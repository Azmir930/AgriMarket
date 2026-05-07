<?php
/**
 * Buyer Order History
 * Agriculture Product Marketplace
 */

require_once '../config/database.php';
require_once '../config/helpers.php';
require_once '../auth/middleware.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $user = requireApiRole('buyer');
        $database = new Database();
        $conn = $database->getConnection();

        // Get buyer ID
        $stmt = $conn->prepare("SELECT id FROM buyer WHERE user_id = ?");
        $stmt->execute([$user['user_id']]);
        $buyer = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$buyer) {
            jsonResponse(['error' => 'Buyer profile not found'], 404);
        }

        $buyer_id = $buyer['id'];

        $page = intval($_GET['page'] ?? 1);
        $limit = intval($_GET['limit'] ?? 10);
        $status = sanitize($_GET['status'] ?? '');
        $order_id = sanitize($_GET['id'] ?? '');

        // Single order view
        if ($order_id) {
            $stmt = $conn->prepare("
                SELECT o.id, o.order_number, o.total_amount, o.status, o.created_at, o.updated_at,
                       o.subtotal, o.shipping_fee, o.tax_amount, o.notes
                FROM orders o
                WHERE o.id = ? AND o.buyer_id = ?
            ");
            $stmt->execute([$order_id, $buyer_id]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$order) {
                jsonResponse(['error' => 'Order not found'], 404);
            }

            // Get order items with product details
            $stmt = $conn->prepare("
                SELECT oi.id, oi.product_id, oi.quantity, oi.unit_price, oi.total_price,
                       pr.name, pr.description,
                       u.abbreviation as unit,
                       f.farm_name,
                       (SELECT image_url FROM product_image WHERE product_id = pr.id AND is_primary = TRUE LIMIT 1) as image
                FROM order_items oi
                JOIN product pr ON oi.product_id = pr.id
                LEFT JOIN unit_of_measure u ON pr.unit_id = u.id
                LEFT JOIN farmer f ON oi.farmer_id = f.id
                WHERE oi.order_id = ?
            ");
            $stmt->execute([$order_id]);
            $order['items'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

            jsonResponse(['success' => true, 'data' => $order]);
        } else {
            // Order listing
            $where = "WHERE o.buyer_id = ?";
            $params = [$buyer_id];

            if ($status) {
                $where .= " AND o.status = ?";
                $params[] = $status;
            }

            // Get total count
            $stmt = $conn->prepare("SELECT COUNT(*) as total FROM orders o $where");
            $stmt->execute($params);
            $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            $pagination = getPagination($page, $limit, $total);

            // Build query with literal LIMIT/OFFSET (cannot use placeholders for these in MySQL)
            $query = "
                SELECT o.id, o.order_number, o.total_amount, o.status, o.created_at,
                       (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
                FROM orders o
                $where
                ORDER BY o.created_at DESC
                LIMIT " . intval($limit) . " OFFSET " . intval($pagination['offset']) . "
            ";
            
            $stmt = $conn->prepare($query);
            $stmt->execute($params);
            $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

            jsonResponse([
                'success' => true,
                'data' => $orders,
                'pagination' => $pagination
            ]);
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        // Handle order cancellation
        $user = requireApiRole('buyer');
        $database = new Database();
        $conn = $database->getConnection();

        // Get buyer ID
        $stmt = $conn->prepare("SELECT id FROM buyer WHERE user_id = ?");
        $stmt->execute([$user['user_id']]);
        $buyer = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$buyer) {
            jsonResponse(['error' => 'Buyer profile not found'], 404);
        }

        $buyer_id = $buyer['id'];

        // Get request data
        $data = json_decode(file_get_contents('php://input'), true);
        $order_id = $data['order_id'] ?? null;
        $new_status = $data['status'] ?? null;
        $cancellation_reason = $data['cancellation_reason'] ?? '';

        if (!$order_id || !$new_status) {
            jsonResponse(['error' => 'Missing required fields: order_id, status'], 400);
        }

        // Only allow cancelling pending orders
        if ($new_status !== 'cancelled') {
            jsonResponse(['error' => 'Invalid status. Only pending orders can be cancelled.'], 400);
        }

        // Verify order belongs to buyer and is pending
        $stmt = $conn->prepare("SELECT id, status FROM orders WHERE id = ? AND buyer_id = ?");
        $stmt->execute([$order_id, $buyer_id]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            jsonResponse(['error' => 'Order not found'], 404);
        }

        if ($order['status'] !== 'pending') {
            jsonResponse(['error' => 'Only pending orders can be cancelled'], 400);
        }

        // Update order status
        $stmt = $conn->prepare("UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?");
        if (!$stmt->execute([$new_status, $order_id])) {
            jsonResponse(['error' => 'Failed to cancel order'], 500);
        }

        jsonResponse([
            'success' => true,
            'message' => 'Order cancelled successfully',
            'data' => ['id' => $order_id, 'status' => 'cancelled']
        ]);
    }

} catch (Exception $e) {
    jsonResponse(['error' => 'Operation failed: ' . $e->getMessage()], 500);
}
?>
