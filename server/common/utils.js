'use strict';
var Boom = require('boom');
var logger = require('./../../config').logger;
var statsd = require('./../../config').statsd;
var traverse = require('traverse');

module.exports.logAndBoom = function logAndBoom (err, locale, reply) {
    logger.error({error: err, stack: err.stack});
    reply (err.canMakeBoomError ? err.boomError(locale) : Boom.badImplementation(err));
};

module.exports.toStatsD = function toStatsD (route, statusCode, user, device, browser, start, finish) {
    var counters = [device, browser, route, route + statusCode, user];
    var timings = [route, user];

    statsd.increment(counters, 1);
    statsd.timing(timings, finish - start);
};

module.exports.defaultcb = function defaultcb(bucket, resolve, reject) {
    var start = Date.now();
    return function mongoCb (err, res) {
        if (err) {
            logger.error({error: err, stack: err.stack});
            reject(err);
            statsd.increment(bucket + '.err', 1);
        } else {
            resolve(res);
        }
        statsd.timing(bucket, Date.now() - start);
    };
};

/*jshint unused:false*/
module.exports.locale = function (request) {
    //TODO: hardcoded for now, to figure out from headers / user preferences later
    var ret = traverse(request).get(['auth', 'credentials', 'user', 'preferences', 'locale']);
    return ret ? ret : 'en';
};
/*jshint unused:true*/
