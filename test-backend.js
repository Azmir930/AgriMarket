// Test Backend Connection
async function testBackendConnection() {
    console.log('=== TESTING BACKEND CONNECTION ===\n');

    // Test 1: Check if localhost is accessible
    console.log('Test 1: Testing http://localhost accessibility...');
    try {
        const response = await fetch('http://localhost/');
        console.log('✓ localhost is accessible (HTTP ' + response.status + ')');
    } catch (error) {
        console.error('✗ localhost is NOT accessible:', error.message);
        console.log('  → Make sure XAMPP is running (Apache on port 80)');
        return;
    }

    // Test 2: Check if XAMPP dashboard exists
    console.log('\nTest 2: Checking XAMPP dashboard...');
    try {
        const response = await fetch('http://localhost/xampp/');
        if (response.ok) {
            console.log('✓ XAMPP dashboard is accessible');
        }
    } catch (error) {
        console.log('⚠ XAMPP dashboard not accessible (not critical)');
    }

    // Test 3: Check if PHP_BACKEND folder exists
    console.log('\nTest 3: Testing PHP_BACKEND folder...');
    try {
        const response = await fetch('http://localhost/PHP_BACKEND/');
        if (response.status === 403 || response.status === 404) {
            console.log('⚠ PHP_BACKEND folder exists but directory listing disabled');
        } else {
            console.log('✓ PHP_BACKEND folder is accessible');
        }
    } catch (error) {
        console.error('✗ PHP_BACKEND folder NOT accessible:', error.message);
        console.log('  → Backend files not found or XAMPP not properly configured');
        return;
    }

    // Test 4: Test inventory.php directly
    console.log('\nTest 4: Testing inventory.php directly (no auth)...');
    try {
        const response = await fetch('http://localhost/PHP_BACKEND/farmer/inventory.php');
        const text = await response.text();
        console.log('Status:', response.status);
        console.log('Response preview:', text.substring(0, 200));

        if (response.status === 401 || response.status === 403) {
            console.log('✓ inventory.php exists and requires authentication (good!)');
        } else if (response.status === 500) {
            console.log('✗ inventory.php returned 500 error');
            console.log('  → Check XAMPP error log: C:\\xampp\\apache\\logs\\error.log');
        } else {
            console.log('Got response:', text.substring(0, 100));
        }
    } catch (error) {
        console.error('✗ Failed to reach inventory.php:', error.message);
        console.log('  → File may not exist or XAMPP not accessible');
        return;
    }

    // Test 5: Test with auth token
    console.log('\nTest 5: Testing with authentication token...');
    const token = localStorage.getItem('auth_token');
    if (!token) {
        console.log('⚠ No auth token found - you may not be logged in');
        console.log('  → Login first, then run this test again');
        return;
    }

    console.log('Token found:', token.substring(0, 20) + '...');

    try {
        const response = await fetch('http://localhost/PHP_BACKEND/farmer/inventory.php', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('✓ SUCCESS! Got inventory data:');
            console.log('  - Items:', data.inventory?.length || 0);
            console.log('  - Logs:', data.logs?.length || 0);
            console.log('  - Summary:', data.summary);
        } else {
            const text = await response.text();
            console.log('✗ Request failed:', text.substring(0, 200));
        }
    } catch (error) {
        console.error('✗ Fetch failed:', error.message);
    }

    console.log('\n=== END TEST ===');
}

// Run the test
testBackendConnection();
