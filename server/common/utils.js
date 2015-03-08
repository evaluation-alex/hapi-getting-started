'use strict';
var Boom = require('boom');
var logger = require('./../../config').logger;
var statsd = require('./../../config').statsd;

var timedPromise = function (bucket, start, resolve, reject, err, val) {
    if (err) {
        logger.error({error: err});
        reject(err);
        statsd.increment(bucket + '.err', 1);
    } else {
        resolve(val);
    }
    statsd.timing(bucket, Date.now() - start);
};

module.exports.timedPromise = timedPromise;

var logAndBoom = function (err, reply) {
    logger.error({error: err});
    reply(Boom.badImplementation(err));
};

module.exports.logAndBoom = logAndBoom;

var toStatsD = function(route, statusCode, user, device, browser, start, finish) {
    var counters = [device, browser, route, route + statusCode, user];
    var timings = [route, user];

    statsd.increment(counters, 1);
    statsd.timing(timings, finish - start);
};

module.exports.toStatsD = toStatsD;