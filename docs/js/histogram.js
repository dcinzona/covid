define([
    "esri/core/promiseUtils"
], function(promiseUtils) {
    let layerview, view, layer;

    function init(lv, v, l) {
        layerview = lv;
        view = v;
        layer = l;

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
            
            console.log("hiding");
        }

        function show(features) {
            hide();
            console.log("showing");
            const params = {
                layer: layer,
                field: "ct",
                numBins: features.length
            };
            

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
            query.groupByFieldsForStatistics = ["dateString"];

            return query;
        }

        view.on("click", function(event) {
            hitTest(event).then(function(hit) {
                //exit if miss
                if (!hit) {
                    hide();
                    return;
                }

                let country = hit.graphic.attributes.country;

                if (country) {
                    const queryParams = getStatQuery();
                    queryParams.where = " country = '" + country + "'";

                    //console.log(queryParams);
                    // query the layer with the modified params object
                    layer.queryFeatures(queryParams).then(function(results) {
                        // prints the array of result graphics to the console
                        //console.log(results.features);
                        show(results.features);
                    });
                } else {
                    //hide histogram
                    hide();
                }
            });
        });
    }

    return {
        init: init
    };
});
