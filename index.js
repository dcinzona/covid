"use strict";
const compression = require("compression");
const express = require("express");
const app = express();
const fs = require("fs");
const logger = require("./logger");
const { spawnPromise } = require("./resources/utils");

require("dotenv").config();
var isDev = process.env.ENV === "DEV";

app.use(compression());

app.get("/favicon.png", (req, res) => {
    res.sendFile("./docs/favicon-dev.png", { root: __dirname });
});

app.use(express.static("docs"));

app.get("/", (req, res) => {
    res.sendFile("./docs/index.html", { root: __dirname });
});

app.get("/geo", (req, res) => {
    res.sendFile("./tools/geo.html", { root: __dirname });
});

process.env.FORCE_COLOR = true;
// Log API
app.get("/logs/error", async (req, res) => {
    if (checkKey(req)) {
        let spwn = await spawnPromise("pm2", ["logs", "--err", "--nostream"]);
        res.send(buildStatusHTML(spwn));
    } else res.sendStatus(403);
});
app.get("/logs/out", async (req, res) => {
    if (checkKey(req)) {
        let spwn = await spawnPromise("pm2", ["logs", "--nostream"]);
        res.send(buildStatusHTML(spwn));
    } else res.sendStatus(403);
});
app.get("/logs/index", async (req, res) => {
    if (checkKey(req)) {
        let spwn = await spawnPromise("pm2", ["logs", "index", "--nostream"]);
        res.send(buildStatusHTML(spwn));
    } else res.sendStatus(403);
});
app.get("/logs/webhook", async (req, res) => {
    if (checkKey(req)) {
        let spwn = await spawnPromise("pm2", ["logs", "webhook", "--nostream"]);
        res.send(buildStatusHTML(spwn));
    } else res.sendStatus(403);
});
app.get("/logs/cron", async (req, res) => {
    if (checkKey(req)) {
        let spwn = await spawnPromise("pm2", ["logs", "cron", "--nostream"]);
        res.send(buildStatusHTML(spwn));
    } else res.sendStatus(403);
});
app.get("/logs/", async (req, res) => {
    if (checkKey(req)) {
        let spwn = await spawnPromise("pm2", ["logs", "--nostream"]);
        res.send(buildStatusHTML(spwn));
    } else res.sendStatus(403);
});

var Convert = require("ansi-to-html");
var convert = new Convert({});
app.get("/logs/status", async (req, res, next) => {
    if (checkKey(req)) {
        res.header("Content-Language", "en-US");
        res.header("Cache-Control", "no-cache");
        res.header("Content-Type", "text/html");

        process.env.FORCE_COLOR = true;
        try {
            let pmProm = await spawnPromise("pm2", ["ls"]);
            res.send(buildStatusHTML(pmProm));
        } catch (ex) {
            console.log(ex);
            res.end();
        }
    } else res.sendStatus(403);
});

function buildStatusHTML(data) {
    return `<html lang="en">
                <head>
                    <style>
                        html,body { background: #0e0e0e; }
                        pre { font-family: monospace; }
                    </style>
                </head>
                <body>
                    <pre>${convert.toHtml(data)}</pre>
                </body>
            </html>`;
}

function checkKey(req) {
    var key = req.query.key;
    return isDev ? isDev : key === process.env.APIKEY;
}

function sendLog(file, res) {
    if (fileExists(file)) {
        res.sendFile(file, { root: __dirname });
    } else {
        res.sendStatus(404);
    }
}

function fileExists(path) {
    try {
        if (fs.existsSync(path)) {
            return true;
        }
    } catch (err) {
        logger.error(err);
    }
    return false;
}

const port = process.env.PORT || 3000;

app.listen(port, () => {
    logger.log(`Starting index.js on port ${port}`, "restarts.log");
});

process.on("SIGINT", (code) => {
    logger
        .log(
            `${__filename
                .replace(`${__dirname}/`, "")
                .toUpperCase()} shutting down...`
        )
        .then(() => {
            process.exit(0);
        });
});
