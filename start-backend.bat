@echo off
echo ========================================
echo       YirikAI Backend Server
echo ========================================
echo.

cd /d "%~dp0backend"

:: Check if venv exists
if not exist "venv" (
    echo [!] Virtual environment not found. Creating...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)

echo [*] Starting YirikAI Backend on port 8000...
echo [*] API URL: http://localhost:8000
echo [*] Press Ctrl+C to stop
echo.

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

pause
