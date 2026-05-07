<?php
/**
 * Debug: Check if farmer record exists
 */

require_once 'config/database.php';
require_once 'auth/middleware.php';

setCorsHeaders();

try {
    // Get authenticated user
    $user = requireApiAuth();
    
    $database = new Database();
    $conn = $database->getConnection();
    
    // Check if user exists
    $stmt = $conn->prepare("SELECT id, email, role_id FROM user WHERE id = ?");
    $stmt->execute([$user['user_id']]);
    $user_data = $stmt->fetch(PDO::FETCH_ASSOC);
    
    jsonResponse([
        'success' => true,
        'user' => $user_data,
        'authenticated_user' => $user
    ]);
    
} catch (Exception $e) {
    jsonResponse([
        'error' => $e->getMessage(),
        'type' => 'debug'
    ], 500);
}
?>
