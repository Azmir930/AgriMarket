<?php
/**
 * Buyer Product Browsing
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
    $database = new Database();
    $conn = $database->getConnection();

    $page = intval($_GET['page'] ?? 1);
    $limit = intval($_GET['limit'] ?? 12);
    $search = sanitize($_GET['search'] ?? '');
    $category = sanitize($_GET['category'] ?? '');
    $min_price = floatval($_GET['min_price'] ?? 0);
    $max_price = floatval($_GET['max_price'] ?? 0);
    $sort = sanitize($_GET['sort'] ?? 'newest');
    $farmer_id = sanitize($_GET['farmer_id'] ?? '');
    $product_id = sanitize($_GET['id'] ?? '');

    // Single product view
    if ($product_id) {
        $stmt = $conn->prepare("
            SELECT p.*, c.name as category_name, u.name as unit_name, u.abbreviation as unit_abbr,
                   f.farm_name, f.farm_location,
                   usr.first_name as farmer_first_name, usr.last_name as farmer_last_name,
                   (SELECT AVG(rating) FROM review WHERE product_id = p.id) as avg_rating,
                   (SELECT COUNT(*) FROM review WHERE product_id = p.id) as review_count
            FROM product p
            JOIN category c ON p.category_id = c.id
            JOIN unit_of_measure u ON p.unit_id = u.id
            JOIN farmer f ON p.farmer_id = f.id
            JOIN user usr ON f.user_id = usr.id
            WHERE p.id = ? AND p.status = 'active'
        ");
        $stmt->execute([$product_id]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$product) {
            jsonResponse(['error' => 'Product not found'], 404);
        }

        // Get product images
        $stmt = $conn->prepare("SELECT * FROM product_image WHERE product_id = ? ORDER BY is_primary DESC");
        $stmt->execute([$product_id]);
        $product['images'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get recent reviews
        $stmt = $conn->prepare("
            SELECT r.*, u.first_name, u.last_name
            FROM review r
            JOIN buyer b ON r.buyer_id = b.id
            JOIN user u ON b.user_id = u.id
            WHERE r.product_id = ?
            ORDER BY r.created_at DESC
            LIMIT 5
        ");
        $stmt->execute([$product_id]);
        $product['recent_reviews'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        jsonResponse(['success' => true, 'data' => $product]);
    }

    // Product listing
    $where = "WHERE p.status = 'active' AND p.stock_quantity > 0";
    $params = [];

    if ($search) {
        $where .= " AND (p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }

    if ($category) {
        $where .= " AND p.category_id = ?";
        $params[] = $category;
    }

    if ($min_price > 0) {
        $where .= " AND p.price >= ?";
        $params[] = $min_price;
    }

    if ($max_price > 0) {
        $where .= " AND p.price <= ?";
        $params[] = $max_price;
    }

    if ($farmer_id) {
        $where .= " AND p.farmer_id = ?";
        $params[] = $farmer_id;
    }

    // Sorting
    $order_by = match($sort) {
        'price_low' => 'p.price ASC',
        'price_high' => 'p.price DESC',
        'popular' => 'review_count DESC',
        'rating' => 'avg_rating DESC',
        default => 'p.created_at DESC'
    };

    // Get total count
    $stmt = $conn->prepare("
        SELECT COUNT(*) as total 
        FROM product p
        JOIN category c ON p.category_id = c.id
        $where
    ");
    $stmt->execute($params);
    $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

    $pagination = getPagination($page, $limit, $total);

    // Get products
    $stmt = $conn->prepare("
        SELECT p.id, p.name, p.price, p.stock_quantity, p.min_order_qty,
               c.name as category_name, u.abbreviation as unit_abbr,
               f.farm_name,
               (SELECT image_url FROM product_image WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) as primary_image,
               (SELECT AVG(rating) FROM review WHERE product_id = p.id) as avg_rating,
               (SELECT COUNT(*) FROM review WHERE product_id = p.id) as review_count
        FROM product p
        JOIN category c ON p.category_id = c.id
        JOIN unit_of_measure u ON p.unit_id = u.id
        JOIN farmer f ON p.farmer_id = f.id
        $where
        ORDER BY $order_by
        LIMIT " . intval($limit) . " OFFSET " . intval($pagination['offset']) . "
    ");
    $stmt->execute($params);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get categories for filter
    $stmt = $conn->prepare("
        SELECT c.id, c.name, COUNT(p.id) as product_count
        FROM category c
        LEFT JOIN product p ON c.id = p.category_id AND p.status = 'active'
        WHERE c.is_active = TRUE
        GROUP BY c.id, c.name
        ORDER BY c.name
    ");
    $stmt->execute();
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);

    jsonResponse([
        'success' => true,
        'data' => $products,
        'categories' => $categories,
        'pagination' => $pagination
    ]);

} catch (Exception $e) {
    jsonResponse(['error' => 'Operation failed: ' . $e->getMessage()], 500);
}
?>
