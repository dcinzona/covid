define(["esri/core/promiseUtils"], function(promiseUtils) {
    let layerview, view, layer;

    function setupHoverTooltip(lv, v, l) {
        layer = l;
        layerview = lv;
        view = v;
        var highlight;
        var OBJECTID;

        var tooltip = createTooltip();

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

        function onHover(event) {
            return hitTest(event).then(
                function(hit) {
                    // remove current highlighted feature
                    var sameObj =
                        hit && OBJECTID === hit.graphic.attributes.OBJECTID;
                    if (highlight) {
                        if (!sameObj) {
                            highlight.remove();
                            highlight = null;
                        }
                    }

                    // highlight the hovered feature
                    // or hide the tooltip
                    if (hit) {
                        var graphic = hit.graphic;
                        var screenPoint = hit.screenPoint;
                        OBJECTID = graphic.attributes.OBJECTID;
                        if (!highlight) {
                            highlight = layerview.highlight(graphic);
                        }
                        tooltip.show(
                            screenPoint,
                            `<div><b>${graphic.getAttribute("place")}</b></div>
                            <div>Date: <span>${graphic.getAttribute(
                                "dateString"
                            )}</span></div>
                            <div>Confirmed: <span>${graphic.getAttribute(
                                "ct"
                            )}</span></div>
                            `
                        );
                    } else {
                        if (highlight) {
                            highlight.remove();
                            highlight = null;
                        }
                        tooltip.hide();
                    }
                },
                function() {}
            );
        }

        view.on("pointer-move", onHover);
    }

    function createTooltip() {
        var tooltip = document.createElement("div");
        var style = tooltip.style;

        tooltip.setAttribute("role", "tooltip");
        tooltip.classList.add("tooltip");

        var textElement = document.createElement("div");
        textElement.classList.add("esri-widget");
        tooltip.appendChild(textElement);

        view.container.appendChild(tooltip);

        var x = 0;
        var y = 0;
        var targetX = 0;
        var targetY = 0;
        var visible = false;

        // move the tooltip progressively
        function move() {
            x += (targetX - x) * 0.1;
            y += (targetY - y) * 0.1;

            if (Math.abs(targetX - x) < 1 && Math.abs(targetY - y) < 1) {
                x = targetX;
                y = targetY;
            } else {
                requestAnimationFrame(move);
            }

            style.transform =
                "translate3d(" +
                Math.round(x) +
                "px," +
                Math.round(y) +
                "px, 0)";
        }

        return {
            show: function(point, text) {
                if (!visible) {
                    x = point.x;
                    y = point.y;
                }

                targetX = point.x;
                targetY = point.y;
                style.opacity = 1;
                visible = true;
                textElement.innerHTML = text;

                move();
            },

            hide: function() {
                style.opacity = 0;
                visible = false;
            }
        };
    }
    return {
        setupHoverTooltip: setupHoverTooltip
    };
});
