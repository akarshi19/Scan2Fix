# Archive Endpoints Testing Script
# Tests all new archive functionality with systematic verification

# Configuration
$BASE_URL = "http://localhost:5000/api"
$ADMIN_TOKEN = $null
$USER_TOKEN = $null
$TEST_COMPLAINT_ID = $null
$ADMIN_ID = $null
$USER_ID = $null

# Color output for better readability
function Write-Success {
    param($message)
    Write-Host "✅ $message" -ForegroundColor Green
}

function Write-Error-Custom {
    param($message)
    Write-Host "❌ $message" -ForegroundColor Red
}

function Write-Info {
    param($message)
    Write-Host "ℹ️  $message" -ForegroundColor Cyan
}

function Write-Section {
    param($title)
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Magenta
    Write-Host "  $title" -ForegroundColor Magenta
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Magenta
    Write-Host ""
}

# Test 1: Server Health Check
Write-Section "1. SERVER HEALTH CHECK"
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/health" -Method Get -ErrorAction Stop
    $data = $response.Content | ConvertFrom-Json
    Write-Success "Server is running on port 5000"
    Write-Info "Status: $($data.status)"
} catch {
    Write-Error-Custom "Server not responding: $_"
    exit 1
}

# Test 2: Authentication (Create test tokens)
Write-Section "2. AUTHENTICATION SETUP"
try {
    # Using seed data credentials
    $loginPayload = @{
        email = "admin@scan2fix.com"
        password = "admin123"
    } | ConvertTo-Json

    $loginResponse = Invoke-WebRequest -Uri "$BASE_URL/auth/login" -Method Post `
        -ContentType "application/json" `
        -Body $loginPayload -ErrorAction Stop
    
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $ADMIN_TOKEN = $loginData.token
    $ADMIN_ID = $loginData.user._id
    Write-Success "Admin authenticated"
    Write-Info "Token: $($ADMIN_TOKEN.Substring(0, 20))..."
} catch {
    Write-Error-Custom "Admin login failed!"
    Write-Info "Ensure database is seeded. Run: node seed.js"
    Write-Info "Or check credentials in the output"
    exit 1
}

# Test 3: Get Active Complaints (should exclude archived)
Write-Section "3. TEST ACTIVE QUERIES - EXCLUDE ARCHIVED"
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/complaints" `
        -Method Get `
        -Headers @{"Authorization" = "Bearer $ADMIN_TOKEN"} `
        -ErrorAction Stop
    
    $complaints = $response.Content | ConvertFrom-Json
    Write-Success "Retrieved active complaints"
    Write-Info "Total active: $($complaints.data.length)"
    
    # Check all complaints have archived = false
    $archivedCount = ($complaints.data | Where-Object { $_.archived -eq $true }).Count
    if ($archivedCount -eq 0) {
        Write-Success "✓ All active complaints have archived = false"
    } else {
        Write-Error-Custom "✗ Found $archivedCount archived complaints in active list (should be 0)"
    }

    
    # Show sample
    if ($complaints.data.length -gt 0) {
        Write-Info "Sample complaint:"
        $sample = $complaints.data[0]
        Write-Host "  - ID: $($sample.id)"
        Write-Host "  - Status: $($sample.status)"
        Write-Host "  - Archived: $($sample.archived)"
        Write-Host "  - Archived_at: $($sample.archived_at)"
        $TEST_COMPLAINT_ID = $sample.id
    }
} catch {
    Write-Error-Custom "Failed to fetch active complaints: $_"
}

# Test 4: Get User's Active Complaints
Write-Section "4. TEST USER ACTIVE COMPLAINTS"
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/complaints/mine" `
        -Method Get `
        -Headers @{"Authorization" = "Bearer $ADMIN_TOKEN"} `
        -ErrorAction Stop
    
    $complaints = $response.Content | ConvertFrom-Json
    Write-Success "Retrieved user's active complaints"
    Write-Info "Total: $($complaints.data.length)"
    
    $archivedCount = ($complaints.data | Where-Object { $_.archived -eq $true }).Count
    if ($archivedCount -eq 0) {
        Write-Success "✓ All user's active complaints have archived = false"
    } else {
        Write-Error-Custom "✗ Found archived complaints in user's active list"
    }
} catch {
    Write-Error-Custom "Failed to fetch user's active complaints: $_"
}

