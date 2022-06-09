define([
    "esri/core/promiseUtils",
    "esri/popup/content",
    "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.4.0/Chart.min.js",
], function (promiseUtils, content, Chart) {
    let layerview, view, layer, selectedCountry, chartWrapper, setDate;

    function init(lv, v, l, s) {
        layerview = lv;
        view = v;
        layer = l;
        setDate = s;
        chartWrapper = document.getElementById("chartWrapper");

        view.on("click", runQuery);

        createChart();
        /* */
        view.popup.actions = [];
        view.popup.autoOpenEnabled = false;
        view.popup.autoCloseEnabled = true;
        view.popup.dockEnabled = true;
        view.popup.dockOptions = {
            breakpoint: false,
            buttonEnabled: false,
            position: "bottom-right",
            content: chartWrapper,
        };
        view.popup.featureNavigationEnabled = false;
        /* */
    }

    var hitTest = promiseUtils.debounce(function (event) {
        return view.hitTest(event).then(function (hit) {
            var results = hit.results.filter(function (result) {
                return result.graphic.layer === layer;
            });

            if (!results.length) {
                return null;
            }

            return {
                graphic: results[0].graphic,
                screenPoint: hit.screenPoint,
                mapPoint: results[0].mapPoint,
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

    function show(features, hit) {
        /* */
        updateChart(rateChart, features);
        console.log(rateChart.data);
        let cnf = rateChart.data.datasets[0].data;
        let dth = rateChart.data.datasets[1].data;
        let cfr = getCFR(cnf, dth);

        let title = `Spread in <span>${selectedCountry}</span> => CFR: <i>${cfr}%</i>`;
        view.popup.title = title;
        if (!view.popup.visible) {
            view.popup.location = hit.mapPoint;
            view.popup.visible = true;
            view.popup.content = chartWrapper;
            view.popup.collapsed = false;
            chartWrapper.classList.add("visible");
        }

        /* */
    }

    Array.prototype.max = function () {
        return Math.max.apply(null, this);
    };

    function getCFR(confArr, deathArr) {
        return ((deathArr.max() / confArr.max()) * 100).toFixed(2);
    }

    function getStatQuery() {
        const query = layer.createQuery();
        query.outStatistics = [
            {
                onStatisticField: "ct",
                outStatisticFieldName: "sum_confirmed",
                statisticType: "sum",
            },
            {
                onStatisticField: "ct",
                outStatisticFieldName: "max_confirmed",
                statisticType: "max",
            },
            {
                onStatisticField: "d",
                outStatisticFieldName: "sum_deaths",
                statisticType: "sum",
            },
            {
                onStatisticField: "1=1",
                outStatisticFieldName: "total_places",
                statisticType: "count",
            },
        ];
        query.returnDistinctValues = true;
        query.groupByFieldsForStatistics = ["dateString"];
        query.orderByFields = ["dateString ASC"];
        return query;
    }

    function sorter(a, b) {
        aTime = new Date(a.attributes.dateString).getTime();
        bTime = new Date(b.attributes.dateString).getTime();
        if (aTime > bTime) {
            return 1;
        } else if (aTime < bTime) {
            return -1;
        } else {
            return 0;
        }
    }

    function updateChart(chart, features) {
        rateChart.data.labels = features.map((e) => e.attributes.dateString);
        rateChart.data.datasets[0].data = features.map(
            (e) => e.attributes.sum_confirmed
        );
        rateChart.data.datasets[1].data = features.map(
            (e) => e.attributes.sum_deaths
        );
        //rateChart.data.datasets[0].label = `${selectedCountry} (Total Cases)`;
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
                        label: `Confirmed Cases`,
                        showLine: true,
                        fill: false,
                        spanGaps: true,
                        borderColor: "#f9c653",
                        backgroundColor: "#f9c653",
                        borderWidth: 1,
                        lineTension: 0.1,
                        data: [],
                        pointRadius: 0,
                        pointHitRadius: 3,
                    },
                    {
                        label: `Deaths`,
                        showLine: true,
                        fill: true,
                        spanGaps: true,
                        borderColor: "#990000",
                        backgroundColor: "#990000",
                        borderWidth: 1,
                        lineTension: 0.1,
                        data: [],
                        pointRadius: 0,
                        pointHitRadius: 3,
                    },
                ],
            },
            options: {
                responsive: true,
                aspectRatio: 1.5,
                legend: {
                    display: true,
                    //onClick: null,
                },
                onClick: function (e) {
                    var firstPoint = rateChart.getElementAtEvent(e)[0];
                    if (firstPoint) {
                        var label = `${
                            rateChart.data.labels[firstPoint._index]
                        }`;
                        if (setDate) {
                            setDate(new Date(label).getTime());
                        }
                    }
                },
                tooltips: {
                    callbacks: {
                        label: function (tooltipItem, data) {
                            var label =
                                data.datasets[tooltipItem.datasetIndex].label ||
                                "";

                            if (label) {
                                label += ": ";
                            }
                            label += tooltipItem.yLabel;

                            return label;
                        },
                        afterLabel: function (tooltipItem, data) {
                            let label = "";
                            let dsi = tooltipItem.datasetIndex;
                            let ds = data.datasets[dsi];
                            let i = tooltipItem.index;
                            if (i >= 1) {
                                let maths = ds.data[i] - ds.data[i - 1];
                                return `Delta: ${
                                    (maths > 0 ? "+" : "") + maths
                                }`;
                            }
                            return null;
                        },
                    },
                },
            },
        });
        //view.popup.content = document.getElementById("rateChart");
    }
    let runQuery = function (event) {
        //event.stopPropagation();
        hitTest(event).then(function (hit) {
            //exit if miss
            if (!hit) {
                //hide(); //commenting out to leave stats up when deselecting
                return;
            }

            selectedCountry = hit.graphic.attributes.country;

            if (selectedCountry) {
                const queryParams = getStatQuery();
                queryParams.where = " country = '" + selectedCountry + "'";
                layer.queryFeatures(queryParams).then(function (results) {
                    let sorted = results.features.sort(sorter);
                    show(sorted, hit);
                });
            } else {
                hide();
            }
        });
    };
    return {
        init: init,
        onClick: runQuery,
        //template: popupTemplate
    };
});
