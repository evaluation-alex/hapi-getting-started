'use strict';
var moment = require('moment');
var _ = require('lodash');
var UserAgent = require('useragent');
var StatsDClient = require('node-statsd');
var Config = require('./../../config');
var sdc = new StatsDClient({
    host: Config.statsd.host,
    port: Config.statsd.port,
    mock: !Config.statsd.logMetrics
});

var normalizePath = function (request) {
    var path = request._route.path;
    var specials = request.connection._router.specials;
    if (request._route === specials.notFound.route) {
        path = '/{notFound*}';
    } else if (specials.options && request._route === specials.options.route) {
        path = '/{cors*}';
    }
    return path;
};

var toStatsD = function(route, statusCode, user, ua, start) {
    var now = Date.now();
    var year = moment(now).format('YYYY');
    var month = moment(now).format('MM');
    var day = moment(now).format('DD');
    var hour = moment(now).format('HH');
    var incr = [];
    var timing = [];
    var stat = Config.projectName;
    _.forEach([route, year, month, day, hour], function (param) {
        stat = stat + '.' + param;
        timing.push(stat);
        incr.push(stat);
        incr.push(stat + '.' + statusCode);
    });
    var stat2 = Config.projectName;
    _.forEach([user, year, month, day], function (param) {
        stat2 = stat2 + '.' + param;
        timing.push(stat2);
        incr.push(stat2);
        incr.push(stat2 + '.' + statusCode);
    });
    incr.push(ua.device.toString());
    incr.push(ua.toString());

    sdc.set(user, ua.toString());
    sdc.set(user, ua.device.toString());
    sdc.increment(incr);
    sdc.timing(timing, moment(now).diff(moment(start)));
};

module.exports.register = function (server, options, next) {
    server.ext('onRequest', function (request, reply) {
        return reply.continue();
    });
    server.ext('onPreResponse', function (request, reply) {
        var path = normalizePath(request);
        var method = request.method;
        var statusCode = (request.response.isBoom) ? request.response.output.statusCode : request.response.statusCode;
        var user = request.auth && request.auth.credentials && request.auth.credentials.user ? request.auth.credentials.user.email : 'notloggedin';
        var ua = UserAgent.lookup(request.headers['user-agent']);
        toStatsD(method + '.' + path, '#' + statusCode + '#', user, ua, request.info.received);
        return reply.continue();
    });
    next();
};

module.exports.register.attributes = {
    name: 'metrics'
};