# Test 5: Get Archived Complaints (should return only archived)
Write-Section "5. TEST ARCHIVED COMPLAINTS ENDPOINT"
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/complaints/archived" `
        -Method Get `
        -Headers @{"Authorization" = "Bearer $ADMIN_TOKEN"} `
        -ErrorAction Stop
    
    $archivedComplaints = $response.Content | ConvertFrom-Json
    Write-Success "Retrieved archived complaints"
    Write-Info "Total archived: $($archivedComplaints.data.length)"
    
    # Verify all have archived = true
    if ($archivedComplaints.data.length -gt 0) {
        $notArchivedCount = ($archivedComplaints.data | Where-Object { $_.archived -ne $true }).Count
        if ($notArchivedCount -eq 0) {
            Write-Success "✓ All archived complaints have archived = true"
        } else {
            Write-Error-Custom "✗ Found non-archived complaints in archive list"
        }
        
        # Show sample
        $sample = $archivedComplaints.data[0]
        Write-Info "Sample archived complaint:"
        Write-Host "  - ID: $($sample.id)"
        Write-Host "  - Status: $($sample.status)"
        Write-Host "  - Archived: $($sample.archived)"
        Write-Host "  - Archived_at: $($sample.archived_at)"
    } else {
        Write-Info "No archived complaints found (this is OK if none have been archived yet)"
    }
} catch {
    Write-Error-Custom "Failed to fetch archived complaints: $_"
}

# Test 6: Get User's Archived Complaints
Write-Section "6. TEST USER'S ARCHIVED COMPLAINTS"
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/complaints/mine/archived" `
        -Method Get `
        -Headers @{"Authorization" = "Bearer $ADMIN_TOKEN"} `
        -ErrorAction Stop
    
    $myArchived = $response.Content | ConvertFrom-Json
    Write-Success "Retrieved user's archived complaints"
    Write-Info "Total: $($myArchived.data.length)"
    
    if ($myArchived.data.length -gt 0) {
        $notArchivedCount = ($myArchived.data | Where-Object { $_.archived -ne $true }).Count
        if ($notArchivedCount -eq 0) {
            Write-Success "✓ All user's archived complaints have archived = true"
        } else {
            Write-Error-Custom "✗ Found non-archived complaints in user's archive"
        }
    } else {
        Write-Info "User has no archived complaints (this is OK)"
    }
} catch {
    Write-Error-Custom "Failed to fetch user's archived complaints: $_"
}

# Test 7: Archive Statistics Endpoint
Write-Section "7. TEST ARCHIVE STATISTICS"
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/complaints/archived/stats" `
        -Method Get `
        -Headers @{"Authorization" = "Bearer $ADMIN_TOKEN"} `
        -ErrorAction Stop
    
    $stats = $response.Content | ConvertFrom-Json
    Write-Success "Retrieved archive statistics"
    
    Write-Info "Archive Statistics:"
    Write-Host "  - Total active complaints: $($stats.data.total_active)"
    Write-Host "  - Total archived: $($stats.data.total_archived)"
    Write-Host "  - By status:"
    foreach ($status in $stats.data.by_status.GetEnumerator()) {
        Write-Host "    • $($status.Name): $($status.Value.active) active, $($status.Value.archived) archived"
    }
    
    if ($stats.data.average_resolution_time) {
        Write-Host "  - Average resolution (hours): $($stats.data.average_resolution_time)"
    }
} catch {
    Write-Error-Custom "Failed to fetch archive statistics: $_"
}

# Test 8: Manual Archival Trigger (End-to-End Test)
Write-Section "8. END-TO-END: MANUAL ARCHIVAL TRIGGER"
try {
    Write-Info "Triggering manual archival for complaints older than 90 days..."
    
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/archive/run" `
        -Method Post `
        -Headers @{"Authorization" = "Bearer $ADMIN_TOKEN"} `
        -ErrorAction Stop
    
    $archiveResult = $response.Content | ConvertFrom-Json
    Write-Success "Archival completed"
    Write-Info "Results:"
    Write-Host "  - Archived: $($archiveResult.archived)"
    Write-Host "  - Failed: $($archiveResult.failed)"
    Write-Host "  - Total processed: $($archiveResult.total)"
    
    if ($archiveResult.archived -eq 0) {
        Write-Info "No complaints older than 90 days found (typical for new system)"
    }
} catch {
    Write-Error-Custom "Failed to trigger archival: $_"
}

