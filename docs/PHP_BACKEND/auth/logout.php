<?php
/**
 * User Logout
 * Agriculture Product Marketplace
 */

require_once '../config/database.php';
require_once '../config/helpers.php';
require_once '../config/session.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

try {
    $user_id = getCurrentUserId();
    
    if ($user_id) {
        $database = new Database();
        $conn = $database->getConnection();

        // Get token from header
        $headers = getallheaders();
        $token = str_replace('Bearer ', '', $headers['Authorization'] ?? '');

        if ($token) {
            // Invalidate session token
            $stmt = $conn->prepare("DELETE FROM User_Session WHERE user_id = ? AND token = ?");
            $stmt->execute([$user_id, $token]);
        }

        // Log logout
        $stmt = $conn->prepare("
            INSERT INTO User_Activity_Log (id, user_id, activity_type, description) 
            VALUES (?, ?, 'logout', 'User logged out')
        ");
        $stmt->execute([generateUUID(), $user_id]);
    }

    // Destroy PHP session
    logout();

    jsonResponse([
        'success' => true,
        'message' => 'Logged out successfully'
    ]);

} catch (Exception $e) {
    jsonResponse(['error' => 'Logout failed: ' . $e->getMessage()], 500);
}
?>
