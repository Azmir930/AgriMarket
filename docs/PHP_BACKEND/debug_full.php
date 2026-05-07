<?php
/**
 * Full Debug: Check all components
 */

header('Content-Type: application/json');
require_once 'config/database.php';
require_once 'auth/middleware.php';

setCorsHeaders();

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    // 1. Check if tables exist
    $tables_query = $conn->query("
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME IN ('user', 'user_session', 'farmer', 'product', 'category', 'unit_of_measure')
    ");
    $existing_tables = $tables_query->fetchAll(PDO::FETCH_COLUMN);
    
    // 2. Check roles
    $stmt = $conn->prepare("SELECT id, role_name FROM user_role");
    $stmt->execute();
    $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 3. Check users
    $stmt = $conn->prepare("SELECT id, email, first_name, last_name FROM user LIMIT 5");
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 4. Check farmers
    $stmt = $conn->prepare("SELECT f.id, f.user_id, f.farm_name, u.email FROM farmer f JOIN user u ON f.user_id = u.id");
    $stmt->execute();
    $farmers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 5. Check categories
    $stmt = $conn->prepare("SELECT id, name FROM category LIMIT 5");
    $stmt->execute();
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 6. Check units
    $stmt = $conn->prepare("SELECT id, name FROM unit_of_measure LIMIT 5");
    $stmt->execute();
    $units = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 7. Check sessions
    $stmt = $conn->prepare("SELECT s.id, s.user_id, u.email, s.expires_at FROM user_session s JOIN user u ON s.user_id = u.id LIMIT 5");
    $stmt->execute();
    $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 8. Try to validate incoming token
    $token = null;
    $validated_user = null;
    $auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    
    if (!empty($auth_header)) {
        $token = str_replace('Bearer ', '', $auth_header);
        
        // Check if token exists in database
        $stmt = $conn->prepare("
            SELECT s.user_id, u.email, r.role_name, u.first_name, u.last_name
            FROM user_session s
            JOIN user u ON s.user_id = u.id
            JOIN user_role r ON u.role_id = r.id
            WHERE s.token = ? AND s.expires_at > NOW() AND u.is_active = TRUE
        ");
        $stmt->execute([$token]);
        $validated_user = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    jsonResponse([
        'success' => true,
        'debug' => [
            'database' => [
                'existing_tables' => $existing_tables,
                'required_tables' => ['user', 'user_session', 'farmer', 'product', 'category', 'unit_of_measure'],
                'missing_tables' => array_diff(['user', 'user_session', 'farmer', 'product', 'category', 'unit_of_measure'], $existing_tables)
            ],
            'roles' => $roles,
            'users_count' => count($users),
            'users_sample' => $users,
            'farmers' => $farmers,
            'categories' => $categories,
            'units' => $units,
            'sessions_count' => count($sessions),
            'sessions_sample' => $sessions,
            'auth' => [
                'token_provided' => !empty($token),
                'token' => $token ? substr($token, 0, 10) . '...' : 'none',
                'token_valid' => $validated_user !== null,
                'validated_user' => $validated_user
            ]
        ]
    ]);
    
} catch (Exception $e) {
    jsonResponse([
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], 500);
}
?>
