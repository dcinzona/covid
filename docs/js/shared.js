
// All the code in this module is 
// enclosed in closure 
(function(exports) { 

   const apiVersion = "v5";
   const pubURI = `https://covid-data.gmt.io/api/${apiVersion}/esri.geojson`;
   
    // Export the function to exports 
    // In node.js this will be exports  
    // the module.exports 
    // In browser this will be function in 
    // the global object sharedModule 
    exports.apiVersion = apiVersion; 
    exports.pubURI = pubURI;
       
})(typeof exports === 'undefined'?  
            this['sharedConfig']={}: exports); 
