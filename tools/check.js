"use strict";

var fs = require("fs"),
    path = require("path"),
    spawnSync = require("child_process").spawnSync,
    roots = ["server/js", "shared/js", "client/js"],
    failures = [];

function walk(directory) {
    fs.readdirSync(directory, {withFileTypes: true}).forEach(function(entry) {
        var fullPath = path.join(directory, entry.name);
        if(entry.isDirectory()) {
            walk(fullPath);
        } else if(entry.name.endsWith(".js")) {
            var result = spawnSync(process.execPath, ["--check", fullPath], {encoding: "utf8"});
            if(result.status !== 0) {
                failures.push(fullPath + "\n" + result.stderr);
            }
        }
    });
}

roots.forEach(walk);
if(failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
}
console.log("Syntax check passed for server, shared, and client JavaScript.");
