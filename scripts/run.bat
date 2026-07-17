@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo               IRON Frontend Launcher
echo ===================================================
echo.

:: 1. Node.js Version Guard
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed.
    echo Next.js requires Node.js ^>= 18.18.0.
    echo Please install Node.js and try again.
    echo.
    pause
    exit /b 1
)

for /f "tokens=1,2 delims=v." %%a in ('node -v') do (
    set major=%%a
    set minor=%%b
)

if !major! lss 18 (
    echo [ERROR] Node.js version is too old: v!major!.!minor!
    echo Next.js requires Node.js ^>= 18.18.0.
    echo.
    pause
    exit /b 1
)
if !major! equ 18 (
    if !minor! lss 18 (
        echo [ERROR] Node.js version is too old: v!major!.!minor!
        echo Next.js requires Node.js ^>= 18.18.0.
        echo.
        pause
        exit /b 1
    )
)

:: Move to project frontend directory
cd /d "%~dp0..\frontend"

:: 2. Build Check
if not exist ".next\BUILD_ID" (
    echo [INFO] Next.js production build not found. Building application for production...
    call npm run build
    if !errorlevel! neq 0 (
        echo [ERROR] Build failed. Please fix compiler errors first.
        echo.
        pause
        exit /b 1
    )
    echo [INFO] Build completed successfully.
    echo.
)

:: 3. Port Check (PowerShell)
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 10000 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if %errorlevel% equ 0 (
    echo [INFO] IRON server is already running on port 10000.
    echo Opening browser to http://localhost:10000...
    start http://localhost:10000
    exit /b 0
)

:: 4. Start Server (In a new, visible command window)
echo [INFO] Starting IRON production server...
start "IRON Server" cmd /k "npm run start"

:: 5. Poll Port 10000 until active
echo [INFO] Waiting for server to start listening on port 10000 (timeout: 60s)...
powershell -NoProfile -Command ^
    "$timeout = 60; $start = Get-Date; " ^
    "while (((Get-Date) - $start).TotalSeconds -lt $timeout) { " ^
    "  if (Get-NetTCPConnection -LocalPort 10000 -State Listen -ErrorAction SilentlyContinue) { exit 0 }; " ^
    "  Start-Sleep -Seconds 1; " ^
    "}; " ^
    "exit 1"

if %errorlevel% equ 0 (
    echo [SUCCESS] Server started! Opening browser...
    start http://localhost:10000
) else (
    echo [ERROR] Timeout waiting for Next.js server to bind to port 10000.
    echo Please check the "IRON Server" console window for details.
    echo.
    pause
)
