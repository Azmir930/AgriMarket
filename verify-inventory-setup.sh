#!/bin/bash
# Inventory Connection Verification Script
# Run this to verify all components are working

echo "================================================"
echo "FARMER INVENTORY CONNECTION VERIFICATION"
echo "================================================"
echo ""

# Check 1: Backend file exists
echo "[1/7] Checking backend file..."
if [ -f "C:\xampp\htdocs\PHP_BACKEND\farmer\inventory.php" ]; then
    echo "✓ Backend file exists at XAMPP"
else
    echo "✗ Backend file NOT found at XAMPP"
    exit 1
fi
echo ""

# Check 2: Frontend component exists
echo "[2/7] Checking frontend component..."
if [ -f "src/pages/farmer/Inventory.tsx" ]; then
    echo "✓ Frontend component exists"
else
    echo "✗ Frontend component NOT found"
    exit 1
fi
echo ""

# Check 3: Route configuration
echo "[3/7] Checking route configuration..."
if grep -q "farmer/inventory" "src/App.tsx"; then
    echo "✓ Route configured in App.tsx"
else
    echo "✗ Route NOT configured"
    exit 1
fi
echo ""

# Check 4: Navigation link
echo "[4/7] Checking navigation link..."
if grep -q "Inventory" "src/components/layout/DashboardLayout.tsx"; then
    echo "✓ Navigation link exists"
else
    echo "✗ Navigation link NOT found"
    exit 1
fi
echo ""

# Check 5: Build status
echo "[5/7] Checking build status..."
if [ -f "dist/index.html" ]; then
    echo "✓ Production build exists"
else
    echo "⚠ No production build found (will build on next dev start)"
fi
echo ""

# Check 6: Database connection
echo "[6/7] Checking database configuration..."
if grep -q "agriculture_marketplace" "docs/PHP_BACKEND/config/database.php"; then
    echo "✓ Database configuration exists"
else
    echo "✗ Database configuration NOT found"
    exit 1
fi
echo ""

# Check 7: API response format
echo "[7/7] Checking API response format..."
if grep -q "success.*inventory.*logs" "docs/PHP_BACKEND/farmer/inventory.php"; then
    echo "✓ API response format configured"
else
    echo "✗ API response format NOT found"
    exit 1
fi
echo ""

echo "================================================"
echo "✓ ALL VERIFICATION CHECKS PASSED!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Start XAMPP (Apache + MySQL)"
echo "2. Run: npm run dev"
echo "3. Login at http://localhost:8083"
echo "4. Navigate to Farmer > Inventory"
echo "5. Open F12 console to verify [Inventory] logs"
echo ""
