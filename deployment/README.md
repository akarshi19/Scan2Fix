# Scan2Fix — Deployment Guide

## Quick Start (First Time)

```bash
# Step 1: Run installation script (as Administrator)
powershell -ExecutionPolicy Bypass -File deployment\installation\01-install-all.ps1

# Step 2: Setup MongoDB
powershell -ExecutionPolicy Bypass -File deployment\installation\02-setup-mongodb.ps1

# Step 3: Setup ngrok (get your free static domain)
powershell -ExecutionPolicy Bypass -File deployment\installation\03-setup-ngrok.ps1

# Step 4: Setup PM2 auto-start
powershell -ExecutionPolicy Bypass -File deployment\installation\04-setup-pm2.ps1

# Step 5: Seed test data
powershell -ExecutionPolicy Bypass -File deployment\installation\05-seed-database.ps1