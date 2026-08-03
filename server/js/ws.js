"use strict";

var http = require("http"),
    fs = require("fs"),
    path = require("path"),
    url = require("url"),
    WebSocket = require("ws"),
    Utils = require("./utils"),
    _ = require("underscore"),
    WS = {};

module.exports = WS;

function Connection(id, socket, server, request) {
    var self = this;

    this.id = id;
    this._connection = socket;
    this._server = server;
    this.remoteAddress = request.socket.remoteAddress;

    socket.on("message", function(data, isBinary) {
        if(isBinary || !self.listen_callback) {
            return;
        }

        try {
            self.listen_callback(JSON.parse(data.toString("utf8")));
        } catch(error) {
            self.close("Received message was not valid JSON.");
        }
    });

    socket.on("close", function() {
        server.removeConnection(self.id);
        if(self.close_callback) {
            self.close_callback();
        }
    });

    socket.on("error", function(error) {
        if(server.error_callback) {
            server.error_callback(error);
        }
    });
}

Connection.prototype.onClose = function(callback) {
    this.close_callback = callback;
};

Connection.prototype.listen = function(callback) {
    this.listen_callback = callback;
};

Connection.prototype.send = function(message) {
    this.sendUTF8(JSON.stringify(message));
};

Connection.prototype.sendUTF8 = function(data) {
    if(this._connection.readyState === WebSocket.OPEN) {
        this._connection.send(data);
    }
};

Connection.prototype.close = function(reason) {
    if(this._connection.readyState === WebSocket.OPEN) {
        this._connection.close(1008, String(reason || "Connection closed").slice(0, 123));
    }
};

WS.MultiVersionWebsocketServer = function(port) {
    var self = this,
        clientRoot = path.resolve(__dirname, "..", "..", "client"),
        mimeTypes = {".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".gif": "image/gif", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".woff": "font/woff", ".ttf": "font/ttf"};

    this.port = port;
    this._connections = {};
    this._counter = 0;
    this._httpServer = http.createServer(function(request, response) {
        var requestPath = url.parse(request.url).pathname;

        if(requestPath === "/status" && self.status_callback) {
            response.writeHead(200, {"Content-Type": "application/json"});
            response.end(self.status_callback());
            return;
        }

        if(request.method !== "GET") {
            response.writeHead(405);
            response.end();
            return;
        }

        var relativePath = decodeURIComponent(requestPath === "/" ? "/index.html" : requestPath),
            filePath = pathModuleSafeJoin(clientRoot, relativePath);
        if(!filePath) {
            response.writeHead(403);
            response.end();
            return;
        }

        fs.readFile(filePath, function(error, contents) {
            if(error) {
                response.writeHead(error.code === "ENOENT" ? 404 : 500);
                response.end();
                return;
            }
            response.writeHead(200, {"Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream"});
            response.end(contents);
        });
    });

    this._webSocketServer = new WebSocket.Server({noServer: true, maxPayload: 1024 * 1024});
    this._httpServer.on("upgrade", function(request, socket, head) {
        self._webSocketServer.handleUpgrade(request, socket, head, function(webSocket) {
            var connection = new Connection(self._createId(), webSocket, self, request);
            self.addConnection(connection);
            if(self.connection_callback) {
                self.connection_callback(connection);
            }
        });
    });

    this._httpServer.on("error", function(error) {
        if(self.error_callback) {
            self.error_callback(error);
        }
    });

    this._httpServer.listen(port, function() {
        log.info("Server is listening on port " + port);
    });
};

function pathModuleSafeJoin(root, requestPath) {
    var filePath = path.resolve(root, "." + requestPath);
    return filePath === root || filePath.indexOf(root + path.sep) === 0 ? filePath : null;
}

WS.MultiVersionWebsocketServer.prototype._createId = function() {
    return "5" + Utils.random(99) + String(this._counter++);
};

WS.MultiVersionWebsocketServer.prototype.onConnect = function(callback) {
    this.connection_callback = callback;
};

WS.MultiVersionWebsocketServer.prototype.onError = function(callback) {
    this.error_callback = callback;
};

WS.MultiVersionWebsocketServer.prototype.onRequestStatus = function(callback) {
    this.status_callback = callback;
};

WS.MultiVersionWebsocketServer.prototype.addConnection = function(connection) {
    this._connections[connection.id] = connection;
};

WS.MultiVersionWebsocketServer.prototype.removeConnection = function(id) {
    delete this._connections[id];
};

WS.MultiVersionWebsocketServer.prototype.getConnection = function(id) {
    return this._connections[id];
};

WS.MultiVersionWebsocketServer.prototype.forEachConnection = function(callback) {
    _.each(this._connections, callback);
};

WS.MultiVersionWebsocketServer.prototype.broadcast = function(message) {
    this.forEachConnection(function(connection) {
        connection.send(message);
    });
};
