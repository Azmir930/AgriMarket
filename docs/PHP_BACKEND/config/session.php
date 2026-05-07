<?php
/**
 * Session Management Configuration
 * Agriculture Product Marketplace
 */

// Start session with secure settings
function initSession() {
    if (session_status() === PHP_SESSION_NONE) {
        ini_set('session.cookie_httponly', 1);
        ini_set('session.cookie_secure', 1); // Enable in production with HTTPS
        ini_set('session.use_only_cookies', 1);
        session_start();
    }
}

// Check if user is logged in
function isLoggedIn() {
    initSession();
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

// Get current user ID
function getCurrentUserId() {
    initSession();
    return $_SESSION['user_id'] ?? null;
}

// Get current user role
function getCurrentUserRole() {
    initSession();
    return $_SESSION['role'] ?? null;
}

// Check if user has specific role
function hasRole($role) {
    return getCurrentUserRole() === $role;
}

// Require authentication
function requireAuth() {
    if (!isLoggedIn()) {
        header("Location: /auth/login.php");
        exit();
    }
}

// Require specific role
function requireRole($role) {
    requireAuth();
    if (!hasRole($role)) {
        header("HTTP/1.1 403 Forbidden");
        echo json_encode(['error' => 'Access denied']);
        exit();
    }
}

// Destroy session
function logout() {
    initSession();
    session_unset();
    session_destroy();
}

// Regenerate session ID (security measure)
function regenerateSession() {
    initSession();
    session_regenerate_id(true);
}

// Store user session data
function setUserSession($user_id, $email, $role, $name) {
    initSession();
    regenerateSession();
    $_SESSION['user_id'] = $user_id;
    $_SESSION['email'] = $email;
    $_SESSION['role'] = $role;
    $_SESSION['name'] = $name;
    $_SESSION['login_time'] = time();
}
?>
