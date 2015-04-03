'use strict';
let Boom = require('boom');
let logger = require('./../../config').logger;
let statsd = require('./../../config').statsd;
let traverse = require('traverse');
let _ = require('lodash');
let moment = require('moment');
let Bcrypt = require('bcrypt');
module.exports.logAndBoom = (err, reply) => {
    logger.error({error: err, stack: err.stack});
    reply(err.canMakeBoomError ? err : Boom.badImplementation(err));
};
module.exports.toStatsD = (route, statusCode, user, device, browser, start, finish) => {
    statsd.increment([device, browser, route, route + statusCode, user], 1);
    statsd.timing([route, user], finish - start);
};
module.exports.errback = (err) => {
    if (err) {
        logger.error({error: err, stack: err.stack});
    }
};
module.exports.defaultcb = (bucket, resolve, reject, query) => {
    const start = Date.now();
    return (err, res) => {
        if (err) {
            logger.error({error: err, stack: err.stack});
            reject(err);
            statsd.increment(bucket + '.err', 1);
        } else {
            resolve(res);
        }
        statsd.timing(bucket, Date.now() - start);
        if (query) {
            statsd.increment(bucket + '.' + _.sortBy(_.keys(query), String).join(','), 1);
        }
    };
};
module.exports.ip = (request) => {
    const ret = request.info.remoteAddress;
    return ret === '' ? 'test' : ret;
};
module.exports.locale = (request) => {
    var ret = traverse(request).get(['auth', 'credentials', 'user', 'preferences', 'locale']);
    //TODO: if not found in user prefs, figure out from request headers - tbd
    return ret ? ret : 'en';
};
module.exports.lookupParamsOrPayloadOrQuery = (request, field) => {
    const ret = request.params && request.params[field] ?
        request.params[field] :
        request.payload && request.payload[field] ?
            request.payload[field] :
            request.query && request.query[field] ?
                request.query[field] :
                undefined;
    return ret;
};
module.exports.hasItems = (arr) => arr && arr.length > 0;
module.exports.buildQueryFromRequestForFields = (query, request, fields) => {
    _.forEach(fields, (pair) => {
        if (request.query[pair[0]]) {
            query[pair[1]] = {$regex: new RegExp('^.*?' + request.query[pair[0]] + '.*$', 'i')};
        }
    });
    return query;
};
module.exports.buildQueryFromRequestForDateFields = (query, request, field) => {
    const before = field + 'Before';
    const after = field + 'After';
    if (request.query[before]) {
        query[field] = {
            $lte: moment(request.query[before], ['YYYY-MM-DD']).toDate()
        };
    }
    if (request.query[after]) {
        query[field] = query[field] || {};
        query[field].$gte = moment(request.query[after], ['YYYY-MM-DD']).toDate();
    }
    return query;
};
module.exports.secureHash = (password) => Bcrypt.hashSync(password, 10);
module.exports.secureCompare = (password, hash) => Bcrypt.compareSync(password, hash) || password === hash;
