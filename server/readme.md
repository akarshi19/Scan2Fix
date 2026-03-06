# Cloudflare Tunnel Setup Guide for Scan2Fix

## Why Cloudflare Tunnel?
- Exposes your local server to the internet securely
- Free HTTPS (SSL) automatically
- No need to open router ports
- DDoS protection included
- Works even behind NAT/firewall

## Architecture
Mobile App (anywhere)
→ https://scan2fix.yourdomain.com
→ Cloudflare Edge Network
→ Cloudflare Tunnel (encrypted)
→ Your Server (localhost:5000)

---

## Step 1: Get a Cloudflare Account

1. Go to https://dash.cloudflare.com/sign-up
2. Create a free account
3. Add your domain (or get a free one via Cloudflare)

If you don't have a domain, you can use Cloudflare's 
`trycloudflare.com` for quick testing (Step 4 Alternative).

---

## Step 2: Install Cloudflared on Your Server

### Windows:
```powershell
# Download from:
# https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

# Or use winget:
winget install --id Cloudflare.cloudflared

# Verify installation:
cloudflared --version

### Ubuntu/Linux:
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
cloudflared --version

Step 3: Authenticate with Cloudflare
Bash

cloudflared tunnel login
This opens a browser. Select your domain and authorize.
A certificate is saved to ~/.cloudflared/cert.pem.

Step 4: Create a Tunnel
Bash

# Create the tunnel
cloudflared tunnel create scan2fix

# This outputs a Tunnel ID like: a1b2c3d4-e5f6-...
# Note this ID!
Create config file:
Windows: C:\Users\YourName\.cloudflared\config.yml
Linux: ~/.cloudflared/config.yml

YAML

tunnel: YOUR_TUNNEL_ID_HERE
credentials-file: C:\Users\YourName\.cloudflared\YOUR_TUNNEL_ID.json

ingress:
  - hostname: scan2fix.yourdomain.com
    service: http://localhost:5000
  - service: http_status:404
Replace:

YOUR_TUNNEL_ID_HERE with your tunnel ID
scan2fix.yourdomain.com with your actual subdomain
Credential file path as shown after tunnel creation
Step 5: Create DNS Record
Bash

cloudflared tunnel route dns scan2fix scan2fix.yourdomain.com
This creates a CNAME record in Cloudflare DNS automatically.

Step 6: Run the Tunnel
Test run:
Bash

cloudflared tunnel run scan2fix
Install as Windows Service (runs on boot):
PowerShell

cloudflared service install
Install as Linux Service:
Bash

sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
Step 7: Update Mobile App
Edit mobile-app/.env:

env

API_URL=https://scan2fix.yourdomain.com/api
Restart Expo:

Bash

npx expo start --clear
Step 4 Alternative: Quick Test WITHOUT a Domain
If you just want to test quickly without buying a domain:

Bash

cloudflared tunnel --url http://localhost:5000
This gives you a temporary URL like:
https://random-words-here.trycloudflare.com

Use this in your .env:

env

API_URL=https://random-words-here.trycloudflare.com/api
Note: This URL changes every time you restart cloudflared.
For permanent use, follow Steps 3-6 with your own domain.