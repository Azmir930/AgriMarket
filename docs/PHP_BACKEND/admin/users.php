<?php
/**
 * Admin User Management
 * Agriculture Product Marketplace
 */

require_once '../config/database.php';
require_once '../config/helpers.php';
require_once '../auth/middleware.php';

setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];

try {
    $user = requireApiRole('admin');
    $database = new Database();
    $conn = $database->getConnection();

    switch ($method) {
        case 'GET':
            $page = intval($_GET['page'] ?? 1);
            $limit = intval($_GET['limit'] ?? 20);
            $search = sanitize($_GET['search'] ?? '');
            $role = sanitize($_GET['role'] ?? '');
            $status = $_GET['status'] ?? '';
            $user_id = sanitize($_GET['id'] ?? '');

            // Single user view
            if ($user_id) {
                $stmt = $conn->prepare("
                    SELECT u.*, r.role_name,
                           CASE 
                               WHEN r.role_name = 'farmer' THEN (SELECT farm_name FROM farmer WHERE user_id = u.id)
                               ELSE NULL
                           END as farm_name,
                           (SELECT kyc.status FROM kyc_verification kyc WHERE kyc.user_id = u.id ORDER BY kyc.created_at DESC LIMIT 1) as kyc_status
                    FROM user u
                    JOIN user_role r ON u.role_id = r.id
                    WHERE u.id = ?
                ");
                $stmt->execute([$user_id]);
                $user_data = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$user_data) {
                    jsonResponse(['error' => 'User not found'], 404);
                }

                // Get addresses
                $stmt = $conn->prepare("SELECT * FROM address WHERE user_id = ?");
                $stmt->execute([$user_id]);
                $user_data['addresses'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Get activity logs
                $stmt = $conn->prepare("
                    SELECT * FROM user_activity_log 
                    WHERE user_id = ? 
                    ORDER BY created_at DESC 
                    LIMIT 20
                ");
                $stmt->execute([$user_id]);
                $user_data['recent_activity'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Remove sensitive data
                unset($user_data['password_hash']);

                jsonResponse(['success' => true, 'data' => $user_data]);
            }

            // User listing
            $where = "WHERE 1=1";
            $params = [];

            if ($search) {
                $where .= " AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)";
                $params[] = "%$search%";
                $params[] = "%$search%";
                $params[] = "%$search%";
                $params[] = "%$search%";
            }

            if ($role) {
                $where .= " AND r.role_name = ?";
                $params[] = $role;
            }

            if ($status !== '') {
                $where .= " AND u.is_active = ?";
                $params[] = $status === 'active' ? 1 : 0;
            }

            // Get total count
            $stmt = $conn->prepare("
                SELECT COUNT(*) as total 
                FROM user u
                JOIN user_role r ON u.role_id = r.id
                $where
            ");
            $stmt->execute($params);
            $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            $pagination = getPagination($page, $limit, $total);

            // Get users with literal LIMIT/OFFSET to avoid binding issue
            $limitInt = intval($limit);
            $offsetInt = intval($pagination['offset']);

            $stmt = $conn->prepare("
                SELECT u.id, u.first_name, u.last_name, u.email, u.phone, 
                       u.is_active, u.created_at, u.updated_at, r.role_name
                FROM user u
                JOIN user_role r ON u.role_id = r.id
                $where
                ORDER BY u.created_at DESC
                LIMIT $limitInt OFFSET $offsetInt
            ");
            $stmt->execute($params);
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

            jsonResponse([
                'success' => true,
                'data' => $users,
                'pagination' => $pagination
            ]);
            break;

        case 'PUT':
            // Update user
            $data = json_decode(file_get_contents("php://input"), true);
            $user_id = sanitize($data['id'] ?? $_GET['id'] ?? '');

            if (empty($user_id)) {
                jsonResponse(['error' => 'User ID is required'], 400);
            }

            // Verify user exists
            $stmt = $conn->prepare("SELECT id FROM user WHERE id = ?");
            $stmt->execute([$user_id]);
            
            if ($stmt->rowCount() === 0) {
                jsonResponse(['error' => 'User not found'], 404);
            }

            $updates = [];
            $params = [];

            $allowed_fields = ['first_name', 'last_name', 'phone'];
            foreach ($allowed_fields as $field) {
                if (isset($data[$field])) {
                    $updates[] = "$field = ?";
                    $params[] = sanitize($data[$field]);
                }
            }

            if (isset($data['is_active'])) {
                $updates[] = "is_active = ?";
                $params[] = (bool)$data['is_active'];
            }

            if (empty($updates)) {
                jsonResponse(['error' => 'No fields to update'], 400);
            }

            $updates[] = "updated_at = NOW()";
            $params[] = $user_id;

            $stmt = $conn->prepare("UPDATE User SET " . implode(', ', $updates) . " WHERE id = ?");
            $stmt->execute($params);

            // Log activity
            $stmt = $conn->prepare("
                INSERT INTO User_Activity_Log (id, user_id, activity_type, description) 
                VALUES (?, ?, 'admin_update', 'User updated by admin')
            ");
            $stmt->execute([generateUUID(), $user_id]);

            jsonResponse([
                'success' => true,
                'message' => 'User updated successfully'
            ]);
            break;

        case 'DELETE':
            // Deactivate user (soft delete)
            $user_id = sanitize($_GET['id'] ?? '');

            if (empty($user_id)) {
                jsonResponse(['error' => 'User ID is required'], 400);
            }

            // Don't allow deleting yourself
            if ($user_id === $user['user_id']) {
                jsonResponse(['error' => 'Cannot deactivate your own account'], 400);
            }

            $stmt = $conn->prepare("UPDATE User SET is_active = FALSE, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$user_id]);

            // Invalidate sessions
            $stmt = $conn->prepare("DELETE FROM User_Session WHERE user_id = ?");
            $stmt->execute([$user_id]);

            jsonResponse([
                'success' => true,
                'message' => 'User deactivated successfully'
            ]);
            break;

        default:
            jsonResponse(['error' => 'Method not allowed'], 405);
    }

} catch (Exception $e) {
    jsonResponse(['error' => 'Operation failed: ' . $e->getMessage()], 500);
}
?>
