module.exports = {
  apps: [
    {
      name: 'eev-api',
      script: 'server.js',
      cwd: '/three/EEV_Proj',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    }
  ]
}
