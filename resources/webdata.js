//git clone --single-branch --branch web-data https://github.com/CSSEGISandData/COVID-19.git COVID-19-web-data
//git clone https://github.com/CSSEGISandData/COVID-19.git COVID-19-web-data
const csv = require("csv");
const parse = require("csv-parse/lib/sync");
const { exec } = require("child_process");
const fs = require("fs");
require("dotenv").config();
const isDev = process.env.ENV === "DEV";
const buildCSV = require("./buildCSV");
const sharedConfig = require("../docs/js/shared.js");
const esriData = require("../esri");
const logger = require("../logger");
const firstBy = require("thenby");

let repo = process.env.COVID_REPO_DIR + "-web-data";

//fields
//Country_Region	Last_Update	Confirmed	Deaths	Recovered	Active	Delta_Confirmed	Delta_Recovered	Incident_Rate	People_Tested	People_Hospitalized	Province_State	FIPS	UID	iso3
//CONTAINS US STATES DATA
//Usually lags by a 2 days (e.g. 4/6/20)
let archivedTimeCSV = `${repo}/archived_data/data/cases_time.csv`; //historical dates, no lat long

//fields
//Province_State	Country_Region	Last_Update	Lat	Long_	Confirmed	Deaths	Recovered	Active	Admin2	FIPS	Combined_Key	Incident_Rate	People_Tested	People_Hospitalized	UID	ISO3
//has cases from "yesterday" (e.g. 4/7/20)
let archivedCases = `${repo}/archived_data/data/cases.csv`; //no history but has lat long

//fields
//Country_Region	Last_Update	Confirmed	Deaths	Recovered	Active	Delta_Confirmed	Delta_Recovered
//DOES NOT CONTAIN DATA BY US STATE
//Do I need this data?
let recentCasesCountry = `${repo}/data/cases_country.csv`;

//fields
//FIPS	Admin2	Province_State	Country_Region	Last_Update	Lat	Long_	Confirmed	Deaths	Recovered	Active	Combined_Key
//Updated with "today's" data regularly (e.g. 4/8)
let recentCases = `${repo}/data/cases.csv`;

//last updated date format is M/D/YY for some unknown reason

let files = [archivedTimeCSV, archivedCases, recentCases, recentCasesCountry];
async function run() {
    return fs.access(repo, function (error) {
        if (error) {
            console.log("Directory does not exist.  Cloning repo....");

            return exec(
                `git clone https://github.com/CSSEGISandData/COVID-19.git ${repo}`,
                (e, so, se) => {
                    if (e) {
                        return logger.error(e);
                    }
                    return checkout();
                }
            );
        } else {
            console.log("Directory exists.");
            return checkout();
        }
    });
}

async function checkout() {
    console.log("checking out branch and getting latest data");
    return exec(
        `cd ${repo} && git checkout web-data && git pull`,
        (err, output, stderr) => {
            if (err) {
                return logger.error(err);
            }
            return processFiles();
        }
    );
}

async function processFiles() {
    console.log("processing files: checking if they exist");
    let allFilesExist = true;
    files.forEach((path) => {
        //make sure files exist
        if (fs.existsSync(path)) {
            console.log(`${path} csv exists`);
        } else {
            console.error(`CSV NOT FOUND: ${path}`);
            allFilesExist = false;
        }
    });
    if (allFilesExist) {
        console.log("all files exist, processing data");
        buildCSV.records = [];
        await setCountryGeos();
        console.log(buildCSV.recMap);
        console.log(buildCSV.recMap.filter((x) => "Canada" in x));
        //read CSVs and process
        console.log("Processing archivedCases");
        await parseCsv(archivedCases);
        //console.log(buildCSV.records[0]);
        console.log(buildCSV.records.length);
        console.log("Processing recentCases");
        await parseCsv(recentCases);
        //console.log(buildCSV.records[0]);
        console.log(buildCSV.records.length);
        console.log("Processing archivedTimeCSV");
        await parseCsv(archivedTimeCSV);
        //console.log(buildCSV.records[0]);
        console.log(buildCSV.records.length);
        console.log("Processing processRecords");
        let recs = finalize();
        console.log(recs[0]);
        console.log(recs[recs.length - 1]);
        console.log(recs.length);
        console.log(recs.filter((x) => x.Combined_Key == "New York, US"));
        return recs;
    } else {
        return console.error("required files are missing... ending process");
    }
}

