const gmt_domainRoot = `${window.location.protocol}//${
    window.location.hostname == "localhost"
        ? "localhost:3000"
        : window.location.hostname
}`;

require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/GeoJSONLayer",
    "esri/widgets/Slider",
    "esri/widgets/Expand",
    "esri/widgets/Legend",
    `${gmt_domainRoot}/js/util.js`,
    `${gmt_domainRoot}/js/tooltip.js`,
    `${gmt_domainRoot}/js/popup.js`,
    `${gmt_domainRoot}/js/renderer.js`,
    `${gmt_domainRoot}/js/mobile.js`
], function(
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
    
    const layer = new GeoJSONLayer({
        url: util.dataUrl,
        copyright: "CDC / Johns Hopkins",
        title: "COVID-19 Cases over time",
        displayField: "place",
        renderer: renderer,
        popupEnabled: false,
        outFields: ["*"]
    });
    

    const map = new Map({
        basemap: "dark-gray-vector",
        layers: [layer]
    });

    var view = new MapView({
        map: map,
        container: "viewDiv",
        zoom: 2,
        center: [5, 35] //[-117.50268, 34.04713]
    });

    view.constraints = {
        minZoom: 1, // User cannot zoom out beyond a scale of 1:500,000
        maxZoom: 8, // User can overzoom tiles
        rotationEnabled: false // Disables map rotation
    };

    var applicationDiv = document.getElementById("applicationDiv");
    var playButton = document.getElementById("playButton");
    var titleDiv = document.getElementById("titleDiv");
    var updateNote = document.getElementById("updateNote");
    var animation = null;

    const startDate = new Date("2020-01-22").getTime();
    let endDate = util.endDate;

    updateNote.innerText = "Next update: " + util.nextUpdate.toLocaleString();

    const slider = new Slider({
        container: "slider",
        min: startDate,
        max: endDate,
        values: [startDate],
        step: 86400, //seconds in a day
        rangeLabelsVisible: false,
        precision: 0,
        labelsVisible: false,
        disabled: true
    });

    slider.labelFormatFunction = function(value, type) {
        return util.convertToDateString(value);
    };

    const dateFilterField = "dateString";

    const magSum = {
        onStatisticField: "ct",
        outStatisticFieldName: "Sum_confirmed",
        statisticType: "sum",
        precision: 0
    };

    const maxTime = {
        onStatisticField: "time",
        outStatisticFieldName: "Max_time",
        statisticType: "max",
        precision: 0
    };

    const placesCount = {
        onStatisticField: "1=1",
        outStatisticFieldName: "record_count",
        statisticType: "count",
        precision: 0
    };

    const statsFields = {
        record_count: "Places Reporting",
        Sum_confirmed: "Total Confirmed",
        Max_time: "Last Updated"
    };

    // wait till the layer view is loaded
    view.whenLayerView(layer).then(function(lv) {
        layerView = lv;
        setDate(endDate).then(function() {
            layer.queryFeatures().then(function(results) {
                let last =
                    results.features[results.features.length - 1].attributes;
                endDate = last.time;
                slider.max = last.time;
                slider.disabled = false;
                slider.labelsVisible = true;
                slider.rangeLabelsVisible = true;
                setDate(endDate).then(function() {
                    slider.on("thumb-drag", inputHandler);
                    playButton.addEventListener("click", function() {
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

    function setDate(value) {
        var dateStr = util.convertToDateString(value);
        slider.viewModel.setValue(0, value);
        layerView.filter = {
            where: dateFilterField + " = '" + dateStr + "'"
        };

        const statQuery = layerView.filter.createQuery();
        statQuery.outStatistics = [magSum, placesCount];

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
                        const html =
                            "<div>" +
                            statsFields[name] +
                            ": <b><span> " +
                            attributes[name].toFixed(0) +
                            "</span></b></div>";
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
                    statsDiv.innerHTML = htmls[1] + statsHtml;
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

        var frame = function(timestamp) {
            if (!animating) {
                return;
            }

            value += 86400 * 120;
            if (value >= endDate) {
                value = startDate;
                stopAnimation();
                setDate(endDate);
                return;
            }

            setDate(value);

            // Update at 30fps
            setTimeout(function() {
                requestAnimationFrame(frame);
            }, 1000 / 30);
        };

        frame();

        return {
            remove: function() {
                animating = false;
            }
        };
    }

    // add a legend for the earthquakes layer
    const legendExpand = new Expand({
        collapsedIconClass: "esri-icon-collapse",
        expandIconClass: "esri-icon-expand",
        expandTooltip: "Legend",
        view: view,
        content: new Legend({
            view: view
        }),
        expanded: false
    });

    const statsDiv = document.getElementById("statsDiv");

    view.ui.empty("top-left");
    view.ui.add(titleDiv, "top-left");

    mobile.init(view, legendExpand);
});
