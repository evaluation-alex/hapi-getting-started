'use strict';
var UserAgent = require('useragent');
var Config = require('./../../config');
var statsd = Config.statsd;

var normalizePath = function (request) {
    var path = request._route.path;
    var specials = request.connection._router.specials;
    if (request._route === specials.notFound.route) {
        path = '/{notFound*}';
    } else if (specials.options && request._route === specials.options.route) {
        path = '/{cors*}';
    }
    path = path.slice(1).replace(/\//g, '.').replace('{', '').replace('}', '');
    return path;
};

var toStatsD = function(route, statusCode, user, ua, start, finish) {
    var counters = [ua.device.toString(), ua.toString(), route, route + statusCode, user];
    var timings = [route, user];

    statsd.increment(counters, 1);
    statsd.timing(timings, finish - start);
};

module.exports.register = function (server, options, next) {
    server.on('tail', function (request) {
        toStatsD(normalizePath(request) + '.' + request.method.toUpperCase(),
            '.' + request.response.statusCode,
            request.auth.credentials ? request.auth.credentials.user.email : 'notloggedin',
            UserAgent.lookup(request.headers['user-agent']),
            request.info.received,
            request.info.responded);
    });
    next();
};

module.exports.register.attributes = {
    name: 'metrics'
};

