require("dotenv").config();
var isDev = process.env.ENV === "DEV";
const http = require("http");
const crypto = require("crypto");
const { exec, execSync, spawn } = require("child_process");
const logger = require("./logger");
const { spawnPromise } = require("./resources/utils");
const SECRET = process.env.WEBHOOK_SECRET;

let services = ["index.js", "cron.js", "webhook.js"];

async function pull() {
    return spawnPromise("git", ["pull"]).then(() => {
        if (exports.modified.includes("package.json")) {
            return updateNPM();
        } else {
            return restartPM2();
        }
    });
}

async function updateNPM() {
    return spawnPromise("npm", ["install", "--production"]).then(() => {
        return restartPM2();
    });
}

async function restartPM2() {

    if (isDev) {
        console.log("checking for need to restart pm2 services");
    }

    //restart all services when any js files are updated
    let shouldRestart =
        exports.modified.filter((e, i) => {
            return e.endsWith(".js");
        }).length > 0;

    if (shouldRestart) {
        logger.log(`Webhook received modified files: ${exports.modified}`);
        logger.log(`restarting all services...`, "restarts.log");
        process.env.WEBHOOK_PORT = 3001;
        let pm2 = await spawnPromise("pm2", [
            "startOrReload",
            "ecosystem.config.js",
        ]);
    }

    return shouldRestart
        ? "WEBHOOK DONE - SERVICES RESTARTED"
        : "WEBHOOK DONE - NOTHING TO DO";
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
exports.restart = restartPM2;
