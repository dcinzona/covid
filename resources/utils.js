const spawn = require('child_process').spawn;
const fs = require("fs");
const logger = require("../logger");

function spawnPromise(cmd, args, options = {}) {
    return new Promise((resolve, reject) => {
        const diffProcess = spawn(cmd, args, options);
        let stdo = "";
        let err = "";
        diffProcess.stdout.on("data", (d) => (stdo += d.toString()));

        diffProcess.stderr.on("data", (d) => (err += d.toString()));

        diffProcess.on("exit", (code) => {
            if (code === 0) {
                resolve(stdo);
                return;
            }
            logger.error(err);
            reject(err);
            return;
        });
    });
}

module.exports = {
    spawnPromise: spawnPromise
}
