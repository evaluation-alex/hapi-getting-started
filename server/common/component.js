'use strict';
var _ = require('lodash');
var Hoek = require('hoek');

module.exports.load = function (server, options, directories) {
    options = Hoek.applyToDefaults({basePath: ''}, options);
    _.forEach(directories (function (dir) {
        var component = require(dir);
        var routes = component.Routes;
        var attributes = component.attributes || {name: dir};
        var plugin = {
            register: function (server, options, next) {
                _.forEach(routes, function (route) {
                    route.path = options.basePath + route.path;
                    server.route(route);
                });
                next();
            }
        };
        plugin.register.attributes = attributes;
    }));
};
