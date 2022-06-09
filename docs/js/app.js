let windowURI = `${
    window.location.hostname == "localhost"
        ? window.location.protocol + "//localhost:3000"
        : window.location.href
    }`;
const gmt_domainRoot = windowURI.endsWith('/') ? windowURI.slice(0, -1) : windowURI;
require([
    "esri/request",
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/GeoJSONLayer",
    "esri/widgets/Slider",
    "esri/widgets/Expand",
    "esri/widgets/Legend",
    `${gmt_domainRoot}/js/util.js`,
    `${gmt_domainRoot}/js/tooltip.js`,
    `${gmt_domainRoot}/js/amcharts_popup.js`,
    `${gmt_domainRoot}/js/renderer.js`,
    `${gmt_domainRoot}/js/mobile.js`,
], function (
    esriRequest,
    Map,
    MapView,
    GeoJSONLayer,
    Slider,
    Expand,
    Legend,
    util,
    tooltip,
    popup,
    renderer,
    mobile
) {
    let layerView;
    let layer;
    window.gisMap = {
        get view() { return view; },
        get map() { return map; },
        get layerView() { return layerView; },
        filter(field = 'place', place = 'Veteran Hospitals, US') {
            layerView.filter = { where: `${field} = '${place}'` }
            layerView.queryFeatures().then(result => { console.log(result.features); });
        },
        customWhereFilter(...where) {
            let today = util.convertToDateString(new Date());
            let args = [...arguments];
            where = args.join(' AND ');
            let filter = { where: `dateString = '${today}' ${where.length > 0 ? ' AND ' + where : ''}` };
            layerView.filter = filter;
            layerView.queryFeatures()
                .then(result => { console.log(result.features.map(x => x.attributes)); })
                .catch(x => {
                    console.error(x.message, x.details);
                    console.log("Example: gisMap.customWhereFilter(`place like '%Military%'`)");
                });
            return layerView.filter;
        }
    };
    /* */
    esriRequest(util.dataUrl, {
        responseType: "json",
    }).then(function (response) {
        // The requested data
        let geojson = response.data;
        //console.log(geojson);
        updateNote.innerText =
            "Last updated: " + new Date(geojson.last_updated).toLocaleString();
        const blob = new Blob([JSON.stringify(geojson)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);

        layer = new GeoJSONLayer({
            url: url,
            copyright: "CDC / Johns Hopkins",
            title: "COVID-19 Cases over time",
            displayField: "place",
            renderer: renderer,
            popupEnabled: false,
            outFields: ["*"],
        });
        map.layers = [layer];

        // wait till the layer view is loaded
        view.whenLayerView(layer).then(function (lv) {
            layerView = lv;
            setDate(endDate).then(function () {
                layer.queryFeatures().then(function (results) {
                    let last =
                        results.features[results.features.length - 1]
                            .attributes;
                    endDate = last.time;
                    slider.max = last.time;
                    slider.disabled = false;
                    setDate(endDate).then(function () {
                        slider.on("thumb-drag", inputHandler);
                        playButton.addEventListener("click", function () {
                            if (playButton.classList.contains("toggled")) {
                                stopAnimation();
                            } else {
                                startAnimation();
                            }
                        });
                        playButton.classList.remove("disabled");
                    });
                });
            });

            if (!mobile.isMobile()) {
                tooltip.setupHoverTooltip(layerView, view, layer);
            }

            popup.init(layerView, view, layer, setDate);
        });
    });
    /* */

    const map = new Map({
        basemap: "dark-gray-vector",
        //layers: [layer],
    });

    var view = new MapView({
        map: map,
        container: "viewDiv",
        scale: 73957338,
        center: [5, 35], //[-117.50268, 34.04713]
    });

    view.constraints = {
        //minZoom: 1, // User cannot zoom out beyond a scale of 1:500,000
        //maxZoom: 8, // User can overzoom tiles
        minScale: 4622333,
        maxScale: 247914677,
        rotationEnabled: false, // Disables map rotation
    };
    /* *
    view.watch("scale", function (newValue) {
        console.log(newValue);
        //layer.renderer = newValue <= 72224 ? simpleRenderer : heatmapRenderer;
    });
    /* */

    var playButton = document.getElementById("playButton");
    var titleDiv = document.getElementById("titleDiv");
    var updateNote = document.getElementById("updateNote");
    var animation = null;

    const startDate = new Date("2020-01-22").getTime();
    let endDate = util.endDate;

    const slider = new Slider({
        container: "slider",
        min: startDate,
        max: endDate,
        values: [startDate],
        step: 86400, //seconds in a day
        precision: 0,
        disabled: true,
        snapOnClickEnabled: false,
        visibleElements: {
            labels: true,
            rangeLabels: true
        }
    });

    slider.labelFormatFunction = function (value, type) {
        return util.convertToDateString(value);
    };

    const dateFilterField = "dateString";

    const magSum = {
        onStatisticField: "ct",
        outStatisticFieldName: "Sum_confirmed",
        statisticType: "sum",
        precision: 0,
    };

    const deathSum = {
        onStatisticField: "d",
        outStatisticFieldName: "Sum_deaths",
        statisticType: "sum",
        precision: 0,
    };

    const placesCount = {
        onStatisticField: "1=1",
        outStatisticFieldName: "record_count",
        statisticType: "count",
        precision: 0,
    };

    const statsFields = {
        record_count: "Places Reporting",
        Sum_confirmed: "Global Confirmed",
        Sum_deaths: "Global Deaths",
        Max_time: "Last Updated",
    };

    function setDate(value) {
        var dateStr = util.convertToDateString(value);
        slider.viewModel.setValue(0, value);
        layerView.filter = {
            where: dateFilterField + " = '" + dateStr + "'",
        };

        const statQuery = layerView.filter.createQuery();
        statQuery.outStatistics = [magSum, deathSum, placesCount];

        return layer
            .queryFeatures(statQuery)
            .then(updateTitleDiv)
            .catch(logError);
    }

    function logError(error) {
        console.error(error);
    }

    function updateTitleDiv(result) {
        let htmls = [];
        statsDiv.innerHTML = "";
        if (result.error) {
            return result.error;
        } else {
            if (result.features.length >= 1) {
                var attributes = result.features[0].attributes;
                for (name in statsFields) {
                    if (attributes[name] && attributes[name] != null) {
                        let Sum_confirmed = attributes["Sum_confirmed"].toFixed(
                            0
                        );
                        let Sum_deaths = attributes["Sum_deaths"].toFixed(0);

                        const html = `<div>
                            ${statsFields[name]} : 
                            <b><span ${
                            name == "Sum_deaths" ? "class='cfr'" : ""
                            }> 
                            ${util.numberWithCommas(
                                attributes[name].toFixed(0)
                            )}
                            </span></b><i>
                            ${
                            name == "Sum_deaths"
                                ? "(" +
                                (
                                    (Sum_deaths / Sum_confirmed) *
                                    100
                                ).toFixed(2) +
                                "%)"
                                : ""
                            }</i>
                            </div>`;
                        htmls.push(html);
                    }
                }
                var statsHtml =
                    "<br/><div><span>" +
                    result.features[0].attributes["record_count"] +
                    "</span> locations reporting on <b>" +
                    util.convertToDateString(slider.viewModel.values[0]);
                ("</b>.</div><br/>");

                if (htmls[0] == undefined) {
                    statsDiv.innerHTML = statsHtml;
                } else {
                    statsDiv.innerHTML = htmls[1] + htmls[2] + statsHtml;
                }
            }
        }
    }

    // When user drags the slider:
    //  - stops the animation
    //  - set the visualized year to the slider one.
    function inputHandler(event) {
        stopAnimation();
        setDate(event.value);
    }

    function startAnimation() {
        stopAnimation();
        if (
            util.convertToDateString(slider.values[0]) ==
            util.convertToDateString(new Date(endDate))
        ) {
            setDate(startDate);
        }
        animation = animate(slider.values[0]);
        playButton.classList.add("toggled");
    }
    function stopAnimation() {
        if (!animation) {
            return;
        }

        animation.remove();
        animation = null;
        playButton.classList.remove("toggled");
    }
    function animate(startValue) {
        var animating = true;
        var value = startValue;
        //make speed relative to number of days
        let speed =
            Math.round(
                (new Date(endDate).getTime() - new Date(startDate).getTime()) /
                (3600000 * 24)
            ) * 2.5;

        var frame = function (timestamp) {
            if (!animating) {
                return;
            }
            value += 86400 * speed;
            if (value >= endDate) {
                value = startDate;
                stopAnimation();
                setDate(endDate);
                return;
            }

            setDate(value);

            // Update at 30fps
            setTimeout(function () {
                requestAnimationFrame(frame);
            }, 1000 / 30);
        };

        frame();

        return {
            remove: function () {
                animating = false;
            },
        };
    }

    // add a legend for the earthquakes layer
    const legendExpand = new Expand({
        collapsedIconClass: "esri-icon-collapse",
        expandIconClass: "esri-icon-expand",
        expandTooltip: "Legend",
        view: view,
        content: new Legend({
            view: view,
        }),
        expanded: false,
    });

    const statsDiv = document.getElementById("statsDiv");

    view.ui.empty("top-left");
    view.ui.add(titleDiv, "top-left");

    mobile.init(view, legendExpand);
});
