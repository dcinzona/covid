'use strict';
const compression = require('compression');
const express = require("express");
const app = express();
const parser = require('./parse');
const esriData = require('./esri');

app.use(compression());


app.get("/", (req, res) => {
    res.sendFile('./docs/index.html', { root: __dirname });
});

app.get("/js/app.js", (req, res) => {
    res.sendFile('./docs/js/app.js', { root: __dirname });
});
app.get("/css/styles.css", (req, res) => {
    res.sendFile('./docs/css/styles.css', { root: __dirname });
});

app.get("/favicon.ico", (req, res) => {
    res.sendFile('./docs/favicon.png', { root: __dirname });
});

// The data
app.get("/data", (req, res) => {
    parser.run(function(data){
        res.header("Content-Type",'application/json');
        res.json(data);
    });
});

// API versioning
app.get("/api/v2/esri.geojson", (req, res) => {
    getEsriData(res);
});

function getEsriData(res){
    parser.run(function(data){
        console.log('getting esri data');
        let d = new esriData(data);
        res.header("Content-Type",'application/geo+json');
        res.json(d);
    });
}

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`App listening on http://localhost:${port}`);
});
