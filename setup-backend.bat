@echo off
REM ============================================================
REM Setup PHP Backend for XAMPP
REM Windows Batch Script
REM ============================================================

echo.
echo ===== AgriMarket - PHP Backend Setup =====
echo.

REM Check if source folder exists
if not exist "docs\PHP_BACKEND" (
    echo Error: docs\PHP_BACKEND folder not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

REM Define XAMPP path (common locations)
set XAMPP_PATH=C:\xampp
set HTDOCS=%XAMPP_PATH%\htdocs

echo Checking XAMPP installation...
if not exist "%XAMPP_PATH%" (
    echo XAMPP not found at %XAMPP_PATH%
    echo.
    echo Please enter your XAMPP path (e.g., C:\xampp):
    set /p XAMPP_PATH=
    set HTDOCS=!XAMPP_PATH!\htdocs
)

if not exist "%HTDOCS%" (
    echo Error: htdocs folder not found at %HTDOCS%
    echo Please install XAMPP first.
    pause
    exit /b 1
)

echo Found XAMPP at: %XAMPP_PATH%
echo HTDocs at: %HTDOCS%
echo.

REM Copy PHP_BACKEND to htdocs
set DEST=%HTDOCS%\PHP_BACKEND

echo Copying PHP_BACKEND folder...
if exist "%DEST%" (
    echo Folder already exists. Updating files...
    xcopy "docs\PHP_BACKEND\*" "%DEST%\" /S /Y /I
) else (
    echo Creating new PHP_BACKEND folder...
    xcopy "docs\PHP_BACKEND\*" "%DEST%\" /S /Y /I
)

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===== SUCCESS! =====
    echo.
    echo PHP Backend copied to: %DEST%
    echo.
    echo Next steps:
    echo 1. Make sure Apache and MySQL are running in XAMPP
    echo 2. Create database: agriculture_marketplace
    echo 3. Import schema from setup-database.sql
    echo 4. Test: http://localhost/PHP_BACKEND/api/categories.php
    echo.
    echo If you get 404 error, you may need to enable mod_rewrite:
    echo - Open: %XAMPP_PATH%\apache\conf\httpd.conf
    echo - Find: #LoadModule rewrite_module modules/mod_rewrite.so
    echo - Remove the # to uncomment it
    echo - Restart Apache
    echo.
) else (
    echo Error during copy!
    pause
    exit /b 1
)

pause
