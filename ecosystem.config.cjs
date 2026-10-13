module.exports = {
  apps: [
    {
      name: "ceylonhosting",
      cwd: "/home/admin/xoxod33p-store",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
    },
  ],
};
