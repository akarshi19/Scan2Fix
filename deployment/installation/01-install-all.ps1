# ============================================
# SCAN2FIX — Master Installation Script
# ============================================

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  SCAN2FIX — Master Installation Script" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ Please run this script as Administrator!" -ForegroundColor Red
    Write-Host "   Right-click PowerShell → Run as Administrator" -ForegroundColor Yellow
    pause
    exit
}

$totalSteps = 8
$currentStep = 0

function Show-Step {
    param($message)
    $script:currentStep++
    Write-Host ""
    Write-Host "[$script:currentStep/$totalSteps] $message" -ForegroundColor Yellow
    Write-Host ("─" * 50) -ForegroundColor DarkGray
}

# ────────────────────────────────────────
# STEP 1: Check/Install Node.js
# ────────────────────────────────────────
Show-Step "Checking Node.js..."

$nodeVersion = $null
try { 
    $nodeVersion = node --version 2>$null 
} catch {}

if ($nodeVersion) {
    Write-Host "  ✅ Node.js already installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "  📦 Installing Node.js..." -ForegroundColor Cyan
    winget install --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    try { 
        $nodeVersion = node --version 2>$null
        Write-Host "  ✅ Node.js installed: $nodeVersion" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️ Node.js installed. Please RESTART PowerShell and run this script again." -ForegroundColor Yellow
        pause
        exit
    }
}

# ────────────────────────────────────────
# STEP 2: Check/Install MongoDB
# ────────────────────────────────────────
Show-Step "Checking MongoDB..."

$mongoRunning = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue

if ($mongoRunning) {
    Write-Host "  ✅ MongoDB service found: $($mongoRunning.Status)" -ForegroundColor Green
    if ($mongoRunning.Status -ne "Running") {
        Start-Service MongoDB
        Write-Host "  ✅ MongoDB started" -ForegroundColor Green
    }
} else {
    Write-Host "  📦 MongoDB not found!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Please install MongoDB manually:" -ForegroundColor Cyan
    Write-Host "  1. Go to: https://www.mongodb.com/try/download/community" -ForegroundColor White
    Write-Host "  2. Download: Windows x64 MSI" -ForegroundColor White
    Write-Host "  3. During install: Check 'Install as Service'" -ForegroundColor White
    Write-Host "  4. After install: Re-run this script" -ForegroundColor White
    Write-Host ""
    
    $openBrowser = Read-Host "  Open MongoDB download page now? (y/n)"
    if ($openBrowser -eq 'y') {
        Start-Process "https://www.mongodb.com/try/download/community"
    }
    
    Write-Host ""
    Write-Host "  After installing MongoDB, run this script again." -ForegroundColor Yellow
    pause
    exit
}

# ────────────────────────────────────────
# STEP 3: Check/Install ngrok
# ────────────────────────────────────────
Show-Step "Checking ngrok..."

$ngrokVersion = $null
try { 
    $ngrokVersion = ngrok version 2>$null 
} catch {}

if ($ngrokVersion) {
    Write-Host "  ✅ ngrok already installed: $ngrokVersion" -ForegroundColor Green
} else {
    Write-Host "  📦 Installing ngrok..." -ForegroundColor Cyan
    winget install --id Ngrok.Ngrok --accept-source-agreements --accept-package-agreements
    
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    try {
        $ngrokVersion = ngrok version 2>$null
        Write-Host "  ✅ ngrok installed: $ngrokVersion" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️ ngrok installed. Please RESTART PowerShell and run this script again." -ForegroundColor Yellow
        pause
        exit
    }
}

# ────────────────────────────────────────
# STEP 4: Install PM2
# ────────────────────────────────────────
Show-Step "Checking PM2..."

$pm2Version = $null
try { 
    $pm2Version = pm2 --version 2>$null 
} catch {}

if ($pm2Version) {
    Write-Host "  ✅ PM2 already installed: $pm2Version" -ForegroundColor Green
} else {
    Write-Host "  📦 Installing PM2..." -ForegroundColor Cyan
    npm install -g pm2
    Write-Host "  ✅ PM2 installed" -ForegroundColor Green
}

# ────────────────────────────────────────
# STEP 5: Install Server Dependencies
# ────────────────────────────────────────
Show-Step "Installing server dependencies..."

$serverPath = Join-Path $PSScriptRoot "..\..\server"
if (Test-Path $serverPath) {
    Set-Location $serverPath
    npm install
    Write-Host "  ✅ Server dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ❌ Server folder not found at $serverPath" -ForegroundColor Red
    Write-Host "  Current location: $PSScriptRoot" -ForegroundColor Yellow
}

# ────────────────────────────────────────
# STEP 6: Install Mobile App Dependencies
# ────────────────────────────────────────
Show-Step "Installing mobile app dependencies..."

$mobilePath = Join-Path $PSScriptRoot "..\..\mobile-app"
if (Test-Path $mobilePath) {
    Set-Location $mobilePath
    npm install
    Write-Host "  ✅ Mobile app dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ⚠️ Mobile app folder not found at $mobilePath" -ForegroundColor Yellow
}

# ────────────────────────────────────────
# STEP 7: Generate JWT Secret
# ────────────────────────────────────────
Show-Step "Configuring server environment..."

$envPath = Join-Path $PSScriptRoot "..\..\server\.env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    
    if ($envContent -match "your_super_secret") {
        Write-Host "  🔑 Generating strong JWT secret..." -ForegroundColor Cyan
        $secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
        $envContent = $envContent -replace "your_super_secret_jwt_key_change_this_in_production_2025", $secret
        $envContent | Out-File -FilePath $envPath -Encoding UTF8 -NoNewline
        Write-Host "  ✅ JWT secret updated" -ForegroundColor Green
    } else {
        Write-Host "  ✅ JWT secret already configured" -ForegroundColor Green
    }
} else {
    Write-Host "  ⚠️ .env file not found. Please create it." -ForegroundColor Yellow
}

# ────────────────────────────────────────
# STEP 8: Create required folders
# ────────────────────────────────────────
Show-Step "Creating required folders..."

$projectRoot = Join-Path $PSScriptRoot "..\.."
$folders = @(
    (Join-Path $projectRoot "server\uploads\profiles"),
    (Join-Path $projectRoot "server\uploads\complaints"),
    (Join-Path $projectRoot "server\logs"),
    "C:\Backups\scan2fix"
)

foreach ($folder in $folders) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
        Write-Host "  📁 Created: $folder" -ForegroundColor Gray
    }
}
Write-Host "  ✅ All folders ready" -ForegroundColor Green

# ────────────────────────────────────────
# SUMMARY
# ────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  INSTALLED:" -ForegroundColor White
Write-Host "  ✅ Node.js" -ForegroundColor Gray
Write-Host "  ✅ MongoDB" -ForegroundColor Gray
Write-Host "  ✅ ngrok" -ForegroundColor Gray
Write-Host "  ✅ PM2" -ForegroundColor Gray
Write-Host "  ✅ Server dependencies" -ForegroundColor Gray
Write-Host "  ✅ Mobile app dependencies" -ForegroundColor Gray
Write-Host ""
Write-Host "  NEXT STEPS:" -ForegroundColor Yellow
Write-Host "  1. Run: .\deployment\installation\02-setup-mongodb.ps1" -ForegroundColor White
Write-Host "  2. Run: .\deployment\installation\03-setup-ngrok.ps1" -ForegroundColor White
Write-Host "  3. Run: .\deployment\installation\04-setup-pm2.ps1" -ForegroundColor White
Write-Host "  4. Run: .\deployment\installation\05-seed-database.ps1" -ForegroundColor White
Write-Host ""
pause