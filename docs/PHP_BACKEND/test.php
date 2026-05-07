<?php
/**
 * Simple Test Endpoint - Check if PHP is working
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: *');

// Very simple response
$response = [
    'status' => 'ok',
    'message' => 'PHP is working!',
    'timestamp' => date('Y-m-d H:i:s'),
    'php_version' => phpversion(),
    'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
];

echo json_encode($response, JSON_PRETTY_PRINT);
?>
