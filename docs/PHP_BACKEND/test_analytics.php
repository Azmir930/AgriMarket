<?php
// Test admin analytics endpoint
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config/database.php';
require_once 'config/helpers.php';

$database = new Database();
$conn = $database->getConnection();

echo "=== Analytics Endpoint Test ===\n\n";

try {
    // Test overview query
    echo "Testing overview query...\n";
    $stmt = $conn->prepare("
        SELECT 
            (SELECT COUNT(*) FROM user) as total_users,
            (SELECT COUNT(*) FROM user WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as new_users,
            (SELECT COUNT(*) FROM farmer) as total_farmers,
            (SELECT COUNT(*) FROM buyer) as total_buyers,
            (SELECT COUNT(*) FROM product WHERE is_active = TRUE) as active_products,
            (SELECT COUNT(*) FROM orders) as total_orders,
            (SELECT COUNT(*) FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as recent_orders,
            (SELECT COALESCE(SUM(total_amount), 0) FROM payment WHERE status != 'cancelled') as total_revenue,
            (SELECT COALESCE(SUM(total_amount), 0) FROM payment WHERE status != 'cancelled' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as recent_revenue
    ");
    $stmt->execute([]);
    $overview = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Overview: " . json_encode($overview) . "\n\n";

    // Test orders by status
    echo "Testing orders by status...\n";
    $stmt = $conn->prepare("SELECT status, COUNT(*) as count FROM orders GROUP BY status");
    $stmt->execute();
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Orders: " . json_encode($orders) . "\n\n";

    // Test top products
    echo "Testing top products...\n";
    $stmt = $conn->prepare("
        SELECT p.id, p.name, f.farm_name,
               SUM(oi.quantity) as total_sold,
               SUM(oi.subtotal) as total_revenue
        FROM order_items oi
        JOIN product p ON oi.product_id = p.id
        JOIN farmer f ON p.farmer_id = f.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status != 'cancelled'
        GROUP BY p.id, p.name, f.farm_name
        ORDER BY total_sold DESC
        LIMIT 10
    ");
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Top Products: " . json_encode($products) . "\n\n";

    echo "✓ All queries executed successfully!\n";

} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
?>
