module.exports = {
  apps: [
    {
      name: 'desvios-hse',
      cwd: '/var/www/desvios-hse',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '700M',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
      },
    },
  ],
}
