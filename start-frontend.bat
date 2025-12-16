@echo off
echo ========================================
echo       YirikAI Frontend Server
echo ========================================
echo.

cd /d "%~dp0frontend"

:: Check if node_modules exists
if not exist "node_modules" (
    echo [!] Dependencies not found. Installing...
    npm install
)

echo [*] Starting YirikAI Frontend on port 3000...
echo [*] URL: http://localhost:3000
echo [*] Press Ctrl+C to stop
echo.

npm run dev

pause
