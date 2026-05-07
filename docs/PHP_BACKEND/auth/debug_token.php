<?php
/**
 * Auth Debug - Test token validation
 */

header('Content-Type: application/json');
require_once 'config/database.php';
require_once 'config/helpers.php';
require_once 'auth/middleware.php';

setCorsHeaders();

try {
    // Try to get the token from different sources
    $auth_header = '';
    
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        error_log("All Headers: " . json_encode($headers));
        $auth_header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    
    if (empty($auth_header) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
    }
    
    // Validate the token
    $user = validateToken();
    
    jsonResponse([
        'success' => true,
        'debug' => [
            'authorization_header' => substr($auth_header, 0, 20) . '...' ?? 'none',
            'user_authenticated' => $user !== null,
            'user' => $user,
            'http_authorization' => isset($_SERVER['HTTP_AUTHORIZATION']) ? 'yes' : 'no',
            'server_auth_header' => $_SERVER['HTTP_AUTHORIZATION'] ?? 'not set'
        ]
    ]);
    
} catch (Exception $e) {
    jsonResponse([
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], 500);
}
?>
