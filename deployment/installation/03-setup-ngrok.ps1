# ============================================
# SCAN2FIX — ngrok Setup + Static Domain
# ============================================

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ngrok Setup" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check ngrok
try {
    $version = ngrok version 2>$null
    Write-Host "✅ ngrok installed: $version" -ForegroundColor Green
} catch {
    Write-Host "❌ ngrok not installed. Run 01-install-all.ps1 first." -ForegroundColor Red
    pause
    exit
}

# Check auth
Write-Host ""
Write-Host "Step 1: ngrok Authentication" -ForegroundColor Yellow
Write-Host "─────────────────────────────" -ForegroundColor DarkGray
Write-Host ""
Write-Host "If you haven't added your auth token yet:" -ForegroundColor White
Write-Host "  1. Go to: https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor Cyan
Write-Host "  2. Copy your auth token" -ForegroundColor Cyan
Write-Host ""

$hasToken = Read-Host "Have you already added your auth token? (y/n)"

if ($hasToken -ne 'y') {
    $token = Read-Host "Paste your ngrok auth token"
    if ($token) {
        ngrok config add-authtoken $token
        Write-Host "✅ Auth token saved!" -ForegroundColor Green
    } else {
        Write-Host "❌ No token provided. Please get one from the ngrok dashboard." -ForegroundColor Red
        pause
        exit
    }
}

# Get static domain
Write-Host ""
Write-Host "Step 2: Static Domain (FREE)" -ForegroundColor Yellow
Write-Host "─────────────────────────────" -ForegroundColor DarkGray
Write-Host ""
Write-Host "To get a FREE permanent URL:" -ForegroundColor White
Write-Host "  1. Go to: https://dashboard.ngrok.com/domains" -ForegroundColor Cyan
Write-Host "  2. Click 'New Domain' (1 free domain per account)" -ForegroundColor Cyan
Write-Host "  3. Copy the domain name" -ForegroundColor Cyan
Write-Host ""

$openDomains = Read-Host "Open ngrok domains page now? (y/n)"
if ($openDomains -eq 'y') {
    Start-Process "https://dashboard.ngrok.com/domains"
    Write-Host ""
    Write-Host "Create your free domain, then come back here..." -ForegroundColor Yellow
    Write-Host ""
}

$domain = Read-Host "Enter your ngrok static domain (e.g., something-random.ngrok-free.app)"

if (-not $domain) {
    Write-Host "❌ No domain provided. You can run this script again later." -ForegroundColor Red
    pause
    exit
}

# Remove https:// if user pasted full URL
$domain = $domain -replace "https://", "" -replace "http://", "" -replace "/.*", ""

Write-Host ""
Write-Host "Your domain: $domain" -ForegroundColor Cyan

# Save domain to config file
$configPath = "C:\Projects\Scan2Fix\deployment\ngrok-domain.txt"
$domain | Out-File -FilePath $configPath -Encoding UTF8 -NoNewline
Write-Host "✅ Domain saved to: $configPath" -ForegroundColor Green

# Update mobile app .env
$envPath = "C:\Projects\Scan2Fix\mobile-app\.env"
"API_URL=https://$domain/api" | Out-File -FilePath $envPath -Encoding UTF8 -NoNewline
Write-Host "✅ Updated mobile-app/.env" -ForegroundColor Green

# Update runner scripts with domain
Write-Host "✅ Domain configured for all scripts" -ForegroundColor Green

# Test it
Write-Host ""
Write-Host "Step 3: Testing..." -ForegroundColor Yellow
Write-Host "─────────────────────────────" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Make sure the server is running (npm run dev), then:" -ForegroundColor White
Write-Host ""
Write-Host "  ngrok http 5000 --domain=$domain" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test URL: https://$domain/api/health" -ForegroundColor Cyan
Write-Host ""

$testNow = Read-Host "Start ngrok now to test? (y/n)"
if ($testNow -eq 'y') {
    Write-Host ""
    Write-Host "Starting ngrok... (Press Ctrl+C to stop)" -ForegroundColor Yellow
    Write-Host "Test in browser: https://$domain/api/health" -ForegroundColor Cyan
    Write-Host ""
    ngrok http 5000 --domain=$domain
}

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ ngrok Setup Complete!" -ForegroundColor Green
Write-Host "  Domain: $domain" -ForegroundColor White
Write-Host "  API URL: https://$domain/api" -ForegroundColor White
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host ""
pause