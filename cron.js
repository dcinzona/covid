const { exec } = require("child_process");
const fs = require("fs");
const buildCSV = require("./resources/buildCSV");
const sharedConfig = require("./docs/js/shared.js");
const esriData = require("./esri");
const logger = require("./logger");
const { spawnPromise } = require("./resources/utils");

require("dotenv").config();
var isDev = process.env.ENV === "DEV";

var cf = require("cloudflare")({
    token: process.env.CF_TOKEN,
});

const cron = require("node-cron");

let repo = process.env.COVID_REPO_DIR;
let filepath = `${repo}/csse_covid_19_data/csse_covid_19_daily_reports/`;
let files;
let filesWithLastMod = {};
let prevFiles = {};

logger.log("Starting cron.js", "restarts.log");

//run at *:15 EST
//jk run every 5 min
cron.schedule("*/5 * * * *", run, {
    scheduled: true,
    timezone: "America/New_York",
});

cron.schedule("6 * * * *", flush, {
    scheduled: true,
    timezone: "America/New_York",
});

function flush() {
    return spawnPromise("pm2", ["flush"]).then((d) => {
        //logger.log(d);
    });
}
/*
flush().then(() => {
    run();
});
*/

function run() {
    prevFiles = {};
    print(`${filepath}`).then(() => {
        //make a copy of previous files
        Object.assign(prevFiles, filesWithLastMod);

        exec(`cd "${repo}" && git pull`, (error, stdout, stderr) => {
            if (error) {
                logger.error(`exec error: ${error}`);
                return;
            }

            if (`${stdout}`.trim() === "Already up to date.") {
                logger.log(`Repo has no changes`);
                return;
            }

            print(`${filepath}`)
                .then(function () {
                    //check each file stat
                    let shouldBuild = files.some((f) => {
                        if (Object.keys(prevFiles).indexOf(f) === -1) {
                            if (isDev)
                                console.log(`prevFiles missing key: ${f}`);
                            return true;
                        }

                        let orig_mdate = new Date(prevFiles[f]).getTime();
                        let new_mdate = new Date(filesWithLastMod[f]).getTime();

                        if (orig_mdate < new_mdate) {
                            if (isDev)
                                console.log(
                                    `${f} ${orig_mdate} < ${new_mdate}`
                                );
                            return true;
                        }
                    });

                    // return if no new or modified files
                    if (shouldBuild === false) {
                        return; // don't rebuild if there's nothing new.
                    }

                    files = files.sort();
                    buildCSV.processFiles(files, function (records) {
                        let recs = records.map((x) => {
                            let r = {};
                            r.Province_State = x.Province_State;
                            r.Country_Region = x.Country_Region;
                            r.Country = x.Country_Region;
                            r.Location = `${x.Lat},${x.Long_}`;
                            r.Label = x.Combined_Key;
                            //r.Last_Update = x.Last_Update;
                            r.Lat = x.Lat;
                            r.Long = x.Long_;
                            r.Confirmed = x.Confirmed;
                            r.time = x.time;
                            r.IsoDate = x.IsoDate;
                            r.Combined_Key = x.Combined_Key;
                            r.UID = x.UID;
                            r.UID2 = x.UID2;
                            return r;
                        });
                        //save("./data.json", JSON.stringify(recs, null, "\t"));
                        let esriGeo = JSON.stringify(new esriData(recs));
                        save("./esri.geojson", esriGeo);
                    });
                })
                .catch(console.error);
        });
    });
}
async function print(path) {
    files = [];
    filesWithLastMod = {};
    const dir = await fs.promises.opendir(path);
    for await (const dirent of dir) {
        if (dirent.name.endsWith(".csv")) {
            let fullPath = `${path}${dirent.name}`;

            const getFileUpdatedDate = (fullPath) => {
                const stats = fs.statSync(fullPath);
                return stats.mtime;
            };

            let fname = dirent.name.replace(".csv", "");
            filesWithLastMod[fname] = getFileUpdatedDate(fullPath);
            files.push(fname);
        }
    }
}

function save(path, data) {
    logger.stat(path).then((origStats) => {
        if (origStats !== undefined) {
            if (origStats.size != data.length) {
                write(path, data);
            } else {
                console.log("no change to data");
            }
        }
    });

    function write(path, data) {
        fs.writeFile(path, data, { flag: "w+" }, (err) => {
            if (err) {
                logger.error(err);
            } else {
                console.log("Saved: " + path);
                logger.log("COVID-19 Data Updated", "./cron_last_updated.log");
                purgeCache();
            }
        });
    }

    function purgeCache() {
        if (isDev) return; //don't do anything on cloudflare if dev (now that we know it works)
        //clear cloudflare cache
        try {
            let cachedFile = isDev
                ? "/api/v1/esri.geojson"
                : sharedConfig.pubURI;
            let params = {
                files: [cachedFile],
            };
            cf.zones
                .purgeCache(process.env.CF_ZONE_ID, params)
                .then((resp) => {
                    if (resp.success) {
                        logger.log("Cloudflare cache cleared");
                    } else {
                        logger.err(
                            `Errors clearing cache: ${JSON.stringify(
                                resp.errors
                            )}`
                        );
                    }
                })
                .catch((err) => {
                    logger.error(err);
                });
        } catch (purgeErr) {
            logger.error(purgeErr);
        }
    }
}

process.on("SIGINT", (code) => {
    logger.log(`${__filename.replace(`${__dirname}/`,'').toUpperCase()} shutting down...`).then(() => {
        process.exit(0);
    });
});
