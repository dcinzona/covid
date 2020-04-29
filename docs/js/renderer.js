define([], function () {
    // minimum size to render minDataVal at specified view scales

    let minSize = {
        type: "size",
        valueExpression: "$view.scale",
        stops: [
            { value: 18489334, size: 20 }, // smallest marker will be 12pt at 1:1128 scale
            { value: 36978669, size: 12 },
            { value: 73957338, size: 6 },
            { value: 150000000, size: 2 }, // smallest marker will be 1.5pt at 1:591657528 scale
        ],
    };
    // maximum size to render maxDataVal at specified view scales
    let maxSize = {
        type: "size",
        valueExpression: "$view.scale",
        stops: [
            { value: 18489334, size: 400 }, // largest marker will be 90pt at 1:1128 scale
            { value: 36978669, size: 120 },
            { value: 73957338, size: 50 },
            { value: 150000000, size: 20 }, // largest marker will be 19pt at 1:591657528 scale
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
                maxDataValue: 350000,
                minSize: minSize,//5,
                maxSize: maxSize,//90,
                valueExpression: "$feature.ct *1.4",
                valueExpressionTitle: "Confirmed Cases",
                valueUnit: "unknown",
                legendOptions: {
                    showLegend: false,
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
                    { value: 20000, color: "#c80064" },
                ],
                legendOptions: {
                    showLegend: true,
                },
            },
        ],
    };
});
