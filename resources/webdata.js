//git clone --single-branch --branch web-data https://github.com/CSSEGISandData/COVID-19.git COVID-19-web-data
//git clone https://github.com/CSSEGISandData/COVID-19.git COVID-19-web-data
const parse = require("csv-parse/lib/sync");
const { exec, execSync } = require("child_process");
const fs = require("fs");
require("dotenv").config();
const buildCSV = require("./buildCSV");
const dataWriter = require("./dataWriter");
const esriData = require("../esri");
const logger = require("../logger");
const firstBy = require("thenby");
const repoParser = require("../repoParser");
const { spawnPromise } = require("./utils");

let repo = process.env.COVID_REPO_DIR// + "-web-data";
//branches = master ()

//fields
//FIPS	Admin2	Province_State	Country_Region	Last_Update	Lat	Long_	Confirmed	Deaths	Recovered	Active	Combined_Key
//Updated with "today's" data regularly (e.g. 4/8)
let recentCases = `${repo}/data/cases.csv`;

//last updated date format is M/D/YY for some unknown reason
let forceRun = false;
let isRunning = false;
async function run(force = false) {
    if (isRunning) {
        logger.log('Previous cron job is already running...exiting');
        return 0;
    }
    isRunning = true;
    forceRun = force;
    buildCSV.records = [];
    let folderExists = fs.existsSync(repo);
    if (!folderExists) {
        logger.log("Directory does not exist.  Cloning repo....");
        console.log(await spawnPromise('git', ['clone', 'https://github.com/CSSEGISandData/COVID-19.git', repo]));
        logger.log(`Clone done.  Starting checkout process...`);
        await checkout();
    } else {
        logger.log("Directory exists. Starting checkout process...");
        await checkout();
    }
    isRunning = false;
}

async function checkout() {
    //check if recent data was updated
    await setBranch('web-data');
    exports.CSVLastUpdatedDate = await lastUpdatedDate(recentCases);
    let geojsonPath = './docs/data/mapdata.json';
    esriFileStat = fs.existsSync(geojsonPath)
        ? new Date(fs.statSync(geojsonPath).mtime).getTime()
        : 0;

    logger.log(`last updated: mapdata.json: ${new Date(esriFileStat).toLocaleString()}`);
    logger.log(`last updated: ${recentCases}: ${new Date(exports.CSVLastUpdatedDate).toLocaleString()}`);

    let newData = exports.CSVLastUpdatedDate.getTime() > esriFileStat;
    logger.log(`exports.CSVLastUpdatedDate.getTime() > esriFileStat = ${newData}`);

    logger.log("checking out master branch to build time series data set");

    await setBranch("master");
    await savePopLookups();

    let jsonData = await repoParser.getJSONData(forceRun || newData);

    if (jsonData.length === 0 && !newData) {
        return await logger.log(`Daily logs weren't processed and no new data detected`);
    }

    console.info(`Daily reports record count: ${jsonData.length}`);
    logger.log("checking out web-data and getting latest data");
    await setBranch("web-data");
    buildCSV.records = [];
    if (csvFilesExist([recentCases])) {
        logger.log("Processing recentCases");
        let recs = await parseCsv(recentCases);
        logger.log("Finalizing recentRecords: " + recs.length);
        let recs2 = finalize(recs);
        logger.log(`Mapping to common format and joining datasets`);
        let recsToJoin = [];
        buildCSV.mapRecords(recs2).forEach((rec) => {
            let jdFoundIdx = jsonData.findIndex((el) => {
                return el.UID === rec.UID;
            });
            if (jdFoundIdx > -1) {
                jsonData[jdFoundIdx] = rec;
            } else {
                recsToJoin.push(rec);
            }
        });
        jsonData = jsonData.concat(recsToJoin).sort(firstBy("time"));
    }
    console.info(`Concatenated data record count: ${jsonData.length}`);
    logger.log(`Saving to file`);
    let saveResponse = await saveAsGeoJSON(jsonData);
    console.log(saveResponse);
    //conditionally push saved files
    await dataWriter.push();
}

