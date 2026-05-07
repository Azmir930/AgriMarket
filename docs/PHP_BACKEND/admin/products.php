<?php
/**
 * Admin Product Management
 * Agriculture Product Marketplace
 */

require_once '../config/database.php';
require_once '../config/helpers.php';
require_once '../auth/middleware.php';

setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];

try {
    $user = requireApiRole('admin');
    $database = new Database();
    $conn = $database->getConnection();

    switch ($method) {
        case 'GET':
            $page = intval($_GET['page'] ?? 1);
            $limit = intval($_GET['limit'] ?? 20);
            $search = sanitize($_GET['search'] ?? '');
            $category = sanitize($_GET['category'] ?? '');
            $farmer_id = sanitize($_GET['farmer_id'] ?? '');
            $status = $_GET['status'] ?? '';

            $where = "WHERE 1=1";
            $params = [];

            if ($search) {
                $where .= " AND (p.name LIKE ? OR p.description LIKE ?)";
                $params[] = "%$search%";
                $params[] = "%$search%";
            }

            if ($category) {
                $where .= " AND p.category_id = ?";
                $params[] = $category;
            }

            if ($farmer_id) {
                $where .= " AND p.farmer_id = ?";
                $params[] = $farmer_id;
            }

            if ($status !== '') {
                $where .= " AND p.is_active = ?";
                $params[] = $status === 'active' ? 1 : 0;
            }

            // Get total
            $stmt = $conn->prepare("SELECT COUNT(*) as total FROM product p $where");
            $stmt->execute($params);
            $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            $pagination = getPagination($page, $limit, $total);

            $limitInt = $limit;
            $offsetInt = $pagination['offset'];

            $stmt = $conn->prepare("
                SELECT p.*, c.name as category_name, u.name as unit_name,
                       f.farm_name, usr.first_name, usr.last_name,
                       (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) as order_count,
                       (SELECT AVG(rating) FROM review WHERE product_id = p.id) as avg_rating
                FROM product p
                JOIN category c ON p.category_id = c.id
                JOIN unit_of_measure u ON p.unit_id = u.id
                JOIN farmer f ON p.farmer_id = f.id
                JOIN user usr ON f.user_id = usr.id
                $where
                ORDER BY p.created_at DESC
                LIMIT $limitInt OFFSET $offsetInt
            ");
            $stmt->execute($params);
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

            jsonResponse([
                'success' => true,
                'data' => $products,
                'pagination' => $pagination
            ]);
            break;

        case 'PUT':
            // Update product (admin can update any product)
            $data = json_decode(file_get_contents("php://input"), true);
            $product_id = sanitize($data['id'] ?? $_GET['id'] ?? '');

            if (empty($product_id)) {
                jsonResponse(['error' => 'Product ID is required'], 400);
            }

            $updates = [];
            $params = [];

            $fields = ['name', 'description', 'category_id', 'unit_id', 'min_order_qty'];
            foreach ($fields as $field) {
                if (isset($data[$field])) {
                    $updates[] = "$field = ?";
                    $params[] = sanitize($data[$field]);
                }
            }

            if (isset($data['price'])) {
                $updates[] = "price = ?";
                $params[] = floatval($data['price']);
            }

            if (isset($data['is_active'])) {
                $updates[] = "is_active = ?";
                $params[] = (bool)$data['is_active'];
            }

            if (isset($data['is_featured'])) {
                $updates[] = "is_featured = ?";
                $params[] = (bool)$data['is_featured'];
            }

            if (empty($updates)) {
                jsonResponse(['error' => 'No fields to update'], 400);
            }

            $updates[] = "updated_at = NOW()";
            $params[] = $product_id;

            $stmt = $conn->prepare("UPDATE product SET " . implode(', ', $updates) . " WHERE id = ?");
            $stmt->execute($params);

            jsonResponse([
                'success' => true,
                'message' => 'Product updated successfully'
            ]);
            break;

        case 'DELETE':
            // Deactivate product
            $product_id = sanitize($_GET['id'] ?? '');

            if (empty($product_id)) {
                jsonResponse(['error' => 'Product ID is required'], 400);
            }

            $stmt = $conn->prepare("UPDATE product SET is_active = FALSE, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$product_id]);

            jsonResponse([
                'success' => true,
                'message' => 'Product deactivated successfully'
            ]);
            break;

        default:
            jsonResponse(['error' => 'Method not allowed'], 405);
    }

} catch (Exception $e) {
    jsonResponse(['error' => 'Operation failed: ' . $e->getMessage()], 500);
}
?>
