const { exec } = require("child_process");
const fs = require("fs");
const buildCSV = require("./resources/buildCSV");
const esriData = require("./esri");
require("dotenv").config();

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

cron(m_15 * 1000, function() {
    run();
});

run();

function run() {
    exec(`cd "${repo}" && git pull`, (error, stdout, stderr) => {
        files = [];
        if (error) {
            console.error(`exec error: ${error}`);
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
                    console.log(recs[records.length - 1]);
                    console.log(recs[0]);
                    save("./data.json", JSON.stringify(recs, null, "\t"));
                    save(
                        "./esri.geojson",
                        JSON.stringify(new esriData(recs))
                    );

                    save(
                        "./cron_last_updated.txt",
                        new Date().toLocaleString()
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
    fs.writeFile(path, data, { flag: "w+" }, err => {
        if (err) {
            throw err;
        }
        console.log("Saved: " + path);
    });
}
