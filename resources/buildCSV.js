const fs = require("fs");
const parse = require("csv-parse/lib/sync");
const states = require("./states_hash");
const stateCoords = require("./USstates_avg_latLong");
const firstBy = require("thenby");
require("dotenv").config();
var isDev = process.env.ENV === "DEV";

let repo = process.env.COVID_REPO_DIR;
let filepath = `${repo}/csse_covid_19_data/csse_covid_19_daily_reports/`;
//let files;

exports.processFiles = processFiles;

//let records;
exports.recMap = stateCoords.getRecMap();
exports.records = [];

function processFiles(files, callback) {
    exports.records = [];
    for (let index = files.length - 1; index >= 0; index--) {
        let fname = files[index];

        let d = fs.readFileSync(`${filepath}${fname}.csv`).toString("utf8");
        let recs = parse(d, { columns: true }).filter((x) => {
            return parseInt(x.Confirmed) > 0;
        });
        let ct = recs.length;
        for (let i = 0; i < ct; i++) {
            processRecord(recs[i], files[index]);
        }
    }
    callback(processRecords());
}

function processRecord(record, fname) {
    record.Confirmed = parseInt(record.Confirmed);
    record.Deaths = parseInt(record.Deaths);
    record.Recovered = parseInt(record.Recovered);
    if (record.Confirmed >= 1) {
        if (fname) {
            record = setDates(record, fname);
        }
        record = setCombined(record);
        //fixing bad data
        if (
            record.IsoDate == "2020-03-23" &&
            record.Combined_Key == "French Polynesia, France"
        ) {
            let cln = Object.assign({}, record);
            cln.Province_State = null;
            cln.Combined_Key = "France";
            exports.records.push(cln);
            record.Confirmed = 20;
        }

        if (record.Lat != undefined) {
            if (record.Combined_Key && !recMapContains(record.Combined_Key)) {
                if (record.Combined_Key.indexOf("Unassigned,") === -1) {
                    recMapSet(record.Combined_Key, {
                        Lat: record.Lat,
                        Long_: record.Long_,
                    });
                }
            }
        } else {
            if (recMapContains(record.Combined_Key)) {
                record.Lat = recMapGet(record.Combined_Key).Lat;
                record.Long_ = recMapGet(record.Combined_Key).Long_;
            } else {
                console.log(record.Combined_Key + ": " + record.Confirmed);
                console.log(record);
                throw "rec";
            }
        }
        if (record.Lat) {
            exports.records.push(record);
        }
    }
}

function recMapContains(input) {
    return exports.recMap.findIndex(x => input in x) !== -1;
}
function recMapGet(input) {
    return exports.recMap.find((x) => input in x)[input];
}
function recMapSet(input, coords) {
    let rec = {};
    rec[input] = coords;
    if (recMapContains(input)) {
        return;//console.log(`Shouldn't hit this`, rec)
    }
    exports.recMap.push(rec);
}

function setDates(record, fname) {
    record.Last_Update = formatDate(fname);
    record.time = new Date(record.Last_Update).getTime();
    record.IsoDate = record.Last_Update; //formatDate(record.time);
    return record;
}

function setCombined(record) {
    Object.keys(record).forEach(function (key) {
        if (key.indexOf("Province/State") !== -1) {
            record.Province_State = record[key].trim();
            if (
                record.Province_State == "" ||
                record.Province_State == "None"
            ) {
                record.Province_State = null;
            }
        }
        if (key.indexOf("Country/Region") !== -1) {
            record.Country_Region = record[key];
        }
        if (key.indexOf("Latitude") !== -1) {
            record.Lat = record[key];
        }
        if (key.indexOf("Longitude") !== -1) {
            record.Long_ = record[key];
        }
    });

    switch (record.Country_Region) {
        case "Germany":
            record.Province_State = null;
            break;
        case "UK":
            record.Country_Region = "United Kingdom";
            break;
        case "Mainland China":
            record.Country_Region = "China";
            break;
        case "South Korea":
            record.Country_Region = "Korea, South";
            break;
        case "Macau":
            record.Province_State = "Macau";
            record.Country_Region = "China";
            break;
        case "Hong Kong":
            record.Province_State = "Hong Kong";
            record.Country_Region = "China";
            break;
        case "Taiwan":
            record.Province_State = null;
            record.Country_Region = "Taiwan";
            break;
        case "Canada":
            if (
                record.Province_State != null &&
                record.Province_State.indexOf(", ON") !== -1
            ) {
                record.Province_State = "Ontario";
            }
            break;
        case "US":
            let fromDiamondPrincess = [
                "Ashland, NE",
                "Travis, CA",
                "Lackland, TX",
            ];
            if (record.Province_State) {
                if (fromDiamondPrincess.includes(record.Province_State)) {
                    record.Province_State += " (From Diamond Princess)";
                } else {
                    //check for things like 'Kings County, PA'
                    let spl = record.Province_State.split(",");
                    if (spl.length > 1) {
                        let lngSt = states.hash[spl[1].trim()];
                        if (lngSt) {
                            record.Province_State = lngSt;
                        }
                    }
                    //stored non-standard in source
                    if (
                        record.Province_State.indexOf("Virgin Islands") !== -1
                    ) {
                        record.Province_State = "Virgin Islands";
                    }
                }
            }
            break;
    }

    if (
        record.Province_State != null &&
        record.Province_State.indexOf("Diamond Princess") !== -1
    ) {
        record.Combined_Key = `Diamond Princess, ${record.Country_Region}`;
        record.Lat = 0;
        record.Long_ = 0;
    }
    if (
        record.Province_State != null &&
        record.Province_State.indexOf("Grand Princess") !== -1
    ) {
        record.Combined_Key = `Grand Princess, ${record.Country_Region}`;
        record.Lat = -1;
        record.Long_ = 1;
    }
    if (
        record.Country_Region != null &&
        (record.Country_Region.indexOf("Grand Princess") !== -1 ||
            record.Country_Region.indexOf("Diamond Princess") !== -1)
    ) {
        record.Combined_Key = `${record.Country_Region}`;
        record.Lat = 1;
        record.Long_ = -1;
    }

    return normalizeCombinedKey(record);
}

