# ============================================
# SCAN2FIX — Installation Script (Client Server)
# Run as Administrator on the client's Windows server
# ============================================

$ROOT        = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$SERVER_PATH = Join-Path $ROOT "server"

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  SCAN2FIX - Installation" -ForegroundColor Cyan
Write-Host "  Root: $ROOT" -ForegroundColor Gray
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Please run as Administrator!" -ForegroundColor Red
    pause
    exit
}

# ── [1/6] Node.js ──────────────────────────────────────────────────
Write-Host "[1/6] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVer = node --version 2>$null
    Write-Host "  OK: Node.js $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "  Installing Node.js LTS..." -ForegroundColor Cyan
    winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Host "  DONE. Please restart PowerShell and run again." -ForegroundColor Yellow
    pause
    exit
}

# ── [2/6] MongoDB ──────────────────────────────────────────────────
Write-Host ""
Write-Host "[2/6] Checking MongoDB..." -ForegroundColor Yellow
$mongo = Get-Service MongoDB -ErrorAction SilentlyContinue
if ($mongo) {
    Write-Host "  OK: MongoDB service found ($($mongo.Status))" -ForegroundColor Green
    if ($mongo.Status -ne "Running") {
        Start-Service MongoDB
        Write-Host "  Started MongoDB" -ForegroundColor Green
    }
} else {
    Write-Host "  MongoDB not installed!" -ForegroundColor Red
    Write-Host "  Download: https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
    $open = Read-Host "  Open download page? (y/n)"
    if ($open -eq 'y') { Start-Process "https://www.mongodb.com/try/download/community" }
    Write-Host "  Install MongoDB, then run this script again." -ForegroundColor Yellow
    pause
    exit
}

# ── [3/6] ngrok ────────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/6] Checking ngrok..." -ForegroundColor Yellow
try {
    $ngrokVer = ngrok version 2>$null
    Write-Host "  OK: $ngrokVer" -ForegroundColor Green
} catch {
    Write-Host "  Installing ngrok..." -ForegroundColor Cyan
    winget install Ngrok.Ngrok --accept-source-agreements --accept-package-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Host "  DONE" -ForegroundColor Green
}

# ── [4/6] PM2 ──────────────────────────────────────────────────────
Write-Host ""
Write-Host "[4/6] Checking PM2..." -ForegroundColor Yellow
try {
    $pm2Ver = pm2 --version 2>$null
    Write-Host "  OK: PM2 v$pm2Ver" -ForegroundColor Green
} catch {
    Write-Host "  Installing PM2..." -ForegroundColor Cyan
    npm install -g pm2
    Write-Host "  DONE" -ForegroundColor Green
}

# ── [5/6] Server dependencies ──────────────────────────────────────
Write-Host ""
Write-Host "[5/6] Installing server dependencies..." -ForegroundColor Yellow
if (Test-Path $SERVER_PATH) {
    Push-Location $SERVER_PATH
    npm install --only=production
    Pop-Location
    Write-Host "  DONE" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Server folder not found at $SERVER_PATH" -ForegroundColor Red
    pause
    exit
}

# ── [6/6] Folders + .env check ─────────────────────────────────────
Write-Host ""
Write-Host "[6/6] Creating folders + checking .env..." -ForegroundColor Yellow

$folders = @(
    (Join-Path $SERVER_PATH "uploads\profiles"),
    (Join-Path $SERVER_PATH "uploads\complaints"),
    (Join-Path $SERVER_PATH "logs"),
    "C:\Backups\scan2fix"
)
foreach ($folder in $folders) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
    }
}
Write-Host "  Folders created" -ForegroundColor Green

$envFile = Join-Path $SERVER_PATH ".env"
if (Test-Path $envFile) {
    Write-Host "  OK: .env file found" -ForegroundColor Green
} else {
    Write-Host "  WARNING: .env file missing at $envFile" -ForegroundColor Yellow
    Write-Host "  Copy your .env file to the server folder before starting." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "  INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. .\02-setup-mongodb.ps1   - Configure MongoDB" -ForegroundColor White
Write-Host "  2. .\03-setup-ngrok.ps1     - Setup internet tunnel" -ForegroundColor White
Write-Host "  3. .\04-setup-pm2.ps1       - Start server with auto-restart" -ForegroundColor White
Write-Host ""
pause
