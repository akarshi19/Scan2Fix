// ============================================
// OAuth Callback — Redirect page for Google/Microsoft
// ============================================
// Flow:
// 1. Google redirects to: https://your-server/auth/callback#access_token=...
// 2. This page reads the token from URL hash
// 3. Redirects to: scan2fix://auth?access_token=...
// 4. App receives the deep link with token
// ============================================

const express = require('express');
const router = express.Router();

router.get('/callback', (req, res) => {
  // Serve a simple HTML page that extracts the token
  // from the URL hash and redirects to the app
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Scan2Fix - Signing In...</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #7dd3fc 0%, #64748b 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .card {
          background: white;
          border-radius: 20px;
          padding: 40px;
          text-align: center;
          max-width: 360px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        }
        .logo { font-size: 48px; margin-bottom: 16px; }
        .title { font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
        .subtitle { font-size: 14px; color: #64748b; margin-bottom: 24px; }
        .spinner {
          width: 40px; height: 40px; margin: 0 auto 20px;
          border: 4px solid #e2e8f0;
          border-top-color: #38bdf8;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .error { color: #ef4444; font-size: 14px; display: none; margin-top: 16px; }
        .manual-btn {
          display: none; margin-top: 16px; padding: 12px 24px;
          background: #38bdf8; color: white; border: none;
          border-radius: 8px; font-size: 14px; font-weight: 600;
          cursor: pointer;
        }
        .manual-btn:hover { background: #0ea5e9; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">🔧</div>
        <div class="title">Scan2Fix</div>
        <div class="subtitle" id="status">Completing sign in...</div>
        <div class="spinner" id="spinner"></div>
        <div class="error" id="error"></div>
        <button class="manual-btn" id="manualBtn" onclick="manualRedirect()">Open Scan2Fix App</button>
      </div>

      <script>
        (function() {
          try {
            // Extract token from URL hash
            var hash = window.location.hash.substring(1);
            var params = {};
            hash.split('&').forEach(function(pair) {
              var parts = pair.split('=');
              if (parts.length === 2) {
                params[parts[0]] = decodeURIComponent(parts[1]);
              }
            });

            var accessToken = params.access_token;

            if (accessToken) {
              document.getElementById('status').textContent = 'Redirecting to app...';

              // Build deep link URL
              var deepLink = 'scan2fix://auth?access_token=' + encodeURIComponent(accessToken);
              
              // Also try exp:// for Expo Go
              var expoLink = 'exp://192.168.0.169:8081/--/auth?access_token=' + encodeURIComponent(accessToken);

              // Try deep link first
              window.location.href = deepLink;

              // Fallback: show manual button after 2 seconds
              setTimeout(function() {
                document.getElementById('spinner').style.display = 'none';
                document.getElementById('status').textContent = 'If the app didn\\'t open automatically:';
                document.getElementById('manualBtn').style.display = 'inline-block';
                
                // Store token for manual copy
                window._token = accessToken;
                window._deepLink = deepLink;
                window._expoLink = expoLink;
              }, 2000);

            } else {
              throw new Error('No access token received');
            }
          } catch (e) {
            document.getElementById('spinner').style.display = 'none';
            document.getElementById('status').textContent = 'Sign in failed';
            document.getElementById('error').style.display = 'block';
            document.getElementById('error').textContent = e.message || 'Unknown error';
          }
        })();

        function manualRedirect() {
          // Try Expo Go link
          window.location.href = window._expoLink || window._deepLink;
          
          setTimeout(function() {
            // If still here, try the other link
            window.location.href = window._deepLink;
          }, 1000);
        }
      </script>
    </body>
    </html>
  `);
});

module.exports = router; 