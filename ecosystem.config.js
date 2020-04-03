module.exports = {
    apps: [
        {
            name: "cron",
            script: "cron.js",
            instances: 1,
            exec_mode: "fork",
            watch: [
                "./*.js",
                "./resources/buildCSV.js",
                "./docs/js/shared.js",
                ".env"
            ],
            watch_delay: 1000
        },
        {
            name: "index",
            script: "index.js",
            instances: 1,
            exec_mode: "fork",
            watch: [
                "./*.js",
                "./resources/*.js",
                "./docs/js/shared.js",
                ".env"
            ],
            watch_delay: 1000
        },
        {
            name: "webhook",
            script: "webhook.js",
            instances: 1,
            exec_mode: "fork",
            watch: [
                "./*.js",
                "./resources/*.js",
                "./docs/js/shared.js",
                ".env"
            ],
            watch_delay: 1000
        }
    ]
};
