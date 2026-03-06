@echo off
cd /d "%~dp0"

echo === Pothole Dashboard Quick Start ===

REM Always run Python pipeline to generate fresh data
echo Running Python pipeline... (first run may take 1-3 min)
pip install -q -r requirements.txt 2>nul
cd pothole_system
python main.py
cd ..
if errorlevel 1 (
    echo Python pipeline failed. Check Python 3.10-3.12 is installed.
    pause
    exit /b 1
)

REM Ensure dashboard dependencies
if not exist "dashboard\node_modules" (
    echo Installing dashboard dependencies...
    cd dashboard
    call npm install
    cd ..
)

REM Start dashboard in new window (keeps servers running)
echo Starting dashboard...
start "Pothole Dashboard" cmd /k "cd /d "%~dp0dashboard" && npm run demo"

REM Wait for servers to be ready
echo Waiting for servers...
timeout /t 8 /nobreak > nul

REM Open browser
start http://localhost:5173
echo.
echo Dashboard opened at http://localhost:5173
echo Close the "Pothole Dashboard" window to stop the servers.
pause