async function savePopLookups() {
    logger.log('Processing Lookups CSV...');
    //since we are on master, parse and save the lookup table
    let lookupJSONPath = './docs/data/lookups.json';
    let lookupCsv = `${repo}/csse_covid_19_data/UID_ISO_FIPS_LookUp_Table.csv`;
    let localLastUpdated = fs.existsSync(lookupJSONPath)
        ? new Date(fs.statSync(lookupJSONPath).mtime).getTime()
        : 0;
    if (fs.existsSync(lookupCsv)) {
        let remoteLastUpdated = await lastUpdatedDate(lookupCsv);
        if (remoteLastUpdated > localLastUpdated) {

            let d = fs.readFileSync(`${lookupCsv}`).toString("utf8");
            let recs = parse(d, { columns: true })
                .filter((x) => {
                    return parseInt(x.Population) > 0 && `${x.Admin2}` === '';
                })
                .map((x) => {
                    x.Population = parseInt(x.Population);
                    return x;
                });
            console.log(recs);
            //TODO: Update datawriter to support saving multiple files and pushing.
            await dataWriter.save(lookupJSONPath, JSON.stringify(recs));
        }
    } else {
        logger.log(`File not found: ${lookupCsv}`);
    }
}

async function setBranch(branch) {
    try {
        let resp = execSync(`git checkout ${branch} && git pull`, { cwd: repo });
        return resp;
    } catch (ex) {
        logger.error("Error running setBranch\n" + ex);
        return ex;
    }
}

function csvFilesExist(arr) {
    let allFilesExist = true;
    arr.forEach((path) => {
        //make sure files exist
        if (fs.existsSync(path)) {
            console.info(`${path} csv exists`);
        } else {
            logger.error(`CSV NOT FOUND: ${path}`);
            allFilesExist = false;
        }
    });
    return allFilesExist;
}

exports.CSVLastUpdatedDate = new Date();
//we are only processing one CSV here (the most recent data)
async function parseCsv(file) {
    //get file last modified date
    exports.CSVLastUpdatedDate = await lastUpdatedDate(file);
    let Last_Updated = fixDateFormat(exports.CSVLastUpdatedDate.toISOString());
    let d = fs.readFileSync(`${file}`).toString("utf8");
    let recs = parse(d, { columns: true })
        .filter((x) => {
            return parseInt(x.Confirmed) > 0;
        })
        .map(checkUSCombined)
        .map((x) => {
            x.Confirmed = parseInt(x.Confirmed);
            x.Deaths = parseInt(x.Deaths);
            x.Recovered = parseInt(x.Recovered);
            x.Last_Reported = x.Last_Update;
            //Set last updated to last modified date on file for continuity over time
            x.Last_Update = Last_Updated;
            x.IsoDate = x.Last_Update;
            x.time = new Date(x.Last_Update).getTime();
            x.ck2 = `${x.IsoDate}:${x.Province_State}:${x.Country_Region}`;
            x = setLatLongForSpecialCases(x);
            return x;
        });
    return recs;
}

async function lastUpdatedDate(file) {
    mtime = await spawnPromise('git', ['--no-pager', 'log', '-1', '--pretty=%ai', file], { cwd: repo });
    mtime = new Date(mtime);
    //console.log(mtime.toLocaleDateString());
    return mtime;
}

function setLatLongForSpecialCases(rec) {
    switch (rec.Combined_Key.trim()) {
        case "MS Zaandam":
            rec.Lat = 53.644638;
            rec.Long_ = 3.390743;
            break;
        case "Northwest Territories, Canada":
            rec.Lat = 74.994164;
            rec.Long_ = -121.780487;
            break;
        case "Diamond Princess, US":
            rec.Lat = 26.115986;
            rec.Long_ = -90.787142;
            break;
        case "Northern Mariana Islands, US":
            rec.Lat = 15.18883;
            rec.Long_ = 145.7535;
            break;
        case "US Military, US":
            rec.Lat = 33.42550825488307;
            rec.Long_ = -75.64934587047526;
            break;
        case "Federal Bureau of Prisons, US":
            rec.Lat = 32.37175163445504;
            rec.Long_ = -75.64934587047526;
            break;
        case "Veteran Hospitals, US":
            rec.Lat = 31.37175163445504;
            rec.Long_ = -75.64934587047526;
            break;
    }
    return rec;
}

function checkUSCombined(record) {
    record.Province_State = record.Province_State || "";
    record.Combined_Key =
        record.Province_State.trim() !== ""
            ? `${record.Province_State.trim()}, ${record.Country_Region.trim()}`
            : record.Country_Region.trim();
    while (record.Combined_Key.indexOf(",") === 0) {
        record.Combined_Key = record.Combined_Key.substring(1);
    }
    return record;
}

