<?php
/**
 * Stock Check API
 * Agriculture Product Marketplace
 */

require_once '../config/database.php';
require_once '../config/helpers.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

try {
    $database = new Database();
    $conn = $database->getConnection();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Check single product stock
        $product_id = sanitize($_GET['product_id'] ?? '');

        if (empty($product_id)) {
            jsonResponse(['error' => 'Product ID is required'], 400);
        }

        $stmt = $conn->prepare("
            SELECT id, name, stock_quantity, min_order_qty, is_active
            FROM Product
            WHERE id = ?
        ");
        $stmt->execute([$product_id]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$product) {
            jsonResponse(['error' => 'Product not found'], 404);
        }

        $in_stock = $product['is_active'] && $product['stock_quantity'] > 0;
        $low_stock = $product['stock_quantity'] > 0 && $product['stock_quantity'] <= 10;

        jsonResponse([
            'success' => true,
            'product_id' => $product['id'],
            'name' => $product['name'],
            'stock_quantity' => $product['stock_quantity'],
            'min_order_quantity' => $product['min_order_quantity'],
            'in_stock' => $in_stock,
            'low_stock' => $low_stock,
            'status' => $in_stock ? ($low_stock ? 'low_stock' : 'in_stock') : 'out_of_stock'
        ]);

    } else {
        // Check multiple products stock
        $data = json_decode(file_get_contents("php://input"), true);
        $product_ids = $data['product_ids'] ?? [];

        if (empty($product_ids) || !is_array($product_ids)) {
            jsonResponse(['error' => 'Product IDs array is required'], 400);
        }

        // Limit to 50 products
        $product_ids = array_slice($product_ids, 0, 50);
        $placeholders = str_repeat('?,', count($product_ids) - 1) . '?';

        $stmt = $conn->prepare("
            SELECT id, name, stock_quantity, min_order_quantity, is_active
            FROM Product
            WHERE id IN ($placeholders)
        ");
        $stmt->execute($product_ids);
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $results = [];
        foreach ($products as $product) {
            $in_stock = $product['is_active'] && $product['stock_quantity'] > 0;
            $low_stock = $product['stock_quantity'] > 0 && $product['stock_quantity'] <= 10;

            $results[$product['id']] = [
                'name' => $product['name'],
                'stock_quantity' => $product['stock_quantity'],
                'min_order_qty' => $product['min_order_qty'],
                'in_stock' => $in_stock,
                'low_stock' => $low_stock,
                'status' => $in_stock ? ($low_stock ? 'low_stock' : 'in_stock') : 'out_of_stock'
            ];
        }

        // Mark missing products
        foreach ($product_ids as $id) {
            if (!isset($results[$id])) {
                $results[$id] = [
                    'error' => 'Product not found',
                    'in_stock' => false,
                    'status' => 'not_found'
                ];
            }
        }

        jsonResponse([
            'success' => true,
            'data' => $results
        ]);
    }

} catch (Exception $e) {
    jsonResponse(['error' => 'Operation failed: ' . $e->getMessage()], 500);
}
?>
