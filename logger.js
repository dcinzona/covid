const fs = require("fs");
const defaultPath = "logger.log";
const trimAtSize = 4000;

function saveLog(message, file = defaultPath, isError = false) {
    return new Promise((resolve, reject) => {
        let dateS = `${new Date()
            .toISOString()
            .substr(0, 10)} ${new Date().toLocaleTimeString()}`;
        let msg = `[${isError ? "ERROR" : "INFO"}]['${dateS}'] ${message}`;
        resolve(isError ? console.error(msg) : console.log(msg));
    });
}

module.exports = {
    log: saveLog,
    error: function (message, file = "error.log") {
        return saveLog(message, file, true);
    },
    deleteLog: function (file) {
        return new Promise((resolve, reject) => {
            if (file.endsWith(".log")) {
                return fs.unlink(file, (err) => {
                    if (err) {
                        console.error(err);
                        reject(err);
                    }
                    resolve(console.log("deleted: " + file));
                });
            }
            reject("Invalid file");
        });
    },
    trim: function (message, file = defaultPath) {
        this.stat(file)
            .then((stats) => {
                if (stats.size > trimAtSize) {
                    this.deleteLog(file)
                        .then(() => {
                            this.log(message, file);
                        })
                        .catch((err) => {
                            console.error(err);
                        });
                } else {
                    this.log(message, file);
                }
            })
            .catch((err) => {
                console.error(err);
                this.log(message, file);
            });
    },
    stat: function (file) {
        return new Promise((resolve, reject) => {
            fs.exists(file, (exists) => {
                if (exists) {
                    fs.stat(file, function (err, stats) {
                        if (err) {
                            console.error(err);
                            reject(err);
                        } else {
                            resolve(stats);
                        }
                    });
                } else {
                    resolve({ size: 0 });
                }
            });
        });
    },
};
