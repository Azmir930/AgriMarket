-- Agriculture Marketplace Database Schema (MySQL)
-- Created: January 21, 2026

-- ============================================================
-- 1. User_Role Table
-- ============================================================
CREATE TABLE IF NOT EXISTS user_role (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. User Table
-- ============================================================
CREATE TABLE IF NOT EXISTS user (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    role_id CHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES user_role(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_email (email),
    INDEX idx_role (role_id)
);

-- ============================================================
-- 3. User_Session Table
-- ============================================================
CREATE TABLE IF NOT EXISTS user_session (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_token (token)
);

-- ============================================================
-- 4. Password_Reset Table
-- ============================================================
CREATE TABLE IF NOT EXISTS password_reset (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user (user_id)
);

-- ============================================================
-- 5. User_Activity_Log Table
-- ============================================================
CREATE TABLE IF NOT EXISTS user_activity_log (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_type (activity_type)
);

-- ============================================================
-- 6. Address Table
-- ============================================================
CREATE TABLE IF NOT EXISTS address (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    address_type VARCHAR(20) DEFAULT 'shipping',
    street VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) DEFAULT 'India',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
);

-- ============================================================
-- 7. KYC_Verification Table
-- ============================================================
CREATE TABLE IF NOT EXISTS kyc_verification (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL UNIQUE,
    document_type VARCHAR(50) NOT NULL,
    document_number VARCHAR(100) NOT NULL,
    document_url TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_status (status)
);

-- ============================================================
-- 8. Farmer Table
-- ============================================================
CREATE TABLE IF NOT EXISTS farmer (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL UNIQUE,
    farm_name VARCHAR(255) NOT NULL,
    farm_location VARCHAR(255),
    farm_size DECIMAL(10, 2),
    farming_type VARCHAR(100),
    bio TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_verified (is_verified)
);

-- ============================================================
-- 9. Buyer Table
-- ============================================================
CREATE TABLE IF NOT EXISTS buyer (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL UNIQUE,
    company_name VARCHAR(255),
    business_type VARCHAR(100),
    gst_number VARCHAR(50),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
);

-- ============================================================
-- 10. Category Table
-- ============================================================
CREATE TABLE IF NOT EXISTS category (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    parent_id CHAR(36),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES category(id) ON DELETE SET NULL,
    INDEX idx_parent (parent_id),
    INDEX idx_active (is_active)
);

-- ============================================================
-- 11. Unit_Of_Measure Table
-- ============================================================
CREATE TABLE IF NOT EXISTS unit_of_measure (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(50) NOT NULL UNIQUE,
    abbreviation VARCHAR(10) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 12. Product Table
-- ============================================================
CREATE TABLE IF NOT EXISTS product (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    farmer_id CHAR(36) NOT NULL,
    category_id CHAR(36) NOT NULL,
    unit_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    min_order_qty INT DEFAULT 1,
    is_organic BOOLEAN DEFAULT FALSE,
    harvest_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    rating DECIMAL(3, 2) DEFAULT 0.00,
    review_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES farmer(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES unit_of_measure(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_farmer (farmer_id),
    INDEX idx_category (category_id),
    INDEX idx_status (status),
    INDEX idx_organic (is_organic)
);

-- ============================================================
-- 13. Product_Image Table
-- ============================================================
CREATE TABLE IF NOT EXISTS product_image (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id CHAR(36) NOT NULL,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE,
    INDEX idx_product (product_id)
);

-- ============================================================
-- 14. Inventory_Log Table
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_log (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id CHAR(36) NOT NULL,
    change_type VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    previous_qty INT NOT NULL,
    new_qty INT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE,
    INDEX idx_product (product_id),
    INDEX idx_type (change_type)
);

-- ============================================================
-- 15. Orders Table
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    buyer_id CHAR(36) NOT NULL,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(30) DEFAULT 'pending',
    subtotal DECIMAL(12, 2) NOT NULL,
    shipping_fee DECIMAL(12, 2) DEFAULT 0.00,
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES buyer(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_buyer (buyer_id),
    INDEX idx_status (status),
    INDEX idx_order_number (order_number)
);

-- ============================================================
-- 16. Order_Items Table
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    order_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    farmer_id CHAR(36) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (farmer_id) REFERENCES farmer(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_order (order_id),
    INDEX idx_product (product_id)
);

-- ============================================================
-- 17. Payment Table
-- ============================================================
CREATE TABLE IF NOT EXISTS payment (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    order_id CHAR(36) NOT NULL UNIQUE,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    status VARCHAR(30) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_status (status),
    INDEX idx_transaction (transaction_id)
);

-- ============================================================
-- 18. Review Table
-- ============================================================
CREATE TABLE IF NOT EXISTS review (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id CHAR(36) NOT NULL,
    buyer_id CHAR(36) NOT NULL,
    rating INT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES buyer(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_product (product_id),
    INDEX idx_buyer (buyer_id),
    UNIQUE KEY unique_review (buyer_id, product_id)
);

-- ============================================================
-- 19. Wishlist Table
-- ============================================================
CREATE TABLE IF NOT EXISTS wishlist (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_product (product_id),
    UNIQUE KEY unique_wishlist (user_id, product_id)
);

-- ============================================================
-- 20. Delivery Table
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    order_id CHAR(36) NOT NULL UNIQUE,
    status VARCHAR(30) DEFAULT 'pending',
    tracking_number VARCHAR(100),
    carrier VARCHAR(100),
    estimated_delivery_date DATE,
    actual_delivery_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_status (status)
);

-- ============================================================
-- Insert Sample Data
-- ============================================================

-- Insert Roles
INSERT INTO user_role (id, role_name, description) VALUES
('role-admin-001', 'admin', 'System administrator'),
('role-farmer-001', 'farmer', 'Agricultural product seller'),
('role-buyer-001', 'buyer', 'Product buyer/customer')
ON DUPLICATE KEY UPDATE role_name=role_name;

-- Insert Categories
INSERT INTO category (id, name, description, is_active) VALUES
('cat-veg-001', 'Vegetables', 'Fresh vegetables', TRUE),
('cat-fruits-001', 'Fruits', 'Fresh fruits', TRUE),
('cat-grains-001', 'Grains', 'Rice, wheat, and other grains', TRUE),
('cat-dairy-001', 'Dairy Products', 'Milk, cheese, and dairy', TRUE),
('cat-spices-001', 'Spices', 'Dried spices and condiments', TRUE)
ON DUPLICATE KEY UPDATE name=name;

-- Insert Units of Measure
INSERT INTO unit_of_measure (id, name, abbreviation) VALUES
('unit-kg-001', 'Kilogram', 'kg'),
('unit-g-001', 'Gram', 'g'),
('unit-l-001', 'Liter', 'L'),
('unit-ml-001', 'Milliliter', 'mL'),
('unit-piece-001', 'Piece', 'pc'),
('unit-dozen-001', 'Dozen', 'dz'),
('unit-bunch-001', 'Bunch', 'bch')
ON DUPLICATE KEY UPDATE name=name;

-- You can now add more test users, products, etc. manually through your app
