module.exports = {
  apps: [
    {
      name: 'blog-editor-dev',
      script: 'npm',
      args: 'start',
      cwd: '/home/ubuntu/codes/blog/blog-editor',
      env: {
        PORT: 3101,
        HOST: '0.0.0.0',
        REACT_APP_ENV: 'development'
      },
      watch: ['src'],
      ignore_watch: ['node_modules', 'build', '.git', '*.log'],
      watch_delay: 1000,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'blog-editor-prod',
      script: 'serve',
      args: '-s build -l tcp://0.0.0.0:3101',
      cwd: '/home/ubuntu/codes/blog/blog-editor',
      env: {
        NODE_ENV: 'production'
      },
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};