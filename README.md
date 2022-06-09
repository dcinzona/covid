## Displaying COVID-19 Viral Spread over time

Some details around this project are available [here](https://tandeciarz.com/covid-19-playing-with-data/)


### Requirements:
* NodeJS v12+
* [Node PM2](https://www.npmjs.com/package/pm2) (for running as a service)
    * `Webhook.js` expects pm2 to be running to restart the services when new versions are pushed to the master branch

### Instructions
1. Install NodeJS LTS or Current: https://nodejs.org/en/
2. Clone this repo
3. `cd ./covid`
4. `npm install`
5. *follow instructions in Updates section below*
6. `node index.js`
7. Go to http://localhost:3000
8. Click the `play` button on the bottom left

### Updates

JHU CSSE is no longer updating the original CSV (`time_series_19-covid-Confirmed.csv`) used to aggregate the data.  As a result, I needed to have a way to get all the daily report CSV's and process them. 

To make this fast, I decided to clone the COVID-19 repo and then process the files locally (instead of having to pull each one in during the build process).

So to get this to run locally, you need to do the additonal steps listed below:

1. Clone the JHU CSSE COVID-19 repo somewhere:

`git clone https://github.com/CSSEGISandData/COVID-19 ../COVID-19`

2. Copy the .sample-env file to .env

`cp .sample-env .env`

3. Update the repo location with the *FULL* directory path where you cloned the JHU CSSE repo
4. Run `node cron.js` (this will build the esri.geojson file from the CSV daily reports in the COVID-19 repo)


### Notes

The Daily CSV Reports all have different structures (different column names, values for provinces and countries, etc.).  Because of this, I had to add a bunch of logic to "fix" the data to match how I wanted it displayed.

The latest version of CSV structure is splitting up US reporting by *county* but previous US reporting was handling the data by either state or city, then state.  I ended up grouping the county records into state records and rendering the data that way, rather than changing how the points appear on the map after `2020-03-22` (this is when the structure changed).

In "production" the cron job runs every 15 minutes and builds out the geojson file (and only takes about 1-2 seconds to run).  I'm sure this can be optimized, but I'm only working on it late at night (and during some daytime downtime).

In dev, you have to run `node cron.js` every time you want to rebuild the geojson file the map uses to render the points.

### Todo

- [x] Build a webhook to auto-deploy to prod and restart the pm2 jobs
- [ ] Add an Updates section to the front-end UI somewhere
- [ ] ~~Figure out if I can z-index the points with largest on the bottom~~
- [ ] ~~Enable comparing two different countries' rate of infection~~


### Resources used

- [ArcGIS](https://developers.arcgis.com/)
- [JHU CSSE](https://systems.jhu.edu/research/public-health/ncov/)
- [Original Dashboard](https://gisanddata.maps.arcgis.com/apps/opsdashboard/index.html#/bda7594740fd40299423467b48e9ecf6)
- [thenBy.js](https://github.com/Teun/thenBy.js)
- [US States geocoding](https://gist.github.com/meiqimichelle/7727723)
- [US States Short-Long Hash](https://gist.github.com/mshafrir/2646763)
