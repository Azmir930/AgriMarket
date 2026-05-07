<?php
require_once 'config/database.php';
require_once 'config/helpers.php';

header('Content-Type: application/json');

$headers = getallheaders();
$auth_header = $headers['Authorization'] ?? '';
$token = str_replace('Bearer ', '', $auth_header);

if (empty($token)) {
    echo json_encode(['error' => 'No token']);
    exit;
}

try {
    $database = new Database();
    $conn = $database->getConnection();

    // Step 1: Check if session exists
    $stmt = $conn->prepare("SELECT * FROM user_session WHERE token = ?");
    $stmt->execute([$token]);
    $session_row = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Step 1 - Session lookup: " . json_encode($session_row ? 'Found' : 'Not found') . "\n";
    
    if (!$session_row) {
        echo json_encode(['error' => 'Token not in database']);
        exit;
    }
    
    // Step 2: Check expiry
    $expires_at = $session_row['expires_at'];
    $user_id = $session_row['user_id'];
    echo "Step 2 - Expires at: $expires_at\n";
    
    $stmt = $conn->prepare("SELECT user_id FROM user_session WHERE token = ? AND expires_at > NOW()");
    $stmt->execute([$token]);
    $valid_session = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Step 3 - Not expired: " . json_encode($valid_session ? 'Yes' : 'No') . "\n";
    
    // Step 3: Try the full join
    $stmt = $conn->prepare("
        SELECT s.user_id, u.email, r.role_name, u.first_name, u.last_name
        FROM user_session s
        JOIN user u ON s.user_id = u.id
        JOIN user_role r ON u.role_id = r.id
        WHERE s.token = ? AND s.expires_at > NOW() AND u.is_active = TRUE
    ");
    $stmt->execute([$token]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Step 4 - Full join: " . json_encode($result ? 'Success' : 'Failed') . "\n\n";
    
    if ($result) {
        echo "Final result:\n";
        echo json_encode($result, JSON_PRETTY_PRINT);
    } else {
        echo json_encode(['error' => 'Join failed']);
        
        // Debug: check each table individually
        $stmt = $conn->prepare("SELECT COUNT(*) as cnt FROM user WHERE id = ?");
        $stmt->execute([$user_id]);
        $user_check = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "\n\nUser exists: " . $user_check['cnt'];
        
        $stmt = $conn->prepare("SELECT role_id, is_active FROM user WHERE id = ?");
        $stmt->execute([$user_id]);
        $user_data = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "\nUser data: " . json_encode($user_data);
        
        $stmt = $conn->prepare("SELECT * FROM user_role WHERE id = ?");
        $stmt->execute([$user_data['role_id']]);
        $role = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "\nRole exists: " . json_encode($role ? 'Yes' : 'No');
    }
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
