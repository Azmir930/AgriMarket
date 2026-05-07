-- ================================================================
-- Fix Foreign Key Constraint on order_items.farmer_id
-- ================================================================
-- This script fixes the foreign key constraint that was preventing
-- deletion/update of wishlist items due to foreign key constraint failure
-- ERROR: Cannot delete or update a parent row: a foreign key constraint fails 
-- (`agriculture_marketplace`.`order_items`, CONSTRAINT `order_items_ibfk_3` 
-- FOREIGN KEY (`farmer_id`) REFERENCES `farmer` (`id`))

-- Step 1: Drop the old constraint
ALTER TABLE order_items DROP FOREIGN KEY order_items_ibfk_3;

-- Step 2: Add the new constraint with ON DELETE CASCADE
ALTER TABLE order_items ADD CONSTRAINT order_items_ibfk_3 
FOREIGN KEY (farmer_id) REFERENCES farmer(id) ON DELETE CASCADE;

-- Verify the constraint was applied
SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'order_items' AND COLUMN_NAME = 'farmer_id';
