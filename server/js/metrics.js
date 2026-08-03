
var cls = require("./lib/class"),
    _ = require("underscore"),
    Memjs = require("memjs");

module.exports = Metrics = Class.extend({
    init: function(config) {
        var self = this;
        
        this.config = config;
        this.client = Memjs.Client.create(config.memcached_host + ":" + config.memcached_port);
        this.isReady = true;
        log.info("Metrics enabled: using memcached at " + config.memcached_host + ":" + config.memcached_port);
    },
    
    ready: function(callback) {
        this.ready_callback = callback;
        callback();
    },
    
    updatePlayerCounters: function(worlds, updatedCallback) {
        var self = this,
            config = this.config,
            numServers = _.size(config.game_servers),
            playerCount = _.reduce(worlds, function(sum, world) { return sum + world.playerCount; }, 0);
        
        if(this.isReady) {
            // Set the number of players on this server
            this.client.set('player_count_'+config.server_name, String(playerCount), {}, function() {
                var total_players = 0;
                
                // Recalculate the total number of players and set it
                _.each(config.game_servers, function(server) {
                    self.client.get('player_count_'+server.name, function(error, result) {
                        var count = result ? parseInt(result.toString(), 10) : 0;

                        total_players += count;
                        numServers -= 1;
                        if(numServers === 0) {
                            self.client.set('total_players', String(total_players), {}, function() {
                                if(updatedCallback) {
                                    updatedCallback(total_players);
                                }
                            });
                        }
                    });
                });
            });
        } else {
            log.error("Memcached client not connected");
        }
    },
    
    updateWorldDistribution: function(worlds) {
        this.client.set('world_distribution_'+this.config.server_name, JSON.stringify(worlds), {});
    },
    
    getOpenWorldCount: function(callback) {
        this.client.get('world_count_'+this.config.server_name, function(error, result) {
            callback(result ? parseInt(result.toString(), 10) : 0);
        });
    },
    
    getTotalPlayers: function(callback) {
        this.client.get('total_players', function(error, result) {
            callback(result ? parseInt(result.toString(), 10) : 0);
        });
    }
});
