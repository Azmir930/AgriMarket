<?php
/**
 * Buyer Address Management
 * Agriculture Product Marketplace
 */

require_once '../config/database.php';
require_once '../config/helpers.php';
require_once '../auth/middleware.php';

setCorsHeaders();

error_log("ADDRESSES: Request method = " . $_SERVER['REQUEST_METHOD']);

try {
    $user = requireApiRole('buyer');
    error_log("ADDRESSES: User authenticated: " . $user['email']);
    
    $database = new Database();
    $conn = $database->getConnection();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get all addresses for user
        error_log("ADDRESSES: Fetching addresses for user_id = " . $user['user_id']);
        
        $query = "SELECT id, user_id, address_type, street, city, state, postal_code, country, is_default 
                  FROM address 
                  WHERE user_id = ? 
                  ORDER BY is_default DESC";
        
        $stmt = $conn->prepare($query);
        $stmt->execute([$user['user_id']]);
        $addresses = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        error_log("ADDRESSES: Found " . count($addresses) . " addresses");
        foreach ($addresses as $addr) {
            error_log("ADDRESSES: ID=" . $addr['id'] . ", street=" . $addr['street'] . ", city=" . $addr['city']);
        }
        jsonResponse(['success' => true, 'addresses' => $addresses], 200);
    }
    
    elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Add new address
        error_log("ADDRESSES: Adding new address");
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        if (empty($data['street']) || empty($data['city']) || empty($data['state']) || empty($data['postal_code'])) {
            error_log("ADDRESSES: Missing required fields");
            jsonResponse(['error' => 'Missing required fields: street, city, state, postal_code'], 400);
        }
        
        $id = bin2hex(random_bytes(16));
        $address_type = $data['address_type'] ?? 'shipping';
        $street = sanitize($data['street']);
        $city = sanitize($data['city']);
        $state = sanitize($data['state']);
        $postal_code = sanitize($data['postal_code']);
        $country = sanitize($data['country'] ?? 'India');
        $is_default = !empty($data['is_default']) ? 1 : 0;
        
        // If setting as default, unset other defaults
        if ($is_default) {
            error_log("ADDRESSES: Setting as default address");
            $update_query = "UPDATE address SET is_default = 0 WHERE user_id = ?";
            $update_stmt = $conn->prepare($update_query);
            $update_stmt->execute([$user['user_id']]);
        }
        
        $query = "INSERT INTO address (id, user_id, address_type, street, city, state, postal_code, country, is_default) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $conn->prepare($query);
        $stmt->execute([
            $id,
            $user['user_id'],
            $address_type,
            $street,
            $city,
            $state,
            $postal_code,
            $country,
            $is_default
        ]);
        
        error_log("ADDRESSES: Address added with ID = " . $id);
        
        // Log activity
        $activity_type = 'address_added';
        $description = "Added new " . $address_type . " address: " . $street . ", " . $city;
        $log_query = "INSERT INTO user_activity_log (user_id, activity_type, description) VALUES (?, ?, ?)";
        $log_stmt = $conn->prepare($log_query);
        $log_stmt->execute([$user['user_id'], $activity_type, $description]);
        
        jsonResponse([
            'success' => true,
            'message' => 'Address added successfully',
            'address' => [
                'id' => $id,
                'user_id' => $user['user_id'],
                'address_type' => $address_type,
                'street' => $street,
                'city' => $city,
                'state' => $state,
                'postal_code' => $postal_code,
                'country' => $country,
                'is_default' => (bool)$is_default
            ]
        ], 201);
    }
    
    else {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }

} catch (Exception $e) {
    error_log("ADDRESSES: Exception - " . $e->getMessage());
    jsonResponse(['error' => $e->getMessage()], 500);
}
