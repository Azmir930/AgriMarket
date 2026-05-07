<?php
/**
 * Image Upload Handler
 * Agriculture Product Marketplace
 */

function handleImageUpload($product_id) {
    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        return null;
    }

    $file = $_FILES['image'];
    
    // Validate file type
    $allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!in_array($file['type'], $allowed_types)) {
        throw new Exception('Invalid image type. Only JPEG, PNG, GIF, and WebP are allowed.');
    }

    // Validate file size (max 5MB)
    $max_size = 5 * 1024 * 1024; // 5MB
    if ($file['size'] > $max_size) {
        throw new Exception('Image file is too large. Maximum size is 5MB.');
    }

    // Create uploads directory if it doesn't exist
    $uploads_dir = __DIR__ . '/../../uploads/products';
    if (!is_dir($uploads_dir)) {
        mkdir($uploads_dir, 0755, true);
    }

    // Generate unique filename
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = $product_id . '_' . time() . '.' . $ext;
    $filepath = $uploads_dir . '/' . $filename;

    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        throw new Exception('Failed to save image file.');
    }

    // Return relative path for storage
    return '/uploads/products/' . $filename;
}

function deleteProductImage($image_path) {
    if (empty($image_path)) {
        return true;
    }

    $file_path = __DIR__ . '/../../' . ltrim($image_path, '/');
    
    if (file_exists($file_path)) {
        return unlink($file_path);
    }

    return true;
}
?>
