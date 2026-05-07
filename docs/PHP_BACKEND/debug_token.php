<?php
require_once 'config/database.php';
require_once 'config/helpers.php';
require_once 'auth/middleware.php';

header('Content-Type: application/json');

// Get the token from header
$headers = getallheaders();
$auth_header = $headers['Authorization'] ?? '';
$token = str_replace('Bearer ', '', $auth_header);

echo json_encode([
    'token_received' => !empty($token),
    'token_length' => strlen($token ?? ''),
    'auth_header' => substr($auth_header, 0, 20) . '...',
    'all_headers' => array_keys($headers),
]);

// Try to validate
$user = validateToken();
echo "\nValidation result: " . json_encode($user ?? ['error' => 'No user found']);

// Query database directly
try {
    $database = new Database();
    $conn = $database->getConnection();
    
    if ($token) {
        $stmt = $conn->prepare("SELECT * FROM user_session WHERE token = ?");
        $stmt->execute([$token]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "\nDatabase session: " . json_encode($session ?? ['error' => 'Not found']);
    }
    
    // Show all sessions
    $stmt = $conn->prepare("SELECT id, user_id, token, expires_at FROM user_session ORDER BY created_at DESC LIMIT 3");
    $stmt->execute();
    $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "\nRecent sessions: " . json_encode($sessions);
    
} catch (Exception $e) {
    echo "\nDB Error: " . $e->getMessage();
}
?>
