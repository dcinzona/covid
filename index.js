"use strict";
const compression = require("compression");
const express = require("express");
const app = express();
const fs = require("fs");
const logger = require("./logger");
const sharedConfig = require("./docs/js/shared.js");
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

// Data API
app.get(sharedConfig.dataURI, (req, res) => {
    getEsriDataV2(res);
});
// Log API
app.get("/logs/error", (req, res) => {
    if (checkKey(req)) sendLog("./error.log", res);
    else res.sendStatus(403);
});
app.get("/logs/restart", (req, res) => {
    if (checkKey(req)) sendLog("./restarts.log", res);
    else res.sendStatus(403);
});
app.get("/logs/cron", (req, res) => {
    if (checkKey(req)) sendLog("./cron_last_updated.log", res);
    else res.sendStatus(403);
});
app.get("/logs/logger", (req, res) => {
    if (checkKey(req)) sendLog("./logger.log", res);
    else res.sendStatus(403);
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

function getEsriDataV2(res) {
    console.log("getting esri data v2");
    res.header("Content-Type", "application/geo+json");
    res.sendFile("./esri.geojson", { root: __dirname });
}

const port = process.env.PORT || 3000;

app.listen(port, () => {
    logger.trim(`Starting index.js on port ${port}`, "restarts.log");
});
