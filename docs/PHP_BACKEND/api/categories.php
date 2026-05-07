<?php
/**
 * Categories API
 * Agriculture Product Marketplace
 */

require_once '../config/database.php';
require_once '../config/helpers.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

try {
    $database = new Database();
    $conn = $database->getConnection();

    $include_count = isset($_GET['include_count']);
    $parent_only = isset($_GET['parent_only']);
    $category_id = sanitize($_GET['id'] ?? '');

    if ($category_id) {
        // Get single category with products
        $stmt = $conn->prepare("
            SELECT c.*, 
                   (SELECT COUNT(*) FROM product WHERE category_id = c.id AND status = 'active') as product_count
            FROM category c
            WHERE c.id = ? AND c.is_active = TRUE
        ");
        $stmt->execute([$category_id]);
        $category = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$category) {
            jsonResponse(['error' => 'Category not found'], 404);
        }

        // Get subcategories
        $stmt = $conn->prepare("
            SELECT id, name, description
            FROM category
            WHERE parent_id = ? AND is_active = TRUE
            ORDER BY name
        ");
        $stmt->execute([$category_id]);
        $category['subcategories'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        jsonResponse(['success' => true, 'data' => $category]);
    }

    // List all categories
    $where = "WHERE c.is_active = TRUE";
    if ($parent_only) {
        $where .= " AND c.parent_id IS NULL";
    }

    if ($include_count) {
        $stmt = $conn->prepare("
            SELECT c.id, c.name, c.description, c.parent_id,
                   (SELECT COUNT(*) FROM product WHERE category_id = c.id AND status = 'active') as product_count
            FROM category c
            $where
            ORDER BY c.name
        ");
    } else {
        $stmt = $conn->prepare("
            SELECT c.id, c.name, c.description, c.parent_id
            FROM category c
            $where
            ORDER BY c.name
        ");
    }

    $stmt->execute();
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Build tree structure if requested
    if (isset($_GET['tree'])) {
        $tree = [];
        $lookup = [];

        foreach ($categories as $cat) {
            $cat['children'] = [];
            $lookup[$cat['id']] = $cat;
        }

        foreach ($lookup as $id => $cat) {
            if ($cat['parent_id'] && isset($lookup[$cat['parent_id']])) {
                $lookup[$cat['parent_id']]['children'][] = &$lookup[$id];
            } else {
                $tree[] = &$lookup[$id];
            }
        }

        jsonResponse(['success' => true, 'data' => $tree]);
    }

    jsonResponse(['success' => true, 'data' => $categories]);

} catch (Exception $e) {
    jsonResponse(['error' => 'Operation failed: ' . $e->getMessage()], 500);
}
?>
