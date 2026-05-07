<?php
require_once 'config/database.php';

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    // Get current time
    $stmt = $conn->prepare("SELECT NOW() as now_time");
    $stmt->execute();
    $time_result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Current DB time: " . json_encode($time_result) . "\n\n";
    
    // Check a session with time comparison
    $stmt = $conn->prepare("
        SELECT id, user_id, token, expires_at, 
               NOW() as current_time,
               expires_at > NOW() as is_valid
        FROM user_session
        LIMIT 1
    ");
    $stmt->execute();
    $session = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Session time check: " . json_encode($session) . "\n\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
