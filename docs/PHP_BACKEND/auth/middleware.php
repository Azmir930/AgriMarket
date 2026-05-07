<?php
/**
 * Authentication Middleware
 * Agriculture Product Marketplace
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/session.php';

/**
 * Validate API token from Authorization header
 */
function validateToken() {
    $auth_header = '';
    
    // Try multiple ways to get Authorization header
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        $auth_header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    
    // Fallback for servers where getallheaders() doesn't work
    if (empty($auth_header) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
    }
    
    // Apache fastcgi workaround
    if (empty($auth_header) && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $auth_header = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
    
    // Final fallback - check all $_SERVER keys
    if (empty($auth_header)) {
        foreach ($_SERVER as $key => $value) {
            if ($key === 'HTTP_AUTHORIZATION' || strpos($key, 'AUTHORIZATION') !== false) {
                $auth_header = $value;
                break;
            }
        }
    }
    
    if (empty($auth_header)) {
        error_log("No Authorization header found. Available headers: " . json_encode(array_keys(array_filter($_SERVER, function($k) { return strpos($k, 'HTTP') === 0; }, ARRAY_FILTER_USE_KEY))));
        return null;
    }

    $token = str_replace('Bearer ', '', $auth_header);
    
    if (empty($token)) {
        error_log("Token is empty after removing 'Bearer '");
        return null;
    }

    try {
        $database = new Database();
        $conn = $database->getConnection();

        error_log("Checking token in database: " . substr($token, 0, 20) . "...");
        
        $stmt = $conn->prepare("
            SELECT s.user_id, u.email, r.role_name, u.first_name, u.last_name
            FROM user_session s
            JOIN user u ON s.user_id = u.id
            JOIN user_role r ON u.role_id = r.id
            WHERE s.token = ? AND s.expires_at > NOW() AND u.is_active = TRUE
        ");
        $stmt->execute([$token]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($session) {
            // Session is valid, return user data
            error_log("Session found for user: " . $session['email'] . ", Role: " . $session['role_name']);
            return $session;
        }
        
        error_log("Session not found for token: " . substr($token, 0, 10));
        
        // Debug: Check if token exists at all
        $debugStmt = $conn->prepare("SELECT COUNT(*) as cnt FROM user_session WHERE token = ?");
        $debugStmt->execute([$token]);
        $debugResult = $debugStmt->fetch(PDO::FETCH_ASSOC);
        error_log("Token exists in DB: " . ($debugResult['cnt'] > 0 ? 'YES' : 'NO'));
        
        return null;

    } catch (Exception $e) {
        error_log("validateToken Error: " . $e->getMessage());
        return null;
    }
}

/**
 * Require valid authentication
 */
function requireApiAuth() {
    $user = validateToken();
    
    if (!$user) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }
    
    return $user;
}

/**
 * Require specific role via API
 */
function requireApiRole($required_role) {
    $user = requireApiAuth();
    
    error_log("RequireApiRole check - Required: $required_role, User role: " . ($user['role_name'] ?? 'NULL') . ", User data: " . json_encode($user));
    
    if ($user['role_name'] !== $required_role && $user['role_name'] !== 'admin') {
        error_log("Access denied - User role '{$user['role_name']}' does not match required role '{$required_role}'");
        jsonResponse(['error' => 'Forbidden: Insufficient permissions', 'user_role' => $user['role_name'] ?? 'unknown'], 403);
    }
    
    return $user;
}

/**
 * Require any of the specified roles
 */
function requireApiRoles($roles) {
    $user = requireApiAuth();
    
    if (!in_array($user['role_name'], $roles) && $user['role_name'] !== 'admin') {
        jsonResponse(['error' => 'Forbidden: Insufficient permissions'], 403);
    }
    
    return $user;
}

/**
 * Get current authenticated user from token or session
 */
function getAuthenticatedUser() {
    // Try token first (for API calls)
    $user = validateToken();
    
    if ($user) {
        return $user;
    }
    
    // Fall back to session (for web pages)
    if (isLoggedIn()) {
        return [
            'user_id' => getCurrentUserId(),
            'email' => $_SESSION['email'] ?? null,
            'role_name' => getCurrentUserRole(),
            'first_name' => explode(' ', $_SESSION['name'] ?? '')[0],
            'last_name' => explode(' ', $_SESSION['name'] ?? '')[1] ?? ''
        ];
    }
    
    return null;
}
?>
