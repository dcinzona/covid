require("dotenv").config();
var isDev = process.env.ENV === "DEV";
const http = require("http");
const utils = require("./webhook-utils");
const logger = require("./logger");
const port = process.env.WEBHOOK_PORT || 3001;

exports.server = http
    .createServer(async function (req, res) {
        req.on("data", async function (chunk) {
            logger.log(`Received webhook`);
            const signature = utils.createSig(chunk);
            const isAllowed =
                req.headers["x-hub-signature"] === signature || isDev;

            /* */
            try {
                const body = JSON.parse(chunk);
                const isMaster = body.ref === "refs/heads/master";
                const pusherName = body.head_commit.author.name;
                let shouldPull =
                    pusherName != "Automated Process" && isAllowed && isMaster;

                if (pusherName === "Automated Process") {
                    logger.log(
                        `Received push from ${pusherName}. Nothing to do.`
                    );
                }

                if (shouldPull) {
                    utils.modified = utils.getChangedFiles(body);//body.head_commit.modified;
                    exports.job = utils.pull();
                }
            } catch (ex) {
                //logger.error(`error on data: ${ex}`);
            }
            /* */

            res.end();
        });
    })
    .listen(port, () => {
        logger.log(`Starting webhook.js on port ${port}`, "restarts.log");
    });


process.on("SIGINT", (code) => {
    logger
        .log(
            `${__filename
                .replace(`${__dirname}/`, "")
                .toUpperCase()} shutting down...`
        )
        .then(() => {
            exports.server.close();
            process.exit(0);
        });
});
