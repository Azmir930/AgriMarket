-- Fix All Foreign Key Constraints - Migration Script
-- This script adds ON DELETE CASCADE and ON UPDATE CASCADE to all foreign key constraints
-- Run this on existing databases to fix constraint issues

-- ============================================================
-- Step 1: Fix user.role_id constraint
-- ============================================================
ALTER TABLE `user` DROP FOREIGN KEY `user_ibfk_1`;
ALTER TABLE `user` ADD CONSTRAINT `user_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `user_role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Step 2: Fix product table constraints
-- ============================================================
ALTER TABLE `product` DROP FOREIGN KEY `product_ibfk_1`;
ALTER TABLE `product` ADD CONSTRAINT `product_ibfk_1` FOREIGN KEY (`farmer_id`) REFERENCES `farmer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `product` DROP FOREIGN KEY `product_ibfk_2`;
ALTER TABLE `product` ADD CONSTRAINT `product_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `product` DROP FOREIGN KEY `product_ibfk_3`;
ALTER TABLE `product` ADD CONSTRAINT `product_ibfk_3` FOREIGN KEY (`unit_id`) REFERENCES `unit_of_measure`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Step 3: Fix orders.buyer_id constraint
-- ============================================================
ALTER TABLE `orders` DROP FOREIGN KEY `orders_ibfk_1`;
ALTER TABLE `orders` ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`buyer_id`) REFERENCES `buyer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Step 4: Fix order_items constraints
-- ============================================================
ALTER TABLE `order_items` DROP FOREIGN KEY `order_items_ibfk_1`;
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `order_items` DROP FOREIGN KEY `order_items_ibfk_2`;
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `order_items` DROP FOREIGN KEY `order_items_ibfk_3`;
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_ibfk_3` FOREIGN KEY (`farmer_id`) REFERENCES `farmer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Step 5: Fix payment.order_id constraint
-- ============================================================
ALTER TABLE `payment` DROP FOREIGN KEY `payment_ibfk_1`;
ALTER TABLE `payment` ADD CONSTRAINT `payment_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Step 6: Fix review table constraints
-- ============================================================
ALTER TABLE `review` DROP FOREIGN KEY `review_ibfk_1`;
ALTER TABLE `review` ADD CONSTRAINT `review_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `review` DROP FOREIGN KEY `review_ibfk_2`;
ALTER TABLE `review` ADD CONSTRAINT `review_ibfk_2` FOREIGN KEY (`buyer_id`) REFERENCES `buyer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Step 7: Fix delivery.order_id constraint
-- ============================================================
ALTER TABLE `delivery` DROP FOREIGN KEY `delivery_ibfk_1`;
ALTER TABLE `delivery` ADD CONSTRAINT `delivery_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Verification
-- ============================================================
-- Run these queries to verify all constraints are properly set:

-- SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME, 
--        DELETE_RULE, UPDATE_RULE
-- FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
-- WHERE TABLE_SCHEMA = 'agriculture_marketplace' 
-- AND REFERENCED_TABLE_NAME IS NOT NULL 
-- ORDER BY TABLE_NAME, COLUMN_NAME;

-- This should show all foreign keys with DELETE_RULE and UPDATE_RULE as 'CASCADE'

