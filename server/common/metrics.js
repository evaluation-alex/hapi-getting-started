'use strict';
var moment = require('moment');
var _ = require('lodash');
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
    return path;
};

var toStatsD = function(route, statusCode, user, ua, start, finish) {
    var now = finish ? finish : Date.now();
    var m = moment(now);
    var year = m.format('YYYY');
    var month = m.format('MM');
    var day = m.format('DD');
    var hour = m.format('HH');
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

    statsd.unique(user + '.browser', ua.toString());
    statsd.unique(user + '.device', ua.device.toString());
    statsd.unique(user + '.routes', route);
    statsd.increment(incr, 1);
    statsd.timing(timing, now - start);
};

module.exports.register = function (server, options, next) {
    server.on('tail', function (request) {
        var path = normalizePath(request);
        var method = request.method;
        var statusCode = request.response.statusCode;
        var user = request.auth && request.auth.credentials && request.auth.credentials.user ? request.auth.credentials.user.email : 'notloggedin';
        var ua = UserAgent.lookup(request.headers['user-agent']);
        toStatsD(method + '.' + path, '#' + statusCode + '#', user, ua, request.info.received, request.info.responded);
    });
    next();
};

module.exports.register.attributes = {
    name: 'metrics'
};

