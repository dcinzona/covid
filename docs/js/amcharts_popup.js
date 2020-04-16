
define([
    "esri/core/promiseUtils",
], function (promiseUtils) {

    let layerview, view, layer, selectedCountry, chartWrapper, setDate;

    function init(lv, v, l, s) {
        layerview = lv;
        view = v;
        layer = l;
        setDate = s;
        chartWrapper = document.getElementById("chartWrapper");

        view.on("click", runQuery);

        am4core.ready(createChart);

        /* */
        view.popup.actions = [];
        view.popup.autoOpenEnabled = false;
        view.popup.autoCloseEnabled = true;
        view.popup.dockEnabled = true;
        view.popup.dockOptions = {
            breakpoint: false,
            buttonEnabled: false,
            position: "bottom-right",
        };
        view.popup.visibleElements = {
            featureNavigationEnabled: false
        }
        /* */
    }

    function createChart() {
        // Themes begin
        am4core.useTheme(am4themes_dark);
        am4core.useTheme(am4themes_animated);
        // Themes end
        // Create chart
        //var container = am4core.create("chartWrapper", am4core.Container);
        //container.width = am4core.percent(100);
        //container.height = am4core.percent(100);
        am4core.options.onlyShowOnViewport = true;
        rateChart = am4core.create("rateChart", am4charts.XYChart);
        rateChart.responsive.enabled = true;

        var dateAxis = rateChart.xAxes.push(new am4charts.DateAxis());
        dateAxis.renderer.grid.template.location = 0;
        dateAxis.skipEmptyPeriods = true;
        dateAxis.groupData = true;
        dateAxis.renderer.labels.template.fill = am4core.color("#dfcc64");

        var valueAxis = rateChart.yAxes.push(new am4charts.ValueAxis());
        valueAxis.tooltip.disabled = true;
        valueAxis.renderer.labels.template.fill = am4core.color("#dfcc64");
        //valueAxis.renderer.minWidth = 60;

        var valueAxis2 = rateChart.yAxes.push(new am4charts.ValueAxis());
        valueAxis2.tooltip.disabled = true;
        valueAxis2.renderer.labels.template.fill = am4core.color("#e59165");
        valueAxis2.renderer.opposite = true;
        //valueAxis2.renderer.minWidth = 60;
        valueAxis2.syncWithAxis = valueAxis;

        var series = rateChart.series.push(new am4charts.LineSeries());
        series.name = "Cases";
        series.dataFields.dateX = "date";
        series.dataFields.valueY = "confirmed";
        series.tooltipText = "{valueY.value}";
        series.fill = am4core.color("#dfcc64");
        series.stroke = am4core.color("#dfcc64");
        //series.strokeWidth = 3;

        var series2 = rateChart.series.push(new am4charts.LineSeries());
        series2.name = "Deaths";
        series2.dataFields.dateX = "date";
        series2.dataFields.valueY = "deaths";
        series2.yAxis = valueAxis2;
        series2.xAxis = dateAxis;
        series2.tooltipText = "{valueY.value}";
        series2.fill = am4core.color("#e59165");
        series2.stroke = am4core.color("#e59165");
        //series2.strokeWidth = 3;

        series.events.on("hidden", toggleAxes);
        series.events.on("shown", toggleAxes);
        series2.events.on("hidden", toggleAxes);
        series2.events.on("shown", toggleAxes);

        rateChart.cursor = new am4charts.XYCursor();
        rateChart.cursor.xAxis = dateAxis;

        rateChart.scrollbarX = new am4core.Scrollbar();

        rateChart.legend = new am4charts.Legend();
        rateChart.legend.parent = rateChart.plotContainer;
        rateChart.legend.zIndex = 100;

        valueAxis2.renderer.grid.template.strokeOpacity = 0.07;
        dateAxis.renderer.grid.template.strokeOpacity = 0.07;
        valueAxis.renderer.grid.template.strokeOpacity = 0.07;

    }

    function toggleAxes(ev) {
        var axis = ev.target.yAxis;
        var disabled = true;
        axis.series.each(function (series) {
            if (!series.isHiding && !series.isHidden) {
                disabled = false;
            }
        });
        axis.disabled = disabled;
    }

    function updateChart(features) {
        let data = features.map((e) => {
            let conf = {
                'date': e.attributes.dateString,
                'confirmed': e.attributes.sum_confirmed,
                'deaths': e.attributes.sum_deaths
            }
            return conf;
        })
        rateChart.data = data;
        //rateChart.data.datasets[0].label = `${selectedCountry} (Total Cases)`;
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
            rateChart.dispose();
            view.popup.close();
            chartWrapper.classList.remove("visible");
            console.log("hiding");
        }
    }

    function show(features, hit) {
        /* */
        updateChart(features);
        console.log(rateChart.data);
        let cnf = rateChart.data.map(x => x.confirmed);
        let dth = rateChart.data.map(x => x.deaths);
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
