'use strict';
var Boom = require('boom');
var logger = require('./../../config').logger;
var statsd = require('./../../config').statsd;
var traverse = require('traverse');
var _ = require('lodash');
var moment = require('moment');

module.exports.logAndBoom = function logAndBoom (err, reply) {
    logger.error({error: err, stack: err.stack});
    reply (err.canMakeBoomError ? err : Boom.badImplementation(err));
};

module.exports.toStatsD = function toStatsD (route, statusCode, user, device, browser, start, finish) {
    var counters = [device, browser, route, route + statusCode, user];
    var timings = [route, user];

    statsd.increment(counters, 1);
    statsd.timing(timings, finish - start);
};

module.exports.errback = function errback (err) {
    if (err) {
        logger.error({error: err, stack: err.stack});
    }
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

module.exports.locale = function locale (request) {
    var ret = traverse(request).get(['auth', 'credentials', 'user', 'preferences', 'locale']);
    //TODO: if not found in user prefs, figure out from request headers - tbd
    return ret ? ret : 'en';
};

module.exports.lookupParamsOrPayloadOrQuery = function lookupParamsOrPayloadOrQuery(request, field) {
    var ret = request.params && request.params[field] ?
        request.params[field] :
        request.payload && request.payload[field] ?
            request.payload[field] :
            request.query && request.query[field] ?
                request.query[field] :
                undefined;
    return ret;
};

module.exports.hasItems = function hasItems(arr) {
    return arr && arr.length > 0;
};

module.exports.buildQueryFromRequestForFields = function buildQueryFromRequestForFields(query, request, fields) {
    _.forEach(fields, function (pair) {
        if (request.query[pair[0]]) {
            query[pair[1]] = {$regex: new RegExp('^.*?' + request.query[pair[0]] + '.*$', 'i')};
        }
    });
};

module.exports.buildQueryFromRequestForDateFields = function buildQueryFromRequestForDateFields(query, request, field) {
    var before = field + 'Before';
    var after = field + 'After';
    if (request.query[before]) {
        query[field] = {
            $lte: moment(request.query[before], ['YYYY-MM-DD']).toDate()
        };
    }
    if (request.query[after]) {
        query[field] = query[field] || {};
        query[field].$gte = moment(request.query[after], ['YYYY-MM-DD']).toDate();
    }
};
