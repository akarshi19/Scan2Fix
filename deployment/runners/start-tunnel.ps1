# Scan2Fix SSH Tunnel — auto-reconnect loop
$key         = "C:\Users\user\.ssh\scan2fix_tunnel"
$tunnelHost  = "adminscan2fix@gmail.com@localhost.run"

while ($true) {
    Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Starting tunnel..."
    & "C:\Windows\System32\OpenSSH\ssh.exe" -i $key -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -R 80:localhost:5000 $tunnelHost
    Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Tunnel dropped. Reconnecting in 10 seconds..."
    Start-Sleep -Seconds 10
}
