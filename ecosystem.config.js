module.exports = {
  apps: [
    {
      name: "sodeos",
      script: "npm",
      args: "start",
      instances: 1,
      watch: false,
      max_memory_restart: "1G",
      env_production: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
