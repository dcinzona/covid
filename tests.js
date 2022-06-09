require("dotenv").config();
var isDev = process.env.ENV === "DEV";
const http = require("http");
const webhookUtils = require("./webhook-utils");
const logger = require("./logger");

//process.env.WEBHOOK_PORT = 3002;
//const webhook = require("./webhook");

if (process.argv.length > 2) {
    let arg1 = process.argv[2];
    switch (arg1) {
        case "webhook":
            let name = process.argv.length > 3 ? process.argv[3] : undefined;
            runWebhookTest(name);
            break;
        case "webdata":
            runWebdataTest();//.then(console.log('DONE'));
            break;
    }
}

async function runWebdataTest() {
    let webdata = require('./resources/webdata');
    await webdata.setBranch('master');
    let lookups = webdata.getLookupsArray();
    const repoParser = require("./repoParser");
    let dailyReportRecs = await repoParser.getJSONData(true);
    dailyReportRecs = dailyReportRecs.map(x => webdata.setCoordsAndPopulation(x));
    await webdata.setBranch('web-data');
    let cases_csv = await webdata.parseCasesTimeCsv();

    console.log(`cases_csv: ${cases_csv.length}`);
    console.log(`dailyReportRecs : ${dailyReportRecs.length}`);
    //cases_csv.sort((a, b) => (a.time > b.time) ? 1 : -1);
    //cases_csv.sort(sorter);
    //dailyReportRecs.sort(sorter);
    //console.log(cases_csv.find(x => x.Country_Region === 'US' && x.Province_State !== ''),
    //    dailyReportRecs.find(x => x.Country_Region === 'US' && x.Province_State !== ''));
    //let drUIDset = new Set(dailyReportRecs.map(x => { return x.UID; }));
    //let casesCsvSet = new Set(cases_csv.map(x => { return x.UID; }));
    //let difference = new Set([...drUIDset].filter(x => !casesCsvSet.has(x)));
    //console.log(dailyReportRecs.find(x => x.UID == [...difference][difference.size - 1]));
    //get latest records:
    let maxTime = getMaxTime(cases_csv);
    let latestCases = cases_csv.filter(x => x.time === maxTime);
    console.log(`latestCases.length: `, latestCases.length);
    console.log(`total sum confirmed: `, getSumConfirmed(latestCases));
    console.log(latestCases.sort(sorter)[0]);
    //console.log(cases_csv.find(x => x.Population === undefined))

    let maxTimeDR = getMaxTime(dailyReportRecs);
    let latestCasesDR = dailyReportRecs.filter(x => x.time === maxTime);
    console.log(`latestCasesDR.length: `, latestCasesDR.length);
    console.log(`total sum confirmed DR: `, getSumConfirmed(latestCasesDR));
    console.log(latestCasesDR.sort(sorter)[0]);

    function getSumConfirmed(data) {
        return data.reduce(function (prev, cur) {
            return prev + cur.Confirmed;
        }, 0);
    }

    function getMaxTime(data) {
        return data.reduce((max, p) => p.time > max ? p.time : max, data[0].time);
    }
}

function sorter(a, b) {
    return (a.time < b.time) ? 1 : (a.time === b.time) ? ((a.UID < b.UID) ? 1 : -1) : -1;
}

function runWebhookTest(pusherName = 'dcinzona') {
    console.log("testing webhook");
    let dj = {
        ref: "refs/heads/master",
        commits: [
            {
                "distinct": true,
                "message": "mapdata automated update",
                "author": {
                    "name": "Automated Process",
                    "email": "dcinzona@users.noreply.github.com",
                    "username": "dcinzona"
                },
                "committer": {
                    "name": "Automated Process",
                    "email": "dcinzona@users.noreply.github.com",
                    "username": "dcinzona"
                },
                "added": [],
                "removed": [],
                "modified": ["docs/data/mapdata.json", "webhook.js", "docs/js/amcharts_popup.js"]
            }
        ],
        head_commit: {
            modified: [
                "buildCSV.js",
                "cron.js",
                "webhook-utils.js",
                "package.json",
            ],
            author: {
                name: pusherName
            }
        }
    };
    let data = JSON.stringify(dj);
    let sig = webhookUtils.createSig(data);

    const options = {
        hostname: "localhost",
        port: process.env.WEBHOOK_PORT,
        path: "/",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": data.length,
            "x-hub-signature": sig,
        },
    };

    const req = http.request(options, (res) => {
        console.log(`statusCode: ${res.statusCode}`);
    });

    req.on("close", () => {
        console.log("request closed");
        let port = process.env.WEBHOOK_PORT;
        logger.log(`Stopping webhook: ${port}`, "restarts.log");
        process.exit();
    });

    req.on("error", (error) => {
        console.error(error);
        process.exit(0);
    });

    req.write(data);
    req.end();
}
