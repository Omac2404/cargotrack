/**
 * PM2 Ecosystem — Production Process Manager
 *
 * KURULUM:
 *   npm install -g pm2
 *
 * BAŞLAT:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 save                       # restart sonrası otomatik açılır
 *   pm2 startup                    # systemd entegrasyonu (sunucu boot'unda)
 *
 * KOMUTLAR:
 *   pm2 status                     # durum
 *   pm2 logs cargotrack            # canlı log
 *   pm2 restart cargotrack         # graceful restart
 *   pm2 reload cargotrack          # zero-downtime reload (cluster mode'da)
 *   pm2 stop cargotrack            # durdur
 *   pm2 delete cargotrack          # tamamen kaldır
 *   pm2 monit                      # interaktif monitor
 *
 * LOG ROTATION (önerilir):
 *   pm2 install pm2-logrotate
 *   pm2 set pm2-logrotate:max_size 50M
 *   pm2 set pm2-logrotate:retain 14
 */
module.exports = {
  apps: [
    {
      name: 'cargotrack',
      script: './app.js',
      cwd: __dirname,

      // CLUSTER MODE — cpu çekirdek sayısı kadar instance
      // Tek-instance için: instances: 1, exec_mode: 'fork'
      instances: 'max',
      exec_mode: 'cluster',

      // OTOMATIK RESTART
      autorestart: true,
      max_restarts: 10,         // 1 dk içinde 10'dan fazla crash → durdur
      min_uptime: '30s',        // sayılabilmesi için min 30s ayakta kalmalı
      restart_delay: 2000,      // crash sonrası 2s bekle

      // MEMORY LIMIT — bu sınırı aşarsa otomatik restart (memory leak koruması)
      max_memory_restart: '512M',

      // LOG'lar
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      merge_logs: true,

      // GRACEFUL SHUTDOWN — backend SIGTERM dinliyor (app.js'te ayarlandı)
      kill_timeout: 10000,      // 10s sonra SIGKILL
      wait_ready: false,        // process.send('ready') beklemiyoruz
      listen_timeout: 10000,    // listen() için max 10s bekle

      // ENV — production
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // ENV — staging (opsiyonel)
      env_staging: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
}
