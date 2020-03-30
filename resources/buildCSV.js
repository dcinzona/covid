const fs = require("fs");
const csv = require("csv");
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

let records;
let recMap = stateCoords.getRecMap();
//console.log(recMap);

function processFiles(files, callback) {
    //files = f;
    records = [];
    for (let index = files.length - 1; index >= 0; index--) {
        let fname = files[index];
        console.info("******** Starting: " + fname);

        let d = fs.readFileSync(`${filepath}${fname}.csv`).toString("utf8");
        let recs = parse(d, { columns: true }).filter(x => {
            return parseInt(x.Confirmed) >= 1;
        });
        //console.log(recs.length);
        for (let i = 0; i < recs.length; i++) {
            //console.log(index);
            //console.log(files[index]);
            processRecord(recs[i], files[index]);
        }

        console.log("Records Processed: " + recs.length);
        //parser.write(fs.readFileSync(`${filepath}${fname}.csv`));
        //parser.end();
    }
    callback(processRecords());
}

function processRecord(record, fname) {
    record.Confirmed = parseInt(record.Confirmed);
    if (record.Confirmed >= 1) {
        record = setDates(record, fname);
        record = setCombined(record);
        //fixing bad data
        if (
            record.IsoDate == "2020-03-23" &&
            record.Combined_Key == "French Polynesia, France"
        ) {
            let cln = Object.assign({}, record);
            cln.Province_State = null;
            cln.Combined_Key = "France";
            records.push(cln);
            record.Confirmed = 20;
        }

        if (record.Lat != undefined) {
            if (record.Combined_Key && !recMap[record.Combined_Key]) {
                if (record.Combined_Key.indexOf("Unassigned,") === -1) {
                    recMap[record.Combined_Key] = {
                        Lat: record.Lat,
                        Long_: record.Long_
                    };
                }
            }
        } else {
            if (recMap[record.Combined_Key]) {
                record.Lat = recMap[record.Combined_Key].Lat;
                record.Long_ = recMap[record.Combined_Key].Long_;
            } else {
                console.log(record.Combined_Key + ": " + record.Confirmed);
            }
        }
        if (record.Lat) {
            records.push(record);
        }
    }
}

function setDates(record, fname) {
    record.Last_Update = formatDate(fname);
    record.time = new Date(record.Last_Update).getTime();
    record.IsoDate = record.Last_Update; //formatDate(record.time);
    return record;
}

function setCombined(record) {
    Object.keys(record).forEach(function(key) {
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
                "Lackland, TX"
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
            recMap[record.Combined_Key] = {
                Lat: record.Lat,
                Long_: record.Long_
            };
            break;
        case "Cruise Ship, Others":
            record.Lat = 1;
            record.Long_ = 1;
            recMap[record.Combined_Key] = {
                Lat: record.Lat,
                Long_: record.Long_
            };
        case "Australia":
            record.Lat = -35.282001;
            record.Long_ = 149.128998;
            recMap[record.Combined_Key] = {
                Lat: record.Lat,
                Long_: record.Long_
            };
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

function getTomorrow(value) {
    const tomorrow = new Date(value);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
}

function processRecords() {
    let sorted = records
        .filter(x => {
            return x.Combined_Key != "US, US";
        })
        .map(x => {
            x = normalizeCombinedKey(x);
            //fixing issue where combined key exists and includes 'Unassigned'
            let unassginedFixed = false;
            if (x.Combined_Key.startsWith("Unassigned")) {
                //console.log(`[${x.IsoDate}] ${x.Combined_Key} ${x.Confirmed}`);
                let fixed = x.Combined_Key.replace("Unassigned,", "").trim();
                //console.log(`[${x.IsoDate}] ${x.Combined_Key} => ${fixed}`);
                x.Combined_Key = fixed;
                unassginedFixed = true;
            }
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

            if(unassginedFixed && isDev){
                console.log(`[${x.IsoDate}] ${x.Combined_Key} = ${x.Confirmed}`);
            }

            //update coordinates based on state
            x.Lat =
                x.Combined_Key in recMap ? recMap[x.Combined_Key].Lat : x.Lat;
            x.Long_ =
                x.Combined_Key in recMap
                    ? recMap[x.Combined_Key].Long_
                    : x.Long_;

            //set unique identifiers
            x.Location = `${x.Lat},${x.Long_}`;
            x.UID = `${x.IsoDate}:${x.Location}`;
            x.UID2 = `${x.Combined_Key}:${x.IsoDate}`;

            return x;
        })
        .sort(firstBy("time"));

    var result = Object.values(
        sorted.reduce(function(r, e) {
            var key = e.UID2;
            if (!r[key]) r[key] = e;
            else {
                r[key].Confirmed += e.Confirmed;
            }
            return r;
        }, {})
    );
    return result;
}

exports.makeCsv = function(recs, callback) {
    csv.stringify(
        recs,
        {
            header: true
        },
        function(err, data) {
            //console.log(data);
            callback(data);
        }
    );
};
