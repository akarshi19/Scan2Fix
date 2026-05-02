# Scan2Fix — Client Server Deployment Guide

## What runs on the client server

```
Client's Office Windows PC / Server
├── MongoDB          (Windows service — stores all data)
├── Node.js Server   (PM2 — keeps it running 24/7, auto-restarts on crash)
└── ngrok            (free tunnel — makes server accessible from the internet)
```

The mobile app connects to the server via the ngrok public URL from anywhere.

---

## First-Time Setup (run once)

Open PowerShell **as Administrator** inside the `deployment\installation\` folder.

```powershell
# Step 1 — Install Node.js, MongoDB check, ngrok, PM2, server dependencies
.\01-install-all.ps1

# Step 2 — Configure MongoDB (set to auto-start)
.\02-setup-mongodb.ps1

# Step 3 — Get your free ngrok static domain (permanent public URL)
.\03-setup-ngrok.ps1

# Step 4 — Start server with PM2 (auto-restart on crash / reboot)
.\04-setup-pm2.ps1

# Step 5 — Create the admin account (run once on fresh database)
.\05-seed-database.ps1
```

**Note:** `pm2 startup` does not work on Windows. Step 4 uses `pm2-windows-startup` instead,
which creates a Task Scheduler entry so PM2 auto-starts on reboot.

After Step 3 you will have a URL like `https://something.ngrok-free.app`.
Update the mobile app `.env`:
```
API_URL=https://something.ngrok-free.app/api
```
Then rebuild the app with EAS.

---

## Daily Operations

All scripts are in `deployment\runners\`:

| Script | What it does |
|--------|-------------|
| `start-all.bat` | Start MongoDB + PM2 server + ngrok tunnel |
| `stop-all.bat` | Stop PM2 server + ngrok (MongoDB keeps running) |
| `restart-all.bat` | Restart everything |
| `status.bat` | Show status of all services |
| `health-check.ps1` | Detailed health check with logs and memory usage |
| `backup.bat` | Backup database + uploads to `C:\Backups\scan2fix\` |

---

## Updating the server (after code changes)

```powershell
cd C:\<path-to-Scan2Fix>\server
git pull
npm install --only=production
pm2 restart scan2fix
```

---

## Requirements

- Windows 10/11 or Windows Server 2019+
- [MongoDB Community](https://www.mongodb.com/try/download/community) installed as a Windows service
- Internet connection (for ngrok tunnel)
- 1 free [ngrok account](https://ngrok.com) (1 free static domain included)
