<?php
/**
 * Admin KYC Verification Management
 * Agriculture Product Marketplace
 */

require_once '../config/database.php';
require_once '../config/helpers.php';
require_once '../auth/middleware.php';

error_log("=== KYC Verification Endpoint Called ===");

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

try {
    error_log("Attempting to require admin role");
    $user = requireApiRole('admin');
    error_log("User authenticated as admin: " . json_encode($user));
    
    $database = new Database();
    $conn = $database->getConnection();

    $input = file_get_contents("php://input");
    error_log("Raw input: " . $input);
    
    $data = json_decode($input, true);
    error_log("Parsed data: " . json_encode($data));
    
    $user_id = sanitize($data['user_id'] ?? '');
    $status = sanitize($data['status'] ?? ''); // 'verified' or 'rejected'

    error_log("User ID: $user_id, Status: $status");

    if (empty($user_id)) {
        jsonResponse(['error' => 'User ID is required'], 400);
    }

    if ($status !== 'verified' && $status !== 'rejected') {
        jsonResponse(['error' => 'Invalid status. Must be verified or rejected'], 400);
    }

    // Verify user exists
    $stmt = $conn->prepare("SELECT id FROM user WHERE id = ?");
    $stmt->execute([$user_id]);
    
    if ($stmt->rowCount() === 0) {
        error_log("User not found: $user_id");
        jsonResponse(['error' => 'User not found'], 404);
    }

    error_log("User found. Updating KYC status...");

    // Update KYC verification status using ON DUPLICATE KEY
    // Note: kyc_verification has UNIQUE constraint on user_id
    $kyc_id = generateUUID();
    $stmt = $conn->prepare("
        INSERT INTO kyc_verification (id, user_id, document_type, document_number, status, verified_at, created_at)
        VALUES (?, ?, 'admin_verified', 'admin_approval', ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE 
            status = VALUES(status),
            verified_at = NOW()
    ");
    $stmt->execute([$kyc_id, $user_id, $status]);
    error_log("KYC verification updated successfully");

    // Log activity
    $stmt = $conn->prepare("
        INSERT INTO user_activity_log (id, user_id, activity_type, description)
        VALUES (?, ?, 'kyc_update', 'KYC status updated to " . $status . " by admin')
    ");
    $stmt->execute([generateUUID(), $user_id]);
    error_log("Activity logged");

    jsonResponse([
        'success' => true,
        'message' => 'KYC status updated successfully'
    ]);

} catch (Exception $e) {
    error_log("KYC Verification Exception: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    jsonResponse([
        'success' => false,
        'error' => 'Operation failed: ' . $e->getMessage(),
        'exception' => get_class($e)
    ], 500);
}
?>
