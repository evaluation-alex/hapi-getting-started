'use strict';
var Hoek = require('hoek');
var Promise = require('bluebird');
var _ = require('lodash');
var Config = require('./../../config');
var moment = require('moment');
var MongoClient = require('mongodb').MongoClient;
var UserAgent = require('useragent');
var mongodb;

var connect = function (mongouri) {
    return new Promise(function (resolve, reject) {
        MongoClient.connect(mongouri, {}, function (err, db) {
            if (err) {
                reject(err);
            } else {
                mongodb = db;
                resolve(db);
            }
        });
    });
};

var enrichWithStat = function (s) {
    s.count = 0;
    s.avg = 0;
    s.min = 0;
    s.max = 0;
    s.statusCode = {'0#': 1};
    return s;
};

var preEnrichObj = function (id, val, incr) {
    var ret = {};
    ret[id] = incr ? val + 1 : val;
    return ret;
};

var newStatArr = function (size, id, incr) {
    var ret = [];
    for (var i = 0; i < size; i++) {
        ret.push(enrichWithStat(preEnrichObj(id, i, incr)));
    }
    return ret;
};

var newDoc = function (params, id) {
    var ret = {
        _id: id,
        host: params.host,
        path: params.path,
        method: params.method
    };
    if (params.user) {
        ret.user = params.user;
        ret.type = 'userStats';
        ret.ua = 'tbd';
        return enrichWithStat(ret);
    } else {
        ret.year = params.year;
        ret.type = 'combinedStats';
        ret = enrichWithStat(ret);
        ret.months = newStatArr(12, 'm', true);
        var daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        _.forEach(ret.months, function (month) {
            month.days = newStatArr(daysInMonth[month.m-1], 'd', true);
            _.forEach(month.days, function (day) {
                day.hours = newStatArr(24, 'h', false);
            });
        });
        return ret;
    }
};

var update = function (stats, ua, statusCode, elapsed) {
    _.forEach(stats, function (stat) {
        if (!_.isUndefined(stat.ua)) {
            stat.ua = ua.toString();
            stat.os = ua.os.toString();
            stat.device = ua.device.toString();
        }
        if (_.isUndefined(stat.statusCode[statusCode])) {
            stat.statusCode[statusCode] = 1;
        } else {
            stat.statusCode[statusCode] += 1;
        }
        stat.min = stat.min === 0 ? elapsed : stat.min < elapsed ? stat.min : elapsed;
        stat.max = stat.max > elapsed ? stat.max : elapsed;
        stat.avg = ((stat.avg * stat.count) + elapsed) / (stat.count + 1);
        stat.count += 1;
    });
};

/* jshint unused: false*/
var findAndUpdate = function (host, path, method, user, ua, year, month, day, hour, statusCode, elapsed) {
    var queries = [
        {
            id: [host, path, method, year].join(','),
            args: {host: host, path: path, method: method, year: year},
            toUpdate: function (metric, user, year, month, day, hour) {
                return [
                    metric,
                    metric.months[month - 1],
                    metric.months[month - 1].days[day - 1],
                    metric.months[month - 1].days[day - 1].hours[hour]
                ];
            }
        },
        {
            id: [host, path, method, user].join(','),
            args: {host: host, path: path, method: method, user: user},
            toUpdate: function (metric, user, year, month, day, hour) {
                return [metric];
            }
        }
    ];
    var metrics = mongodb.collection('metrics');
    _.forEach(queries, function (query) {
        metrics.findOne({_id: query.id}, function (err, doc) {
            if (err) {
                //do nothing
            } else {
                var metric = doc || newDoc(query.args, query.id);
                update(query.toUpdate(metric, user, year, month, day, hour), ua, statusCode, elapsed);
                metrics.findAndModify({_id: metric._id}, [['_id', 'asc']], metric, {upsert: true}, function (err, doc) {
                    if (err) {
                        //do nothing;
                    } else {
                        //do nothing;
                    }
                });
            }
        });
    });
};
/* jshint unused: true*/

var normalizePath = function (request) {
    var path = request._route.path;
    var specials = request.connection._router.specials;
    if (request._route === specials.notFound.route) {
        path = '/{notFound*}';
    } else if (specials.options && request._route === specials.options.route) {
        path = '/{cors*}';
    }
    return path;
};

module.exports.register = function (server, options, next) {
    var settings = Hoek.applyToDefaults({mongodburl: Config.hapiMongoModels.mongodb.url}, options);
    connect(settings.mongodburl);
    server.ext('onRequest', function (request, reply) {
        return reply.continue();
    });
    server.ext('onPreResponse', function (request, reply) {
        var now = Date.now();
        var year = moment(now).format('YYYY');
        var month = moment(now).format('M');
        var day = moment(now).format('D');
        var hour = moment(now).format('H');
        var host = request.info.host;
        var path = normalizePath(request);
        var method = request.method;
        var ua = UserAgent.lookup(request.headers['user-agent']);
        var statusCode = (request.response.isBoom) ? request.response.output.statusCode : request.response.statusCode;
        var user = request.auth && request.auth.credentials && request.auth.credentials.user ? request.auth.credentials.user.email : 'notloggedin';
        var elapsed = moment(request.info.responded === 0 ? now : request.info.responded).diff(moment(request.info.received));
        findAndUpdate(host, path, method, user, ua, year, month, day, hour, statusCode + '#', elapsed);
        return reply.continue();
    });
    next();

};

module.exports.register.attributes = {
    name: 'metrics'
};
