@echo off
title Scan2Fix - Status Check
color 0B

echo.
echo =======================================
echo   SCAN2FIX - Service Status
echo   %date% %time%
echo =======================================
echo.

:: MongoDB
echo [MongoDB]
sc query MongoDB | find "STATE"
echo.

:: PM2 / Node.js
echo [Node.js Server - PM2]
call pm2 status 2>nul
echo.

:: ngrok
echo [ngrok Tunnel]
tasklist /FI "IMAGENAME eq ngrok.exe" 2>nul | find "ngrok" >nul
if %ERRORLEVEL% == 0 (
    echo   Status: RUNNING
) else (
    echo   Status: NOT RUNNING
)
echo.

:: Health Check
echo [API Health Check]
curl -s http://localhost:5000/api/health 2>nul
echo.
echo.

:: ngrok URL
set DOMAIN_FILE=C:\Projects\Scan2Fix\deployment\ngrok-domain.txt
if exist "%DOMAIN_FILE%" (
    set /p DOMAIN=<"%DOMAIN_FILE%"
    echo [Public URL]
    echo   https://%DOMAIN%/api
    echo.
)

echo =======================================
echo.
pause