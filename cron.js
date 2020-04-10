const cron = require("node-cron");
const logger = require("./logger");
const { spawnPromise } = require("./resources/utils");
require("dotenv").config();
var isDev = process.env.ENV === "DEV";
const webData = require("./resources/webdata");

logger.log("Starting cron.js", "restarts.log");

//run at *:15 EST
//jk run every 5 min
runTask = cron.schedule("*/5 * * * *", run, {
    scheduled: true,//!isDev,
    timezone: "America/New_York",
});

flushTask = cron.schedule("0 */12 * * *", flush, {
    scheduled: true,///!isDev,
    timezone: "America/New_York",
});

run(true);

function flush() {
    return spawnPromise("pm2", ["flush"]).then((d) => {
        logger.log(`Logs purged by automated process`);
    });
}

function run(force = false) {
    logger.log(`Cron job starting execution...`);
    webData.run(force).then((x) => {
        if (x === 1) {
            //exited because another job is running
        }
        else { logger.log(`Cron job completed`); }
    });
}

process.on("SIGINT", (code) => {
    logger
        .log(
            `${__filename
                .replace(`${__dirname}/`, "")
                .toUpperCase()} shutting down...`
        )
        .then(() => {
            runTask.destroy();
            flushTask.destroy();
            process.exit(0);
        });
});