async function setCountryGeos() {
    let d = fs.readFileSync(`${recentCasesCountry}`).toString("utf8");
    let recs = parse(d, { columns: true })
        .filter((x) => {
            return x.Lat || false;
        })
        .map((x) => {
            let ret = {};
            ret[x.Country_Region.trim()] = {
                Lat: x.Lat,
                Long_: x.Long_,
            };
            if (!recMapContains(x.Country_Region.trim())) {
                buildCSV.recMap.push(ret);
            }
            return ret;
        });

    return recs;
}

async function parseCsv(file) {
    let d = fs.readFileSync(`${file}`).toString("utf8");
    let last;
    if (buildCSV.records.length > 0) {
        last = buildCSV.records.sort(firstBy("time"))[
            buildCSV.records.length - 1
        ];
    }
    let recs = parse(d, { columns: true })
        .filter((x) => {
            return parseInt(x.Confirmed) > 0;
        })
        .map(checkUSCombined)
        .map((x) => {
            x.Last_Update = fixDateFormat(x.Last_Update);
            x.IsoDate = x.Last_Update;
            x.time = new Date(x.Last_Update).getTime();
            x.ck2 = `${x.IsoDate}:${x.Province_State}:${x.Country_Region}`
            return x;
        })
        .filter((x) => {
            return last ? x.time != last.time && !buildCSV.records.some(b => b.ck2 === x.ck2) : true;
        })
        .map((x) => {
            return buildCSV.processRecord(x);
        })
        .sort(firstBy("time"));
    return recs;
}

function checkUSCombined(record) {
    record.Combined_Key =
        record.Province_State.trim() !== ""
            ? `${record.Province_State.trim()}, ${record.Country_Region.trim()}`
            : record.Country_Region.trim();
    while (record.Combined_Key.indexOf(",") === 0) {
        record.Combined_Key = record.Combined_Key.substring(1);
    }
    return record;
}

function recMapContains(input) {
    return buildCSV.recMap.findIndex((x) => input in x) !== -1;
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
    console.error("Invalid date: " + input);
    throw "";
    return null;
}

function finalize() {
    let sorted = buildCSV.records
        .sort(firstBy("time"))
        .filter((x) => {
            return x.Combined_Key != "US, US";
        })
        .map((x) => {
            //x = buildCSV.normalizeCombinedKey(x);
            //fixing issue where combined key exists and includes 'Unassigned'
            if (x.Combined_Key.startsWith("Unassigned")) {
                let fixed = x.Combined_Key.replace("Unassigned,", "").trim();
                x.Combined_Key = fixed;
            }
            /* *
            //fix combined keys that include us county (reduce to just state, country)
            let spl = x.Combined_Key.split(",");
            x.Combined_Key =
                spl.length > 2
                    ? `${spl[1].trim()}, ${spl[2].trim()}`
                    : x.Combined_Key;

            //fix for some combined keys missing spaces
            spl = x.Combined_Key.split(",");
            if (x.Country_Region == "US" && spl.length == 2) {
                x.Combined_Key = `${spl[0].trim()}, ${spl[1].trim()}`;
            }

            //update coordinates based on state
            x.Lat = recMapContains(x.Combined_Key)
                ? recMapGet(x.Combined_Key).Lat
                : x.Lat;
            x.Long_ = recMapContains(x.Combined_Key)
                ? recMapGet(x.Combined_Key).Long_
                : x.Long_;
            //console.log(x);
            //throw '';
            //set unique identifiers
            */
            x.Location = `${x.Lat},${x.Long_}`;
            x.UID = `${x.IsoDate}:${x.Location}`;
            x.UID2 = `${x.Combined_Key}:${x.IsoDate}`;

            return x;
        })
        .sort(firstBy("time"));

    var result = Object.values(
        sorted.reduce(function (r, e) {
            var key = e.UID2;
            if (!r[key]) r[key] = e;
            else {
                r[key].Confirmed += e.Confirmed;
                r[key].Deaths += e.Deaths;
                //r[key].Recovered += e.Recovered || 0;
            }
            return r;
        }, {})
    );
    return result;
}
run();
