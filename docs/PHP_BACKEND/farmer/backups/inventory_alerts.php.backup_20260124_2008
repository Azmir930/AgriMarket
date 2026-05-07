<?php
/**
 * Farmer Inventory Alerts
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
    $user = validateToken();
    if (!$user || $user['role_name'] !== 'farmer') {
        jsonResponse(['error' => 'Unauthorized or not a farmer'], 401);
    }

    $database = new Database();
    $conn = $database->getConnection();

    // Get farmer ID
    $stmt = $conn->prepare("SELECT id FROM farmer WHERE user_id = ?");
    $stmt->execute([$user['user_id']]);
    $farmerResult = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$farmerResult) {
        jsonResponse(['error' => 'Farmer profile not found'], 404);
    }
    
    $farmer_id = $farmerResult['id'];

    // Get low stock products
    $stmt = $conn->prepare("
        SELECT 
            p.id,
            p.name,
            p.stock_quantity,
            p.unit_id,
            CASE 
                WHEN p.stock_quantity = 0 THEN 'out'
                WHEN p.stock_quantity <= 5 THEN 'critical'
                WHEN p.stock_quantity <= 10 THEN 'low'
                ELSE 'medium'
            END as status
        FROM product p
        WHERE p.farmer_id = ? AND p.stock_quantity <= 10
        ORDER BY p.stock_quantity ASC
    ");
    $stmt->execute([$farmer_id]);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get unit of measure names
    $alerts = array_map(function($product) use ($conn) {
        $unitStmt = $conn->prepare("SELECT abbreviation FROM unit_of_measure WHERE id = ?");
        $unitStmt->execute([$product['unit_id']]);
        $unitResult = $unitStmt->fetch(PDO::FETCH_ASSOC);
        $unit = $unitResult['abbreviation'] ?? 'unit';

        return [
            'id' => $product['id'],
            'name' => $product['name'],
            'stock' => (int)$product['stock_quantity'],
            'unit' => $unit,
            'status' => $product['status']
        ];
    }, $products);

    jsonResponse([
        'success' => true,
        'data' => $alerts
    ]);

} catch (Exception $e) {
    jsonResponse([
        'success' => false,
        'message' => 'Failed to fetch inventory alerts',
        'error' => $e->getMessage()
    ], 500);
}
?>
