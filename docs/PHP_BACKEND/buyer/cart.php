<?php
/**
 * Buyer Shopping Cart
 * Agriculture Product Marketplace
 */

require_once '../config/database.php';
require_once '../config/helpers.php';
require_once '../auth/middleware.php';

setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];

try {
    // Only GET doesn't require auth for now, others do
    if ($method !== 'GET') {
        $user = requireApiRole('buyer');
    }

    $database = new Database();
    $conn = $database->getConnection();

    switch ($method) {
        case 'GET':
            // Get cart items from session
            // For now, return empty cart - frontend manages cart in localStorage
            jsonResponse([
                'success' => true,
                'data' => [
                    'items' => []
                ]
            ]);
            break;

        case 'POST':
            // Add item to cart
            $data = json_decode(file_get_contents("php://input"), true);
            $action = sanitize($data['action'] ?? '');
            $product_id = sanitize($data['product_id'] ?? '');
            $quantity = intval($data['quantity'] ?? 1);

            if (empty($product_id)) {
                jsonResponse(['error' => 'Product ID is required'], 400);
            }

            if ($action === 'add') {
                // Get product details
                $stmt = $conn->prepare("
                    SELECT p.id, p.name, p.price, p.stock_quantity, p.min_order_qty,
                           p.farmer_id, f.farm_name, u.name as unit_name,
                           (SELECT image_url FROM product_image WHERE product_id = p.id LIMIT 1) as image
                    FROM product p
                    JOIN farmer f ON p.farmer_id = f.id
                    JOIN unit_of_measure u ON p.unit_id = u.id
                    WHERE p.id = ? AND p.status = 'active'
                ");
                $stmt->execute([$product_id]);
                $product = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$product) {
                    jsonResponse(['error' => 'Product not found or inactive'], 404);
                }

                if ($product['stock_quantity'] < $quantity) {
                    jsonResponse([
                        'error' => "Insufficient stock. Available: {$product['stock_quantity']}",
                        'available' => $product['stock_quantity']
                    ], 400);
                }

                jsonResponse([
                    'success' => true,
                    'message' => 'Item added to cart',
                    'product' => [
                        'id' => $product['id'],
                        'product_id' => $product['id'],
                        'name' => $product['name'],
                        'price' => floatval($product['price']),
                        'quantity' => $quantity,
                        'unit' => $product['unit_name'],
                        'farmer_id' => $product['farmer_id'],
                        'farm_name' => $product['farm_name'],
                        'image' => $product['image'],
                        'stock_quantity' => $product['stock_quantity']
                    ]
                ]);
            } elseif ($action === 'remove') {
                // Frontend handles removal, just confirm
                jsonResponse([
                    'success' => true,
                    'message' => 'Item removed from cart'
                ]);
            } else {
                jsonResponse(['error' => 'Invalid action'], 400);
            }
            break;

        case 'PUT':
            // Update quantity
            $data = json_decode(file_get_contents("php://input"), true);
            $product_id = sanitize($data['product_id'] ?? '');
            $quantity = intval($data['quantity'] ?? 0);

            if (empty($product_id)) {
                jsonResponse(['error' => 'Product ID is required'], 400);
            }

            if ($quantity < 0) {
                jsonResponse(['error' => 'Invalid quantity'], 400);
            }

            if ($quantity === 0) {
                jsonResponse([
                    'success' => true,
                    'message' => 'Item removed from cart'
                ]);
                break;
            }

            // Get product to validate stock
            $stmt = $conn->prepare("SELECT id, stock_quantity, name FROM product WHERE id = ? AND status = 'active'");
            $stmt->execute([$product_id]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$product) {
                jsonResponse(['error' => 'Product not found'], 404);
            }

            if ($product['stock_quantity'] < $quantity) {
                jsonResponse([
                    'error' => "Insufficient stock for {$product['name']}. Available: {$product['stock_quantity']}",
                    'available' => $product['stock_quantity']
                ], 400);
            }

            jsonResponse([
                'success' => true,
                'message' => 'Quantity updated'
            ]);
            break;

        default:
            jsonResponse(['error' => 'Method not allowed'], 405);
    }

} catch (Exception $e) {
    jsonResponse(['error' => 'Operation failed: ' . $e->getMessage()], 500);
}
?>
