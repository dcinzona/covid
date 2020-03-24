define([], function() {
    return {
        type: "simple",
        field: "ct",
        symbol: {
            type: "simple-marker",
            color: "#00ffff"
        },
        visualVariables: [
            {
                type: "opacity",
                field: "ct",
                stops: [
                    {
                        value: 1,
                        opacity: 0.7
                    }
                ],
                legendOptions: {
                    showLegend: false
                }
            },
            {
                type: "size",
                minDataValue: 1,
                maxDataValue: 40000,
                minSize: 5,
                maxSize: 90,
                valueExpression: "$feature.ct * 1",
                valueExpressionTitle: "Confirmed Cases",
                valueUnit: "unknown",
                legendOptions: {
                    showLegend: false
                }
            },
            {
                type: "color",
                valueExpression: "( $feature.ct / 1 ) * 1",
                valueExpressionTitle: "Confirmed Cases",
                stops: [
                    { value: 1, color: "cyan" },
                    //{ value: 800, color: "#98d1d1" },
                    { value: 20000, color: "#ffed85" },
                    //{ value: 3500, color: "#df979e" },
                    { value: 40000, color: "#c80064" }
                ],
                legendOptions: {
                    showLegend: true
                }
            }
        ]
    };
});
