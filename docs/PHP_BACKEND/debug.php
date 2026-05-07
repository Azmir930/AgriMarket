<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "Test 1: Helpers\n";
require_once __DIR__ . '/config/helpers.php';
echo "Helpers loaded\n";

echo "Test 2: Database\n";
require_once __DIR__ . '/config/database.php';
echo "Database loaded\n";

echo "Test 3: Session\n";
require_once __DIR__ . '/config/session.php';
echo "Session loaded\n";

echo "Test 4: CORS\n";
setCorsHeaders();
echo "CORS headers set\n";

echo "Test 5: POST data\n";
$raw_data = file_get_contents("php://input");
echo "Raw data: " . ($raw_data ? "Received" : "Empty") . "\n";

if ($raw_data) {
    $data = json_decode($raw_data, true);
    echo "JSON decoded: " . json_encode($data) . "\n";
}

echo "All tests passed!";
?>
