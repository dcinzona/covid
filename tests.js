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
            runWebdataTest().then(console.log('DONE'));
            break;
    }
}

async function runWebdataTest() {
    let webdata = require('./resources/webdata');
    await webdata.setBranch('web-data');
    let cases_csv = await webdata.parseCasesTimeCsv();
    await webdata.setBranch('master');
    const repoParser = require("./repoParser");
    let jsonData = await repoParser.getJSONData(true);
    console.log(`cases_csv: ${cases_csv.length}`);
    console.log(`jsonData : ${jsonData.length}`);
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
