# ============================================
# SCAN2FIX — PM2 Auto-Start Setup
# PM2 keeps the Node.js server running 24/7
# and auto-restarts it if it crashes.
# ============================================

$ROOT        = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$SERVER_PATH = Join-Path $ROOT "server"

Write-Host ""
Write-Host "" -ForegroundColor Cyan
Write-Host "  PM2 Auto-Start Setup" -ForegroundColor Cyan
Write-Host "" -ForegroundColor Cyan
Write-Host ""

# Check PM2
try {
    $version = pm2 --version 2>$null
    Write-Host "OK: PM2 installed: v$version" -ForegroundColor Green
} catch {
    Write-Host "  Installing PM2..." -ForegroundColor Cyan
    npm install -g pm2
    Write-Host "  DONE" -ForegroundColor Green
}

# Check server path
if (-not (Test-Path $SERVER_PATH)) {
    Write-Host "ERROR: Server folder not found: $SERVER_PATH" -ForegroundColor Red
    pause
    exit
}

# Check .env
$envFile = Join-Path $SERVER_PATH ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "WARNING:  WARNING: .env file not found at $envFile" -ForegroundColor Yellow
    Write-Host "   The server needs a .env file to connect to MongoDB." -ForegroundColor Yellow
    $cont = Read-Host "   Continue anyway? (y/n)"
    if ($cont -ne 'y') { exit }
}

# Install Windows startup helper (pm2 startup does not work on Windows)
$pm2WinStartup = npm list -g pm2-windows-startup 2>$null
if (-not ($pm2WinStartup -match "pm2-windows-startup")) {
    Write-Host "Installing pm2-windows-startup..." -ForegroundColor Cyan
    npm install -g pm2-windows-startup
}
pm2-windows-startup install

# Start with PM2
Write-Host ""
Write-Host "Starting server with PM2..." -ForegroundColor Yellow
Push-Location $SERVER_PATH
pm2 start ecosystem.config.js
pm2 save
Pop-Location

Write-Host ""
pm2 status

# Test health
Write-Host ""
Write-Host "Testing server..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 5
    Write-Host "OK: Server responding: $($health.message)" -ForegroundColor Green
} catch {
    Write-Host "WARNING:  Server may still be starting. Check:" -ForegroundColor Yellow
    Write-Host "   pm2 logs scan2fix" -ForegroundColor Cyan
    Write-Host "   http://localhost:5000/api/health" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "" -ForegroundColor Green
Write-Host "  OK: PM2 Setup Complete!" -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Write-Host ""
Write-Host "  PM2 commands:" -ForegroundColor White
Write-Host "  pm2 status              - Check status" -ForegroundColor Gray
Write-Host "  pm2 logs scan2fix       - View logs" -ForegroundColor Gray
Write-Host "  pm2 restart scan2fix    - Restart server" -ForegroundColor Gray
Write-Host "  pm2 monit               - Live monitor" -ForegroundColor Gray
Write-Host ""
pause
