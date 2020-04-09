const { exec } = require("child_process");
const cron = require("node-cron");
const repoParser = require("./repoParser");
const logger = require("./logger");
const { spawnPromise } = require("./resources/utils");
const dataWriter = require("./resources/dataWriter");
require("dotenv").config();
let repo = process.env.COVID_REPO_DIR;
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

run(isDev);

function flush() {
    return spawnPromise("pm2", ["flush"]).then((d) => {
        logger.log(`Logs purged by automated process`);
    });
}

async function run(force = false) {
    logger.log(`Cron job starting execution...`);
    return await webData.run(force).catch((err)=>{
        logger.error(`Error running webdata: ${err}`)
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
