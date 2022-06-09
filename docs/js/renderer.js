define([], function () {
    // minimum size to render minDataVal at specified view scales

    let minSize = {
        type: "size",
        valueExpression: "$view.scale",
        stops: [
            { value: 18489334, size: 7 }, // smallest marker will be 12pt at 1:1128 scale
            { value: 36978669, size: 5 },
            { value: 73957338, size: 4 },
            { value: 150000000, size: 3 }, // smallest marker will be 1.5pt at 1:591657528 scale
        ],
    };
    // maximum size to render maxDataVal at specified view scales
    let maxSize = {
        type: "size",
        valueExpression: "$view.scale",
        stops: [
            { value: 18489334, size: 120 }, // largest marker will be 90pt at 1:1128 scale
            { value: 36978669, size: 80 },
            { value: 73957338, size: 60 },
            { value: 150000000, size: 40 }, // largest marker will be 19pt at 1:591657528 scale
        ],
    };
    return {
        type: "simple",
        field: "ct",
        symbol: {
            type: "simple-marker",
            color: "#00ffff",
        },
        visualVariables: [
            {
                type: "opacity",
                field: "ct",
                stops: [
                    {
                        value: 1,
                        opacity: 0.6,
                    },
                ],
                legendOptions: {
                    showLegend: false,
                },
            },
            {
                type: "size",
                minDataValue: 1,
                maxDataValue: 250000,
                minSize: minSize,//5,
                maxSize: maxSize,//90,
                valueExpression: "$feature.ct *1.2",
                valueExpressionTitle: "Confirmed Cases",
                valueUnit: "unknown",
                legendOptions: {
                    showLegend: true,
                },
            },
            {
                type: "color",
                valueExpression: "( $feature.ct / 1 ) * 1",
                valueExpressionTitle: "Confirmed Cases",
                stops: [
                    { value: 1, color: "cyan" },
                    //{ value: 800, color: "#98d1d1" },
                    { value: 10000, color: "#ffed85" },
                    //{ value: 3500, color: "#df979e" },
                    { value: 200000, color: "#c80064" },
                ],
                legendOptions: {
                    showLegend: true,
                },
            },
        ],
    };
});
