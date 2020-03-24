define([], function() {

    function convertToDateString(value){
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

    function setDates(){
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const yesteday = new Date(today);
            yesteday.setDate(yesteday.getDate() - 1);

            const updating = new Date(
                tomorrow.toLocaleDateString() + " 00:15 UTC"
            );
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
    
    let apiVersion = "v3";
    const dataUrl =
        window.location.hostname == "localhost"
            ? `/api/${apiVersion}/esri.geojson`
            : `https://covid-data.gmt.io/api/${apiVersion}/esri.geojson`;

    return {
        convertToDateString: convertToDateString,
        dataUrl: dataUrl,
        endDate: endDate,
        nextUpdate: nextUpdate
    };
});
