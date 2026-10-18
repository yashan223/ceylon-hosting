module.exports = {
  apps: [
    {
      name: "ceylonhosting",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 4000",
      node_args: "--max-old-space-size=1536",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1200M",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
    },
  ],
};
