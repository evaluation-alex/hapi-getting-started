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

var buildCountersAndTimingBuckets = function(pail, statusCode, counters, timings) {
    var bucket = Config.projectName;
    _.forEach(pail, function (param) {
        bucket = bucket + '.' + param;
        timings.push(bucket);
        counters.push(bucket);
        counters.push(bucket + '.' + statusCode);
    });
};

var toStatsD = function(route, statusCode, user, ua, start, finish) {
    var now = finish;
    var m = moment(now);
    var year = m.format('YYYY');
    var month = m.format('MM');
    var day = m.format('DD');
    var hour = m.format('HH');

    var counters = [ua.device.toString(), ua.toString()];
    var timings = [Config.projectName];

    buildCountersAndTimingBuckets([route, year, month, day, hour], statusCode, counters, timings);
    buildCountersAndTimingBuckets([user, year, month, day], statusCode, counters, timings);

    statsd.unique(user + '.browser', ua.toString());
    statsd.unique(user + '.device', ua.device.toString());
    statsd.unique(user + '.routes', route);
    statsd.increment(counters, 1);
    statsd.timing(timings, now - start);
};

module.exports.register = function (server, options, next) {
    server.on('tail', function (request) {
        toStatsD(request.method + '.' + normalizePath(request),
            '#' + request.response.statusCode + '#',
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

