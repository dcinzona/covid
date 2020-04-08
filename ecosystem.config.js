require("dotenv").config();
var isDev = process.env.ENV === "DEV";
module.exports = {
    apps: [
        {
            name: "cron",
            script: "cron.js",
            instances: 1,
            exec_mode: "fork",
            watch: isDev ? ["**/*.js"] : false,
            autorestart: false,
            restart_delay: 5000,
            watch_delay: 1000,
            ignore_watch: ["node_modules"],
            exp_backoff_restart_delay: 100,
        },
        {
            name: "index",
            script: "index.js",
            instances: 1,
            exec_mode: "fork",
            watch: isDev ? ["**/*.js"] : false,
            autorestart: true,
            restart_delay: 5000,
            watch_delay: 1000,
            ignore_watch: ["node_modules"],
            exp_backoff_restart_delay: 100,
        },
        {
            name: "webhook",
            script: "webhook.js",
            instances: 1,
            exec_mode: "fork",
            watch: isDev ? ["**/*.js"] : false,
            autorestart: true,
            restart_delay: 5000,
            watch_delay: 1000,
            ignore_watch: ["node_modules"],
            exp_backoff_restart_delay: 100,
        },
    ],
};
