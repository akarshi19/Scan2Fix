// ============================================
// PM2 Configuration — Keeps server running 24/7
// ============================================
// Install PM2: npm install -g pm2
// Start:       pm2 start ecosystem.config.js
// Monitor:     pm2 monit
// Logs:        pm2 logs scan2fix
// Restart:     pm2 restart scan2fix
// Stop:        pm2 stop scan2fix
// Auto-start:  pm2 startup    (run once, follows instructions)
//              pm2 save       (saves current process list)
// ============================================

module.exports = {
  apps: [
    {
      name: 'scan2fix',
      script: 'server.js',
      cwd: __dirname,

      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },

      // Process management
      instances: 1,             // Single instance (sufficient for office use)
      autorestart: true,        // Auto-restart on crash
      watch: false,             // Don't watch files in production
      max_memory_restart: '500M', // Restart if memory exceeds 500MB

      // Logging
      log_file: './logs/combined.log',
      error_file: './logs/error.log',
      out_file: './logs/output.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // Graceful shutdown
      kill_timeout: 5000,
    },
  ],
};