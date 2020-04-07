const csv = require("csv");
const fs = require("fs");
require("dotenv").config();
const isDev = process.env.ENV === "DEV";
const buildCSV = require("./resources/buildCSV");
const sharedConfig = require("./docs/js/shared.js");
const esriData = require("./esri");
const logger = require("./logger");

let repo = process.env.COVID_REPO_DIR;
let filepath = `${repo}/csse_covid_19_data/csse_covid_19_daily_reports/`;

exports.getCsvFiles = async function (path = filepath) {
    let files = [];
    let filesWithLastMod = {};
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
    return {
        files: files,
        lastMod: filesWithLastMod,
    };
};

function newDataDetected(lastModArray) {
    if (Object.values(lastModArray).length == 0) {
        return false;
    }
    let geojsonPath = "./esri.geojson";
    esriFileStat = fs.existsSync(geojsonPath)
        ? new Date(fs.statSync(geojsonPath).mtime).getTime()
        : 0;

    let maxCallback = (acc, cur) => Math.max(acc, cur);
    let max = Object.values(lastModArray).reduce(maxCallback);

    let filesNewerThanJSON = max > esriFileStat;

    return filesNewerThanJSON;
}

function buildDataset(files) {
    return new Promise((resolve, reject) => {
        if (files && Array.isArray(files)) {
            buildCSV.processFiles(files, function (records) {
                resolve(mapRecords(records));
            });
        } else {
            reject(`invalid files array: ${JSON.stringify(files)}`);
        }
    });
}

function mapRecords(records){
    return records.map((x) => {
        let r = {};
        r.Province_State = x.Province_State;
        r.Country_Region = x.Country_Region;
        r.Country = x.Country_Region;
        //r.Location = `${x.Lat},${x.Long_}`;
        r.Label = x.Combined_Key;
        r.Lat = x.Lat;
        r.Long = x.Long_;
        r.time = x.time;
        r.IsoDate = x.IsoDate;
        r.Combined_Key = x.Combined_Key;
        r.Confirmed = x.Confirmed;
        r.Deaths = x.Deaths || 0;
        r.Recovered = x.Recovered || 0;
        return r;
    });
}

exports.getJSONData = async function (force = false) {
    let data = [];
    let csvFiles = await exports.getCsvFiles();
    if (csvFiles.files.length === 0) {
        logger.error(`No files to process at path: ${filepath}`);
    } else {
        let filesNewerThanJSON = newDataDetected(csvFiles.lastMod);

        logger.log(
            `${
                filesNewerThanJSON
                    ? "geojson is out of date"
                    : "no new records to process"
            }`
        );
        if(force){
            logger.log('Force build enabled... processing csv files')
        }
        if (filesNewerThanJSON || force) {
            data = await buildDataset(csvFiles.files.sort());
        }
    }

    return data;
};

exports.getEsriData = async function (force = false) {
    let data = await exports.getJSONData(force);
    let esriGeo;
    if (data.length > 0) {
        esriGeo = new esriData(data);
    }
    return esriGeo;
};

exports.runTask = async function () {
    let d = await exports.getJSONData(true);
    console.log(d[0]);
};
