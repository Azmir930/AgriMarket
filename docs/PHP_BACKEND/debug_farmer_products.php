<?php
/**
 * Debug Farmer Products Endpoint
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config/database.php';
require_once 'config/helpers.php';

try {
    $database = new Database();
    $conn = $database->getConnection();

    echo "=== Database Connection Test ===\n";
    echo "Connected: " . ($conn ? "YES" : "NO") . "\n\n";

    // Test farmer table exists
    echo "=== Farmer Table Test ===\n";
    $stmt = $conn->query("SHOW TABLES LIKE 'farmer'");
    $result = $stmt->fetchAll();
    echo "Farmer table exists: " . (count($result) > 0 ? "YES" : "NO") . "\n";
    if (count($result) > 0) {
        print_r($result);
    }

    // Test farmer table columns
    echo "\n=== Farmer Table Columns ===\n";
    $stmt = $conn->query("DESCRIBE farmer");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($columns as $col) {
        echo "- {$col['Field']}: {$col['Type']}\n";
    }

    // Test querying farmer table
    echo "\n=== Test Query ===\n";
    $stmt = $conn->prepare("SELECT * FROM farmer LIMIT 1");
    $stmt->execute();
    $farmer = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($farmer) {
        echo "Query successful!\n";
        echo "First farmer ID: " . $farmer['id'] . "\n";
    } else {
        echo "No farmers in database\n";
    }

    // Test with specific user_id
    echo "\n=== Test with User ID ===\n";
    $test_user_id = 'test-user-123';
    $stmt = $conn->prepare("SELECT id FROM farmer WHERE user_id = ?");
    $stmt->execute([$test_user_id]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Query with user_id '$test_user_id': " . ($result ? "Found" : "Not found") . "\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}
?>
