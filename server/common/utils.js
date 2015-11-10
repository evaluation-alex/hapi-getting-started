'use strict';
import {get, isArray, isBoolean, isString, isNumber} from 'lodash';
import moment from 'moment';
import bcrypt from 'bcrypt';
import boom from 'boom';
import {ObjectID as objectID} from 'mongodb';
import config from './../config';
import dgram from 'dgram';
let {logger, influxdb} = config;
let udpClient = dgram.createSocket('udp4');
export function logAndBoom(err) {
    logger.error({error: err, stack: err.stack});
    return err.canMakeBoomError ? err : boom.badImplementation(err);
}
export function errback(err) {
    if (err) {
        logger.error({error: err, stack: err.stack});
    }
}
export function ip(request) {
    return get(request, ['info', 'remoteAddress'], 'test');
}
export function by(request) {
    return get(request, ['auth', 'credentials', 'user', 'email'], 'notloggedin');
}
export function org(request) {
    return get(request, ['auth', 'credentials', 'user', 'organisation'], '');
}
export function user(request) {
    return get(request, ['auth', 'credentials', 'user'], undefined);
}
export function locale(request) {
    return get(request, ['auth', 'credentials', 'user', 'preferences', 'locale'], 'en');
}
// TODO: if not found in user prefs, figure out from request headers - tbd
export function lookupParamsOrPayloadOrQuery(request, field) {
    return get(request, ['params', field], get(request, ['payload', field], get(request, ['query', field], undefined)));
}
export function hasItems(arr) {
    return arr && arr.length > 0;
}
const queryBuilder = {
    objectId: p => {
        return isArray(p) ? {$in: p.map(objectID)} : objectID(p);
    },
    exact: p => {
        return isArray(p) ? {$in: p} : p;
    },
    partial: p => {
        return isArray(p) ?
        {$in: p.map(op => new RegExp('^.*?' + op + '.*$', 'i'))} :
        {$regex: new RegExp('^.*?' + p + '.*$', 'i')};
    }
};
function buildQueryFor(type, query, request, fields) {
    const builder = queryBuilder[type];
    fields.forEach(pair => {
        const p = lookupParamsOrPayloadOrQuery(request, pair[0]);
        if (p) {
            query[pair[1]] = builder(p);
        }
    });
    return query;
}
function buildQueryForDateRange(query, request, field) {
    const pb4 = lookupParamsOrPayloadOrQuery(request, field + 'Before');
    if (pb4) {
        query[field] = {
            $lte: moment(pb4).toDate()
        };
    }
    const paf = lookupParamsOrPayloadOrQuery(request, field + 'After');
    if (paf) {
        query[field] = query[field] || {};
        query[field].$gte = moment(paf).toDate();
    }
    return query;
}
export function buildQuery(request, options) {
    let {forPartial, forExact, forDateRange, forID} = options;
    let query = {};
    if (hasItems(forPartial)) {
        buildQueryFor('partial', query, request, forPartial);
    }
    if (hasItems(forExact)) {
        buildQueryFor('exact', query, request, forExact);
    }
    if (hasItems(forID)) {
        buildQueryFor('objectId', query, request, forID);
    }
    if (forDateRange) {
        buildQueryForDateRange(query, request, forDateRange);
    }
    return query;
}
export function secureHash(password) {
    return bcrypt.hashSync(password, 10);
}
export function secureCompare(password, hash) {
    return bcrypt.compareSync(password, hash) || password === hash;
}
function escape(str) {
    if (str && str.replace) {
        return str.replace(/ /g, '\\ ').replace(/,/g, '\\,');
    }
}
function cmp(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}
function asString(v) {
    if (isBoolean(v)) {
        return v ? 't' : 'f';
    } else if (isString(v)) {
        return `"${v.replace(/"/g, '\\"')}"`;
    } else if (isNumber(v)) {
        return `${v}i`;
    }
}
export function timing(key, tags, fields) {
    const timestamp = 1000000 * Date.now();
    process.nextTick(() => {
        const tagstr = Object.keys(tags).sort(cmp).map(k => `${escape(k)}=${escape(tags[k])}`).join(',');
        const fieldstr = Object.keys(fields).sort(cmp).map(k => `${escape(k)}=${asString(fields[k])}`).join(',');
        const message = new Buffer(`${escape(key)},${tagstr} ${fieldstr} ${timestamp}`);
        udpClient.send(message, 0, message.length, influxdb.udpport, influxdb.host, errback);
    });
}
export function dumpTimings() {
    console.log('all done');
    udpClient.close();
}
