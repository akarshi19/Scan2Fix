# SCAN2FIX Installation Script
Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  SCAN2FIX - Installation" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Please run as Administrator!" -ForegroundColor Red
    pause
    exit
}

Write-Host "[1/8] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVer = node --version 2>$null
    Write-Host "  OK: Node.js $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "  Installing Node.js..." -ForegroundColor Cyan
    winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Host "  DONE. Please restart PowerShell and run again." -ForegroundColor Yellow
    pause
    exit
}

Write-Host ""
Write-Host "[2/8] Checking MongoDB..." -ForegroundColor Yellow
$mongo = Get-Service MongoDB -ErrorAction SilentlyContinue
if ($mongo) {
    Write-Host "  OK: MongoDB found" -ForegroundColor Green
    if ($mongo.Status -ne "Running") {
        Start-Service MongoDB
        Write-Host "  Started MongoDB" -ForegroundColor Green
    }
} else {
    Write-Host "  ERROR: MongoDB not installed!" -ForegroundColor Red
    Write-Host "  Download from: https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
    $open = Read-Host "  Open download page? (y/n)"
    if ($open -eq 'y') {
        Start-Process "https://www.mongodb.com/try/download/community"
    }
    pause
    exit
}

Write-Host ""
Write-Host "[3/8] Checking ngrok..." -ForegroundColor Yellow
try {
    $ngrokVer = ngrok version 2>$null
    Write-Host "  OK: ngrok installed" -ForegroundColor Green
} catch {
    Write-Host "  Installing ngrok..." -ForegroundColor Cyan
    winget install Ngrok.Ngrok --accept-source-agreements --accept-package-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Host "  DONE" -ForegroundColor Green
}

Write-Host ""
Write-Host "[4/8] Checking PM2..." -ForegroundColor Yellow
try {
    $pm2Ver = pm2 --version 2>$null
    Write-Host "  OK: PM2 installed" -ForegroundColor Green
} catch {
    Write-Host "  Installing PM2..." -ForegroundColor Cyan
    npm install -g pm2
    Write-Host "  DONE" -ForegroundColor Green
}

Write-Host ""
Write-Host "[5/8] Installing server dependencies..." -ForegroundColor Yellow
$serverPath = "C:\Users\user\Scan2Fix\server"
if (Test-Path $serverPath) {
    Set-Location $serverPath
    npm install
    Write-Host "  DONE" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Server folder not found!" -ForegroundColor Red
}

Write-Host ""
Write-Host "[6/8] Installing mobile app dependencies..." -ForegroundColor Yellow
$mobilePath = "C:\Users\user\Scan2Fix\mobile-app"
if (Test-Path $mobilePath) {
    Set-Location $mobilePath
    npm install
    Write-Host "  DONE" -ForegroundColor Green
} else {
    Write-Host "  WARNING: Mobile app folder not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[7/8] Configuring environment..." -ForegroundColor Yellow
$envFile = "C:\Users\user\Scan2Fix\server\.env"
if (Test-Path $envFile) {
    Write-Host "  OK: .env file exists" -ForegroundColor Green
} else {
    Write-Host "  WARNING: .env file missing" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[8/8] Creating folders..." -ForegroundColor Yellow
$folders = @(
    "C:\Users\user\Scan2Fix\server\uploads\profiles",
    "C:\Users\user\Scan2Fix\server\uploads\complaints",
    "C:\Users\user\Scan2Fix\server\logs",
    "C:\Backups\scan2fix"
)
foreach ($folder in $folders) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
    }
}
Write-Host "  DONE" -ForegroundColor Green

Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "  INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. .\deployment\installation\02-setup-mongodb.ps1" -ForegroundColor White
Write-Host "  2. .\deployment\installation\03-setup-ngrok.ps1" -ForegroundColor White
Write-Host "  3. .\deployment\installation\04-setup-pm2.ps1" -ForegroundColor White
Write-Host "  4. .\deployment\installation\05-seed-database.ps1" -ForegroundColor White
Write-Host ""
pause