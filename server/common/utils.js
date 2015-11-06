'use strict';
import {get, isArray, uniq} from 'lodash';
import moment from 'moment';
import bcrypt from 'bcrypt';
import boom from 'boom';
import {ObjectID as objectID} from 'mongodb';
import stats from 'simple-statistics';
import config from './../config';
let {logger} = config;
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
let quantiles = [0, 0.05, 0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 0.95, 1];
let toFlushDefaults = ['type', 'name', 'count', 'uniques', 'mean', 'variance', 'stdDev', 'p0', 'p10', 'p25', 'p50', 'p75', 'p90', 'p100', 'lastObservation'];
function cmp(v, f) {
    let d = v - f;
    return d > 0 ? 1 : d < 0 ? -1 : 0;
}
class Stats {
    constructor(type, name) {
        this.type = type;
        this.name = name;
        this.lastObservation = undefined;
        this.lastFlushed = Date.now();
        this.init();
    }
    init() {
        this.mean = 0;
        this.variance = 0;
        this.stdDev = 0;
        quantiles.forEach(q => {
            this['p' + q * 100] = 0;
        }, this);
        this.count = 0;
        this.uniques = 0;
        this.observations = [];
    }
    addObservation(obs) {
        let n = this.count + 1;
        let nMinus1 = this.count;
        let mean = this.mean;
        let delta = obs - mean;
        let variance = this.variance;
        //https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Online_algorithm
        mean = mean + ((obs - mean) / n);
        variance = ((nMinus1 * variance) + delta * (obs - mean)) / n;
        this.lastObservation = obs;
        this.observations.push(obs);
        this.count = n;
        this.mean = mean;
        this.variance = variance;
        this.stdDev = Math.sqrt(variance);
    }
    flush(fieldsToFlush) {
        this.observations.sort(cmp);
        quantiles.forEach(q => {
            this['p' + q * 100] = stats.quantileSorted(this.observations, q);
        }, this);
        this.uniques = uniq(this.observations, true).length;
        let ret = fieldsToFlush.map(f => this[f], this).join(':');
        this.init();
        this.lastFlushed = Date.now();
        return ret;
    }
}
let timings = new Map([]);
export function timing(type, name, elapsed) {
    let key = type + name;
    if (!timings.has(key)) {
        timings.set(key, new Stats(type, name));
    }
    timings.get(key).addObservation(elapsed);
}
export function dumpTimings() {
    console.log(toFlushDefaults.join(':'));
    timings.forEach(value => {
        console.log(value.flush(toFlushDefaults));
    });
}
