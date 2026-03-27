@echo off
title Scan2Fix - Stopping Services
color 0C

echo.
echo =======================================
echo   SCAN2FIX - Stopping All Services
echo   %date% %time%
echo =======================================
echo.

:: Stop PM2
echo [1/3] Stopping Node.js Server...
call pm2 stop scan2fix 2>nul
call pm2 delete scan2fix 2>nul
echo   ✓ Server: Stopped
echo.

:: Stop ngrok
echo [2/3] Stopping ngrok...
taskkill /F /IM ngrok.exe 2>nul
echo   ✓ ngrok: Stopped
echo.

:: MongoDB stays running (it's a system service)
echo [3/3] MongoDB: Still running (system service)
echo   To stop MongoDB: net stop MongoDB
echo.

echo =======================================
echo   ✓ ALL SERVICES STOPPED
echo =======================================
echo.
pause