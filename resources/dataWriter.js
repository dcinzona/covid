const fs = require("fs").promises;
const sharedConfig = require("../docs/js/shared");
const logger = require("../logger");
const { spawnPromise } = require("../resources/utils");
require("dotenv").config();
var isDev = process.env.ENV === "DEV";
var cf = require("cloudflare")({
    token: process.env.CF_TOKEN,
});


let filePaths = new Set();
exports.mapDataPath = "docs/data/mapdata.json";
exports.popDataPath = "docs/data/lookups.json";

let currentBranch = 'dev';

async function save(path, data) {

    updateFilePaths(exports.mapDataPath, exports.popDataPath, path);

    currentBranch = await spawnPromise("git", [
        "rev-parse",
        "--abbrev-ref",
        "HEAD",
    ]);

    return await write(path, data);
}

function updateFilePaths(...paths) {
    let args = [...arguments];
    args.forEach(path => {
        filePaths.add(path);
    });
    return filePaths;
}

async function write(path, data) {

    if (isDev && currentBranch === "master") {
        //checkout remote file first
        await spawnPromise("git", ['pull']); //just get all files
    }

    return await fs
        .writeFile(path, data, { flag: "w+" })
        .then(async () => {
            //save to docs directory
            //why are we doing this? So that we can host all files directly from github pages and not touch out server at all
            //the server basically just functions as a worker to build the file and then push it back to the master repo
            //await writeToDocsData(data);
            logger.log(`Data Writes Done: ${path}`);
            return "Writes done";
        })
        .catch((err) => {
            logger.error(err);
            return err;
        });
}

async function pushMapData() {

    //add files in case they are not already tracked
    await spawnPromise('git', ['add', 'docs/data/*']);

    let params = [
        "status",
        "-s"];
    params.concat([...filePaths]);

    let mapStatus = await spawnPromise("git", params);

    //check if the docs file has changed
    let isChanged = false;
    filePaths.forEach(p => {
        if (mapStatus.indexOf(p) !== -1) {
            isChanged = true;
        }
    });

    if (isChanged) {
        logger.log("Data changed and requires push");

        let params = ["commit",
            "-m",
            "data automated update"];
        params = params.concat([...filePaths]); // merge the two arrays

        if (isDev && currentBranch === 'master') {
            console.log(params);
            return cleanup('[pushMapData]: Running in dev so not actually executing commit on master')
        }

        return spawnPromise("git", params)
            .then(async () => {
                if (!isDev) {
                    await spawnPromise("git", ["push"]);
                    return cleanup("DATA PUSHED");
                } else {
                    return cleanup("Running in dev, not pushing");
                }
            })
            .catch(async (err) => {
                return cleanup(err, true);
            });

    } else {
        return logger.log("Data did not change, no push required");
    }

}

function cleanup(msg, err = false) {
    filePaths.clear();
    return err ? logger.error(msg) : logger.log(msg);
}

async function purgeCache() {
    //clear cloudflare cache
    var rootDomain = 'gmtaz.com'; // gmt.io
    try {
        let cachedFiles = isDev
            ? "https://covid-data."+rootDomain+"/api/v1/esri.geojson"
            : "https://covid."+rootDomain + sharedConfig.pubURI;
        let params = {
            files: [cachedFiles],
        };
        if (!isDev) {
            params.files.push("https://covid."+rootDomain);
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

exports.save = save;
exports.write = write;
exports.push = pushMapData;
exports.purgeCFCache = purgeCache;