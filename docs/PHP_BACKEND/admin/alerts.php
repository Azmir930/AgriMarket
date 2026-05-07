<?php
/**
 * Admin System Alerts
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
    $user = requireApiRole('admin');
    $database = new Database();
    $conn = $database->getConnection();

    // Pending KYC Verifications
    $stmt = $conn->prepare("
        SELECT COUNT(*) as count
        FROM kyc_verification
        WHERE status = 'pending'
    ");
    $stmt->execute();
    $pending_kyc = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    // Products Awaiting Approval
    $stmt = $conn->prepare("
        SELECT COUNT(*) as count
        FROM product
        WHERE status = 'pending'
    ");
    $stmt->execute();
    $pending_products = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    // Unresolved Payment Disputes
    $stmt = $conn->prepare("
        SELECT COUNT(*) as count
        FROM payment
        WHERE status = 'failed'
    ");
    $stmt->execute();
    $failed_payments = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    // Low Stock Products
    $stmt = $conn->prepare("
        SELECT COUNT(*) as count
        FROM product
        WHERE status = 'active' AND stock_quantity <= 10
    ");
    $stmt->execute();
    $low_stock = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    // Inactive Users
    $stmt = $conn->prepare("
        SELECT COUNT(*) as count
        FROM user
        WHERE is_active = 0
    ");
    $stmt->execute();
    $inactive_users = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    jsonResponse([
        'success' => true,
        'data' => [
            [
                'id' => 'kyc',
                'title' => 'Pending KYC Verifications',
                'count' => intval($pending_kyc),
                'action' => 'Review',
                'severity' => 'warning'
            ],
            [
                'id' => 'products',
                'title' => 'Products Awaiting Approval',
                'count' => intval($pending_products),
                'action' => 'Approve',
                'severity' => 'warning'
            ],
            [
                'id' => 'payments',
                'title' => 'Failed Payments',
                'count' => intval($failed_payments),
                'action' => 'Resolve',
                'severity' => 'error'
            ],
            [
                'id' => 'stock',
                'title' => 'Low Stock Products',
                'count' => intval($low_stock),
                'action' => 'Restock',
                'severity' => 'warning'
            ],
            [
                'id' => 'users',
                'title' => 'Inactive Users',
                'count' => intval($inactive_users),
                'action' => 'Review',
                'severity' => 'info'
            ]
        ]
    ]);

} catch (Exception $e) {
    error_log("Alerts error: " . $e->getMessage());
    jsonResponse(['error' => 'Operation failed: ' . $e->getMessage()], 500);
}
?>
