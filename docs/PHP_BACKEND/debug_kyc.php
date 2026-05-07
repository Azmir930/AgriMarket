<?php
/**
 * Debug KYC Endpoint
 */

require_once 'config/database.php';
require_once 'config/helpers.php';
require_once 'auth/middleware.php';

setCorsHeaders();

error_log("=== Debug KYC Endpoint ===");
error_log("REQUEST_METHOD: " . $_SERVER['REQUEST_METHOD']);
error_log("Raw POST data: " . file_get_contents("php://input"));

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed, use POST'], 405);
}

// Test 1: Check if auth headers are received
error_log("Testing auth header...");
$auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? 'NOT FOUND';
error_log("Authorization header: " . substr($auth_header, 0, 50));

// Test 2: Parse JSON input
$input = file_get_contents("php://input");
error_log("Raw input length: " . strlen($input));
$data = json_decode($input, true);
error_log("Parsed JSON: " . json_encode($data));

if (isset($data['test_user_id'])) {
    error_log("Test: Looking for user with ID: " . $data['test_user_id']);
    try {
        $database = new Database();
        $conn = $database->getConnection();
        $stmt = $conn->prepare("SELECT id, email FROM user WHERE id = ?");
        $stmt->execute([$data['test_user_id']]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($result) {
            error_log("User found: " . json_encode($result));
        } else {
            error_log("User NOT found");
        }
    } catch (Exception $e) {
        error_log("Database error: " . $e->getMessage());
    }
}

jsonResponse([
    'debug' => true,
    'auth_header_received' => !empty($auth_header) && $auth_header !== 'NOT FOUND',
    'json_parsed' => !is_null($data),
    'received_data' => $data
]);
?>
