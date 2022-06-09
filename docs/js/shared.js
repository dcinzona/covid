// All the code in this module is
// enclosed in closure
(function (exports) {
  try {
    exports.domainRoot = gmt_domainRoot;
  } catch (ex) {
    exports.domainRoot = "dev";
  }
  const apiVersion = "v6";
  const dataURI = `${exports.domainRoot}/api/${apiVersion}/esri.geojson`;
  const pubURI =
    typeof window !== "undefined"
      ? window.location.hostname.startsWith("localhost")
        ? `${exports.domainRoot}/data/mapdata.json`
        : "https://media.githubusercontent.com/media/dcinzona/covid/master/docs/data/mapdata.json"
      : `${exports.domainRoot}/data/mapdata.json`;

  // Export the function to exports
  // In node.js this will be exports
  // the module.exports
  // In browser this will be function in
  // the global object sharedModule
  exports.dataURI = dataURI;
  exports.apiVersion = apiVersion;
  exports.pubURI = pubURI;
})(typeof exports === "undefined" ? (this["sharedConfig"] = {}) : exports);
