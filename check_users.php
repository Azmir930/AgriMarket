<?php
require_once 'docs/PHP_BACKEND/config/database.php';
try {
    $db = new Database();
    $conn = $db->getConnection();
    $stmt = $conn->query('SELECT id, email FROM user LIMIT 5');
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Users in database:\n";
    foreach($users as $user) {
        echo "  ID: " . $user['id'] . ", Email: " . $user['email'] . "\n";
    }
    echo "\n\nTotal users: ";
    $countStmt = $conn->query('SELECT COUNT(*) as cnt FROM user');
    $result = $countStmt->fetch(PDO::FETCH_ASSOC);
    echo $result['cnt'];
} catch(Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
