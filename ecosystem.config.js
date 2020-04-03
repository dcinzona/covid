require("dotenv").config();
var isDev = process.env.ENV === "DEV";
module.exports = {
    apps: [
        {
            name: "cron",
            script: "cron.js",
            instances: 1,
            exec_mode: "fork",
            watch: isDev ? ["*.js"] : false
        },
        {
            name: "index",
            script: "index.js",
            instances: 1,
            exec_mode: "fork",
            watch: isDev ? ["*.js"] : false
        },
        {
            name: "webhook",
            script: "webhook.js",
            instances: 1,
            exec_mode: "fork",
            watch: isDev ? ["*.js"] : false
        }
    ]
};
