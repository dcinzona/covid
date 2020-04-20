
define([
    "esri/core/promiseUtils",
], function (promiseUtils) {

    let layerview, view, layer, selectedCountry, chartWrapper, setDate, shift = [];
    function init(lv, v, l, s) {
        layerview = lv;
        view = v;
        layer = l;
        setDate = s;
        chartWrapper = document.getElementById("chartWrapper");

        document.addEventListener('keydown', evt => {
            if (evt.shiftKey) {
                shift.push(evt);
            }
            //console.log(shift);
        });
        document.addEventListener('keyup', evt => {
            shift = shift.filter(x => x.keyCode != evt.keyCode);
            //console.log(evt);
        });

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
        view.popup.on('trigger-action', function (e) {
            console.log(e);
        })
        /* */
    }

    let colorYellow = '#f9c653';
    let colorRed = '#da0000';
    let colorGreen = '#00da1b';
    let colorBlue = '#00b2da';

    function createChart() {
        // Themes begin
        am4core.useTheme(am4themes_dark);
        am4core.useTheme(am4themes_animated);
        // Themes end
        // Create chart
        am4core.options.onlyShowOnViewport = true;
        rateChart = am4core.create("rateChart", am4charts.XYChart);
        rateChart.responsive.enabled = true;
        rateChart.numberFormatter.numberFormat = "#.#a";
        rateChart.colors.step = 2

        var dateAxis = rateChart.xAxes.push(new am4charts.DateAxis());
        dateAxis.renderer.grid.template.location = 0;
        dateAxis.skipEmptyPeriods = true;
        dateAxis.dateFormats.setKey("day", "MMM d");
        dateAxis.baseInterval = {
            "timeUnit": "day",
            "count": 3
        };
        dateAxis.gridIntervals.setAll([
            { timeUnit: "day", count: 1 },
            { timeUnit: "day", count: 3 },
            { timeUnit: "day", count: 5 },
            { timeUnit: "day", count: 10 },
            { timeUnit: "week", count: 1 },
            { timeUnit: "week", count: 2 },
            { timeUnit: "month", count: 1 }
        ]);
        dateAxis.renderer.grid.template.location = 0.5;
        dateAxis.renderer.minGridDistance = 50;
        dateAxis.startLocation = 0;
        dateAxis.endLocation = 0.5;
        dateAxis.groupData = true;
        dateAxis.tooltip.label.fontSize = "0.8em";
        // Setting up label rotation
        //dateAxis.renderer.labels.template.rotation = 90;

        var valueAxis = rateChart.yAxes.push(new am4charts.ValueAxis());
        valueAxis.tooltip.disabled = true;
        //valueAxis.renderer.labels.template.fill = am4core.color(colorYellow);
        valueAxis.renderer.opposite = true;
        //valueAxis.logarithmic = true;
        //valueAxis.renderer.minWidth = 60;


        /* Add Cursor */
        rateChart.cursor = new am4charts.XYCursor();
        rateChart.cursor.xAxis = dateAxis;
        rateChart.cursor.lineY.disabled = true;
        rateChart.cursor.behavior = 'none';
        /* Add Scrollbar */
        rateChart.scrollbarX = new am4core.Scrollbar();
        /* Add legend */
        rateChart.legend = new am4charts.Legend();
        rateChart.legend.markers.template.disabled = true;
        rateChart.legend.labels.template.text = "[bold {color}]{name}[/]";

        //valueAxis2.renderer.grid.template.strokeOpacity = 0.07;
        dateAxis.renderer.grid.template.strokeOpacity = 0.07;
        valueAxis.renderer.grid.template.strokeOpacity = 0.07;
        /**
         * ========================================================
         * Enabling responsive features
         * ========================================================
         */

        rateChart.responsive.useDefault = false
        rateChart.responsive.enabled = true;
        rateChart.padding(0, 0, 0, 20);
        rateChart.scrollbarX.properties.marginBottom = 20;
        rateChart.scrollbarX.properties.paddingTop = 0;
        rateChart.legend.properties.paddingTop = -10
        rateChart.legend.properties.marginBottom = 10;
        rateChart.tapToActivate = true;
    }

    function createSeries(name, valueField, tooltipText = undefined, hide = false) {

        chart = rateChart;
        var series = chart.series.push(new am4charts.LineSeries());
        //chart.series.push(series);
        series.name = name;
        series.dataFields.dateX = "date";
        series.dataFields.valueY = valueField;
        series.dataFields.dummyData = 'breakdown';
        series.dataFields.customValue = 'country';
        series.tooltipText = tooltipText || `[bold]Cases ([bold ${series.stroke.hex}]{country}[/][bold]): [/]
        ● Total: [bold]{valueY.value}[/]
        ● Delta: [bold]{valueY.previousChange.formatNumber('+#.#a|-#.#a')}[/]
        ● ROC: [bold]{dummyData.confirmed.ROCStr}[/]
        ● Deaths: [bold #ffb0b0]{dummyData.deaths.count}[/]`;
        series.strokeWidth = 2;
        series.legendSettings.valueText = "{valueY.confirmed}";
        series.legendSettings.itemValueText = "[bold]{valueY.value.formatNumber('#,###')}[/]";
        series.showOnInit = false;
        series.tooltip.getFillFromObject = false;
        series.tooltip.background.fill = am4core.color('rgba(50, 50, 50, 0.7)');
        series.tooltip.background.stroke = series.stroke.hex;
        series.tooltip.background.strokeOpacity = 0.5;
        series.tooltip.fontSize = "0.8em";
        series.fillOpacity = 0.2;
        return series;
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

    function updateChart(arr) {
        let prev;
        let data = arr.map((x, i) => {
            let confirmed = x.attributes.sum_confirmed;
            let deaths = x.attributes.sum_deaths;
            let cfr = parseFloat(getROC(deaths, confirmed));
            let delta = 0;
            let posNeg = false;
            let roc = 0;
            if (prev) {
                delta = confirmed - prev.confirmed;
                posNeg = delta > prev.delta ? '+' : delta != prev.delta;
                let dChange = delta - prev.delta;
                roc = posNeg ? getROC(dChange, delta) : 0;
            }
            let conf = {
                'country': selectedCountry,
                'date': x.attributes.dateString,
                'confirmed': confirmed,
                'breakdown': {
                    'deaths': {
                        'count': deaths
                    },
                    'cfr': cfr,
                    'confirmed': {
                        'delta': delta,
                        'ROC': roc,
                        'ROCStr': `${posNeg == '+' ? posNeg : ''}${parseFloat(roc)}%`
                    }
                },
                'deaths': deaths,
                'cfr': cfr,
                'delta': delta,
            }
            prev = i > 0 ? conf : undefined;
            return conf;
        })
        //rateChart.data = data;
        createSeries(seriesName(), 'confirmed').data = data;
    }

    let seriesName = function () {
        return `Cases in ${selectedCountry}`;
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

    function show(features, hit) {
        /* */
        updateChart(features);
        if (!view.popup.visible) {
            view.popup.location = hit.mapPoint;
            view.popup.visible = true;
            view.popup.content = chartWrapper;
            view.popup.collapsed = false;
            chartWrapper.classList.add("visible");
        }
        updateTitle();
        /* */
    }

    Array.prototype.max = function () {
        return Math.max.apply(null, this);
    };

    function getROC(topVal, bottomVal) {
        let top = Array.isArray(topVal) ? topVal.max() : topVal;
        let bottom = Array.isArray(bottomVal) ? bottomVal.max() : bottomVal;
        bottom = bottom == 0 ? 1 : bottom;
        return ((top / bottom) * 100).toFixed(2);
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
            if (!selectedCountry) return;

            if (rateChart && rateChart.series.length > 0) {

                //get existing index
                let exists = -1;
                let seriesToRemove = [];
                rateChart.series.each((t, i) => {
                    if (t.name == seriesName()) {
                        exists = i;
                    } else {
                        seriesToRemove.push(t);
                    }
                });


                if (!view.popup.visible) {
                    view.popup.open();
                    if (exists > -1) return;
                }
                if (view.popup.collapsed) {
                    view.popup.collapsed = false;
                    if (exists > -1) return;
                }

                if (shift.length > 0) {
                    if (exists != -1) {
                        return updateTitle();
                    }
                    //only have two
                    if (rateChart.series.length > 2) {
                        rateChart.series.removeIndex(1).dispose();
                    }
                } else {
                    seriesToRemove.forEach(x => {
                        rateChart.series.removeIndex(rateChart.series.indexOf(x)).dispose();
                    });
                    if (exists > -1) {
                        return updateTitle();
                    }
                }
            }
            const queryParams = getStatQuery();
            queryParams.where = " country = '" + selectedCountry + "'";
            let todayString = new Date().toISOString().split('T')[0];
            layer.queryFeatures(queryParams).then(function (results) {
                let sorted = results.features
                    .filter(x => x.attributes.dateString != todayString)
                    .sort(sorter);
                show(sorted, hit);
            });
        });
    };

    function updateTitle() {
        let title = '';
        if (rateChart.series.length === 1) {
            let data = rateChart.series.getIndex(0).data;
            let cnf = data.map(x => x.confirmed);
            let dth = data.map(x => x.deaths);
            let cfr = getROC(dth, cnf);
            title = `Spread in <span>${data[0].country}</span> => CFR: <i>${cfr}%</i>`;
        } else {
            let countries = rateChart.series.values.map(x => x.data.reduce(y => y).country).join(' vs. ');
            title = `Comparing Spread: <span>${countries}</span>`
        }

        view.popup.title = title;
    }

    return {
        init: init,
        onClick: runQuery,
        //template: popupTemplate
    };
});
