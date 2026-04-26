# ============================================
# SCAN2FIX — Test MongoDB Connection
# ============================================

Write-Host ""
Write-Host "Testing MongoDB..." -ForegroundColor Yellow
Write-Host ""

Write-Host "[1/2] MongoDB Service Status" -ForegroundColor Cyan
$mongo = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
if ($mongo) {
    Write-Host "  Service found: $($mongo.Status)" -ForegroundColor Green
} else {
    Write-Host "  MongoDB service not found" -ForegroundColor Red
    Write-Host "  Install MongoDB from: https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[2/2] .env Configuration" -ForegroundColor Cyan

$ROOT    = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$envPath = Join-Path $ROOT "server\.env"

if (Test-Path $envPath) {
    Write-Host "  .env file: Found" -ForegroundColor Green

    $mongoUri = Select-String "MONGO_URI" $envPath
    if ($mongoUri) {
        Write-Host "  MONGO_URI: Configured" -ForegroundColor Green
    } else {
        Write-Host "  MONGO_URI: NOT configured" -ForegroundColor Red
    }
} else {
    Write-Host "  .env file: NOT FOUND at $envPath" -ForegroundColor Red
    Write-Host "  Create .env with MONGO_URI=mongodb://localhost:27017/scan2fix" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
