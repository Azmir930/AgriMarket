<?php
require_once 'config/database.php';

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    // Check user
    $user_id = "33adf2e9-86ea-45d4-975f-2da6384ba8a6";
    $stmt = $conn->prepare("SELECT * FROM user WHERE id = ?");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "User: " . json_encode($user) . "\n\n";
    
    // Check farmer
    $stmt = $conn->prepare("SELECT * FROM farmer WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $farmer = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Farmer: " . json_encode($farmer) . "\n\n";
    
    // Check role
    if ($user) {
        $stmt = $conn->prepare("SELECT * FROM user_role WHERE id = ?");
        $stmt->execute([$user['role_id']]);
        $role = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "Role: " . json_encode($role) . "\n\n";
    }
    
    // Test the full join
    $stmt = $conn->prepare("
        SELECT s.user_id, u.email, r.role_name, u.first_name, u.last_name
        FROM user_session s
        JOIN user u ON s.user_id = u.id
        JOIN user_role r ON u.role_id = r.id
        WHERE s.user_id = ?
    ");
    $stmt->execute([$user_id]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Join result: " . json_encode($result);
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
