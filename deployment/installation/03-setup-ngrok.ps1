# ============================================================
# SCAN2FIX -- ngrok Setup (Free Static Domain)
# Creates a permanent public URL so the app works anywhere.
# ============================================================

$ROOT        = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$DOMAIN_FILE = Join-Path (Split-Path $PSScriptRoot -Parent) "ngrok-domain.txt"

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  ngrok Setup" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Refresh PATH from registry (picks up winget installs done in the same session)
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# WinGet sometimes installs to a Links folder not yet in the registry PATH — add it explicitly
$wingetLinks = "$env:LOCALAPPDATA\Microsoft\WinGet\Links"
if (Test-Path $wingetLinks) { $env:Path += ";$wingetLinks" }

# Also search WinGet packages folder for ngrok.exe in case symlink wasn't created
$ngrokExe = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter "ngrok.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if ($ngrokExe) { $env:Path += ";$($ngrokExe.DirectoryName)" }

# Check ngrok is now reachable
$ngrokCmd = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokCmd) {
    Write-Host "ERROR: ngrok not found in PATH." -ForegroundColor Red
    Write-Host ""
    Write-Host "Fix options:" -ForegroundColor Yellow
    Write-Host "  1. Close this window, open a NEW PowerShell as Admin, run this script again." -ForegroundColor White
    Write-Host "  2. Or install manually: winget install Ngrok.Ngrok" -ForegroundColor White
    pause
    exit
}

$version = ngrok version 2>$null
Write-Host "OK: ngrok installed: $version" -ForegroundColor Green

# -- Step 1: Auth token ----------------------------------------
Write-Host ""
Write-Host "Step 1: ngrok Authentication" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Get your auth token from:" -ForegroundColor Cyan
Write-Host "  https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor Cyan
Write-Host ""

$hasToken = Read-Host "Have you already added your auth token? (y/n)"
if ($hasToken -ne "y") {
    $token = Read-Host "Paste your ngrok auth token"
    if ($token) {
        ngrok config add-authtoken $token
        Write-Host "OK: Auth token saved" -ForegroundColor Green
    } else {
        Write-Host "ERROR: No token provided." -ForegroundColor Red
        pause
        exit
    }
}

# -- Step 2: Static domain ------------------------------------
Write-Host ""
Write-Host "Step 2: Free Static Domain" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Go to: https://dashboard.ngrok.com/domains" -ForegroundColor Cyan
Write-Host "  2. Click New Domain (1 free domain per account)" -ForegroundColor Cyan
Write-Host "  3. Copy the domain e.g. something-random.ngrok-free.app" -ForegroundColor Cyan
Write-Host ""

$openDomains = Read-Host "Open ngrok domains page now? (y/n)"
if ($openDomains -eq "y") {
    Start-Process "https://dashboard.ngrok.com/domains"
    Write-Host ""
    Write-Host "Create your free domain, then come back here..." -ForegroundColor Yellow
    Write-Host ""
}

$domain = Read-Host "Enter your ngrok static domain"
if (-not $domain) {
    Write-Host "ERROR: No domain provided. Run this script again when ready." -ForegroundColor Red
    pause
    exit
}

# Clean up URL if user pasted full https://
$domain = $domain -replace "https://", "" -replace "http://", "" -replace "/.*", ""

# Save domain to config file
$domain | Out-File -FilePath $DOMAIN_FILE -Encoding UTF8 -NoNewline
Write-Host ""
Write-Host "OK: Domain saved: $domain" -ForegroundColor Green
Write-Host "   Config file: $DOMAIN_FILE" -ForegroundColor Gray
Write-Host ""
Write-Host "   Your API will be available at:" -ForegroundColor White
Write-Host "   https://$domain/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Update your mobile app .env with:" -ForegroundColor White
Write-Host "   API_URL=https://$domain/api" -ForegroundColor Cyan

# -- Step 3: Test ---------------------------------------------
Write-Host ""
Write-Host "Step 3: Test Connection" -ForegroundColor Yellow
Write-Host ""
$testNow = Read-Host "Start ngrok now to test? Server must already be running. (y/n)"
if ($testNow -eq "y") {
    Write-Host ""
    Write-Host "Starting ngrok... (Ctrl+C to stop)" -ForegroundColor Yellow
    Write-Host "Test in browser: https://$domain/api/health" -ForegroundColor Cyan
    Write-Host ""
    ngrok http 5000 --domain=$domain
}

Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "  ngrok Setup Complete!" -ForegroundColor Green
Write-Host "  Domain: https://$domain" -ForegroundColor White
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""
pause
