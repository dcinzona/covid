require("dotenv").config();
var isDev = process.env.ENV === "DEV";
const http = require("http");
const webhookUtils = require("./webhook-utils");
const logger = require("./logger");

process.env.WEBHOOK_PORT = 3002;

const webhook = require("./webhook");

if (process.argv.length > 2) {
    let arg1 = process.argv[2];
    switch (arg1) {
        case "webhook":
            runWebhookTest();
            break;
    }
}

function runWebhookTest() {
    console.log("testing webhook");
    let dj = {
        ref: "refs/heads/master",
        head_commit: {
            modified: ["buildCSV.js", "cron.js", "webhook-utils.js",'package.json']
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
            "x-hub-signature": sig
        }
    };

    const req = http.request(options, res => {
        console.log(`statusCode: ${res.statusCode}`);
    });

    req.on("close", () => {
        console.log("request closed");
        let port = process.env.WEBHOOK_PORT;
        webhook.job
            .then(function(msg) {
                console.log(`callback: ${msg}`);
                logger.trim(`Stopping webhook: ${port}`, "restarts.log");
            })
            .then(() => {
                console.log("exit");
                process.exit();
            });
    });

    req.on("error", error => {
        console.error(error);
        process.exit(0);
    });

    req.write(data);
    req.end();
}
