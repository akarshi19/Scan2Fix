# ============================================
# SCAN2FIX — Update Server to Latest Code
# Run this on the office server whenever a
# new server build is released on GitHub.
# ============================================

$ROOT        = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$SERVER_PATH = Join-Path $ROOT "server"

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Scan2Fix — Server Update" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ── Check server path ──────────────────────────────────────────────
if (-not (Test-Path $SERVER_PATH)) {
    Write-Host "❌ Server path not found: $SERVER_PATH" -ForegroundColor Red
    pause; exit
}

Push-Location $ROOT

# ── Step 1: Pull latest code ───────────────────────────────────────
Write-Host "[1/4] Pulling latest code from GitHub..." -ForegroundColor Yellow
$pullResult = git pull origin main 2>&1
Write-Host "  $pullResult" -ForegroundColor Gray

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ git pull failed. Check your internet connection or repo access." -ForegroundColor Red
    Pop-Location; pause; exit
}
Write-Host "  ✅ Code updated" -ForegroundColor Green

# ── Step 2: Install / update dependencies ─────────────────────────
Write-Host ""
Write-Host "[2/4] Installing server dependencies..." -ForegroundColor Yellow
Push-Location $SERVER_PATH
npm install --only=production --silent
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ⚠️ npm install had warnings. Check logs." -ForegroundColor Yellow
}
Pop-Location

# ── Step 3: Restart PM2 ───────────────────────────────────────────
Write-Host ""
Write-Host "[3/4] Restarting server (PM2)..." -ForegroundColor Yellow
$pm2Running = pm2 jlist 2>$null | ConvertFrom-Json | Where-Object { $_.name -eq "scan2fix" }

if ($pm2Running) {
    pm2 restart scan2fix
    Write-Host "  ✅ Server restarted" -ForegroundColor Green
} else {
    Write-Host "  PM2 process not found, starting fresh..." -ForegroundColor Yellow
    Push-Location $SERVER_PATH
    pm2 start ecosystem.config.js
    pm2 save
    Pop-Location
    Write-Host "  ✅ Server started" -ForegroundColor Green
}

# ── Step 4: Health check ───────────────────────────────────────────
Write-Host ""
Write-Host "[4/4] Health check..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 10
    Write-Host "  ✅ $($health.message)" -ForegroundColor Green
    Write-Host "  Version: $($health.version)" -ForegroundColor Gray
} catch {
    Write-Host "  ⚠️ Server not responding yet. Check:" -ForegroundColor Yellow
    Write-Host "     pm2 logs scan2fix" -ForegroundColor Cyan
}

Pop-Location

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ Update Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host ""
pause
