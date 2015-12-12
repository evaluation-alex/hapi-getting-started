'use strict';
const {get, isArray, isBoolean, isString, isNumber, merge} = require('lodash');
const moment = require('moment');
const bcrypt = require('bcrypt');
const boom = require('boom');
const {ObjectID: objectID} = require('mongodb');
const config = require('./../config');
const {logger, influxdb} = config;
module.exports.logAndBoom = function logAndBoom(err) {
    logger.error({error: err, stack: err.stack});
    return err.canMakeBoomError ? err : boom.badImplementation(err);
};
const errback = function errback(err) {
    if (err) {
        logger.error({error: err, stack: err.stack});
    }
};
module.exports.errback = errback;
module.exports.ip = function ip(request) {
    return get(request, ['info', 'remoteAddress'], 'test');
};
module.exports.by = function by(request) {
    return get(request, ['auth', 'credentials', 'user', 'email'], 'notloggedin');
};
module.exports.org = function org(request) {
    return get(request, ['auth', 'credentials', 'user', 'organisation'], '');
};
module.exports.user = function user(request) {
    return get(request, ['auth', 'credentials', 'user'], undefined);
};
module.exports.locale = function locale(request) {
    return get(request, ['auth', 'credentials', 'user', 'preferences', 'locale'], 'en');
};
// TODO: if not found in user prefs, figure out from request headers - tbd
const lookupParamsOrPayloadOrQuery = function lookupParamsOrPayloadOrQuery(request, field) {
    return get(request, ['params', field], get(request, ['payload', field], get(request, ['query', field], undefined)));
};
module.exports.lookupParamsOrPayloadOrQuery = lookupParamsOrPayloadOrQuery;
const hasItems = function hasItems(arr) {
    return arr && arr.length > 0;
};
module.exports.hasItems = hasItems;
const queryBuilder = {
    forID: p => isArray(p) ? {$in: p.map(objectID)} : objectID(p),
    forExact: p => isArray(p) ? {$in: p} : p,
    forPartial: p => isArray(p) ?
        {$in: p.map(op => new RegExp(`^.*?${op}.*$`, 'i'))} :
        {$regex: new RegExp(`^.*?${p}.*$`, 'i')},
    forDateBefore: d => {
        return {$lte: moment(d).toDate()};
    },
    forDateAfter: d => {
        return {$gte: moment(d).toDate()};
    }
};
function buildQueryFor(type, request, fields) {
    const builder = queryBuilder[type];
    return fields.map(pair => {
        const p = lookupParamsOrPayloadOrQuery(request, pair[0]);
        return p ? {[pair[1]]: builder(p)} : {};
    }).reduce((p, c) => merge(p, c), {});
}
module.exports.buildQuery = function buildQuery(request, options) {
    return ['forPartial', 'forExact', 'forID', 'forDateBefore', 'forDateAfter']
        .map(type => hasItems(options[type]) ? buildQueryFor(type, request, options[type]) : {})
        .reduce((p, c) => merge(p, c), {});
};
module.exports.secureHash = function secureHash(password) {
    return bcrypt.hashSync(password, 10);
};
module.exports.secureCompare = function secureCompare(password, hash) {
    return bcrypt.compareSync(password, hash) || password === hash;
};
function escape(str) {
    if (str && str.replace) {
        return str.replace(/ /g, '\\ ').replace(/,/g, '\\,');
    }
}
function asString(v) {
    if (isBoolean(v)) {
        return v ? 't' : 'f';
    } else if (isString(v)) {
        return `"${v.replace(/"/g, '\\"')}"`;
    } else /*istanbul ignore else*/ if (isNumber(v)) {
        return `${v}i`;
    }
}
module.exports.timing = function timing(key, tags, fields) {
    const timestamp = 1000000 * Date.now();
    process.nextTick(() => {
        //https://influxdb.com/docs/v0.9/write_protocols/write_syntax.html
        const tagstr = Object.keys(tags).sort().map(k => `${escape(k)}=${escape(tags[k])}`).join(',');
        const fieldstr = Object.keys(fields).sort().map(k => `${escape(k)}=${asString(fields[k])}`).join(',');
        const message = new Buffer(`${escape(key)},${tagstr} ${fieldstr} ${timestamp}`);
        influxdb.udpClient.send(message, 0, message.length, influxdb.udpport, influxdb.host, errback);
    });
};
module.exports.dumpTimings = function dumpTimings() {
    influxdb.udpClient.close();
};
