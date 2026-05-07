<?php
/**
 * Comprehensive KYC Testing Script
 */

echo "=== KYC VERIFICATION SYSTEM TEST ===\n\n";

// Test 1: Database Connection
echo "TEST 1: Database Connection\n";
echo str_repeat("-", 50) . "\n";
require_once 'docs/PHP_BACKEND/config/database.php';

try {
    $db = new Database();
    $conn = $db->getConnection();
    echo "✓ Database connection successful\n\n";
} catch (Exception $e) {
    echo "✗ Database connection failed: " . $e->getMessage() . "\n\n";
    die("Cannot continue without database\n");
}

// Test 2: Check Users in Database
echo "TEST 2: Check Users in Database\n";
echo str_repeat("-", 50) . "\n";
try {
    $stmt = $conn->query('SELECT COUNT(*) as cnt FROM user');
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $userCount = $result['cnt'];
    echo "Total users in database: $userCount\n";
    
    if ($userCount > 0) {
        echo "\nFirst 5 users:\n";
        $stmt = $conn->query('SELECT id, email, role_id FROM user LIMIT 5');
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($users as $user) {
            echo "  - ID: {$user['id']}, Email: {$user['email']}, Role ID: {$user['role_id']}\n";
        }
    }
    echo "\n";
} catch (Exception $e) {
    echo "✗ Error checking users: " . $e->getMessage() . "\n\n";
}

// Test 3: Check Admin Users
echo "TEST 3: Check Admin Users\n";
echo str_repeat("-", 50) . "\n";
try {
    $stmt = $conn->prepare('
        SELECT u.id, u.email, r.role_name 
        FROM user u 
        JOIN user_role r ON u.role_id = r.id 
        WHERE r.role_name = ?
    ');
    $stmt->execute(['admin']);
    $admins = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Admin users found: " . count($admins) . "\n";
    foreach ($admins as $admin) {
        echo "  - ID: {$admin['id']}, Email: {$admin['email']}\n";
    }
    echo "\n";
} catch (Exception $e) {
    echo "✗ Error checking admins: " . $e->getMessage() . "\n\n";
}

// Test 4: Check KYC Verification Table
echo "TEST 4: Check KYC Verification Table\n";
echo str_repeat("-", 50) . "\n";
try {
    $stmt = $conn->query('SELECT COUNT(*) as cnt FROM kyc_verification');
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Total KYC records: " . $result['cnt'] . "\n";
    
    $stmt = $conn->query('DESCRIBE kyc_verification');
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "\nKYC table structure:\n";
    foreach ($columns as $col) {
        echo "  - {$col['Field']}: {$col['Type']}\n";
    }
    echo "\n";
} catch (Exception $e) {
    echo "✗ Error checking KYC table: " . $e->getMessage() . "\n\n";
}

// Test 5: Check User Sessions
echo "TEST 5: Check Active Sessions\n";
echo str_repeat("-", 50) . "\n";
try {
    $stmt = $conn->query('
        SELECT COUNT(*) as cnt FROM user_session 
        WHERE expires_at > NOW()
    ');
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Active sessions: " . $result['cnt'] . "\n";
    
    $stmt = $conn->query('
        SELECT us.user_id, u.email, us.token, us.expires_at 
        FROM user_session us 
        JOIN user u ON us.user_id = u.id 
        WHERE us.expires_at > NOW() 
        LIMIT 3
    ');
    $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (count($sessions) > 0) {
        echo "\nActive session tokens (first 3):\n";
        foreach ($sessions as $session) {
            echo "  - User: {$session['email']}\n";
            echo "    Token: " . substr($session['token'], 0, 50) . "...\n";
            echo "    Expires: {$session['expires_at']}\n";
        }
    }
    echo "\n";
} catch (Exception $e) {
    echo "✗ Error checking sessions: " . $e->getMessage() . "\n\n";
}

// Test 6: Test KYC Endpoint Logic
echo "TEST 6: Simulate KYC Update Logic\n";
echo str_repeat("-", 50) . "\n";

// Get first user
try {
    $stmt = $conn->query('SELECT id FROM user LIMIT 1');
    $firstUser = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($firstUser) {
        $testUserId = $firstUser['id'];
        echo "Testing with user ID: $testUserId\n";
        
        // Simulate the KYC update
        require_once 'docs/PHP_BACKEND/config/helpers.php';
        
        $kyc_id = generateUUID();
        $status = 'verified';
        
        echo "\nAttempting to insert/update KYC:\n";
        echo "  - KYC ID: $kyc_id\n";
        echo "  - User ID: $testUserId\n";
        echo "  - Status: $status\n";
        
        $stmt = $conn->prepare("
            INSERT INTO kyc_verification (id, user_id, document_type, document_number, status, verified_at, created_at)
            VALUES (?, ?, 'admin_verified', 'admin_approval', ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE 
                status = VALUES(status),
                verified_at = NOW()
        ");
        
        $result = $stmt->execute([$kyc_id, $testUserId, $status]);
        
        if ($result) {
            echo "\n✓ KYC update successful\n";
            
            // Verify the update
            $stmt = $conn->prepare('SELECT * FROM kyc_verification WHERE user_id = ?');
            $stmt->execute([$testUserId]);
            $kycRecord = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($kycRecord) {
                echo "\nKYC Record in database:\n";
                foreach ($kycRecord as $key => $value) {
                    echo "  - $key: $value\n";
                }
            }
        } else {
            echo "\n✗ KYC update failed\n";
        }
    } else {
        echo "✗ No users found in database\n";
    }
    echo "\n";
} catch (Exception $e) {
    echo "✗ Error during KYC test: " . $e->getMessage() . "\n\n";
}

// Test 7: Test Activity Log
echo "TEST 7: Test Activity Log Insert\n";
echo str_repeat("-", 50) . "\n";
try {
    $stmt = $conn->query('SELECT id FROM user LIMIT 1');
    $firstUser = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($firstUser) {
        $testUserId = $firstUser['id'];
        
        $stmt = $conn->prepare("
            INSERT INTO user_activity_log (id, user_id, activity_type, description)
            VALUES (?, ?, 'kyc_update_test', 'Test KYC update entry')
        ");
        
        $result = $stmt->execute([generateUUID(), $testUserId]);
        echo "Activity log insert: " . ($result ? "✓ Success" : "✗ Failed") . "\n";
    }
    echo "\n";
} catch (Exception $e) {
    echo "✗ Error testing activity log: " . $e->getMessage() . "\n\n";
}

echo "=== TEST SUMMARY ===\n";
echo "Database: Connected\n";
echo "Ready to test KYC endpoint\n";
echo "\nTo test the actual endpoint:\n";
echo "1. Get a valid admin token from your application\n";
echo "2. Make a POST request to: http://localhost/PHP_BACKEND/admin/kyc_verification.php\n";
echo "3. Include Authorization header: Bearer <token>\n";
echo "4. Send JSON body: {\"user_id\": \"<id>\", \"status\": \"verified\"}\n";
?>
