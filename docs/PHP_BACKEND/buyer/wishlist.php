<?php
/**
 * Buyer Wishlist Management
 * Agriculture Product Marketplace
 */

require_once '../config/database.php';
require_once '../config/helpers.php';
require_once '../auth/middleware.php';

setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];

try {
    $user = requireApiRole('buyer');
    $database = new Database();
    $conn = $database->getConnection();

    switch ($method) {
        case 'GET':
            // Get wishlist items for current user
            $page = intval($_GET['page'] ?? 1);
            $limit = intval($_GET['limit'] ?? 12);

            $stmt = $conn->prepare("SELECT COUNT(*) as total FROM wishlist WHERE user_id = ?");
            $stmt->execute([$user['user_id']]);
            $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            $pagination = getPagination($page, $limit, $total);

            $stmt = $conn->prepare("
                SELECT w.id as wishlist_id, w.created_at as added_at,
                       p.id as product_id, p.name, p.price, p.stock_quantity, p.description,
                       c.name as category_name, u.abbreviation as unit_abbr,
                       f.farm_name,
                       (SELECT image_url FROM product_image WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) as image,
                       (SELECT AVG(rating) FROM review WHERE product_id = p.id) as rating,
                       (SELECT COUNT(*) FROM review WHERE product_id = p.id) as review_count
                FROM wishlist w
                JOIN product p ON w.product_id = p.id
                LEFT JOIN category c ON p.category_id = c.id
                LEFT JOIN unit_of_measure u ON p.unit_id = u.id
                LEFT JOIN farmer f ON p.farmer_id = f.id
                WHERE w.user_id = ?
                ORDER BY w.created_at DESC
                LIMIT " . intval($limit) . " OFFSET " . intval($pagination['offset']) . "
            ");
            $stmt->execute([$user['user_id']]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            jsonResponse([
                'success' => true,
                'data' => $items,
                'pagination' => $pagination
            ]);
            break;

        case 'POST':
            // Add to wishlist
            $data = json_decode(file_get_contents("php://input"), true);
            $product_id = sanitize($data['product_id'] ?? '');
            
            error_log('Wishlist POST - user_id: ' . $user['user_id'] . ', product_id: ' . $product_id);

            if (empty($product_id)) {
                error_log('Product ID is empty');
                jsonResponse(['error' => 'Product ID is required'], 400);
            }

            // Verify product exists
            $stmt = $conn->prepare("SELECT id FROM product WHERE id = ?");
            $stmt->execute([$product_id]);
            
            if ($stmt->rowCount() === 0) {
                error_log('Product not found: ' . $product_id);
                jsonResponse(['error' => 'Product not found'], 404);
            }
            
            error_log('Product found, checking wishlist...');

            // Check if already in wishlist
            $stmt = $conn->prepare("SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?");
            $stmt->execute([$user['user_id'], $product_id]);
            
            if ($stmt->rowCount() > 0) {
                error_log('Product already in wishlist');
                jsonResponse(['error' => 'Product already in wishlist'], 409);
            }

            // Add to wishlist
            $wishlist_id = generateUUID();
            error_log('Inserting into wishlist - id: ' . $wishlist_id . ', user_id: ' . $user['user_id'] . ', product_id: ' . $product_id);
            $stmt = $conn->prepare("INSERT INTO wishlist (id, user_id, product_id) VALUES (?, ?, ?)");
            $result = $stmt->execute([$wishlist_id, $user['user_id'], $product_id]);
            error_log('Insert result: ' . ($result ? 'success' : 'failed'));

            jsonResponse([
                'success' => true,
                'message' => 'Added to wishlist',
                'wishlist_id' => $wishlist_id
            ], 201);
            break;

        case 'DELETE':
            // Remove from wishlist
            $product_id = sanitize($_GET['product_id'] ?? '');
            $wishlist_id = sanitize($_GET['id'] ?? '');

            if (empty($product_id) && empty($wishlist_id)) {
                jsonResponse(['error' => 'Product ID or Wishlist ID is required'], 400);
            }

            if ($wishlist_id) {
                $stmt = $conn->prepare("DELETE FROM wishlist WHERE id = ? AND user_id = ?");
                $stmt->execute([$wishlist_id, $user['user_id']]);
            } else {
                $stmt = $conn->prepare("DELETE FROM wishlist WHERE product_id = ? AND user_id = ?");
                $stmt->execute([$product_id, $user['user_id']]);
            }

            if ($stmt->rowCount() === 0) {
                jsonResponse(['error' => 'Item not found in wishlist'], 404);
            }

            jsonResponse([
                'success' => true,
                'message' => 'Removed from wishlist'
            ]);
            break;

        default:
            jsonResponse(['error' => 'Method not allowed'], 405);
    }

} catch (Exception $e) {
    jsonResponse(['error' => 'Operation failed: ' . $e->getMessage()], 500);
}
?>
