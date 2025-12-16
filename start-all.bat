@echo off
echo ========================================
echo    YirikAI - Start All Services
echo ========================================
echo.

echo [*] Starting Backend...
start "YirikAI Backend" cmd /c "%~dp0start-backend.bat"

timeout /t 5 /nobreak > nul

echo [*] Starting Frontend...
start "YirikAI Frontend" cmd /c "%~dp0start-frontend.bat"

echo.
echo [OK] All services started!
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo.
pause
