#!/bin/bash
# Farmer Inventory - Debug & Fix Script

echo "=========================================="
echo "FARMER INVENTORY - TROUBLESHOOTING"
echo "=========================================="
echo ""

# Check 1: XAMPP Status
echo "[1/5] Checking XAMPP Status..."
echo "  • Apache should be running on port 80"
echo "  • MySQL should be running"
echo "  Action: Open XAMPP Control Panel and verify both are GREEN"
echo ""

# Check 2: Backend File
echo "[2/5] Checking backend file..."
if [ -f "C:\xampp\htdocs\PHP_BACKEND\farmer\inventory.php" ]; then
    echo "  ✓ Backend file exists"
else
    echo "  ✗ Backend file NOT found - need to copy"
    echo "  Action: Copy docs/PHP_BACKEND/farmer/inventory.php to C:\xampp\htdocs\PHP_BACKEND\farmer\inventory.php"
fi
echo ""

# Check 3: Database
echo "[3/5] Checking database..."
echo "  • Database: agriculture_marketplace"
echo "  • Tables: product, inventory_log, category, unit_of_measure"
echo "  Action: Open phpMyAdmin (http://localhost/phpmyadmin) and verify database exists"
echo ""

# Check 4: Authentication
echo "[4/5] Checking authentication..."
echo "  • Make sure you're logged in with farmer account"
echo "  • Check localStorage for 'auth_token'"
echo "  Action: Open F12 console and run:"
echo "         localStorage.getItem('auth_token')"
echo ""

# Check 5: Debug Console
echo "[5/5] Checking debug console..."
echo "  • Open F12 Developer Tools (press F12)"
echo "  • Go to Console tab"
echo "  • Look for [Inventory] messages"
echo "  • Check for errors in red"
echo ""

echo "=========================================="
echo "WHAT TO LOOK FOR IN CONSOLE:"
echo "=========================================="
echo ""
echo "GOOD - You should see:"
echo "  [Inventory] Fetching from: http://localhost/PHP_BACKEND/farmer/inventory.php"
echo "  [Inventory] Response status: 200"
echo "  [Inventory] Data received: {...}"
echo "  [Inventory] Loaded X inventory items"
echo ""
echo "BAD - You might see:"
echo "  [Inventory] Error response body: ..."
echo "  [Inventory] Response status: 500"
echo "  [Inventory] Parsed error: {error: '...', debug: '...'}"
echo ""

echo "=========================================="
echo "XAMPP ERROR LOG"
echo "=========================================="
echo "Location: C:\xampp\apache\logs\error.log"
echo "Action: Open and check for PHP errors with timestamp from when you tested"
echo ""

echo "=========================================="
echo "NEXT STEPS:"
echo "=========================================="
echo ""
echo "1. Verify XAMPP is running (both Apache and MySQL GREEN)"
echo "2. Make sure you're logged in as farmer"
echo "3. Refresh inventory page (F5)"
echo "4. Open F12 console and check for [Inventory] messages"
echo "5. If still getting 500 error, check XAMPP error log"
echo ""
echo "Most common causes:"
echo "  • XAMPP not running → Start Apache + MySQL"
echo "  • Not logged in → Login with farmer account"
echo "  • Database issue → Check if tables exist in agriculture_marketplace"
echo "  • PHP error → Check C:\xampp\apache\logs\error.log"
echo ""