function normalizeCombinedKey(record) {
    if (record.Combined_Key == null || record.Combined_Key == undefined) {
        if (record.Province_State != null) {
            record.Combined_Key = `${record.Province_State}, ${record.Country_Region}`;
        } else {
            record.Combined_Key = record.Country_Region;
        }
    }
    switch (record.Combined_Key) {
        case "UK":
            record.Combined_Key = "United Kingdom, United Kingdom";
            break;
        case "United Kingdom, UK":
            record.Combined_Key = "United Kingdom, United Kingdom";
            break;
        case "UK, United Kingdom":
            record.Combined_Key = "United Kingdom, United Kingdom";
            break;
        case "United Kingdom":
            record.Combined_Key = "United Kingdom, United Kingdom";
            break;
        case "France, France":
            record.Combined_Key = "France";
            break;
        case "Chicago, US":
            record.Combined_Key = "Illinois, US";
            break;
        case "Netherlands, Netherlands":
            record.Combined_Key = "Netherlands";
            break;
        case "North Ireland":
            record.Combined_Key = "Ireland";
            break;
        case "Ivory Coast":
            record.Lat = 5.345317;
            record.Long_ = -4.024429;
            recMapSet(record.Combined_Key, {
                Lat: record.Lat,
                Long_: record.Long_,
            });
            break;
        case "Cruise Ship, Others":
            record.Lat = 1;
            record.Long_ = 1;
            recMapSet(record.Combined_Key, {
                Lat: record.Lat,
                Long_: record.Long_,
            });
            break;
        case "Australia":
            record.Lat = -35.282001;
            record.Long_ = 149.128998;
            recMapSet(record.Combined_Key, {
                Lat: record.Lat,
                Long_: record.Long_,
            });
            break;
    }
    record.Combined_Key = record.Combined_Key.trim();
    return record;
}

function formatDate(value) {
    //YYYY-MM-DD
    let date = new Date(value);
    let dayOfMonth = date.getUTCDate();
    let month = date.getUTCMonth() + 1;
    let year = date.getUTCFullYear();
    month = month < 10 ? "0" + month : month;
    dayOfMonth = dayOfMonth < 10 ? "0" + dayOfMonth : dayOfMonth;
    return `${year}-${month}-${dayOfMonth}`;
}

function processRecords() {
    let sorted = exports.records
        .filter((x) => {
            return x.Combined_Key != "US, US";
        })
        .map((x) => {
            x = normalizeCombinedKey(x);
            //fixing issue where combined key exists and includes 'Unassigned'
            if (x.Combined_Key.startsWith("Unassigned")) {
                let fixed = x.Combined_Key.replace("Unassigned,", "").trim();
                x.Combined_Key = fixed;
            }
            //fix combined keys that include us county (reduce to just state, country)
            let spl = x.Combined_Key.split(",");
            x.Combined_Key =
                spl.length > 2 ? `${spl[1].trim()}, ${spl[2].trim()}`
                    : x.Combined_Key;

            //fix for some combined keys missing spaces
            spl = x.Combined_Key.split(",");
            if (x.Country_Region == "US" && spl.length == 2) {
                x.Combined_Key = `${spl[0].trim()}, ${spl[1].trim()}`;
            }

            //update coordinates based on state
            x.Lat = recMapContains(x.Combined_Key) ? recMapGet(x.Combined_Key).Lat
                : x.Lat;
            x.Long_ = recMapContains(x.Combined_Key) ? recMapGet(x.Combined_Key).Long_
                : x.Long_;
            //console.log(x);
            //throw '';
            //set unique identifiers
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
                //r[key].Recovered += e.Recovered;
            }
            return r;
        }, {})
    );
    return result;
}

exports.mapRecords = function (records) {
    return records.map((x) => {
        let r = {};
        r.Province_State = x.Province_State;
        r.Country_Region = x.Country_Region;
        r.Country = x.Country_Region;
        r.Label = x.Combined_Key;
        r.Lat = parseFloat(x.Lat);
        r.Long = parseFloat(x.Long_);
        r.time = x.time;
        r.IsoDate = x.IsoDate;
        r.Combined_Key = x.Combined_Key;
        r.Confirmed = x.Confirmed;
        r.Deaths = x.Deaths || 0;
        r.Recovered = x.Recovered || 0;
        r.UID = `${x.IsoDate}:${x.Combined_Key}`;
        return r;
    });
};

exports.setCombined = setCombined;
exports.normalizeCombinedKey = normalizeCombinedKey;
exports.processRecord = processRecord;
exports.processRecords = processRecords;
exports.recMapContains = recMapContains;
exports.recMapGet = recMapGet;
exports.recMapSet = recMapSet;