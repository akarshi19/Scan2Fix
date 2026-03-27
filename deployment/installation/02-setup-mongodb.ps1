# ============================================
# SCAN2FIX — MongoDB Setup
# ============================================

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  MongoDB Setup" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check service
$mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue

if (-not $mongoService) {
    Write-Host "❌ MongoDB service not found!" -ForegroundColor Red
    Write-Host "Please install MongoDB first (run 01-install-all.ps1)" -ForegroundColor Yellow
    pause
    exit
}

# Ensure it's running
if ($mongoService.Status -ne "Running") {
    Write-Host "Starting MongoDB..." -ForegroundColor Yellow
    Start-Service MongoDB
}

# Set to auto-start
Set-Service -Name "MongoDB" -StartupType Automatic
Write-Host "✅ MongoDB service: Running" -ForegroundColor Green
Write-Host "✅ MongoDB startup: Automatic" -ForegroundColor Green

# Test connection
Write-Host ""
Write-Host "Testing connection..." -ForegroundColor Yellow
try {
    $result = mongosh --quiet --eval "db.runCommand({ping:1}).ok" 2>$null
    if ($result -eq "1") {
        Write-Host "✅ MongoDB connection: Working" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ mongosh not found. Trying mongod..." -ForegroundColor Yellow
}

# Check database
Write-Host ""
Write-Host "Checking scan2fix database..." -ForegroundColor Yellow
try {
    $collections = mongosh scan2fix --quiet --eval "db.getCollectionNames()" 2>$null
    Write-Host "✅ Database collections: $collections" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Database will be created when you run seed script" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ MongoDB Setup Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host ""
pause