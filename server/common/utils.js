'use strict';
import {get, isArray, isNumber, pluck} from 'lodash';
import moment from 'moment';
import bcrypt from 'bcrypt';
import boom from 'boom';
import {ObjectID as objectID} from 'mongodb';
import stats from 'simple-statistics';
import {logger} from './../config';
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
    return request.params && request.params[field] ?
        request.params[field] :
        request.payload && request.payload[field] ?
            request.payload[field] :
            request.query && request.query[field] ?
                request.query[field] :
                undefined;
}
export function hasItems(arr) {
    return arr && arr.length > 0;
}
const queryBuilderForArray = {
    objectId: p => {
        return {$in: p.map(objectID)};
    },
    exact: p => {
        return {$in: p};
    },
    partial: p => {
        return {$in: p.map(op => new RegExp('^.*?' + op + '.*$', 'i'))};
    }
};
const queryBuilderForOne = {
    objectId: p => objectID(p),
    exact: p => p,
    partial: p => {
        return {$regex: new RegExp('^.*?' + p + '.*$', 'i')};
    }
};
function buildQueryFor(type, query, request, fields) {
    const builder = queryBuilderForOne[type];
    const arrBuilder = queryBuilderForArray[type];
    fields.forEach(pair => {
        const p = lookupParamsOrPayloadOrQuery(request, pair[0]);
        if (p) {
            query[pair[1]] = isArray(p) ? arrBuilder(p) : builder(p);
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
class FixedLengthArray extends Array {
    constructor(maxLength) {
        super([]);
        this.maxLength = maxLength;
    }

    push(values) {
        super.push(values);
        super.splice(0, this.length - this.maxLength);
    }

    //static get [Symbol.species]() { return Array; }
}
class ListValueMap extends Map {
    constructor(maxLength) {
        super([]);
        this.maxLength = maxLength;
    }

    set(key, value) {
        if (!super.has(key)) {
            super.set(key, new FixedLengthArray(this.maxLength));
        }
        return super.set(super.get(key).push({ts: Date.now(), v: value}));
    }

    stats(key) {
        const value = super.get(key);
        const v = pluck(value, 'v');
        return {
            key: key,
            count: v.length,
            median: stats.median(v),
            mode: stats.mode(v),
            variance: stats.variance(v),
            stdDev: stats.standardDeviation(v),
            _0: stats.quantile(v, 0),
            _10: stats.quantile(v, 0.1),
            _25: stats.quantile(v, 0.25),
            _50: stats.quantile(v, 0.5),
            _75: stats.quantile(v, 0.75),
            _90: stats.quantile(v, 0.90),
            _100: stats.quantile(v, 1)
        };
    }

    //static get [Symbol.species]() { return Map; }
}
let timings = new ListValueMap(10000);
export function timing(key, elapsed) {
    timings.set(key, elapsed);
}
export function dumpTimings() {
    console.log('dbcall,count,median,mode,variance,stddev,min,10,25,avg,75,90,max');
    timings.forEach((value, key)  => {
        if (key && !isNumber(key)) {
            const stats = timings.stats(key);
            console.log(`${stats.key},${stats.count},${stats.median},${stats.mode},${stats.variance},${stats.stdDev},${stats._0},${stats._10},${stats._25},${stats._50},${stats._75},${stats._90},${stats._100}`);
        }
    });
}
