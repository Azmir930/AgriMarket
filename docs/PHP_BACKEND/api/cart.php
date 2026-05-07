<?php
/**
 * Cart API (Add to Cart, Update Quantity)
 * Agriculture Product Marketplace
 * 
 * Note: Cart is typically managed client-side (localStorage/sessionStorage)
 * This API validates products and returns updated cart data
 */

require_once '../config/database.php';
require_once '../config/helpers.php';

setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];

try {
    $database = new Database();
    $conn = $database->getConnection();

    switch ($method) {
        case 'POST':
            // Add to cart / Validate product
            $data = json_decode(file_get_contents("php://input"), true);
            $action = $data['action'] ?? 'add';

            if ($action === 'add') {
                $product_id = sanitize($data['product_id'] ?? '');
                $quantity = intval($data['quantity'] ?? 1);

                if (empty($product_id)) {
                    jsonResponse(['error' => 'Product ID is required'], 400);
                }

                if ($quantity < 1) {
                    jsonResponse(['error' => 'Quantity must be at least 1'], 400);
                }

                // Get product details
                $stmt = $conn->prepare("
                    SELECT p.id, p.name, p.price, p.stock_quantity, p.min_order_qty,
                           p.farmer_id, f.farm_name, u.abbreviation as unit_abbr,
                           (SELECT image_url FROM Product_Image WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) as image
                    FROM Product p
                    JOIN Farmer f ON p.farmer_id = f.id
                    JOIN Unit_Of_Measure u ON p.unit_id = u.id
                    WHERE p.id = ? AND p.is_active = TRUE
                ");
                $stmt->execute([$product_id]);
                $product = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$product) {
                    jsonResponse(['error' => 'Product not found or unavailable'], 404);
                }

                if ($product['stock_quantity'] < $quantity) {
                    jsonResponse([
                        'error' => 'Insufficient stock',
                        'available' => $product['stock_quantity']
                    ], 400);
                }

                if ($quantity < $product['min_order_qty']) {
                    jsonResponse([
                        'error' => 'Minimum order quantity not met',
                        'minimum' => $product['min_order_qty']
                    ], 400);
                }

                jsonResponse([
                    'success' => true,
                    'message' => 'Product validated and ready to add',
                    'product' => [
                        'id' => $product['id'],
                        'name' => $product['name'],
                        'price' => $product['price'],
                        'quantity' => $quantity,
                        'subtotal' => $product['price'] * $quantity,
                        'unit' => $product['unit_abbr'],
                        'farm_name' => $product['farm_name'],
                        'image' => $product['image'],
                        'max_quantity' => $product['stock_quantity'],
                        'min_quantity' => $product['min_order_qty']
                    ]
                ]);

            } elseif ($action === 'validate') {
                // Validate entire cart
                $items = $data['items'] ?? [];
                
                if (empty($items)) {
                    jsonResponse(['error' => 'Cart is empty'], 400);
                }

                $validated = [];
                $errors = [];
                $subtotal = 0;

                foreach ($items as $item) {
                    $product_id = sanitize($item['product_id'] ?? '');
                    $quantity = intval($item['quantity'] ?? 0);

                    if (empty($product_id) || $quantity < 1) {
                        continue;
                    }

                    $stmt = $conn->prepare("
                        SELECT p.id, p.name, p.price, p.stock_quantity, p.min_order_qty,
                               u.abbreviation as unit_abbr
                        FROM Product p
                        JOIN Unit_Of_Measure u ON p.unit_id = u.id
                        WHERE p.id = ? AND p.is_active = TRUE
                    ");
                    $stmt->execute([$product_id]);
                    $product = $stmt->fetch(PDO::FETCH_ASSOC);

                    if (!$product) {
                        $errors[] = ['product_id' => $product_id, 'error' => 'Product unavailable'];
                        continue;
                    }

                    $adjusted_qty = $quantity;
                    $warnings = [];

                    if ($quantity > $product['stock_quantity']) {
                        $adjusted_qty = $product['stock_quantity'];
                        $warnings[] = "Quantity adjusted to available stock: {$adjusted_qty}";
                    }

                    if ($adjusted_qty < $product['min_order_qty']) {
                        $errors[] = [
                            'product_id' => $product_id,
                            'error' => "Minimum order is {$product['min_order_qty']}"
                        ];
                        continue;
                    }

                    $item_subtotal = $product['price'] * $adjusted_qty;
                    $subtotal += $item_subtotal;

                    $validated[] = [
                        'product_id' => $product['id'],
                        'name' => $product['name'],
                        'price' => $product['price'],
                        'quantity' => $adjusted_qty,
                        'original_quantity' => $quantity,
                        'subtotal' => $item_subtotal,
                        'unit' => $product['unit_abbr'],
                        'warnings' => $warnings
                    ];
                }

                $delivery_fee = $subtotal > 1000 ? 0 : 50;
                $tax = $subtotal * 0.05;
                $total = $subtotal + $delivery_fee + $tax;

                jsonResponse([
                    'success' => true,
                    'items' => $validated,
                    'errors' => $errors,
                    'summary' => [
                        'subtotal' => round($subtotal, 2),
                        'delivery_fee' => round($delivery_fee, 2),
                        'tax' => round($tax, 2),
                        'total' => round($total, 2)
                    ]
                ]);
            }
            break;

        default:
            jsonResponse(['error' => 'Method not allowed'], 405);
    }

} catch (Exception $e) {
    jsonResponse(['error' => 'Operation failed: ' . $e->getMessage()], 500);
}
?>
