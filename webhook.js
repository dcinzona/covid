

require("dotenv").config();
const http = require("http");
const crypto = require("crypto");
const exec = require("child_process").exec;
const logger = require('./logger');
const SECRET = process.env.WEBHOOK_SECRET;

logger.error('test');

let modified = [];
let services = ['index.js','cron.js','webhook.js'];

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

function pull(){
    exec(`git pull`, (error, stdout, stderr) => {
        if (error) {
            logger.error(`exec error: ${error}`);
            return;
        }
        modified.forEach(svc => {
            if(services.includes(svc)){
                logger.log('restarting ' + svc, 'restarts.log');
                let serviceName = svc.replace('.js','');
                restartPM2(serviceName);
            }
        });
    });
}

function restartPM2(serviceName){
    exec(`pm2 restart ${serviceName}`, (error, stdout, stderr) => {
        if (error) {
            logger.error(`exec error: ${error}`);
            return;
        }
        logger.log(`stdout: ${stdout}`, 'restarts.log');
    });
}
