'use strict';
const compression = require('compression');
const express = require("express");
const app = express();
const parser = require('./parse');
const esriData = require('./esri');
const fs = require('fs');
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
app.get("/data", (req, res) => {
    parser.run(function(data){
        res.header("Content-Type",'application/json');
        res.json(data);
    });
});

// API versioning
app.get("/api/v([0-9]+)/esri.geojson", (req, res) => {
    getEsriDataV2(res);
});

// API versioning
app.get("/api/v([0-9]+)/esri2.geojson", (req, res) => {
    getEsriDataV2(res);
});


function getEsriDataV2(res) {
    console.log("getting esri data v2");
    res.header("Content-Type", "application/geo+json");
    res.sendFile("./esri.geojson", { root: __dirname });
}

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`App listening on http://localhost:${port}`);
});
