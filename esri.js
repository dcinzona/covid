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
    type = 'FeatureCollection';
    features = [];

    constructor(data){
        this.features = [];
        console.log(data.length);
        data.forEach(rec => {
            let time = Date.parse(rec.IsoDate);
            if(time){
                this.features.push(new feature(rec));
            }
            else{
                console.error(rec);
            }
        });
    }
}

class feature {
    type = "Feature";
    geometry;
    properties;
    constructor(rec){
        this.geometry = new geometry(rec.Lat, rec.Long);
        this.properties = new properties(rec);
    }
}

class geometry {
    type = "Point";
    coordinates = [];
    constructor(lat, long){
        this.coordinates.push(long, lat);
    }
}

class properties {
    ct;
    place;
    time;
    //title;
    country;
    dateString;
    coords;
    uid;
    uid2;
    Country_Region;
    Prov_State
    constructor(rec){
        this.ct = parseInt(rec.Confirmed);
        this.place = rec.Label == 'United Kingdom, United Kingdom' ? 'United Kingdom' : rec.Label.trim();
        this.time = Date.parse(rec.IsoDate);
        this.dateString = rec.IsoDate;
        this.coords = rec.Location;
        this.country = rec.Country;
        this.uid = rec.UID;
        this.uid2 = rec.UID2;
        this.Prov_State = rec.Province_State;
        this.Country_Region = rec.Country_Region;
    }
}