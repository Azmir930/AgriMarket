<?php
/**
 * Buyer Checkout & Order Creation
 * Agriculture Product Marketplace
 */

require_once '../config/database.php';
require_once '../config/helpers.php';
require_once '../auth/middleware.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

error_log("CHECKOUT: Request received from " . $_SERVER['REMOTE_ADDR'] . " at " . date('Y-m-d H:i:s'));

try {
    error_log("CHECKOUT: Validating user role");
    $user = requireApiRole('buyer');
    error_log("CHECKOUT: User validated: " . $user['email']);
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
    $data = json_decode(file_get_contents("php://input"), true);

    $items = $data['items'] ?? [];
    $shipping_address_id = sanitize($data['shipping_address_id'] ?? '');
    $payment_method = sanitize($data['payment_method'] ?? 'cod'); // cod, card, bank_transfer

    error_log("CHECKOUT: Items count = " . count($items));
    error_log("CHECKOUT: Shipping address ID = " . $shipping_address_id);
    error_log("CHECKOUT: Payment method = " . $payment_method);

    if (empty($items)) {
        jsonResponse(['error' => 'Cart is empty'], 400);
    }

    if (empty($shipping_address_id)) {
        jsonResponse(['error' => 'Shipping address is required'], 400);
    }

    // Verify shipping address belongs to buyer
    $stmt = $conn->prepare("
        SELECT id FROM address 
        WHERE id = ? AND user_id = ?
    ");
    $stmt->execute([$shipping_address_id, $user['user_id']]);
    error_log("CHECKOUT: Address verification - rows = " . $stmt->rowCount());
    if ($stmt->rowCount() === 0) {
        error_log("CHECKOUT: Address not found for id=" . $shipping_address_id . ", user_id=" . $user['user_id']);
        jsonResponse(['error' => 'Invalid shipping address'], 400);
    }

    $conn->beginTransaction();
    error_log("CHECKOUT: Transaction started");

    // Validate and lock products
    $order_items = [];
    $subtotal = 0;
    $errors = [];

    foreach ($items as $item) {
        $product_id = sanitize($item['product_id'] ?? '');
        $quantity = intval($item['quantity'] ?? 0);

        if (empty($product_id) || $quantity <= 0) {
            continue;
        }

        error_log("CHECKOUT: Validating product_id=" . $product_id . ", qty=" . $quantity);

        // Get and lock product
        $stmt = $conn->prepare("
            SELECT id, name, price, stock_quantity, min_order_qty, farmer_id
            FROM product 
            WHERE id = ? AND status = 'active'
            FOR UPDATE
        ");
        $stmt->execute([$product_id]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$product) {
            $errors[] = "Product not available: $product_id";
            continue;
        }

        if ($product['stock_quantity'] < $quantity) {
            $errors[] = "Insufficient stock for {$product['name']}";
            continue;
        }

        if ($quantity < $product['min_order_qty']) {
            $errors[] = "Minimum order for {$product['name']} is {$product['min_order_qty']}";
            continue;
        }

        $item_subtotal = $product['price'] * $quantity;
        $order_items[] = [
            'product_id' => $product['id'],
            'quantity' => $quantity,
            'unit_price' => $product['price'],
            'subtotal' => $item_subtotal
        ];
        $subtotal += $item_subtotal;

        // Update stock
        $new_stock = $product['stock_quantity'] - $quantity;
        $stmt = $conn->prepare("UPDATE product SET stock_quantity = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$new_stock, $product_id]);

        // Log inventory change
        $stmt = $conn->prepare("
            INSERT INTO inventory_log (id, product_id, quantity, change_type, 
                                      previous_qty, new_qty, notes) 
            VALUES (?, ?, ?, 'sale', ?, ?, 'Order sale')
        ");
        $stmt->execute([
            generateUUID(), $product_id, -$quantity,
            $product['stock_quantity'], $new_stock
        ]);
    }

    error_log("CHECKOUT: Errors count = " . count($errors));
    if (!empty($errors)) {
        error_log("CHECKOUT: Validation errors: " . json_encode($errors));
        $conn->rollBack();
        jsonResponse(['error' => 'Checkout failed', 'details' => $errors], 400);
    }

    error_log("CHECKOUT: Order items count = " . count($order_items));
    if (empty($order_items)) {
        $conn->rollBack();
        jsonResponse(['error' => 'No valid items to order'], 400);
    }

    // Calculate totals
    $shipping_fee = $subtotal > 1000 ? 0 : 50;
    $tax = $subtotal * 0.05;
    $total = $subtotal + $shipping_fee + $tax;

    // Create order
    $order_id = generateUUID();
    $order_number = 'ORD-' . date('Ymd') . '-' . strtoupper(substr(md5($order_id), 0, 6));

    $stmt = $conn->prepare("
        INSERT INTO orders (id, buyer_id, order_number, shipping_address_id, subtotal, shipping_fee, 
                           tax_amount, total_amount, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    ");
    $stmt->execute([$order_id, $buyer_id, $order_number, $shipping_address_id, $subtotal, $shipping_fee, $tax, $total]);

    // Create order items
    foreach ($order_items as $item) {
        // Get farmer_id for the product
        $stmt = $conn->prepare("SELECT farmer_id FROM product WHERE id = ?");
        $stmt->execute([$item['product_id']]);
        $prod_data = $stmt->fetch(PDO::FETCH_ASSOC);
        $farmer_id = $prod_data['farmer_id'] ?? null;
        
        $stmt = $conn->prepare("
            INSERT INTO order_items (id, order_id, product_id, farmer_id, quantity, unit_price, total_price) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            generateUUID(), $order_id, $item['product_id'], $farmer_id,
            $item['quantity'], $item['unit_price'], $item['subtotal']
        ]);
    }

    // Create payment record
    $payment_id = generateUUID();
    $payment_status = $payment_method === 'cod' ? 'pending' : 'pending';
    
    $stmt = $conn->prepare("
        INSERT INTO payment (id, order_id, amount, payment_method, status) 
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([$payment_id, $order_id, $total, $payment_method, $payment_status]);

    // Create delivery record
    $stmt = $conn->prepare("
        INSERT INTO delivery (id, order_id, status) 
        VALUES (?, ?, 'pending')
    ");
    $stmt->execute([generateUUID(), $order_id]);

    // Log activity
    $stmt = $conn->prepare("
        INSERT INTO user_activity_log (id, user_id, activity_type, description) 
        VALUES (?, ?, 'order_placed', ?)
    ");
    $stmt->execute([generateUUID(), $user['user_id'], "Order placed: $order_number"]);

    $conn->commit();

    jsonResponse([
        'success' => true,
        'message' => 'Order placed successfully',
        'order' => [
            'id' => $order_id,
            'order_number' => $order_number,
            'total' => $total,
            'status' => 'pending',
            'payment_method' => $payment_method
        ]
    ], 201);

} catch (Exception $e) {
    if (isset($conn)) {
        $conn->rollBack();
    }
    jsonResponse(['error' => 'Checkout failed: ' . $e->getMessage()], 500);
}
?>
