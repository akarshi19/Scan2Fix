# ============================================
# SCAN2FIX — Create Admin Account
# Run this ONCE on a fresh server to create
# the master admin login.
# ============================================

$ROOT        = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$SERVER_PATH = Join-Path $ROOT "server"

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Create Admin Account" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  This will create the master admin account." -ForegroundColor White
Write-Host "  The server must be running (run 04-setup-pm2.ps1 first)." -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Continue? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "Cancelled." -ForegroundColor Gray
    exit
}

# Check server is running
try {
    Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 5 | Out-Null
    Write-Host "✅ Server is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is not responding at http://localhost:5000" -ForegroundColor Red
    Write-Host "   Start the server first: run 04-setup-pm2.ps1" -ForegroundColor Yellow
    pause
    exit
}

Write-Host ""
Write-Host "Enter admin account details:" -ForegroundColor Yellow
$adminEmail = Read-Host "  Admin email (e.g. admin@yourcompany.com)"
$adminName  = Read-Host "  Admin full name"
$adminPhone = Read-Host "  Admin phone (10 digits)"

if (-not $adminEmail -or -not $adminName -or -not $adminPhone) {
    Write-Host "❌ All fields are required." -ForegroundColor Red
    pause
    exit
}

# First send verification code
Write-Host ""
Write-Host "Sending verification code to $adminEmail..." -ForegroundColor Yellow
try {
    $verifyBody = @{ email = $adminEmail; full_name = $adminName } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:5000/api/auth/send-verification-code" `
        -Method POST -ContentType "application/json" -Body $verifyBody -TimeoutSec 10 | Out-Null
    Write-Host "✅ Verification code sent to $adminEmail" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not send verification email." -ForegroundColor Yellow
    Write-Host "   Check your .env EMAIL settings." -ForegroundColor Gray
}

$verifyCode = Read-Host "Enter the verification code from your email"

# Verify code
try {
    $codeBody = @{ email = $adminEmail; code = $verifyCode } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:5000/api/auth/verify-email-code" `
        -Method POST -ContentType "application/json" -Body $codeBody -TimeoutSec 10 | Out-Null
    Write-Host "✅ Email verified" -ForegroundColor Green
} catch {
    Write-Host "❌ Verification failed. Check the code and try again." -ForegroundColor Red
    pause
    exit
}

# Note: Signup only allows USER/STAFF roles. Admin must be created manually via MongoDB.
Write-Host ""
Write-Host "  Creating admin account via database..." -ForegroundColor Yellow

$password = Read-Host "  Set admin password (min 6 chars, letters + numbers)"

$createScript = @"
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
require('dotenv').config();

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const User = require('./models/User_v2');

  const existing = await User.findOne({ email: '$adminEmail' });
  if (existing) {
    if (existing.role !== 'ADMIN') {
      existing.role = 'ADMIN';
      await existing.save();
      console.log('UPDATED_TO_ADMIN');
    } else {
      console.log('ALREADY_ADMIN');
    }
  } else {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash('$password', salt);
    await User.create({
      email: '$adminEmail',
      password: hashed,
      full_name: '$adminName',
      phone: '$adminPhone',
      role: 'ADMIN',
      is_active: true,
      is_verified: true,
    });
    console.log('CREATED');
  }
  await mongoose.disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
"@

$tmpScript = Join-Path $env:TEMP "create-admin.js"
$createScript | Out-File -FilePath $tmpScript -Encoding UTF8

Push-Location $SERVER_PATH
$result = node $tmpScript 2>&1
Pop-Location
Remove-Item $tmpScript -Force

if ($result -match "CREATED") {
    Write-Host "✅ Admin account created!" -ForegroundColor Green
} elseif ($result -match "UPDATED_TO_ADMIN") {
    Write-Host "✅ Existing account promoted to ADMIN!" -ForegroundColor Green
} elseif ($result -match "ALREADY_ADMIN") {
    Write-Host "✅ Admin account already exists." -ForegroundColor Green
} else {
    Write-Host "⚠️  Result: $result" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ Admin Setup Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Login: $adminEmail" -ForegroundColor Cyan
Write-Host "  URL:   http://localhost:5000/api/health" -ForegroundColor Cyan
Write-Host ""
pause
