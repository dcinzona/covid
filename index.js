'use strict';
const compression = require('compression');
const express = require("express");
const app = express();
const parser = require('./parse');
const esriData = require('./esri');
const fs = require('fs');
const logger = require("./logger");
const sharedConfig = require("./docs/js/shared.js");
require("dotenv").config();

app.use(compression());

app.get("/favicon.png", (req, res) => {
    res.sendFile("./docs/favicon-dev.png", { root: __dirname });
});

app.use(express.static("docs"));

app.get("/", (req, res) => {
    res.sendFile('./docs/index.html', { root: __dirname });
});

// The data
/*
app.get("/data", (req, res) => {
    parser.run(function(data){
        res.header("Content-Type",'application/json');
        res.json(data);
    });
});
*/

// API versioning
/*
app.get("/api/v([0-9]+)/esri.geojson", (req, res) => {
    getEsriDataV2(res);
});
*/

// Data API
app.get(sharedConfig.dataURI, (req, res) => {
    getEsriDataV2(res);
});
// Log API
app.get("/logs/error", (req, res) => {
    if(checkKey(req)) sendLog('./error.log', res);
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

function checkKey(req){
    var key = req.query.key;
    return key === process.env.APIKEY;
}

function sendLog(file, res){

    if (fileExists(file)) {
        res.sendFile(file, { root: __dirname });
    } else {
        res.sendStatus(404);
    }

}
function fileExists(path){
    try {
        if (fs.existsSync(path)) {
            return true;
        }
    } catch (err) {
        logger.error(err);
    }
    return false;
}
function sendError(err){
        if (err) console.log(err);
        else console.log("Sent:", fileName);
}

function getEsriDataV2(res) {
    console.log("getting esri data v2");
    res.header("Content-Type", "application/geo+json");
    res.sendFile("./esri.geojson", { root: __dirname });
}

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`App listening on http://localhost:${port}`);
});
