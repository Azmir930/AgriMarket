<?php
/**
 * Farmer Product Management
 * Agriculture Product Marketplace
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once '../config/database.php';
require_once '../config/helpers.php';
require_once '../config/image_handler.php';
require_once '../auth/middleware.php';

setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];

try {
    $user = requireApiRole('farmer');
    $database = new Database();
    $conn = $database->getConnection();

    // Get farmer ID
    $stmt = $conn->prepare("SELECT id FROM farmer WHERE user_id = ?");
    $stmt->execute([$user['user_id']]);
    $farmer = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$farmer) {
        jsonResponse(['error' => 'Farmer profile not found'], 404);
    }

    $farmer_id = $farmer['id'];

    switch ($method) {
        case 'GET':
            // List farmer's products
            error_log("Products endpoint: GET called by user_id={$user['user_id']}");
                // If specific product id requested, return single product
                if (isset($_GET['id']) && !empty($_GET['id'])) {
                    $pid = sanitize($_GET['id']);
                    $stmt = $conn->prepare("SELECT p.*, c.name as category_name, u.name as unit_name, (SELECT pi.image_url FROM product_image pi WHERE pi.product_id = p.id AND pi.is_primary = TRUE LIMIT 1) as primary_image FROM product p LEFT JOIN category c ON p.category_id = c.id LEFT JOIN unit_of_measure u ON p.unit_id = u.id WHERE p.id = ? AND p.farmer_id = ?");
                try {
                    $stmt->execute([$pid, $farmer_id]);
                    $prod = $stmt->fetch(PDO::FETCH_ASSOC);
                    if (!$prod) jsonResponse(['error' => 'Product not found or access denied'], 404);
                    jsonResponse(['success' => true, 'data' => $prod]);
                } catch (Exception $e) {
                    error_log("Products GET by id error: " . $e->getMessage());
                    jsonResponse(['error' => 'Failed to fetch product', 'details' => $e->getMessage()], 500);
                }
                }

                $page = intval($_GET['page'] ?? 1);
            $limit = intval($_GET['limit'] ?? 10);
            $search = sanitize($_GET['search'] ?? '');
            $category = sanitize($_GET['category'] ?? '');

            $where = "WHERE p.farmer_id = ?";
            $params = [$farmer_id];

            if ($search) {
                $where .= " AND (p.name LIKE ? OR p.description LIKE ?)";
                $params[] = "%$search%";
                $params[] = "%$search%";
            }

            if ($category) {
                $where .= " AND p.category_id = ?";
                $params[] = $category;
            }

            // Get total count
            $countParams = $params;
            $stmt = $conn->prepare("SELECT COUNT(*) as total FROM product p $where");
            $stmt->execute($countParams);
            $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            $pagination = getPagination($page, $limit, $total);

            // Get products with LIMIT and OFFSET as literals (not parameterized)
            $limitInt = intval($limit);
            $offsetInt = intval($pagination['offset']);
            $stmt = $conn->prepare("
                SELECT p.*, c.name as category_name, u.name as unit_name,
                       (SELECT pi.image_url FROM product_image pi WHERE pi.product_id = p.id AND pi.is_primary = TRUE LIMIT 1) as primary_image
                FROM product p
                LEFT JOIN category c ON p.category_id = c.id
                LEFT JOIN unit_of_measure u ON p.unit_id = u.id
                $where
                ORDER BY p.created_at DESC
                LIMIT $limitInt OFFSET $offsetInt
            ");
            $stmt->execute($params);
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

            jsonResponse([
                'success' => true,
                'data' => $products,
                'pagination' => $pagination
            ]);
            break;

        case 'POST':
            // Create new product - handle both JSON and multipart/form-data
            $content_type = $_SERVER['CONTENT_TYPE'] ?? '';
            
            if (strpos($content_type, 'multipart/form-data') !== false) {
                // Handle multipart form data (with file upload)
                $data = $_POST;
            } else {
                // Handle JSON
                $data = json_decode(file_get_contents("php://input"), true);
            }

            $name = sanitize($data['name'] ?? '');
            $description = sanitize($data['description'] ?? '');
            $category = sanitize($data['category'] ?? '');
            $price = floatval($data['price'] ?? 0);
            $stock = intval($data['stock'] ?? 0);
            $unit = sanitize($data['unit'] ?? 'kg');

            // Validation
            $errors = [];
            if (empty($name)) $errors[] = 'Product name is required';
            if (empty($category)) $errors[] = 'Category is required';
            if ($price <= 0) $errors[] = 'Price must be greater than 0';
            if ($stock < 0) $errors[] = 'Stock cannot be negative';
            if (empty($unit)) $errors[] = 'Unit is required';

            if (!empty($errors)) {
                jsonResponse(['error' => 'Validation failed', 'details' => $errors], 400);
            }

            try {
                $conn->beginTransaction();

                // Get or create category ID
                $stmt = $conn->prepare("SELECT id FROM category WHERE name = ?");
                $stmt->execute([$category]);
                $cat_row = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$cat_row) {
                    $cat_id = generateUUID();
                    $stmt = $conn->prepare("INSERT INTO category (id, name, is_active) VALUES (?, ?, 1)");
                    $stmt->execute([$cat_id, $category]);
                } else {
                    $cat_id = $cat_row['id'];
                }

                // Get or create unit ID
                $stmt = $conn->prepare("SELECT id FROM unit_of_measure WHERE name = ?");
                $stmt->execute([$unit]);
                $unit_row = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$unit_row) {
                    $unit_id = generateUUID();
                    $abbrev = strtoupper(substr($unit, 0, 2));
                    // Check if abbreviation already exists
                    $stmt = $conn->prepare("SELECT id FROM unit_of_measure WHERE abbreviation = ?");
                    $stmt->execute([$abbrev]);
                    $abbrev_exists = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($abbrev_exists) {
                        // Use a different abbreviation
                        $abbrev = strtoupper(substr($unit, 0, 3)) ?: $unit;
                    }
                    
                    $stmt = $conn->prepare("INSERT INTO unit_of_measure (id, name, abbreviation) VALUES (?, ?, ?)");
                    $stmt->execute([$unit_id, $unit, $abbrev]);
                } else {
                    $unit_id = $unit_row['id'];
                }

                // Create product with pending status (requires admin approval)
                $product_id = generateUUID();
                $stmt = $conn->prepare("
                    INSERT INTO product (id, farmer_id, category_id, unit_id, name, description, 
                                        price, stock_quantity, status) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
                ");
                $stmt->execute([
                    $product_id, $farmer_id, $cat_id, $unit_id, $name, 
                    $description, $price, $stock
                ]);

                // Handle image upload if provided
                if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                    $image_path = handleImageUpload($product_id);
                    
                    // Store image record in database
                    $stmt = $conn->prepare("
                        INSERT INTO product_image (id, product_id, image_url, is_primary, display_order) 
                        VALUES (?, ?, ?, TRUE, 0)
                    ");
                    $stmt->execute([generateUUID(), $product_id, $image_path]);
                }

                // Log inventory
                $stmt = $conn->prepare("
                    INSERT INTO inventory_log (id, product_id, change_type, quantity, 
                                              previous_qty, new_qty, notes) 
                    VALUES (?, ?, 'initial_stock', ?, 0, ?, 'Initial product stock')
                ");
                $stmt->execute([generateUUID(), $product_id, $stock, $stock]);

                $conn->commit();

                jsonResponse([
                    'success' => true,
                    'message' => 'Product created successfully. Awaiting admin approval.',
                    'data' => [
                        'product_id' => $product_id,
                        'name' => $name,
                        'price' => $price,
                        'stock' => $stock,
                        'status' => 'pending'
                    ]
                ], 201);
            } catch (Exception $e) {
                if (isset($conn)) {
                    $conn->rollBack();
                }
                throw $e;
            }
            break;

        case 'PUT':
            // Update product
            $data = json_decode(file_get_contents("php://input"), true);
            $product_id = sanitize($data['id'] ?? $_GET['id'] ?? '');

            if (empty($product_id)) {
                jsonResponse(['error' => 'Product ID is required'], 400);
            }

            // Verify ownership
            $stmt = $conn->prepare("SELECT id, stock_quantity FROM product WHERE id = ? AND farmer_id = ?");
            $stmt->execute([$product_id, $farmer_id]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$product) {
                jsonResponse(['error' => 'Product not found or access denied'], 404);
            }

            $updates = [];
            $params = [];

            // Begin transaction for updates and inventory log
            $conn->beginTransaction();

            // Handle category string -> id (create if needed)
            if (isset($data['category'])) {
                $cat = sanitize($data['category']);
                $stmt = $conn->prepare("SELECT id FROM category WHERE name = ?");
                $stmt->execute([$cat]);
                $cat_row = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$cat_row) {
                    $cat_id = generateUUID();
                    $stmt = $conn->prepare("INSERT INTO category (id, name, is_active) VALUES (?, ?, 1)");
                    $stmt->execute([$cat_id, $cat]);
                } else {
                    $cat_id = $cat_row['id'];
                }
                $updates[] = "category_id = ?";
                $params[] = $cat_id;
            }

            // Handle unit string -> id (create if needed)
            if (isset($data['unit'])) {
                $unit = sanitize($data['unit']);
                $stmt = $conn->prepare("SELECT id FROM unit_of_measure WHERE name = ?");
                $stmt->execute([$unit]);
                $unit_row = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$unit_row) {
                    $unit_id = generateUUID();
                    $abbrev = strtoupper(substr($unit, 0, 2));
                    $stmt = $conn->prepare("SELECT id FROM unit_of_measure WHERE abbreviation = ?");
                    $stmt->execute([$abbrev]);
                    $abbrev_exists = $stmt->fetch(PDO::FETCH_ASSOC);
                    if ($abbrev_exists) {
                        $abbrev = strtoupper(substr($unit, 0, 3)) ?: $unit;
                    }
                    $stmt = $conn->prepare("INSERT INTO unit_of_measure (id, name, abbreviation) VALUES (?, ?, ?)");
                    $stmt->execute([$unit_id, $unit, $abbrev]);
                } else {
                    $unit_id = $unit_row['id'];
                }
                $updates[] = "unit_id = ?";
                $params[] = $unit_id;
            }

            // Standard fields
            $fields = ['name', 'description', 'min_order_qty', 'is_active'];
            foreach ($fields as $field) {
                if (isset($data[$field])) {
                    $updates[] = "$field = ?";
                    $params[] = $field === 'is_active' ? (bool)$data[$field] : sanitize($data[$field]);
                }
            }

            if (isset($data['price'])) {
                $updates[] = "price = ?";
                $params[] = floatval($data['price']);
            }

            // Handle stock changes: record inventory log
            $stockChanged = false;
            if (isset($data['stock'])) {
                $newStock = intval($data['stock']);
                $updates[] = "stock_quantity = ?";
                $params[] = $newStock;
                $stockChanged = true;
            }

            if (empty($updates)) {
                $conn->rollBack();
                jsonResponse(['error' => 'No fields to update'], 400);
            }

            $updates[] = "updated_at = NOW()";

            // Append product id for WHERE
            $params[] = $product_id;

            $stmt = $conn->prepare("UPDATE product SET " . implode(', ', $updates) . " WHERE id = ?");
            $stmt->execute($params);

            // If stock changed, insert inventory log
            if ($stockChanged) {
                $previous = intval($product['stock_quantity']);
                $stmt = $conn->prepare("INSERT INTO inventory_log (id, product_id, change_type, quantity, previous_qty, new_qty, notes) VALUES (?, ?, 'adjustment', ?, ?, ?, 'Stock updated via edit')");
                $stmt->execute([generateUUID(), $product_id, ($newStock - $previous), $previous, $newStock]);
            }

            $conn->commit();

            jsonResponse([
                'success' => true,
                'message' => 'Product updated successfully'
            ]);
            break;

        case 'DELETE':
            // Delete product - handle related records with transaction
            $product_id = sanitize($_GET['id'] ?? '');

            if (empty($product_id)) {
                jsonResponse(['error' => 'Product ID is required'], 400);
            }
            error_log("Products DELETE requested: product_id={$product_id}, farmer_id={$farmer_id}, by_user={$user['user_id']}");

            // Verify ownership - use fetch instead of rowCount for portability
            try {
                $stmt = $conn->prepare("SELECT id FROM product WHERE id = ? AND farmer_id = ?");
                $stmt->execute([$product_id, $farmer_id]);
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$row) {
                    jsonResponse(['error' => 'Product not found or access denied'], 404);
                }
            } catch (Exception $e) {
                error_log("Products ownership check error: " . $e->getMessage());
                jsonResponse(['error' => 'Failed to verify ownership', 'details' => $e->getMessage()], 500);
            }

            try {
                // Start transaction to ensure all related records are deleted
                $conn->beginTransaction();
                
                // First delete order items that reference this product
                $stmt = $conn->prepare("DELETE FROM order_items WHERE product_id = ?");
                $stmt->execute([$product_id]);
                error_log("Deleted order items for product: {$product_id}");
                
                // Then delete product images
                $stmt = $conn->prepare("DELETE FROM product_image WHERE product_id = ?");
                $stmt->execute([$product_id]);
                error_log("Deleted product images for product: {$product_id}");
                
                // Finally delete the product itself
                $stmt = $conn->prepare("DELETE FROM product WHERE id = ?");
                $stmt->execute([$product_id]);
                error_log("Deleted product: {$product_id}");
                
                // Commit the transaction
                $conn->commit();
                error_log("Product deletion transaction committed: product_id={$product_id}");
                
            } catch (Exception $e) {
                // Rollback on error
                if ($conn->inTransaction()) {
                    $conn->rollBack();
                }
                error_log("Products DELETE error: " . $e->getMessage());
                jsonResponse(['error' => 'Failed to delete product', 'details' => $e->getMessage()], 500);
            }

            jsonResponse([
                'success' => true,
                'message' => 'Product deleted successfully'
            ]);
            break;

        default:
            jsonResponse(['error' => 'Method not allowed'], 405);
    }

} catch (Exception $e) {
    // Only rollback if we're in a transaction
    if (isset($conn) && $conn->inTransaction()) {
        $conn->rollBack();
    }
    error_log("Products endpoint error: " . $e->getMessage());
    jsonResponse(['error' => 'Operation failed: ' . $e->getMessage()], 500);
}
?>
