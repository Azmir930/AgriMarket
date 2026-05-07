<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

header('Content-Type: application/json');

try {
    // Log the request
    file_put_contents('C:/xampp/htdocs/PHP_BACKEND/register_debug.log', 
        date('Y-m-d H:i:s') . " - POST data: " . file_get_contents("php://input") . "\n", 
        FILE_APPEND);
    
    require_once '../config/database.php';
    require_once '../config/helpers.php';
    require_once '../config/session.php';
    
    setCorsHeaders();
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }
    
    $raw_data = file_get_contents("php://input");
    if (empty($raw_data)) {
        jsonResponse(['error' => 'No data provided'], 400);
    }
    
    $data = json_decode($raw_data, true);
    if ($data === null) {
        jsonResponse(['error' => 'Invalid JSON'], 400);
    }
    
    jsonResponse(['success' => true, 'message' => 'Data received', 'data' => $data]);
    
} catch (Exception $e) {
    error_log("Register error: " . $e->getMessage());
    jsonResponse(['error' => 'Server error: ' . $e->getMessage()], 500);
}
?>
