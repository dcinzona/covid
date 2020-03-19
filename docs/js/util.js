define([], function() {

    function convertToDateString(value){
        //YYYY-MM-DD
        let date = new Date(value);
        let dayOfMonth = date.getDate();
        let month = date.getMonth() + 1;
        let year = date.getFullYear();
        month = month < 10 ? "0" + month : month;
        dayOfMonth = dayOfMonth < 10 ? "0" + dayOfMonth : dayOfMonth;
        return `${year}-${month}-${dayOfMonth}`;
    }
    
    let apiVersion = "v2";
    const dataUrl =
        window.location.hostname == "localhost"
            ? `/api/${apiVersion}/esri.geojson`
            : `https://covid-data.gmt.io/api/${apiVersion}/esri.geojson`;

    return {
        convertToDateString: convertToDateString,
        dataUrl: dataUrl
    };
});
