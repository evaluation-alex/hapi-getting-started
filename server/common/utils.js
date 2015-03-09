'use strict';
var Boom = require('boom');
var logger = require('./../../config').logger;
var statsd = require('./../../config').statsd;

module.exports.timedPromise = function timedPromise (bucket, start, resolve, reject, err, val) {
    if (err) {
        logger.error({error: err});
        reject(err);
        statsd.increment(bucket + '.err', 1);
    } else {
        resolve(val);
    }
    statsd.timing(bucket, Date.now() - start);
};

module.exports.logAndBoom = function logAndBoom (err, reply) {
    logger.error({error: err});
    reply(Boom.badImplementation(err));
};

module.exports.toStatsD = function toStatsD (route, statusCode, user, device, browser, start, finish) {
    var counters = [device, browser, route, route + statusCode, user];
    var timings = [route, user];

    statsd.increment(counters, 1);
    statsd.timing(timings, finish - start);
};
