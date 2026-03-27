@echo off
title Scan2Fix - Backup
color 0E

echo.
echo =======================================
echo   SCAN2FIX - Backup
echo   %date% %time%
echo =======================================
echo.

:: Create backup folder with timestamp
set TIMESTAMP=%date:~10,4%-%date:~4,2%-%date:~7,2%_%time:~0,2%-%time:~3,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_DIR=C:\Backups\scan2fix\%TIMESTAMP%

mkdir "%BACKUP_DIR%" 2>nul

:: Backup MongoDB
echo [1/3] Backing up database...
mongodump --db scan2fix --out "%BACKUP_DIR%\database" 2>nul
if %ERRORLEVEL% == 0 (
    echo   ✓ Database backed up
) else (
    echo   ✗ Database backup failed (is MongoDB running?)
)
echo.

:: Backup uploads
echo [2/3] Backing up uploaded files...
xcopy /E /I /Y /Q "C:\Projects\Scan2Fix\server\uploads" "%BACKUP_DIR%\uploads" >nul 2>nul
echo   ✓ Uploads backed up
echo.

:: Backup .env
echo [3/3] Backing up configuration...
copy "C:\Projects\Scan2Fix\server\.env" "%BACKUP_DIR%\server.env" >nul 2>nul
copy "C:\Projects\Scan2Fix\mobile-app\.env" "%BACKUP_DIR%\mobile-app.env" >nul 2>nul
echo   ✓ Config backed up
echo.

echo =======================================
echo   ✓ BACKUP COMPLETE!
echo   Location: %BACKUP_DIR%
echo =======================================
echo.

:: Show backup size
for /f "tokens=3" %%a in ('dir /s "%BACKUP_DIR%" ^| find "File(s)"') do set SIZE=%%a
echo   Total size: %SIZE% bytes
echo.

pause