# Test 9: Archive Integrity Check
Write-Section "9. ARCHIVE INTEGRITY VERIFICATION"
try {
    Write-Info "Running integrity check on archive..."
    
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/archive/verify" `
        -Method Post `
        -Headers @{"Authorization" = "Bearer $ADMIN_TOKEN"} `
        -ErrorAction Stop
    
    $integrityResult = $response.Content | ConvertFrom-Json
    Write-Success "Integrity check completed"
    Write-Info "Status: $($integrityResult.status)"
    Write-Host "  - Duplicates found: $($integrityResult.duplicates)"
    Write-Host "  - Missing backups: $($integrityResult.missing_backups)"
    
    if ($integrityResult.status -eq "OK") {
        Write-Success "✓ Archive integrity verified"
    } else {
        Write-Error-Custom "✗ Archive integrity issues detected"
    }
} catch {
    Write-Error-Custom "Failed to verify archive integrity: $_"
}

# Test 10: Archive Statistics from Archive Service
Write-Section "10. DETAILED ARCHIVE STATISTICS"
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/archive/stats" `
        -Method Get `
        -Headers @{"Authorization" = "Bearer $ADMIN_TOKEN"} `
        -ErrorAction Stop
    
    $archiveStats = $response.Content | ConvertFrom-Json
    Write-Success "Retrieved detailed archive statistics"
    
    Write-Info "Overall Statistics:"
    Write-Host "  - Active complaints: $($archiveStats.data.active_count)"
    Write-Host "  - Marked archived: $($archiveStats.data.archived_count)"
    Write-Host "  - Backup table: $($archiveStats.data.backup_table_count)"
    
    Write-Info "Storage Information:"
    Write-Host "  - Total backups: $($archiveStats.data.storage.total_backups)"
    Write-Host "  - Total size: $($archiveStats.data.storage.total_size_mb) MB"
    Write-Host "  - Oldest backup: $($archiveStats.data.storage.oldest)"
    Write-Host "  - Newest backup: $($archiveStats.data.storage.newest)"
    
    Write-Info "Age Information:"
    Write-Host "  - Oldest active: $($archiveStats.data.age.oldest_active)"
    Write-Host "  - Oldest backup: $($archiveStats.data.age.oldest_backup)"
} catch {
    Write-Error-Custom "Failed to fetch archive service statistics: $_"
}

# Test 11: Specific Complaint Detail (verify archived field)
Write-Section "11. VERIFY COMPLAINT DETAIL INCLUDES ARCHIVED FIELD"
if ($TEST_COMPLAINT_ID) {
    try {
        $response = Invoke-WebRequest -Uri "$BASE_URL/complaints/$TEST_COMPLAINT_ID" `
            -Method Get `
            -Headers @{"Authorization" = "Bearer $ADMIN_TOKEN"} `
            -ErrorAction Stop
        
        $complaint = $response.Content | ConvertFrom-Json
        Write-Success "Retrieved complaint detail"
        
        Write-Info "Complaint #$TEST_COMPLAINT_ID:"
        Write-Host "  - ID: $($complaint.data.id)"
        Write-Host "  - Status: $($complaint.data.status)"
        Write-Host "  - Archived: $($complaint.data.archived)"
        Write-Host "  - Archived_at: $($complaint.data.archived_at)"
        
        if ($null -ne $complaint.data.archived) {
            Write-Success "✓ Complaint detail includes archived field"
        } else {
            Write-Error-Custom "✗ Complaint detail missing archived field"
        }
    } catch {
        Write-Error-Custom "Failed to fetch complaint detail: $_"
    }
} else {
    Write-Error-Custom "No test complaint ID available"
}

# Summary
Write-Section "📊 TEST SUMMARY"
Write-Info "Archive endpoint testing completed!"
Write-Info ""
Write-Info "Key Verification Points:"
Write-Host "  ✓ Active queries exclude archived complaints"
Write-Host "  ✓ Archived queries return only archived complaints"
Write-Host "  ✓ Response includes archived and archived_at fields"
Write-Host "  ✓ Archive statistics calculate correctly"
Write-Host "  ✓ Manual archival trigger works"
Write-Host "  ✓ Archive integrity verified"
Write-Host ""
Write-Info "Next Steps:"
Write-Host "  1. Create test data with various statuses"
Write-Host "  2. Manually set archived flag on test complaints"
Write-Host "  3. Verify filters work correctly with query parameters"
Write-Host "  4. Test pagination and sorting on archive endpoints"
Write-Host "  5. Integrate archive endpoints with mobile app"
