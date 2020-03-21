define([
    "esri/core/promiseUtils",
    "esri/popup/content",
    "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.4.0/Chart.min.js"
], function(promiseUtils, content, Chart) {
    let layerview, view, layer, selectedCountry, chartWrapper;

    function init(lv, v, l) {
        layerview = lv;
        view = v;
        layer = l;
        chartWrapper = document.getElementById("chartWrapper");

        var hitTest = promiseUtils.debounce(function(event) {
            return view.hitTest(event).then(function(hit) {
                var results = hit.results.filter(function(result) {
                    return result.graphic.layer === layer;
                });

                if (!results.length) {
                    return null;
                }

                return {
                    graphic: results[0].graphic,
                    screenPoint: hit.screenPoint
                };
            });
        });

        function hide() {
            if (view.popup.visible) {
                view.popup.close();
                chartWrapper.classList.remove("visible");
                console.log("hiding");
            }
        }

        function show(features) {
            /* */
            updateChart(rateChart, features);
            let title = `Spread in <span>${selectedCountry}</span>`;
            view.popup.title = title;
            if (!view.popup.visible) {
                console.log("showing");
                view.popup.open({
                    actions: [],
                    autoCloseEnabled: true,
                    dockEnabled: true,
                    dockOptions: {
                        position: "top-right"
                    },
                    content: chartWrapper
                });
                chartWrapper.classList.add("visible");
            }

            /* */
        }

        function getStatQuery() {
            const query = layer.createQuery();
            query.outStatistics = [
                {
                    onStatisticField: "ct",
                    outStatisticFieldName: "sum_confirmed",
                    statisticType: "sum"
                },
                {
                    onStatisticField: "ct",
                    outStatisticFieldName: "max_confirmed",
                    statisticType: "max"
                },
                {
                    onStatisticField: "1=1",
                    outStatisticFieldName: "total_places",
                    statisticType: "count"
                }
            ];
            query.returnDistinctValues = true;
            query.groupByFieldsForStatistics = ["dateString"];
            query.orderByFields = ["dateString ASC"];
            return query;
        }

        function runQuery(event) {
            event.stopPropagation();
            hitTest(event).then(function(hit) {
                //exit if miss
                if (!hit) {
                    hide();
                    return;
                }

                selectedCountry = hit.graphic.attributes.country;

                if (selectedCountry) {
                    const queryParams = getStatQuery();
                    queryParams.where = " country = '" + selectedCountry + "'";
                    queryParams.outFields = ["*"];
                    //console.log(queryParams);
                    // query the layer with the modified params object
                    layer.queryFeatures(queryParams).then(function(results) {
                        // prints the array of result graphics to the console
                        let sorted = results.features.sort(function(a, b) {
                            aTime = new Date(a.attributes.dateString).getTime();
                            bTime = new Date(b.attributes.dateString).getTime();
                            if (aTime > bTime) {
                                return 1;
                            } else if (aTime < bTime) {
                                return -1;
                            } else {
                                return 0;
                            }
                        });
                        //console.log(sorted);
                        show(sorted);
                    });
                } else {
                    //hide histogram
                    hide();
                }
            });
        }
        view.on("click", runQuery);
        createChart();
        /* */
        view.popup.autoOpenEnabled = false;
        view.popup.autoCloseEnabled = true;
        view.popup.dockEnabled = true;
        view.popup.dockOptions = {
            buttonEnabled: false,
            position: "top-right"
        };
        view.popup.featureNavigationEnabled = false;
        /* */
    }

    let fields = {
        type: "fields",
        fieldInfos: [
            {
                fieldName: "country",
                label: "Country",
                visible: true
            },
            {
                fieldName: "ct",
                label: "Confirmed",
                visible: true
            },
            {
                fieldName: "coords",
                label: "Coordinates",
                visible: true
            },
            {
                fieldName: "dateString",
                label: "Reported On",
                visible: true
            }
        ]
    };

    let popupTemplate = {
        title: "{place}",
        content: fields
    };

    function updateChart(chart, features) {
        rateChart.data.labels = features.map(e => e.attributes.dateString);
        rateChart.data.datasets[0].data = features.map(
            e => e.attributes.sum_confirmed
        );
        rateChart.update();
    }

    function createChart() {
        const rateCanvas = document.getElementById("rateChart");
        rateChart = new Chart(rateCanvas.getContext("2d"), {
            type: "line",
            data: {
                labels: [],
                datasets: [
                    {
                        label: "Confirmed Cases",
                        showLine: true,
                        fill: false,
                        spanGaps: true,
                        borderColor: "#f9c653",
                        backgroundColor: "#f9c653",
                        borderWidth: 1,
                        lineTension: 0.1,
                        data: []
                    }
                ]
            },
            options: {
                responsive: true,
                legend: {
                    display: false
                }
            }
        });
        //view.popup.content = document.getElementById("rateChart");
    }

    return {
        init: init,
        template: popupTemplate
    };
});
