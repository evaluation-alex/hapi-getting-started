'use strict';
let Boom = require('boom');
let objectID = require('mongodb').ObjectID;
let logger = require('./../../config').logger;
let statsd = require('./../../config').statsd;
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
module.exports.ip = (request) => request.info.remoteAddress === '' ? 'test' : request.info.remoteAddress;
module.exports.by = (request) => request.auth.credentials ? request.auth.credentials.user.email : 'notloggedin';
module.exports.org = (request) => request.auth.credentials ? request.auth.credentials.user.organisation : '';
module.exports.user = (request) => request.auth.credentials ? request.auth.credentials.user : undefined;
module.exports.locale = (request) => _.get(request, ['auth', 'credentials', 'user', 'preferences', 'locale'], 'en');
    //TODO: if not found in user prefs, figure out from request headers - tbd
module.exports.lookupParamsOrPayloadOrQuery = (request, field) =>
    request.params && request.params[field] ?
        request.params[field] :
        request.payload && request.payload[field] ?
            request.payload[field] :
            request.query && request.query[field] ?
                request.query[field] :
                undefined;
module.exports.hasItems = (arr) => arr && arr.length > 0;
let queryBuilderForArray = {
    objectId: (p) => {return {$in: _.map(p, (op) => objectID(op))};},
    exact: (p) => {return {$in: p};},
    partial: (p) => {return {$in: _.map(p, (op) => new RegExp('^.*?' + op + '.*$', 'i'))};}
};
let queryBuilderFor = {
    objectId: (p) => objectID(p),
    exact: (p) => p,
    partial: (p) => {return {$regex: new RegExp('^.*?' + p + '.*$', 'i')};}
};
let buildQueryFor = (type, query, request, fields) => {
    let builder = queryBuilderFor[type];
    let arrBuilder = queryBuilderForArray[type];
    _.forEach(fields, (pair) => {
        let p = module.exports.lookupParamsOrPayloadOrQuery(request, pair[0]);
        if (p) {
            query[pair[1]] = _.isArray(p) ? arrBuilder(p) : builder(p);
        }
    });
    return query;
};
module.exports.buildQueryForIDMatch = (query, request, fields) => buildQueryFor('objectId', query, request, fields);
module.exports.buildQueryForExactMatch = (query, request, fields) => buildQueryFor('exact', query, request, fields);
module.exports.buildQueryForPartialMatch = (query, request, fields) => buildQueryFor('partial', query, request, fields);
module.exports.buildQueryForDateRange = (query, request, field) => {
    let pb4 = module.exports.lookupParamsOrPayloadOrQuery(request, field + 'Before');
    if (pb4) {
        query[field] = {
            $lte: moment(pb4).toDate()
        };
    }
    let paf = module.exports.lookupParamsOrPayloadOrQuery(request, field + 'After');
    if (paf) {
        query[field] = query[field] || {};
        query[field].$gte = moment(paf).toDate();
    }
    return query;
};
module.exports.secureHash = (password) => Bcrypt.hashSync(password, 10);
module.exports.secureCompare = (password, hash) => Bcrypt.compareSync(password, hash) || password === hash;
