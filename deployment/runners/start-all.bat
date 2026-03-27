@echo off
title Scan2Fix - Starting Services
color 0B

echo.
echo =======================================
echo   SCAN2FIX - Starting All Services
echo   %date% %time%
echo =======================================
echo.

:: Read ngrok domain from config
set DOMAIN_FILE=C:\Projects\Scan2Fix\deployment\ngrok-domain.txt
if exist "%DOMAIN_FILE%" (
    set /p NGROK_DOMAIN=<"%DOMAIN_FILE%"
) else (
    set NGROK_DOMAIN=
)

:: Step 1: MongoDB
echo [1/3] Checking MongoDB...
sc query MongoDB | find "RUNNING" >nul
if %ERRORLEVEL% == 0 (
    echo   ✓ MongoDB: Already running
) else (
    echo   Starting MongoDB...
    net start MongoDB
    echo   ✓ MongoDB: Started
)
echo.

:: Step 2: Node.js Server via PM2
echo [2/3] Starting Node.js Server...
cd /d C:\Projects\Scan2Fix\server
call pm2 start ecosystem.config.js --silent 2>nul
call pm2 save --silent 2>nul
echo   ✓ Server: Started on port 5000
echo.

:: Wait for server to be ready
echo   Waiting for server to initialize...
timeout /t 3 /nobreak >nul

:: Step 3: ngrok Tunnel
echo [3/3] Starting ngrok Tunnel...
if "%NGROK_DOMAIN%"=="" (
    echo   ⚠ No static domain configured.
    echo   Run deployment\installation\03-setup-ngrok.ps1 first.
    echo   Starting with random URL...
    start "ngrok - Scan2Fix" cmd /k "ngrok http 5000"
) else (
    echo   Domain: %NGROK_DOMAIN%
    start "ngrok - Scan2Fix" cmd /k "ngrok http 5000 --domain=%NGROK_DOMAIN%"
)
echo.

:: Summary
echo =======================================
echo   ✓ ALL SERVICES STARTED!
echo =======================================
echo.
echo   Local:     http://localhost:5000/api
if not "%NGROK_DOMAIN%"=="" (
    echo   Public:    https://%NGROK_DOMAIN%/api
)
echo   Health:    http://localhost:5000/api/health
echo.
echo   PM2:       pm2 status / pm2 logs scan2fix
echo   ngrok:     Check the ngrok window
echo.
echo =======================================
echo.
echo Press any key to close this window...
echo (Services will keep running)
pause >nul