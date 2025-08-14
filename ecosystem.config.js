module.exports = {
  apps: [
    {
      name: 'threenew-api',
      script: 'server.js',
      cwd: '/threenew',
      env: { NODE_ENV: 'production', PORT: 4000 }
    },
    {
      name: 'threenew-web',
      script: 'serve',
      cwd: '/threenew',
      args: '-s build -l 3000',
      env: { NODE_ENV: 'production' }
    }
  ]
}
