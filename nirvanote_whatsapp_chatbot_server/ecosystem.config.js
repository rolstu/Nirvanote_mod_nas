module.exports = {
  apps: [
    {
      name: "NrNotes",
      script: "dist/app.js",
      watch: false,
      instances: 4,
      exec_mode: "cluster",
    },
  ],
};
