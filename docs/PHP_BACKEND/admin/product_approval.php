<?php
/**
 * Admin Product Approval Management
 * Agriculture Product Marketplace
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once '../config/database.php';
require_once '../config/helpers.php';
require_once '../auth/middleware.php';

setCorsHeaders();

// Debug logging
error_log("Product Approval Request - Method: " . $_SERVER['REQUEST_METHOD']);
error_log("Authorization Header: " . ($_SERVER['HTTP_AUTHORIZATION'] ?? 'NOT SET'));

try {
    $user = requireApiRole('admin');
    
    error_log("User authenticated: " . json_encode($user));
    
    $database = new Database();
    $conn = $database->getConnection();

    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            // Get pending products or specific product details
            $product_id = sanitize($_GET['id'] ?? '');
            $status = sanitize($_GET['status'] ?? 'pending');

            if ($product_id) {
                // Get single product details
                $stmt = $conn->prepare("
                    SELECT p.*, f.farm_name, u.first_name, u.last_name, u.email,
                           c.name as category_name, un.name as unit_name,
                           (SELECT pi.image_url FROM product_image pi WHERE pi.product_id = p.id AND pi.is_primary = TRUE LIMIT 1) as primary_image
                    FROM product p
                    LEFT JOIN farmer f ON p.farmer_id = f.id
                    LEFT JOIN user u ON f.user_id = u.id
                    LEFT JOIN category c ON p.category_id = c.id
                    LEFT JOIN unit_of_measure un ON p.unit_id = un.id
                    WHERE p.id = ?
                ");
                $stmt->execute([$product_id]);
                $product = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$product) {
                    jsonResponse(['error' => 'Product not found'], 404);
                }

                jsonResponse(['success' => true, 'data' => $product]);
            } else {
                // Get list of products by status (default: pending)
                $where = "WHERE p.status = ?";
                $params = [$status];

                $page = intval($_GET['page'] ?? 1);
                $limit = intval($_GET['limit'] ?? 20);
                $search = sanitize($_GET['search'] ?? '');

                if ($search) {
                    $where .= " AND (p.name LIKE ? OR f.farm_name LIKE ?)";
                    $params[] = "%$search%";
                    $params[] = "%$search%";
                }

                // Get total count
                $countStmt = $conn->prepare("SELECT COUNT(*) as total FROM product p LEFT JOIN farmer f ON p.farmer_id = f.id $where");
                $countStmt->execute($params);
                $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

                $pagination = getPagination($page, $limit, $total);

                $limitInt = intval($limit);
                $offsetInt = intval($pagination['offset']);

                $stmt = $conn->prepare("
                    SELECT p.id, p.name, p.price, p.stock_quantity, p.status, p.created_at,
                           f.id as farmer_id, f.farm_name, u.first_name, u.last_name,
                           c.name as category_name,
                           (SELECT pi.image_url FROM product_image pi WHERE pi.product_id = p.id AND pi.is_primary = TRUE LIMIT 1) as primary_image
                    FROM product p
                    LEFT JOIN farmer f ON p.farmer_id = f.id
                    LEFT JOIN user u ON f.user_id = u.id
                    LEFT JOIN category c ON p.category_id = c.id
                    $where
                    ORDER BY p.created_at DESC
                    LIMIT $limitInt OFFSET $offsetInt
                ");
                $stmt->execute($params);
                $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

                jsonResponse([
                    'success' => true,
                    'data' => $products,
                    'pagination' => $pagination,
                    'status' => $status
                ]);
            }
            break;

        case 'PUT':
            // Approve or reject product
            $data = json_decode(file_get_contents("php://input"), true);
            $product_id = sanitize($data['id'] ?? '');
            $action = sanitize($data['action'] ?? ''); // 'approve' or 'reject'
            $notes = sanitize($data['notes'] ?? '');

            if (empty($product_id) || !in_array($action, ['approve', 'reject'])) {
                jsonResponse(['error' => 'Invalid product ID or action'], 400);
            }

            // Get product
            $stmt = $conn->prepare("SELECT id, status, stock_quantity FROM product WHERE id = ?");
            $stmt->execute([$product_id]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$product) {
                jsonResponse(['error' => 'Product not found'], 404);
            }

            if ($product['status'] !== 'pending') {
                jsonResponse(['error' => 'Product is not pending approval'], 400);
            }

            try {
                $conn->beginTransaction();

                if ($action === 'approve') {
                    // Set status to 'active' and create inventory log
                    $stmt = $conn->prepare("UPDATE product SET status = 'active', updated_at = NOW() WHERE id = ?");
                    $stmt->execute([$product_id]);

                    // Create inventory log for initial stock
                    $stmt = $conn->prepare("
                        INSERT INTO inventory_log (id, product_id, change_type, quantity, 
                                                  previous_qty, new_qty, notes) 
                        VALUES (?, ?, 'initial_stock', ?, 0, ?, 'Product approved by admin')
                    ");
                    $stmt->execute([generateUUID(), $product_id, $product['stock_quantity'], $product['stock_quantity']]);

                    $message = 'Product approved successfully';
                } else {
                    // Set status to 'rejected'
                    $stmt = $conn->prepare("UPDATE product SET status = 'rejected', updated_at = NOW() WHERE id = ?");
                    $stmt->execute([$product_id]);

                    $message = 'Product rejected';
                }

                // Log admin action
                $activity_description = $action === 'approve' 
                    ? "Product approved: $product_id. " . ($notes ?: '')
                    : "Product rejected: $product_id. " . ($notes ?: '');
                
                $stmt = $conn->prepare("
                    INSERT INTO user_activity_log (id, user_id, activity_type, description)
                    VALUES (?, ?, ?, ?)
                ");
                $stmt->execute([
                    generateUUID(),
                    $user['user_id'],
                    "product_" . $action,
                    trim($activity_description)
                ]);

                $conn->commit();

                jsonResponse([
                    'success' => true,
                    'message' => $message
                ]);
            } catch (Exception $e) {
                $conn->rollBack();
                error_log("Product approval error: " . $e->getMessage());
                jsonResponse(['error' => 'Failed to process approval', 'details' => $e->getMessage()], 500);
            }
            break;

        default:
            jsonResponse(['error' => 'Method not allowed'], 405);
    }

} catch (Exception $e) {
    if (isset($conn) && $conn->inTransaction()) {
        $conn->rollBack();
    }
    error_log("Admin product approval error: " . $e->getMessage());
    jsonResponse(['error' => 'Operation failed: ' . $e->getMessage()], 500);
}
?>
