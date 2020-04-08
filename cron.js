const { exec } = require("child_process");
const cron = require("node-cron");
const repoParser = require("./repoParser");
const fs = require("fs").promises;
const sharedConfig = require("./docs/js/shared.js");
const logger = require("./logger");
const { spawnPromise } = require("./resources/utils");
require("dotenv").config();
var cf = require("cloudflare")({
    token: process.env.CF_TOKEN,
});
let repo = process.env.COVID_REPO_DIR;
var isDev = process.env.ENV === "DEV";

logger.log("Starting cron.js", "restarts.log");

//run at *:15 EST
//jk run every 5 min
runTask = cron.schedule("*/5 * * * *", run, {
    scheduled: !isDev,
    timezone: "America/New_York",
});

flushTask = cron.schedule("0 */12 * * *", flush, {
    scheduled: !isDev,
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
    await exec(`cd "${repo}" && git pull`, async (error, stdout, stderr) => {
        if (error) {
            logger.error(`exec error: ${error}`);
            return;
        }
        return await repoParser
            .getEsriData(force)
            .then(async (esriGeo) => {
                if (esriGeo) {
                    return save("./esri.geojson", JSON.stringify(esriGeo))
                        .then(() => {
                            logger.log("Cron job done");
                        })
                        .catch((err) => {
                            logger.error(err);
                        });
                }
                return 'esriGeo was undefined';
            })
            .catch(console.error);
    });
}

let currentBranch;
async function save(path, data) {
    currentBranch = await spawnPromise("git", ["branch", "--show-current"]);

    return await write(path, data, purgeCache);

    async function write(path, data, cb) {
        return await fs
            .writeFile(path, data, { flag: "w+" })
            .then(async () => {
                console.log(`current branch: ${currentBranch}`);
                await writeToDocsData(data);
                if(!isDev) await pushMapData();
                if(!isDev) await purgeCache();
                return 'Writes done';
            })
            .catch((err) => {
                logger.error(err);
                return err;
            });
    }

    async function writeToDocsData(data) {
        let path = "docs/data/mapdata.json";
        if (isDev && currentBranch === "master") {
            //checkout remote file first
            await spawnPromise("git", ["checkout", "master", path]);
        }
        return await fs.writeFile(`./${path}`, data, { flag: "w+" });
    }

    async function pushMapData() {
        let path = "docs/data/mapdata.json";
        console.log(currentBranch);
        if (currentBranch === "master") {
            //commit and push mapdata.json
            return spawnPromise("git", [
                "commit",
                "-m",
                "mapdata automated update",
                path,
            ])
                .then(async () => {
                    if (!isDev) {
                        await spawnPromise("git", ["push"]);
                        return logger.log("DATA PUSHED");
                    } else {
                        return logger.log("Running in dev, not pushing");
                    }
                })
                .catch((err) => {
                    return logger.error(err);
                });
            Í;
        }
    }

    async function purgeCache() {
        //clear cloudflare cache
        try {
            let cachedFiles = isDev
                ? "https://covid-data.gmt.io/api/v1/esri.geojson"
                : sharedConfig.pubURI;
            let params = {
                files: [cachedFiles],
            };
            if (!isDev) {
                params.files.push("https://covid.gmt.io");
            }
            return cf.zones
                .purgeCache(process.env.CF_ZONE_ID, params)
                .then((resp) => {
                    if (!resp.success) {
                        logger.err(
                            `Errors clearing cache: ${JSON.stringify(
                                resp.errors
                            )}`
                        );
                    } else {
                        logger.log("Cloudflare cache cleared");
                    }
                    return resp.success;
                })
                .catch((err) => {
                    logger.error(err);
                    return false;
                });
        } catch (purgeErr) {
            logger.error(purgeErr);
            return false;
        }
    }
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
