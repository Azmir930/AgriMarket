@echo off
REM Update XAMPP backend files with fixed delete functionality
echo Updating XAMPP backend files...

REM Copy the fixed products.php
if exist "C:\xampp\htdocs\PHP_BACKEND\farmer\products.php" (
    copy /Y "docs\PHP_BACKEND\farmer\products.php" "C:\xampp\htdocs\PHP_BACKEND\farmer\products.php"
    echo [OK] Updated C:\xampp\htdocs\PHP_BACKEND\farmer\products.php
) else (
    echo [ERROR] XAMPP destination not found: C:\xampp\htdocs\PHP_BACKEND\farmer\products.php
    echo Make sure XAMPP is properly set up
    pause
    exit /b 1
)

echo.
echo Backend files updated successfully!
echo The product delete functionality should now handle related orders properly.
pause
