<?php
/**
 * User Registration API
 * Agriculture Product Marketplace
 * Note: This endpoint is deprecated. Use /auth/register.php instead.
 * Kept for backward compatibility.
 */

header('Content-Type: application/json');
require_once '../config/database.php';
require_once '../config/helpers.php';
require_once '../config/session.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

// Get POST data
$raw_data = file_get_contents("php://input");
if (empty($raw_data)) {
    jsonResponse(['error' => 'No data provided'], 400);
}

$data = json_decode($raw_data, true);
if ($data === null) {
    jsonResponse(['error' => 'Invalid JSON'], 400);
}

// Validate input
$errors = [];
if (empty($data['full_name'])) $errors[] = 'Full name is required';
if (empty($data['email'])) $errors[] = 'Email is required';
if (empty($data['phone'])) $errors[] = 'Phone is required';
if (empty($data['password'])) $errors[] = 'Password is required';
if (empty($data['account_type'])) $errors[] = 'Account type is required';

if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Invalid email format';
}

if (count($errors) > 0) {
    echo json_encode(['status' => false, 'message' => implode(', ', $errors)]);
    exit;
}

// Connect to database
$database = new Database();
$conn = $database->getConnection();

if (!$conn) {
    echo json_encode(['status' => false, 'message' => 'Database connection failed']);
    exit;
}

try {
    // Check if email already exists
    $check_query = "SELECT id FROM users WHERE email = ?";
    $stmt = $conn->prepare($check_query);
    $stmt->execute([$data['email']]);
    
    if ($stmt->rowCount() > 0) {
        echo json_encode(['status' => false, 'message' => 'Email already registered']);
        exit;
    }

    // Hash password
    $hashed_password = password_hash($data['password'], PASSWORD_BCRYPT);

    // Insert user
    $insert_query = "INSERT INTO users (full_name, email, phone, password, account_type, created_at) 
                     VALUES (?, ?, ?, ?, ?, NOW())";
    $stmt = $conn->prepare($insert_query);
    $stmt->execute([
        $data['full_name'],
        $data['email'],
        $data['phone'],
        $hashed_password,
        $data['account_type']
    ]);

    echo json_encode(['status' => true, 'message' => 'Registration successful']);
} catch (PDOException $e) {
    error_log("Registration Error: " . $e->getMessage());
    echo json_encode(['status' => false, 'message' => 'Registration failed. Please try again.']);
}
?>
