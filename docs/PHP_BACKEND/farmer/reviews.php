<?php
/**
 * Farmer Reviews View
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

    $page = intval($_GET['page'] ?? 1);
    $limit = intval($_GET['limit'] ?? 10);
    $product_id = sanitize($_GET['product_id'] ?? '');
    $min_rating = intval($_GET['min_rating'] ?? 0);

    $where = "WHERE p.farmer_id = ?";
    $params = [$farmer_id];

    if ($product_id) {
        $where .= " AND r.product_id = ?";
        $params[] = $product_id;
    }

    if ($min_rating > 0 && $min_rating <= 5) {
        $where .= " AND r.rating >= ?";
        $params[] = $min_rating;
    }

    // Get total count
    $stmt = $conn->prepare("
        SELECT COUNT(*) as total 
        FROM review r
        JOIN product p ON r.product_id = p.id
        $where
    ");
    $stmt->execute($params);
    $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

    $pagination = getPagination($page, $limit, $total);

    // Get reviews
    $limitInt = intval($limit);
    $offsetInt = intval($pagination['offset']);

    $stmt = $conn->prepare("
        SELECT r.*, p.name as product_name,
               u.first_name as buyer_first_name, u.last_name as buyer_last_name
        FROM review r
        JOIN product p ON r.product_id = p.id
        JOIN buyer b ON r.buyer_id = b.id
        JOIN user u ON b.user_id = u.id
        $where
        ORDER BY r.created_at DESC
        LIMIT " . $limitInt . " OFFSET " . $offsetInt . "
    ");
    $stmt->execute($params);
    $reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get average ratings per product
    $stmt = $conn->prepare("
        SELECT p.id, p.name, 
               AVG(r.rating) as avg_rating, 
               COUNT(r.id) as review_count
        FROM product p
        LEFT JOIN review r ON p.id = r.product_id
        WHERE p.farmer_id = ?
        GROUP BY p.id, p.name
        HAVING review_count > 0
        ORDER BY avg_rating DESC
    ");
    $stmt->execute([$farmer_id]);
    $product_ratings = $stmt->fetchAll(PDO::FETCH_ASSOC);

    jsonResponse([
        'success' => true,
        'data' => $reviews,
        'product_ratings' => $product_ratings,
        'pagination' => $pagination
    ]);

} catch (Exception $e) {
    jsonResponse(['error' => 'Operation failed: ' . $e->getMessage()], 500);
}
?>
