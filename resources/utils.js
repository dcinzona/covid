const { spawn, SpawnOptions } = require("child_process");
const fs =  require("fs");

function spawnPromise(cmd, args, options = {}) {
    return new Promise((resolve, reject) => {
        const diffProcess = spawn(cmd, args, options);
        let stdo = "";
        let err = "";
        diffProcess.stdout.on("data", (d) => (stdo += d.toString()));

        diffProcess.stderr.on("data", (d) => (err += d.toString()));

        diffProcess.on("exit", (code) => {
            if (code === 0) {
                return resolve(stdo);
            }
            reject(err);
        });
    });
}

module.exports = { spawnPromise : spawnPromise }
