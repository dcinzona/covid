require("dotenv").config();
var isDev = process.env.ENV === "DEV";
const crypto = require("crypto");
const logger = require("./logger");
const { spawnPromise } = require("./resources/utils");
const SECRET = process.env.WEBHOOK_SECRET;

async function pull() {
    return spawnPromise("git", ["pull"]).then(() => {
        if (arrayContainsString("package.json")) {
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
        console.log("checking for need to restart pm2 services", exports.modified);
    }

    //restart all services when any js files are updated
    let shouldRestart = exports.modified.length > 0;

    if (shouldRestart) {
        logger.log(`Webhook received modified files: ${JSON.stringify(exports.modified)}`);
        logger.log(`restarting all services...`, "restarts.log");
        process.env.WEBHOOK_PORT = 3001;
        if (!isDev) {
            await spawnPromise("pm2", ["startOrRestart", "ecosystem.config.js"]);
        }
    } else {
        logger.log('No modified files requiring service restart.');
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

function arrayContainsString(arr, inputStr) {
    if (Array.isArray(arr) === false || arr.length === 0) {
        return false;
    }
    let re = new RegExp(`(${inputStr}$)`, "i");
    let found =
        arr.filter((x) => {
            return x.trim().match(re);
        }).length > 0;
    return found;
};

exports.createSig = createSig;
exports.pull = pull;
exports.modified = [];
exports.restart = restartPM2;
exports.arrayContainsString = arrayContainsString;

exports.getChangedFiles = function getImportantCommitFiles(body) {
    return body.commits.map(x => { return x.added.concat(x.modified, x.removed) })
        .flat()
        .filter((v, i, a) =>
            a.indexOf(v) === i &&
            v.endsWith('.js') &&
            !v.startsWith('docs/vendor')
        );
}