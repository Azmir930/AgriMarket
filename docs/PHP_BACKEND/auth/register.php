<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

/**
 * User Registration
 * Agriculture Product Marketplace
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

$first_name = sanitize($data['first_name'] ?? '');
$last_name = sanitize($data['last_name'] ?? '');
$email = sanitize($data['email'] ?? '');
$phone = sanitize($data['phone'] ?? '');
$password = $data['password'] ?? '';
$confirm_password = $data['confirm_password'] ?? '';
$role = sanitize($data['role'] ?? 'buyer'); // Default role is buyer

// Validation
$errors = [];

if (empty($first_name)) $errors[] = 'First name is required';
if (empty($last_name)) $errors[] = 'Last name is required';
if (empty($email) || !isValidEmail($email)) $errors[] = 'Valid email is required';
if (empty($phone) || !isValidPhone($phone)) $errors[] = 'Valid phone number is required';
if (strlen($password) < 8) $errors[] = 'Password must be at least 8 characters';
if ($password !== $confirm_password) $errors[] = 'Passwords do not match';
if (!in_array($role, ['farmer', 'buyer'])) $errors[] = 'Invalid role'; // Admin created manually

if (!empty($errors)) {
    jsonResponse(['error' => 'Validation failed', 'details' => $errors], 400);
}

try {
    $database = new Database();
    $conn = $database->getConnection();

    // Check if email already exists
    $stmt = $conn->prepare("SELECT id FROM user WHERE email = ?");
    $stmt->execute([$email]);
    
    if ($stmt->rowCount() > 0) {
        jsonResponse(['error' => 'Email already registered'], 409);
    }

    // Check if phone already exists
    $stmt = $conn->prepare("SELECT id FROM user WHERE phone = ?");
    $stmt->execute([$phone]);
    
    if ($stmt->rowCount() > 0) {
        jsonResponse(['error' => 'Phone number already registered'], 409);
    }

    // Begin transaction
    $conn->beginTransaction();

    // Get role ID
    $stmt = $conn->prepare("SELECT id FROM user_role WHERE role_name = ?");
    $stmt->execute([$role]);
    $role_row = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$role_row) {
        throw new Exception("Invalid role");
    }

    // Hash password
    $password_hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

    // Create user
    $user_id = generateUUID();
    $stmt = $conn->prepare("
        INSERT INTO user (id, role_id, first_name, last_name, email, phone, password_hash) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$user_id, $role_row['id'], $first_name, $last_name, $email, $phone, $password_hash]);

    // Create role-specific profile
    if ($role === 'farmer') {
        $farm_name = sanitize($data['farm_name'] ?? $first_name . "'s Farm");
        $stmt = $conn->prepare("
            INSERT INTO farmer (id, user_id, farm_name) 
            VALUES (?, ?, ?)
        ");
        $stmt->execute([generateUUID(), $user_id, $farm_name]);
    } else {
        $stmt = $conn->prepare("
            INSERT INTO buyer (id, user_id) 
            VALUES (?, ?)
        ");
        $stmt->execute([generateUUID(), $user_id]);
    }

    // Log activity
    $stmt = $conn->prepare("
        INSERT INTO user_activity_log (id, user_id, activity_type, description) 
        VALUES (?, ?, 'registration', 'User registered successfully')
    ");
    $stmt->execute([generateUUID(), $user_id]);

    // Create session token for auto-login
    $session_id = generateUUID();
    $token = bin2hex(random_bytes(32));
    $expires_at = date('Y-m-d H:i:s', strtotime('+24 hours'));

    $stmt = $conn->prepare("
        INSERT INTO user_session (id, user_id, token, expires_at, ip_address, user_agent) 
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $session_id, 
        $user_id, 
        $token, 
        $expires_at,
        $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
    ]);

    $conn->commit();

    jsonResponse([
        'success' => true,
        'message' => 'Registration successful',
        'data' => [
            'token' => $token,
            'user' => [
                'id' => $user_id,
                'email' => $email,
                'first_name' => $first_name,
                'last_name' => $last_name,
                'role_name' => $role
            ]
        ]
    ], 201);

} catch (Exception $e) {
    if (isset($conn)) {
        try {
            $conn->rollBack();
        } catch (Exception $rb_error) {
            // Rollback failed, continue
        }
    }
    error_log("Registration Error: " . $e->getMessage());
    jsonResponse(['error' => 'Registration failed: ' . $e->getMessage()], 500);
}
?>
