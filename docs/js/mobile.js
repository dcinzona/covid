define([], function() {
    let view;
    let legendExpand;
    let isMobile;

    function updateView(isMobile) {
        setTitleMobile(isMobile);
        setLegendMobile(isMobile);
    }

    function setTitleMobile(isMobile) {
        if (isMobile) {
            document.querySelector("#titleDiv").classList.add("invisible");
        } else {
            document.querySelector("#titleDiv").classList.remove("invisible");
        }
    }

    function setLegendMobile(is) {
        isMobile = is;
        if (isMobile === false) {
            view.ui.add(legendExpand, "bottom-left");
        } else {
            view.ui.remove(legendExpand);
        }
    }

    function init(v, l) {
        view = v;
        legendExpand = l;

        isResponsiveSize = view.widthBreakpoint === "xsmall";
        updateView(isResponsiveSize);

        // Breakpoints

        view.watch("widthBreakpoint", function(breakpoint) {
            switch (breakpoint) {
                case "xsmall":
                    updateView(true);
                    break;
                case "small":
                case "medium":
                    updateView(false);
                    break;
                case "large":
                    updateView(false);
                    break;
                case "xlarge":
                    updateView(false);
                    break;
                default:
            }
        });
    }

    return {
        init: init,
        isMobile: function(){
            return isMobile;
        }
    };
});
