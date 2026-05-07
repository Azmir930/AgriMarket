<?php
/**
 * Create test admin and get token
 */
require_once 'docs/PHP_BACKEND/config/database.php';
require_once 'docs/PHP_BACKEND/config/helpers.php';

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    // Check if admin role exists
    $stmt = $conn->query("SELECT id FROM user_role WHERE role_name = 'admin'");
    $adminRole = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$adminRole) {
        echo "Creating admin role...\n";
        $stmt = $conn->prepare("INSERT INTO user_role (id, role_name) VALUES (?, ?)");
        $stmt->execute([generateUUID(), 'admin']);
        $stmt = $conn->query("SELECT id FROM user_role WHERE role_name = 'admin'");
        $adminRole = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    $adminRoleId = $adminRole['id'];
    echo "Admin role ID: $adminRoleId\n\n";
    
    // Check if admin user exists
    $stmt = $conn->prepare("SELECT id FROM user WHERE email = ?");
    $stmt->execute(['admin@test.com']);
    $adminUser = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $testEmail = 'admin@test.com';
    $testPassword = 'admin123';
    
    if (!$adminUser) {
        echo "Creating admin user...\n";
        $userId = generateUUID();
        $passwordHash = password_hash($testPassword, PASSWORD_BCRYPT);
        
        $stmt = $conn->prepare("
            INSERT INTO user (id, email, first_name, last_name, password_hash, role_id, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$userId, $testEmail, 'Test', 'Admin', $passwordHash, $adminRoleId, 1]);
        echo "Admin user created with ID: $userId\n";
    } else {
        $userId = $adminUser['id'];
        echo "Admin user already exists: $userId\n";
    }
    
    echo "\nTest admin credentials:\n";
    echo "Email: $testEmail\n";
    echo "Password: $testPassword\n";
    
    // Now try to login
    echo "\n\nAttempting login...\n";
    $stmt = $conn->prepare("
        SELECT u.id, u.email, r.role_name
        FROM user u
        JOIN user_role r ON u.role_id = r.id
        WHERE u.email = ?
    ");
    $stmt->execute([$testEmail]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        echo "User not found after creation!\n";
        exit;
    }
    
    echo "✓ User found: " . json_encode($user) . "\n";
    
    // Verify password
    $stmt = $conn->prepare("SELECT password_hash FROM user WHERE email = ?");
    $stmt->execute([$testEmail]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (password_verify($testPassword, $result['password_hash'])) {
        echo "✓ Password verification passed\n";
    } else {
        echo "✗ Password verification failed\n";
    }
    
    // Create session token
    echo "\nCreating session token...\n";
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', time() + 3600);
    
    $stmt = $conn->prepare("
        INSERT INTO user_session (id, user_id, token, expires_at)
        VALUES (?, ?, ?, ?)
    ");
    $stmt->execute([generateUUID(), $user['id'], $token, $expiresAt]);
    
    echo "✓ Session token created: $token\n";
    echo "✓ Expires at: $expiresAt\n";
    
    echo "\n=== USE THIS TOKEN TO TEST KYC ENDPOINT ===\n";
    echo "Token: $token\n";
    echo "User ID: " . $user['id'] . "\n";
    echo "Role: " . $user['role_name'] . "\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
