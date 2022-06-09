/*exports.payload = {
    type:"FeatureCollection",
    features:[points]
}
exports.points = {
    type:"Feature",
    geometry:{
        type:"Point",
        coordinates:[-116.51433,33.10683,9.01]
    },
    properties:{
        mag:0.85,
        place:"9km ENE of Julian, CA",
        time:1560962164830,
        title:"M 0.9 - 9km ENE of Julian, CA",
        depth:9.01
    }
}
*/
"use strict";

module.exports = class payload {

    constructor(data, lastUpdated = new Date()) {
        this.type = 'FeatureCollection';
        this.last_updated = lastUpdated;
        this.features = [];
        data.forEach(rec => {
            let time = Date.parse(rec.IsoDate);
            if (time) {
                this.features.push(new feature(rec));
            }
            else {
                console.error(rec);
            }
        });
    }
}

class feature {
    constructor(rec) {
        this.type = "Feature";
        this.geometry = new geometry(rec.Lat, rec.Long || rec.Long_);
        this.properties = new properties(rec);
    }
}

class geometry {
    constructor(lat, long) {
        this.type = "Point";
        this.coordinates = [];
        this.coordinates.push(long, lat);
    }
}

class properties {
    constructor(rec) {
        this.ct = parseInt(rec.Confirmed);
        this.place = rec.Label == 'United Kingdom, United Kingdom' ? 'United Kingdom' : rec.Label.trim();
        this.time = Date.parse(rec.IsoDate);
        this.dateString = rec.IsoDate;
        //this.coords = rec.Location;
        this.country = rec.Country;
        this.d = parseInt(rec.Deaths || 0);
        this.r = parseInt(rec.Recovered || 0);
        this.pop = parseInt(rec.Population || 0);
    }
}