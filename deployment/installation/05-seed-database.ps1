# ============================================
# SCAN2FIX — Seed Database with Test Data
# ============================================

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Seed Database" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  This will create demo users, assets, and complaints." -ForegroundColor Yellow
Write-Host "   Existing data will be DELETED!" -ForegroundColor Red
Write-Host ""

$confirm = Read-Host "Continue? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "Cancelled." -ForegroundColor Gray
    exit
}

Set-Location "C:\Projects\Scan2Fix\server"
node seed.js

Write-Host ""
Write-Host "Testing login..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"email":"admin@scan2fix.com","password":"admin123"}'
    
    if ($response.success) {
        Write-Host "✅ Admin login works!" -ForegroundColor Green
        Write-Host "   Role: $($response.data.user.role)" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️ Login test failed. Server may not be running." -ForegroundColor Yellow
    Write-Host "   Start server first: pm2 start ecosystem.config.js" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ Database Seeded!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  LOGIN CREDENTIALS:" -ForegroundColor White
Write-Host "  ┌────────────────────────────────────────┐" -ForegroundColor Gray
Write-Host "  │ 👑 admin@scan2fix.com  / admin123      │" -ForegroundColor Gray
Write-Host "  │ 🔧 rahul@scan2fix.com  / staff123      │" -ForegroundColor Gray
Write-Host "  │ 🔧 priya@scan2fix.com  / staff123      │" -ForegroundColor Gray
Write-Host "  │ 👤 amit@office.com     / user123       │" -ForegroundColor Gray
Write-Host "  │ 👤 neha@office.com     / user123       │" -ForegroundColor Gray
Write-Host "  └────────────────────────────────────────┘" -ForegroundColor Gray
Write-Host ""
pause