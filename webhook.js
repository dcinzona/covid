require("dotenv").config();
var isDev = process.env.ENV === "DEV";
const http = require("http");
const crypto = require("crypto");
const exec = require("child_process").exec;
const logger = require("./logger");
const SECRET = process.env.WEBHOOK_SECRET;

let modified = [];
let services = ["index.js", "cron.js", "webhook.js"];

http.createServer(function(req, res) {
    req.on("data", function(chunk) {
        const signature = `sha1=${crypto
            .createHmac("sha1", SECRET)
            .update(chunk)
            .digest("hex")}`;
        const isAllowed = req.headers["x-hub-signature"] === signature;
        const body = JSON.parse(chunk);
        const isMaster = body.ref === "refs/heads/master";
        if (isAllowed && isMaster) {
            // do something
            modified = body.head_commit.modified;
            console.log(modified);
            pull();
        }
    });

    res.end();
}).listen(3001);

function pull() {
    exec(`git pull`, (error, stdout, stderr) => {
        if (error) {
            logger.error(`exec error: ${error}`);
            return;
        }
        if (modified.includes("package.json")) {
            updateNPM();
        } else{
            restartPM2();
        }
    });
}

function updateNPM() {
    exec(`npm install --production`, (error, stdout, stderr) => {
        if (error) {
            logger.error(`exec error: ${error}`);
            return;
        }
        if(isDev){
            console.log(`${stdout}`);
        }
        restartPM2();
    });
}

function restartPM2() {
    if(isDev){
        console.log('restarting pm2 services');
    }
    modified.forEach(svc => {
        if (services.includes(svc)) {
            logger.trim("restarting " + svc, "restarts.log");
            let serviceName = svc.replace(".js", "");

            exec(`pm2 restart ${serviceName}`, (error, stdout, stderr) => {
                if (error) {
                    logger.error(`exec error: ${error}`);
                    return;
                }
                //logger.trim(`stdout: ${stdout}`, "restarts.log");
            });
        }
    });
}

if(isDev){
    updateNPM();
}