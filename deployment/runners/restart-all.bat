@echo off
title Scan2Fix - Restarting Services
color 0E

echo.
echo =======================================
echo   SCAN2FIX - Restarting All Services
echo =======================================
echo.

:: Stop everything first
echo Stopping services...
call pm2 stop scan2fix 2>nul
call pm2 delete scan2fix 2>nul
taskkill /F /IM ngrok.exe 2>nul
echo   ✓ All stopped
echo.

:: Wait
timeout /t 2 /nobreak >nul

:: Start everything
echo Starting services...
call "%~dp0start-all.bat"