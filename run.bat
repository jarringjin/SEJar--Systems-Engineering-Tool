@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ================================================
echo   SEJar - starting backend + frontend
echo ================================================
echo.

REM ---------------------------------------------------------- find Python
where python >nul 2>nul
if %errorlevel%==0 (
    set "PYTHON_CMD=python"
) else (
    where py >nul 2>nul
    if !errorlevel!==0 (
        set "PYTHON_CMD=py"
    ) else (
        echo [ERROR] Python was not found on PATH.
        echo Install it from https://www.python.org/downloads/ ^(check "Add to PATH" during install^),
        echo then re-run this file.
        pause
        exit /b 1
    )
)

REM ---------------------------------------------------------- find npm
where npm >nul 2>nul
if not %errorlevel%==0 (
    echo [ERROR] npm was not found on PATH.
    echo Install Node.js LTS from https://nodejs.org, restart PowerShell/CMD,
    echo then re-run this file.
    pause
    exit /b 1
)

REM ---------------------------------------------------------- backend setup
cd backend

if not exist venv (
    echo [backend] Creating virtual environment - first run only, this takes a moment...
    %PYTHON_CMD% -m venv venv
    if not exist venv (
        echo [ERROR] Failed to create the virtual environment.
        pause
        exit /b 1
    )
)

echo [backend] Installing/checking dependencies...
call venv\Scripts\python.exe -m pip install -q -r requirements.txt
if not %errorlevel%==0 (
    echo [ERROR] pip install failed - see the output above.
    pause
    exit /b 1
)

echo [backend] Starting FastAPI server on http://127.0.0.1:8000 ...
start "SEJar Backend" cmd /k "call venv\Scripts\activate.bat && uvicorn app.main:app --reload"

cd ..

REM ---------------------------------------------------------- frontend setup
cd frontend

if not exist node_modules (
    echo [frontend] Installing npm dependencies - first run only, this takes a moment...
    call npm install
    if not %errorlevel%==0 (
        echo [ERROR] npm install failed - see the output above.
        pause
        exit /b 1
    )
)

echo [frontend] Starting Vite dev server on http://localhost:5173 ...
start "SEJar Frontend" cmd /k "npm run dev"

cd ..

REM ---------------------------------------------------------- open browser
echo.
echo Waiting for the servers to come up...
timeout /t 5 /nobreak >nul
start http://localhost:5173

echo.
echo ================================================
echo SEJar is running in two separate windows:
echo   - "SEJar Backend"  (http://127.0.0.1:8000)
echo   - "SEJar Frontend" (http://localhost:5173)
echo Close those two windows to stop SEJar.
echo This window can be closed safely.
echo ================================================
pause
endlocal