function fixDateFormat(input) {
    //convert M/D/YY to YYYY-MM-DD
    if (input.indexOf("/") !== -1) {
        let inArr = input.split("/").map((x) => x.trim());
        let m = inArr[0].length == 1 ? `0${inArr[0]}` : inArr[0];
        let d = inArr[1].length == 1 ? `0${inArr[1]}` : inArr[1];
        let y = inArr[2].length == 2 ? `20${inArr[2]}` : inArr[2];
        return `${y}-${m}-${d}`;
    } else {
        //test for iso date format
        input = input.split("T")[0].split(" ")[0];
        let isIso = input
            .trim()
            .match(
                /^([1-9][0-9]{3})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])?$/g
            );
        if (isIso) {
            return input.trim();
        }
    }
    logger.error("Invalid date: " + input).then(() => {
        throw "";
    });
}

function finalize(recs = buildCSV.records) {
    let sorted = recs
        .filter((x) => {
            return x.Combined_Key != "US, US";
        })
        .map((x) => {
            //update coordinates based on state
            x.Lat = buildCSV.recMapContains(x.Combined_Key)
                ? buildCSV.recMapGet(x.Combined_Key).Lat
                : x.Lat;
            x.Long_ = buildCSV.recMapContains(x.Combined_Key)
                ? buildCSV.recMapGet(x.Combined_Key).Long_
                : x.Long_;

            x = setLatLongForSpecialCases(x);
            /* */
            x.Location = `${x.Lat},${x.Long_}`;
            x.UID = `${x.IsoDate}:${x.Location}`;
            x.UID2 = `${x.Combined_Key}:${x.IsoDate}`;

            return x;
        });
    //.sort(firstBy("Confirmed")).reverse();
    //throw '';
    var result = Object.values(
        sorted.reduce(function (r, e) {
            var key = e.Combined_Key;
            if (!r[key]) r[key] = e;
            else {
                r[key].Confirmed += e.Confirmed;
                r[key].Deaths += e.Deaths;
                //r[key].Recovered += e.Recovered || 0;
            }
            return r;
        }, {})
    );
    let missingLatLong = result.filter((x) => {
        return x.Lat === "";
    });
    if (missingLatLong.length > 0) {
        logger.log(`Records missing Lat, Long_: ${JSON.stringify(missingLatLong)}`)
    }
    return (buildCSV.records = result);
}

async function saveAsGeoJSON(recs) {
    let esriGeo = new esriData(recs, exports.CSVLastUpdatedDate);
    let saveResponse = await dataWriter.save(dataWriter.mapDataPath, JSON.stringify(esriGeo));
    return saveResponse;
    //return esriGeo;
}

exports.run = run;

//NOTE: May need to pull archived data from the master branch time series, then take current data from web-data branch and merge...

/* *
//fields
//Country_Region	Last_Update	Confirmed	Deaths	Recovered	Active	Delta_Confirmed	Delta_Recovered	Incident_Rate	People_Tested	People_Hospitalized	Province_State	FIPS	UID	iso3
//CONTAINS US STATES DATA
//Usually lags by a 2 days (e.g. 4/6/20)
let archivedTimeCSV = `${repo}/data/cases_time.csv`; //historical dates, no lat long

//fields
//Province_State	Country_Region	Last_Update	Lat	Long_	Confirmed	Deaths	Recovered	Active	Admin2	FIPS	Combined_Key	Incident_Rate	People_Tested	People_Hospitalized	UID	ISO3
//has cases from "yesterday" (e.g. 4/7/20)
let archivedCases = `${repo}/archived_data/data/cases.csv`; //no history but has lat long

//fields
//Country_Region	Last_Update	Confirmed	Deaths	Recovered	Active	Delta_Confirmed	Delta_Recovered
//DOES NOT CONTAIN DATA BY US STATE
//Do I need this data?
let recentCasesCountry = `${repo}/data/cases_country.csv`;
/* */

/* *
async function setCountryGeos(file) {
    let d = fs.readFileSync(`${file}`).toString("utf8");
    let recs = parse(d, { columns: true })
        .filter((x) => {
            return x.Lat || false;
        })
        .map(checkUSCombined)
        .map((x) => {
            if (!buildCSV.recMapContains(x.Combined_Key)) {
                buildCSV.recMapSet(x.Combined_Key, {
                    Lat: parseFloat(x.Lat),
                    Long_: parseFloat(x.Long_),
                });
            }
            return x;
        });

    return recs;
}
/* */
