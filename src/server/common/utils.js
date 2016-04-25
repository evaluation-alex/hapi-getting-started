'use strict';
const _ = require('./../lodash');
const moment = require('moment');
const bcrypt = require('bcrypt');
const boom = require('boom');
const mongodb = require('mongodb');
const config = require('./../config');
const {get, isArray, isBoolean, isString, isNumber, merge, isUndefined, values} = _;
const {ObjectID: objectID} = mongodb;
const {logger, influxdb, enableConsole} = config;
const logAndBoom = function logAndBoom(err) {
    errback(err);
    return err.canMakeBoomError ? err : boom.badImplementation(err);
};
const errback = function errback(err) {
    /*istanbul ignore else*/
    if (err) {
        /*istanbul ignore else*/
        if (enableConsole) {
            console.log('err', err);
            console.log(err.stack);
        }
        logger.error({error: err, stack: err.stack});
    }
};
const ip = function ip(request) {
    return get(request, ['info', 'remoteAddress'], 'test');
};
const by = function by(request) {
    return get(request, ['auth', 'credentials', 'user', 'email'], 'notloggedin');
};
const org = function org(request) {
    return get(request, ['auth', 'credentials', 'user', 'organisation'], '');
};
const user = function user(request) {
    return get(request, ['auth', 'credentials', 'user'], undefined);
};
const locale = function locale(request) {
    return get(request, ['auth', 'credentials', 'user', 'preferences', 'locale'], 'en');
};
const lookupParamsOrPayloadOrQuery = function lookupParamsOrPayloadOrQuery(request, field, defaultVal, paths) {
    const toRet = (paths || [['params'], ['payload'], ['query'], ['headers']])
        .reduce((found, path) => isUndefined(found) ? get(request, path.concat(field)) : found, undefined);
    return !isUndefined(toRet) ? toRet : defaultVal;
};
const hasItems = function hasItems(arr) {
    return arr && arr.length > 0;
};
const queryBuilder = {
    forID: p => isArray(p) ? {$in: p.map(objectID)} : objectID(p),
    forExact: p => isArray(p) ? {$in: p} : p,
    forPartial: p => isArray(p) ? {$in: p.map(op => new RegExp(`^.*?${op}.*$`, 'i'))} : {$regex: new RegExp(`^.*?${p}.*$`, 'i')},
    forDateBefore: d => ({$lte: moment(d).toDate()}),
    forDateAfter: d => ({$gte: moment(d).toDate()})
};
const buildQueryFor = function buildQueryFor(type, request, fields, paths) {
    return fields
        .map(([fieldToLookup, fieldInMongo]) =>
            [lookupParamsOrPayloadOrQuery(request, fieldToLookup, undefined, paths), fieldInMongo])
        .filter(([valueFromRequest, fieldInMongo]) => !!valueFromRequest)
        .reduce((query, [valueFromRequest, fieldInMongo]) =>
            merge(query, {[fieldInMongo]: queryBuilder[type](valueFromRequest)}), {});
}
const buildQuery = function buildQuery(request, options) {
    const andOr = {
        and: {
            paths: [['payload'], ['query']],
            reducer: (mongoQuery, queryForField) => merge(mongoQuery, queryForField),
            reduceInitial: {}
        },
        or: {
            paths: [['payload', '$or'], ['query', '$or']],
            reducer: (mongoQueryOr, queryForFields) => mongoQueryOr.concat(Object.keys(queryForFields).map(k => ({[k]: queryForFields[k]}))),
            reduceInitial: []
        }
    };
    const [and, $or] = values(andOr)
        .map(({paths, reducer, reduceInitial}) =>
            Object.keys(queryBuilder)
            .filter(type => hasItems(options[type]))//only do query formation for query types setup for this handler
            .map(type =>  buildQueryFor(type, request, options[type], paths))//buildquery for each type using the default paths
            .reduce(reducer, reduceInitial)
        );
    return merge(and, hasItems($or) ? {$or} : {});
};
const optsToDoc = function optsToDoc(opts, val = 1, notVal = 0) {
    return (!opts || opts === '') ? undefined
        : opts.split(/\s+/)
        .reduce((doc, each) => merge(doc, (each[0] === '-') ? {[each.slice(1)]: notVal} : {[each]: val}), {});
};
const secureHash = function secureHash(password) {
    return bcrypt.hashSync(password, 10);
};
const secureCompare = function secureCompare(password, hash) {
    return bcrypt.compareSync(password, hash) || password === hash;
};
function escape(str) {
    if (str && str.replace) {
        return str.replace(/ /g, '\\ ').replace(/,/g, '\\,');
    }
}
function asString(v) {
    /*istanbul ignore else*/
    if (isBoolean(v)) {
        return v ? 't' : 'f';
    } else if (isString(v)) {
        return `"${v.replace(/"/g, '\\"')}"`;
    } else if (isNumber(v)) {
        return `${v}i`;
    }
}
const timing = function timing(key, tags, fields) {
    const timestamp = 1000000 * Date.now();
    process.nextTick(() => {
        //https://influxdb.com/docs/v0.9/write_protocols/write_syntax.html
        const tagstr = Object.keys(tags).sort().map(k => `${escape(k)}=${escape(tags[k])}`).join(',');
        const fieldstr = Object.keys(fields).sort().map(k => `${escape(k)}=${asString(fields[k])}`).join(',');
        const message = new Buffer(`${escape(key)},${tagstr} ${fieldstr} ${timestamp}`);
        influxdb.udpClient.send(message, 0, message.length, influxdb.udpport, influxdb.host, errback);
    });
};
const profile = function profile(key, tags) {
    return function proxiedTiming(start) {
        timing(key, tags, {elapsed: Date.now() - start});
    };
};
const dumpTimings = function dumpTimings() {
    influxdb.udpClient.close();
};
module.exports = {
    logAndBoom,
    errback,
    ip,
    by,
    org,
    user,
    locale,
    lookupParamsOrPayloadOrQuery,
    hasItems,
    buildQuery,
    optsToDoc,
    secureHash,
    secureCompare,
    timing,
    profile,
    dumpTimings
};
