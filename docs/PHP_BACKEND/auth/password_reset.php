<?php
/**
 * Password Reset Request & Confirmation
 * Agriculture Product Marketplace
 */

require_once '../config/database.php';
require_once '../config/helpers.php';
require_once '../config/session.php';

setCorsHeaders();

$data = json_decode(file_get_contents("php://input"), true);
$action = $data['action'] ?? 'request';

try {
    $database = new Database();
    $conn = $database->getConnection();

    if ($action === 'request') {
        // Request password reset
        $email = sanitize($data['email'] ?? '');
        
        if (empty($email) || !isValidEmail($email)) {
            jsonResponse(['error' => 'Valid email is required'], 400);
        }

        // Check if user exists
        $stmt = $conn->prepare("SELECT id, first_name FROM User WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            // Don't reveal if email exists
            jsonResponse(['success' => true, 'message' => 'If email exists, reset link will be sent']);
        }

        // Generate reset token
        $token = bin2hex(random_bytes(32));
        $expires_at = date('Y-m-d H:i:s', strtotime('+1 hour'));

        // Invalidate previous tokens
        $stmt = $conn->prepare("UPDATE Password_Reset SET is_used = TRUE WHERE user_id = ? AND is_used = FALSE");
        $stmt->execute([$user['id']]);

        // Create new reset token
        $stmt = $conn->prepare("
            INSERT INTO Password_Reset (id, user_id, token, expires_at) 
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([generateUUID(), $user['id'], $token, $expires_at]);

        // In production, send email here
        // mail($email, "Password Reset", "Click here to reset: https://yoursite.com/reset?token=$token");

        // Log activity
        $stmt = $conn->prepare("
            INSERT INTO User_Activity_Log (id, user_id, activity_type, description) 
            VALUES (?, ?, 'password_reset_request', 'Password reset requested')
        ");
        $stmt->execute([generateUUID(), $user['id']]);

        jsonResponse([
            'success' => true,
            'message' => 'If email exists, reset link will be sent',
            // Only include token in development
            'debug_token' => $token
        ]);

    } elseif ($action === 'reset') {
        // Reset password with token
        $token = sanitize($data['token'] ?? '');
        $new_password = $data['new_password'] ?? '';
        $confirm_password = $data['confirm_password'] ?? '';

        if (empty($token)) {
            jsonResponse(['error' => 'Reset token is required'], 400);
        }
        if (strlen($new_password) < 8) {
            jsonResponse(['error' => 'Password must be at least 8 characters'], 400);
        }
        if ($new_password !== $confirm_password) {
            jsonResponse(['error' => 'Passwords do not match'], 400);
        }

        // Verify token
        $stmt = $conn->prepare("
            SELECT pr.id, pr.user_id 
            FROM Password_Reset pr
            WHERE pr.token = ? AND pr.is_used = FALSE AND pr.expires_at > NOW()
        ");
        $stmt->execute([$token]);
        $reset = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$reset) {
            jsonResponse(['error' => 'Invalid or expired token'], 400);
        }

        // Begin transaction
        $conn->beginTransaction();

        // Update password
        $password_hash = password_hash($new_password, PASSWORD_BCRYPT, ['cost' => 12]);
        $stmt = $conn->prepare("UPDATE User SET password_hash = ? WHERE id = ?");
        $stmt->execute([$password_hash, $reset['user_id']]);

        // Mark token as used
        $stmt = $conn->prepare("UPDATE Password_Reset SET is_used = TRUE WHERE id = ?");
        $stmt->execute([$reset['id']]);

        // Invalidate all sessions
        $stmt = $conn->prepare("DELETE FROM User_Session WHERE user_id = ?");
        $stmt->execute([$reset['user_id']]);

        // Log activity
        $stmt = $conn->prepare("
            INSERT INTO User_Activity_Log (id, user_id, activity_type, description) 
            VALUES (?, ?, 'password_reset', 'Password was reset')
        ");
        $stmt->execute([generateUUID(), $reset['user_id']]);

        $conn->commit();

        jsonResponse([
            'success' => true,
            'message' => 'Password reset successful. Please login with your new password.'
        ]);
    }

} catch (Exception $e) {
    if (isset($conn)) {
        $conn->rollBack();
    }
    jsonResponse(['error' => 'Password reset failed: ' . $e->getMessage()], 500);
}
?>
