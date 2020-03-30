const { exec } = require("child_process");
const fs = require("fs");
const buildCSV = require("./resources/buildCSV");
const sharedConfig = require("./docs/js/shared.js");
const esriData = require("./esri");
const logger = require("./logger");
require("dotenv").config();
var isDev = process.env.ENV === "DEV";

var cf = require("cloudflare")({
    token: process.env.CF_TOKEN
});

let repo = process.env.COVID_REPO_DIR;
let filepath = `${repo}/csse_covid_19_data/csse_covid_19_daily_reports/`;
let files;

function cron(ms, fn) {
    function cb() {
        clearTimeout(timeout);
        timeout = setTimeout(cb, ms);
        fn();
    }
    let timeout = setTimeout(cb, ms);
}

let spm = 60;
let m_15 = spm * 15;
let secondsPerHour = m_15 * 4;
let hourly = secondsPerHour * 1000;

if (!isDev) {
    cron(hourly, function() {
        run();
    });
}

run();

function run() {
    exec(`cd "${repo}" && git pull`, (error, stdout, stderr) => {
        files = [];
        if (error) {
            logger.error(`exec error: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);

        print(`${filepath}`)
            .then(function() {
                files = files.sort();
                buildCSV.processFiles(files, function(records) {
                    let recs = records.map(x => {
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

                    logger.trim(
                        "COVID-19 Data Updated",
                        "./cron_last_updated.log"
                    );
                });
            })
            .catch(console.error);
    });
}

async function print(path) {
    const dir = await fs.promises.opendir(path);
    for await (const dirent of dir) {
        if (dirent.name.endsWith(".csv")) {
            //console.log(dirent.name);
            files.push(`${dirent.name.replace(".csv", "")}`);
        }
    }
}

function save(path, data) {
    logger.stat(path).then(origStats => {
        if (origStats !== undefined) {
            if (origStats.size != data.length) {
                write(path, data);
            } else {
                console.log("no change to data");
            }
        }
    });

    function write(path, data) {
        fs.writeFile(path, data, { flag: "w+" }, err => {
            if (err) {
                logger.error(err);
            } else {
                console.log("Saved: " + path);
                purgeCache();
            }
        });
    }

    function purgeCache() {
        //clear cloudflare cache
        try {
            let cachedFile = isDev
                ? "/api/v1/esri.geojson"
                : sharedConfig.pubURI;
            let params = {
                files: [cachedFile]
            };
            console.log(params);
            cf.zones
                .purgeCache(process.env.CF_ZONE_ID, params)
                .then(resp => {
                    if (resp.success) {
                        console.log(resp);
                        logger.log("Cloudflare cache cleared");
                    } else {
                        logger.err(
                            `Errors clearing cache: ${JSON.stringify(
                                resp.errors
                            )}`
                        );
                    }
                })
                .catch(err => {
                    logger.error(err);
                });
        } catch (purgeErr) {
            logger.error(purgeErr);
        }
    }
}
