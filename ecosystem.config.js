module.exports = {
    apps: [
        {
            name: "cron",
            script: "cron.js",
            instances: 1,
            exec_mode: "fork"
        },
        {
            name: "index",
            script: "index.js",
            instances: 1,
            exec_mode: "fork"
        },
        {
            name: "webhook",
            script: "webhook.js",
            instances: 1,
            exec_mode: "fork"
        }
    ]
};
