# ============================================
# SCAN2FIX — PM2 Auto-Start Setup
# ============================================

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  PM2 Auto-Start Setup" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check PM2
try {
    $version = pm2 --version 2>$null
    Write-Host "✅ PM2 installed: v$version" -ForegroundColor Green
} catch {
    Write-Host "Installing PM2..."
    npm install -g pm2
}

# Start the server
Write-Host ""
Write-Host "Starting server with PM2..." -ForegroundColor Yellow

Set-Location "C:\Projects\Scan2Fix\server"
pm2 start ecosystem.config.js
pm2 save

Write-Host ""
pm2 status

Write-Host ""
Write-Host "✅ Server started with PM2" -ForegroundColor Green

# Test
Write-Host ""
Write-Host "Testing server..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 5
    Write-Host "✅ Server responding: $($health.message)" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Server may still be starting. Wait a few seconds and check:" -ForegroundColor Yellow
    Write-Host "  http://localhost:5000/api/health" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ PM2 Setup Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Useful PM2 commands:" -ForegroundColor White
Write-Host "  pm2 status        - Check status" -ForegroundColor Gray
Write-Host "  pm2 logs scan2fix - View logs" -ForegroundColor Gray
Write-Host "  pm2 restart scan2fix - Restart" -ForegroundColor Gray
Write-Host "  pm2 monit         - Live monitor" -ForegroundColor Gray
Write-Host ""
pause