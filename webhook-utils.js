require("dotenv").config();
var isDev = process.env.ENV === "DEV";
const http = require("http");
const crypto = require("crypto");
const { exec, execSync, spawn } = require("child_process");
const logger = require("./logger");
const SECRET = process.env.WEBHOOK_SECRET;

let services = ["index.js", "cron.js", "webhook.js"];

function pull() {
    return new Promise((resolve, reject) => {
        sp = spawn(`git`, ["pull"]);
        sp.on("close", code => {
            if (exports.modified.includes("package.json")) {
                resolve(updateNPM());
            } else {
                resolve(restartPM2());
            }
        });
    });
}

function updateNPM() {
    execSync(`npm install --production`, (error, stdout, stderr) => {
        if (error) {
            logger.error(`exec error: ${error}`);
            return;
        }
        if (isDev) {
            console.log(`${stdout}`);
        }
        restartPM2();
    });
}

function restartPM2() {
    if (isDev) {
        console.log("checking for need to restart pm2 services");
    }
    modifiedSet = new Set(exports.modified);
    //restart all services when any js files are updated
    let shouldRestart =
        exports.modified.filter((e, i) => {
            return e.endsWith(".js");
        }).length > 0;

    if (shouldRestart) {
        //logger.trim(`Webhook received modified files: ${exports.modified}`);
        logger.trim(`restarting all services...`, "restarts.log");
        try {
            process.env.WEBHOOK_PORT = 3001;
            execSync(
                `pm2 restart ecosystem.config.js`,
                (error, stdout, stderr) => {
                    if (error) {
                        logger.error(`exec error: ${error}`);
                    }
                }
            );
        } catch (ex) {
            logger.error(ex);
        }
    }

    /*
    modifiedSet = new Set(exports.modified);

    if (modifiedSet.has("resources/buildCSV.js")) {
        modifiedSet.add("cron.js");
    }
    if (modifiedSet.has("webhook-utils.js")) {
        modifiedSet.add("webhook.js");
    }

    modifiedSet.forEach(svc => {
        if (services.includes(svc)) {
            let serviceName = svc.replace(".js", "");
            logger.trim("restarting " + svc, "restarts.log");
            try {
                execSync(
                    `pm2 restart ${serviceName}`,
                    (error, stdout, stderr) => {
                        if (error) {
                            logger.error(`exec error: ${error}`);
                        }
                        //logger.trim(`stdout: ${stdout}`, "restarts.log");
                    }
                );
            } catch (ex) {
                //console.error(ex);
            }
        }
    });
    */
    return "WEBHOOK DONE";
}

function createSig(chunk) {
    return `sha1=${crypto
        .createHmac("sha1", SECRET)
        .update(chunk)
        .digest("hex")}`;
}

exports.createSig = createSig;
exports.pull = pull;
exports.modified = [];
