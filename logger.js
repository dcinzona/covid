const fs = require("fs");

const defaultPath = "logger.log";

function saveLog(message, file = defaultPath, isError = false) {
    let dateS = `${new Date()
        .toISOString()
        .substr(0, 10)} ${new Date().toLocaleTimeString()}`;
    let msg = `[${
        isError ? "ERROR" : "INFO"
    }]['${dateS}'] ${message}\n`;
    fs.appendFile(file, msg, err => {
        if (err) {
            throw err;
        }
        console.log("Saved: " + file);
    });
    console.log(msg);
}

module.exports = {
    log: saveLog,
    error: function(message, file = "error.log") {
        saveLog(message, file, true);
    }
};
