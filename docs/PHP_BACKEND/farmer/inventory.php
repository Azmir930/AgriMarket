<?php
/**
 * Farmer Inventory Management - Simplified
 * Get inventory levels and history
 */

// Enable all error logging
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

error_log("[Inventory] Request received at " . date('Y-m-d H:i:s'));
error_log("[Inventory] Method: " . $_SERVER['REQUEST_METHOD']);

// Check if required files exist
if (!file_exists('../config/database.php')) {
    http_response_code(500);
    echo json_encode(['error' => 'Database config not found', 'path' => __DIR__]);
    error_log("[Inventory] ERROR: Database config not found");
    exit;
}

try {
    require_once '../config/database.php';
    require_once '../config/helpers.php';
    require_once '../auth/middleware.php';
    
    error_log("[Inventory] Files loaded successfully");

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method !== 'GET' && $method !== 'POST' && $method !== 'OPTIONS') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        exit;
    }

    // Authenticate user
    error_log("[Inventory] Authenticating user...");
    $user = requireApiRole('farmer');
    
    if (!$user) {
        error_log("[Inventory] Authentication failed");
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }

    error_log("[Inventory] User authenticated: " . $user['email']);

    // Connect to database
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        error_log("[Inventory] Database connection failed");
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed']);
        exit;
    }

    // Get farmer ID
    error_log("[Inventory] Looking up farmer for user_id: " . $user['user_id']);
    $stmt = $conn->prepare("SELECT id FROM farmer WHERE user_id = ?");
    $stmt->execute([$user['user_id']]);
    $farmer = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$farmer) {
        error_log("[Inventory] No farmer profile found");
        http_response_code(404);
        echo json_encode(['error' => 'Farmer profile not found']);
        exit;
    }

    $farmer_id = $farmer['id'];
    error_log("[Inventory] Farmer ID: $farmer_id");

    if ($method === 'GET') {
        error_log("[Inventory] Processing GET request");

        // Get inventory
        $stmt = $conn->prepare("
            SELECT 
                p.id as product_id,
                p.name as product_name,
                c.name as category_name,
                u.name as unit_name,
                p.stock_quantity as current_stock,
                10 as min_stock,
                p.price,
                p.status
            FROM product p
            LEFT JOIN category c ON p.category_id = c.id
            LEFT JOIN unit_of_measure u ON p.unit_id = u.id
            WHERE p.farmer_id = ?
            ORDER BY p.stock_quantity ASC
        ");
        
        $stmt->execute([$farmer_id]);
        $inventory = $stmt->fetchAll(PDO::FETCH_ASSOC);
        error_log("[Inventory] Found " . count($inventory) . " items");

        // Get logs
        $stmt = $conn->prepare("
            SELECT 
                il.id,
                il.product_id,
                p.name as product_name,
                il.change_type,
                il.quantity,
                il.previous_qty,
                il.new_qty,
                il.notes,
                il.created_at
            FROM inventory_log il
            INNER JOIN product p ON il.product_id = p.id
            WHERE p.farmer_id = ?
            ORDER BY il.created_at DESC
            LIMIT 100
        ");
        
        $stmt->execute([$farmer_id]);
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        error_log("[Inventory] Found " . count($logs) . " log entries");

        // Add primary images
        $images = [];
        if (!empty($inventory)) {
            $productIds = array_map(fn($i) => $i['product_id'], $inventory);
            $placeholders = implode(',', array_fill(0, count($productIds), '?'));
            $imgStmt = $conn->prepare("
                SELECT product_id, image_url 
                FROM product_image 
                WHERE is_primary = TRUE AND product_id IN ($placeholders)
            ");
            $imgStmt->execute($productIds);
            foreach ($imgStmt->fetchAll(PDO::FETCH_ASSOC) as $img) {
                $images[$img['product_id']] = $img['image_url'];
            }
        }

        foreach ($inventory as &$item) {
            $item['primary_image'] = $images[$item['product_id']] ?? null;
        }

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'inventory' => $inventory,
            'logs' => $logs,
            'summary' => [
                'total_items' => count($inventory),
                'low_stock_items' => count(array_filter($inventory, fn($item) => intval($item['current_stock']) <= intval($item['min_stock']))),
                'out_of_stock_items' => count(array_filter($inventory, fn($item) => intval($item['current_stock']) === 0)),
            ]
        ]);
        error_log("[Inventory] Response sent successfully");
    }

} catch (Exception $e) {
    error_log("[Inventory] Exception: " . $e->getMessage());
    error_log("[Inventory] File: " . $e->getFile() . ":" . $e->getLine());
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ]);
}
?>

