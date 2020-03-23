var csv = require("csv");
var request = require("request");
const https = require("https");
var csvUrl =
    "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv";

var etl = [];

exports.data = etl;

exports.run = function(callback) {
    request.get(
        csvUrl,
        {
            columns: true
        },
        function(error, response, body) {
            if (!error && response.statusCode == 200) {
                let data = body;
                process(data, callback);
            }
        }
    );
};

function process(data, callback) {
    etl = [];
    return csv.parse(
        data,
        {
            columns: true,
            on_record: (record, { lines }) => {
                var columns = Object.keys(record);
                columns.forEach(col => {
                    loadEtl(record, col);
                });
                return record;
            }
        },
        function(err, output) {
            callback(etl);
        }
    );
}

function loadEtl(record, col) {
    let skip = ["Province/State", "Country/Region", "Lat", "Long"];
    if (skip.includes(col)) {
        return;
    } else {
        let ct = parseInt(record[col]);
        if (ct > 0) {
            var rec = {
                //"Location" : record["Location"],
                //"Label" : record["Label"],
                Country: record["Country/Region"],
                State_Province: record["Province/State"]
                    ? record["Province/State"]
                    : record["Country/Region"],
                Confirmed: ct,
                RawDate: col,
                IsoDate: convertToDateString(col),
                Lat: parseFloat(record["Lat"]),
                Long: parseFloat(record["Long"])
            };
            rec.Label = (
                record["Province/State"] +
                " [" +
                record["Country/Region"] +
                "]"
            ).trim();
            rec.Location = record["Lat"] + "," + record["Long"];
            etl.push(rec);
        } else if (ct != 0) {
            //console.log(record);
        }
    }
}

convertToDateString = function(value) {
    //YYYY-MM-DD
    let date = new Date(value);
    let dayOfMonth = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();
    month = month < 10 ? "0" + month : month;
    dayOfMonth = dayOfMonth < 10 ? "0" + dayOfMonth : dayOfMonth;
    return `${year}-${month}-${dayOfMonth}`;
};
exports.run(function(d) {
    console.log(d[d.length - 1]);
    console.log(d.length);
});
