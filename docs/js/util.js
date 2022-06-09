define([`${gmt_domainRoot}/js/shared.js`], function () {
    sharedConfig.domainRoot = gmt_domainRoot;
    function convertToDateString(value) {
        //YYYY-MM-DD
        let date = new Date(value);
        let dayOfMonth = date.getUTCDate();
        let month = date.getUTCMonth() + 1;
        let year = date.getUTCFullYear();
        month = month < 10 ? "0" + month : month;
        dayOfMonth = dayOfMonth < 10 ? "0" + dayOfMonth : dayOfMonth;
        return `${year}-${month}-${dayOfMonth}`;
    }

    let endDate, nextUpdate;

    function setDates() {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yesteday = new Date(today);
        yesteday.setDate(yesteday.getDate() - 1);

        const updating = new Date(tomorrow.toLocaleDateString() + " 00:15 UTC");
        nextUpdate =
            updating > today
                ? updating
                : new Date(tomorrow.toLocaleDateString() + " 23:59 UTC");
        endDate =
            today > updating
                ? new Date(today.toLocaleDateString()).getTime()
                : new Date(yesteday.toLocaleDateString()).getTime();
    }
    setDates();

    let dataUrl = sharedConfig.pubURI;

    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    return {
        convertToDateString: convertToDateString,
        dataUrl: dataUrl,
        endDate: endDate,
        nextUpdate: nextUpdate,
        numberWithCommas: numberWithCommas
    };
});
