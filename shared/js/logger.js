"use strict";

var priorities = {debug: 10, info: 20, error: 30};

module.exports = function createLogger(level) {
    var threshold = priorities[level] || priorities.info;

    function write(name, values) {
        if(priorities[name] < threshold) {
            return;
        }
        (console[name] || console.log).apply(console, Array.prototype.slice.call(values));
    }

    return {
        debug: function() { write("debug", arguments); },
        info: function() { write("info", arguments); },
        error: function() { write("error", arguments); }
    };
};
