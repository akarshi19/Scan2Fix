# ============================================
# SCAN2FIX — Detailed Health Check
# ============================================

Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  SCAN2FIX HEALTH CHECK" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check 1: MongoDB
Write-Host "[1] MongoDB Service" -ForegroundColor Yellow
$mongo = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
if ($mongo -and $mongo.Status -eq "Running") {
    Write-Host "    ✅ Running" -ForegroundColor Green
} else {
    Write-Host "    ❌ NOT Running" -ForegroundColor Red
    $allGood = $false
}
Write-Host ""

# Check 2: Node.js Server
Write-Host "[2] Node.js Server (PM2)" -ForegroundColor Yellow
try {
    $pm2Status = pm2 jlist 2>$null | ConvertFrom-Json
    $scan2fix = $pm2Status | Where-Object { $_.name -eq "scan2fix" }
    if ($scan2fix -and $scan2fix.pm2_env.status -eq "online") {
        Write-Host "    ✅ Online (PID: $($scan2fix.pid))" -ForegroundColor Green
        Write-Host "    Memory: $([math]::Round($scan2fix.monit.memory / 1MB, 1)) MB" -ForegroundColor Gray
        Write-Host "    Uptime: $([math]::Round((Get-Date - (Get-Date $scan2fix.pm2_env.pm_uptime)).TotalHours, 1)) hours" -ForegroundColor Gray
    } else {
        Write-Host "    ❌ NOT Running" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host "    ❌ PM2 not responding" -ForegroundColor Red
    $allGood = $false
}
Write-Host ""

# Check 3: API Response
Write-Host "[3] API Health Endpoint" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 5
    Write-Host "    ✅ $($health.message)" -ForegroundColor Green
    Write-Host "    Environment: $($health.environment)" -ForegroundColor Gray
} catch {
    Write-Host "    ❌ API not responding" -ForegroundColor Red
    $allGood = $false
}
Write-Host ""

# Check 4: ngrok
Write-Host "[4] ngrok Tunnel" -ForegroundColor Yellow
$ngrokProcess = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
if ($ngrokProcess) {
    Write-Host "    ✅ Running (PID: $($ngrokProcess.Id))" -ForegroundColor Green
    
    try {
        $tunnels = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -TimeoutSec 3
        $publicUrl = $tunnels.tunnels[0].public_url
        Write-Host "    URL: $publicUrl" -ForegroundColor Cyan
    } catch {
        Write-Host "    ⚠️ Could not get tunnel URL" -ForegroundColor Yellow
    }
} else {
    Write-Host "    ❌ NOT Running" -ForegroundColor Red
    $allGood = $false
}
Write-Host ""

# Check 5: Database counts
Write-Host "[5] Database Status" -ForegroundColor Yellow
try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
        -Method POST -ContentType "application/json" `
        -Body '{"email":"admin@scan2fix.com","password":"admin123"}' -TimeoutSec 5
    
    if ($loginResponse.success) {
        $token = $loginResponse.data.token
        $headers = @{ Authorization = "Bearer $token" }
        
        $overview = Invoke-RestMethod -Uri "http://localhost:5000/api/reports/overview" -Headers $headers -TimeoutSec 5
        $stats = $overview.data
        
        Write-Host "    ✅ Connected" -ForegroundColor Green
        Write-Host "    Users: $($stats.users.totalUsers) (Admin: $($stats.users.admins), Staff: $($stats.users.staff), Users: $($stats.users.regularUsers))" -ForegroundColor Gray
        Write-Host "    Complaints: $($stats.complaints.total) (Open: $($stats.complaints.open), Assigned: $($stats.complaints.assigned), Closed: $($stats.complaints.closed))" -ForegroundColor Gray
        Write-Host "    Staff: $($stats.users.staffAvailable) available, $($stats.users.staffOnLeave) on leave" -ForegroundColor Gray
    }
} catch {
    Write-Host "    ⚠️ Could not get database stats" -ForegroundColor Yellow
}
Write-Host ""

# Check 6: Disk Space
Write-Host "[6] Storage" -ForegroundColor Yellow
$uploadsPath = "C:\Projects\Scan2Fix\server\uploads"
if (Test-Path $uploadsPath) {
    $profilesSize = (Get-ChildItem "$uploadsPath\profiles" -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
    $complaintsSize = (Get-ChildItem "$uploadsPath\complaints" -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
    
    Write-Host "    Profile photos: $([math]::Round($profilesSize, 2)) MB" -ForegroundColor Gray
    Write-Host "    Complaint photos: $([math]::Round($complaintsSize, 2)) MB" -ForegroundColor Gray
}

$drive = Get-PSDrive C
$freeGB = [math]::Round($drive.Free / 1GB, 1)
Write-Host "    Disk free (C:): $freeGB GB" -ForegroundColor $(if ($freeGB -gt 10) { "Gray" } else { "Red" })
Write-Host ""

# Summary
Write-Host "═══════════════════════════════════════════" -ForegroundColor $(if ($allGood) { "Green" } else { "Red" })
if ($allGood) {
    Write-Host "  ✅ ALL SYSTEMS OPERATIONAL" -ForegroundColor Green
} else {
    Write-Host "  ⚠️ SOME SERVICES NEED ATTENTION" -ForegroundColor Red
    Write-Host "  Run: deployment\runners\start-all.bat" -ForegroundColor Yellow
}
Write-Host "═══════════════════════════════════════════" -ForegroundColor $(if ($allGood) { "Green" } else { "Red" })
Write-Host ""
pause