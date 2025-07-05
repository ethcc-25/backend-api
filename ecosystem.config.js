module.exports = {
  apps: [
    {
      name: 'defi-apy-server',
      script: 'src/server.ts',
      interpreter: 'node',
      interpreter_args: '-r ts-node/register',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        MONGODB_PASSWORD: process.env.MONGODB_PASSWORD || '',
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        MONGODB_PASSWORD: process.env.MONGODB_PASSWORD || '',
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 5,
      restart_delay: 4000,
      kill_timeout: 1600,
      listen_timeout: 3000,
      wait_ready: true,
    }
  ]
}; 