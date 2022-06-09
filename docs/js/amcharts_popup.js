
define([
    "esri/core/promiseUtils",
], function (promiseUtils) {
    let maxCompare = 3;
    let layerview, view, layer, setDate, chartWrapper, applicationDiv, chart;

    let compareMode = {
        get enabled() { return document.querySelector('#compareMode:checked') !== null; },
        toggle: function () {
            let el = document.getElementById('compareMode');
            el.checked = !el.checked;
        }
    };

    function init(lv, v, l, s) {
        layerview = lv;
        view = v;
        layer = l;
        setDate = s;
        applicationDiv = document.getElementById("applicationDiv");
        chartWrapper = document.getElementById("chartWrapper");
        let closeButton = document.getElementById('closeChart');
        closeButton.addEventListener('click', hide);

        document.addEventListener('keyup', evt => {
            if (evt.key == 'c') {
                compareMode.toggle();
            }
        });
        /*
        document.addEventListener('keydown', evt => {
            if (evt.shiftKey) {
                shift.push(evt);
            }
        });
        document.addEventListener('keyup', evt => {
            shift = shift.filter(x => x.keyCode != evt.keyCode);
        });
        */

        am4core.ready(createChart);

        view.on("click", runQuery);

        window.chart = chart;
    }

    let colorYellow = '#f9c653';
    let colorRed = '#da0000';
    let colorGreen = '#00da1b';
    let colorBlue = '#00b2da';

    function createChart() {
        am4core.options.onlyShowOnViewport = true;
        // Themes begin
        am4core.useTheme(am4themes_dark);
        am4core.useTheme(am4themes_animated);

        chart = am4core.create("rateChart", am4charts.XYChart3D);
        chart.numberFormatter.numberFormat = "#.#a";
        chart.colors.step = 2;

        var dateAxis = chart.xAxes.push(new am4charts.DateAxis());
        dateAxis.renderer.grid.template.location = 0;
        dateAxis.skipEmptyPeriods = false;
        dateAxis.dateFormats.setKey("day", "MMM d");
        dateAxis.baseInterval = {
            "timeUnit": "day",
            "count": 1
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
        //dateAxis.renderer.grid.template.location = 0.5;
        dateAxis.renderer.minGridDistance = 50;
        dateAxis.startLocation = -1;
        dateAxis.endLocation = 2;
        dateAxis.tooltip.label.fontSize = "0.8em";
        //dataAxis.groupData = true;

        let now = new Date();
        let todayUTC = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        let yesterday = new Date(now);
        yesterday.setDate(todayUTC.getDate() - 1);
        todayUTC.setDate(todayUTC.getDate() + 1);

        var pattern = new am4core.LinePattern();
        pattern.width = 10;
        pattern.height = 10;
        pattern.strokeWidth = 2;
        pattern.stroke = am4core.color("red");
        pattern.fill = pattern.stroke;
        pattern.fillOpacity = 0.5;
        pattern.rotation = 45;
        /* */
        var range = dateAxis.axisRanges.create();
        range.date = yesterday;
        range.endDate = todayUTC;
        range.axisFill.fill = pattern;
        range.axisFill.fillOpacity = 0.4;
        range.axisFill.tooltip = new am4core.Tooltip();
        range.axisFill.tooltipText = "[opacity:.9 letter-spacing:2px]Partial Data...[/]";
        range.axisFill.tooltip.rotation = 90;
        range.axisFill.interactionsEnabled = true;
        range.axisFill.isMeasured = true;
        range.axisFill.tooltip.fontSize = "11px";
        range.axisFill.tooltip.getFillFromObject = false;
        range.axisFill.tooltip.background.fill = pattern;
        range.axisFill.tooltip.background.fillOpacity = pattern.fillOpacity * range.axisFill.fillOpacity;
        range.axisFill.tooltip.background.stroke = pattern.stroke;
        range.axisFill.tooltip.background.strokeWidth = 1;
        range.axisFill.tooltip.background.strokeOpacity = range.axisFill.tooltip.background.fillOpacity;
        range.axisFill.tooltip.label.padding(2, 4, 2, 4);

        var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
        valueAxis.tooltip.disabled = true;
        valueAxis.renderer.opposite = true;
        valueAxis.rangeChangeDuration = 0;


        /* Add Cursor */
        chart.cursor = new am4charts.XYCursor();
        chart.cursor.xAxis = dateAxis;
        chart.cursor.lineY.disabled = true;
        chart.cursor.behavior = 'none';
        /* Add Scrollbar */
        chart.scrollbarX = new am4core.Scrollbar();
        /* Add legend */
        chart.legend = new am4charts.Legend();
        chart.legend.markers.template.disabled = true;
        chart.legend.labels.template.text = "[bold {color}]{name}[/]";

        dateAxis.renderer.grid.template.strokeOpacity = 0.07;
        valueAxis.renderer.grid.template.strokeOpacity = 0.07;
        chart.responsive.useDefault = false;
        chart.responsive.enabled = true;
        chart.scrollbarX.properties.marginBottom = 20;
        chart.scrollbarX.properties.paddingTop = 0;
        chart.legend.properties.paddingTop = -10;
        chart.legend.properties.marginBottom = 10;
        chart.tapToActivate = true;
        //zoom out button config
        chart.zoomOutButton.disabled = true;
        /*
        chart.zoomOutButton.align = "left";
        chart.zoomOutButton.background.fill = am4core.color("#404251");
        chart.zoomOutButton.icon.stroke = am4core.color("#EFD9CE");
        chart.zoomOutButton.icon.strokeWidth = 3;
        chart.zoomOutButton.background.states.getKey("hover").properties.fill = am4core.color("#696969");
        chart.zoomOutButton.cursorOverStyle = am4core.MouseCursorStyle.pointer;
        var shadow = chart.zoomOutButton.filters.push(new am4core.DropShadowFilter());
        shadow.dx = 0;
        shadow.dy = 0;
        shadow.blur = 3;
        */
        return chart;
    }

    function createSeries(name, valueField = 'confirmed', tooltipText = undefined, hide = false, placeField = '{country}') {
        var series = chart.series.push(new am4charts.LineSeries());
        series.name = name;
        series.dataFields.dateX = "date";
        series.dataFields.valueY = valueField;
        series.dataFields.dummyData = 'breakdown';
        series.dataFields.customValue = 'country';
        series.tooltipText = tooltipText || `[bold]Cases ([bold ${series.stroke.hex}]${placeField}[/][bold]): [/]
        ● Total: [bold]{valueY.value}[/]
        ● Delta: [bold]{dummyData.confirmed.delta.formatNumber('+#.#a|-#.#a')}[/]
        ● ROC: [bold]{dummyData.confirmed.ROCStr}[/]
        ● Deaths: [bold #ffb0b0]{dummyData.deaths.count}[/]`;
        series.strokeWidth = 2;
        series.legendSettings.valueText = "{valueY.confirmed}";
        series.legendSettings.itemValueText = "[bold]{valueY.value.formatNumber('#,###')}[/]";
        series.showOnInit = false;
        series.tooltip.getFillFromObject = false;
        series.tooltip.background.fill = am4core.color('rgb(50,50,50');
        series.tooltip.background.stroke = series.stroke.hex;
        //series.tooltip.background.strokeOpacity = 0.5;
        series.tooltip.fontSize = "0.8em";
        //series.tooltip.animationDuration = 10;
        series.zIndex = 10 - chart.series.length;
        series.tooltip.zIndex = series.zIndex;
        series.fillOpacity = 0.2;
        //series.showOnInit = chart.series.length > 1;
        return series;
    }

    function updateChart(arr) {
        let series = createSeries(seriesName(selectedRecord.country), 'confirmed');
        series.data = mapData(arr);
        return series;
    }

    function mapData(arr) {
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
                'country': selectedRecord.country,
                'place': selectedRecord.place,
                'date': x.attributes.dateString,
                'confirmed': confirmed,
                'breakdown': {
                    'place': selectedRecord.place,
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
            };
            prev = i > 0 ? conf : undefined;
            return conf;
        });
        return data;
    }

    let seriesName = function (location = selectedRecord.country) {
        return `${location}`;
    };

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
        applicationDiv.classList.add("chartVisible");
        let series = updateChart(features);
        updateTitle();
        return series;
        /* */
    }
    function hide() {
        applicationDiv.classList.remove("chartVisible");
    }

    function groupedSeriesLength() {
        let ctByCountry = [];
        chart.series.each((x, i) => {
            try {
                if (x.data && x.data.length > 0) {
                    if (!ctByCountry.find(y => y.country === x.data[0].country)) {
                        ctByCountry.push({ country: x.data[0].country, series: x });
                    }
                } else {
                    console.error(x);
                }
            } catch (ex) {
                console.error(x);
            }
        });
        return ctByCountry.length;
    }
    window.groupedSeriesLength = groupedSeriesLength;

    function setDimensions() {
        /* placement */
        let count = groupedSeriesLength();
        chart.depth = 25 * (count - 1);
        let opp = false;
        if (count == 1) {
            opp = true;
            chart.padding(0, 0, 0, 20);
            chart.angle = 0;
        } else {
            chart.padding(0, 20, 0, 0);
            chart.angle = 60;
        }
        let processed = [];
        chart.series.each((series, idx) => {
            if (series.data.length > 0) {
                let found = processed.find(x => x.data[0].country === series.data[0].country);
                let diff = chart.series.length - count;
                let index = count != chart.series.length && idx > 1 && series.data[0].country !== series.name ? idx - diff : idx;
                series.dx = found ? found.dx : chart.depth / (count) * am4core.math.cos(chart.angle) * index;
                series.dy = found ? found.dy : -chart.depth / (count) * am4core.math.sin(chart.angle) * index;
                if (!found) processed.push(series);
            }
        });
        chart.yAxes.each(aY => {
            aY.renderer.opposite = opp;
        });
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
                onStatisticField: "r",
                outStatisticFieldName: "sum_recovered",
                statisticType: "sum",
            },
            {
                onStatisticField: "1=1",
                outStatisticFieldName: "total_places",
                statisticType: "count",
            },
        ];
        //query.returnDistinctValues = true;
        query.groupByFieldsForStatistics = ["dateString"];
        query.orderByFields = ["dateString ASC"];
        //return getFeatureQuery();
        return query;
    }

    function getFeatureQuery() {
        const query = layer.createQuery();
        query.outFields = ['*'];
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


    let selectedRecord;
    let runQuery = function (event) {
        //event.stopPropagation();
        hitTest(event).then(function (hit) {
            //exit if miss
            if (!hit) {
                //hide(); //commenting out to leave stats up when deselecting
                return;
            }

            if (!hit.graphic.attributes) return;

            let firstRun = selectedRecord === undefined;
            let countryNotEqPlace = hit.graphic.attributes.country.trim() !== hit.graphic.attributes.place.trim();
            let queryPlaces = firstRun && countryNotEqPlace;
            if (!queryPlaces) {
                queryPlaces = countryNotEqPlace && selectedRecord.place != hit.graphic.attributes.place;
            }

            selectedRecord = hit.graphic.attributes;

            if (chart && chart.series.length > 0) {

                if (!applicationDiv.classList.contains('chartVisible')) {
                    applicationDiv.classList.add('chartVisible');
                }

                //get existing index
                let exists = -1;
                let seriesToRemove = [];
                let found;
                let countriesToRemove = [];
                chart.series.each((t, i) => {
                    let country = t.data[0].country;
                    if (t.name === selectedRecord.place || t.name === selectedRecord.country) {
                        //already in there
                        exists = i;
                        found = t;
                    } else {
                        seriesToRemove.push(t);
                    }
                    if (country !== selectedRecord.country && t.name !== country && countriesToRemove.includes(country) == false) {
                        countriesToRemove.push(country);
                    }
                });
                let countrySeriesToRemove = [];
                chart.series.each(c => {
                    if (c.data.length > 0) {
                        if (countriesToRemove.includes(c.data[0].country)) {
                            countrySeriesToRemove.push(c);
                        }
                    }
                });

                //this is a mess
                if (compareMode.enabled) {
                    let lengthPlus1 = chart.series.length + 1;
                    if (exists != -1) {
                        console.log(lengthPlus1);
                        if (queryPlaces) {
                            if (lengthPlus1 > maxCompare) {
                                //remove the first sub-place location for the country
                                let idx = chart.series.values.findIndex(x => {
                                    let d = x.data[0];
                                    return d ? d.country === selectedRecord.country && x.name !== d.country : true;
                                });
                                if (idx) {
                                    chart.series.removeIndex(idx).dispose();
                                }
                            }
                            //if adding place to series would make it longer than max
                            if (lengthPlus1 > maxCompare) {
                                countrySeriesToRemove.forEach(x => {
                                    chart.series.removeIndex(chart.series.indexOf(x)).dispose();
                                });
                            }
                            loadPlaceSeries(selectedRecord.place);
                        } else {
                            if (lengthPlus1 >= maxCompare) {
                                countrySeriesToRemove.forEach(x => {
                                    chart.series.removeIndex(chart.series.indexOf(x)).dispose();
                                });
                            }
                        }
                        return updateTitle();
                    }
                    if (lengthPlus1 > maxCompare) {
                        if (queryPlaces || groupedSeriesLength() != chart.series.length) {
                            countrySeriesToRemove.forEach(x => {
                                chart.series.removeIndex(chart.series.indexOf(x)).dispose();
                            });
                        }
                    }
                    //only have two
                    if (groupedSeriesLength() >= maxCompare) {
                        chart.series.removeIndex(1).dispose();
                    }
                } else {
                    seriesToRemove.forEach(x => {
                        chart.series.removeIndex(chart.series.indexOf(x)).dispose();
                    });
                    if (exists > -1) {
                        if (queryPlaces) {
                            if (chart.series.length > 1) chart.series.removeIndex(1).dispose();
                            loadPlaceSeries(selectedRecord.place);
                        }
                        return updateTitle();
                    }
                }
            }
            execQuery().then(arr => {
                let series = show(arr, hit);
                if (queryPlaces) {
                    loadPlaceSeries(selectedRecord.place);
                }
            });
        });
    };

    function loadPlaceSeries(place) {
        execQuery(`AND place = '${place}'`).then(arrP => {
            let tooltip = '{dummyData.place}: [bold]{valueY.value}[/]';
            createSeries(`${place}`, 'confirmed', null, false, '{dummyData.place}').data = mapData(arrP);
            setDimensions();
        });
    }

    function execQuery(filter = '') {
        const queryParams = getStatQuery();
        queryParams.where = ` country = '${selectedRecord.country}' ${filter}`;
        let todayString = new Date().toISOString().split('T')[0];
        return layer.queryFeatures(queryParams).then(function (results) {
            let sorted = results.features;
            //.filter(x => x.attributes.dateString != todayString)
            //.sort(sorter);
            return sorted;
        });
    }
    function updateTitle() {
        let title = '';
        if (groupedSeriesLength() === 1) {
            let data = chart.series.getIndex(0).data;
            let cnf = data.map(x => x.confirmed);
            let dth = data.map(x => x.deaths);
            let cfr = getROC(dth, cnf);
            title = `Spread in <span>${data[0].country}</span> => CFR: <i>${cfr}%</i>`;
        } else {
            let countries = chart.series.values
                .map(x => x.data.reduce(y => y).country)
                .filter((v, i, a) => a.indexOf(v) === i).join(' vs. ');
            title = `Comparing Spread: <span>${countries}</span>`;
        }
        chartWrapper.querySelector('.chartTitle').innerHTML = title;
        setDimensions();
    }

    return {
        init: init,
        onClick: runQuery,
    };
});
