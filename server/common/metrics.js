'use strict';
var Joi = require('joi');
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

var daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

var enrichWithStat = function (s) {
    s.count = 0;
    s.avg = 0;
    s.min = 0;
    s.max = 0;
    s.statusCode = {};
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
        return enrichWithStat(ret);
    }
    if (params.year) {
        ret.year = params.year;
        if (params.month) {
            ret.month = params.month;
            if (params.day) {
                ret.day = params.day;
                ret.hours = newStatArr(24, 'h', false);
                ret.type = 'hourlyStats';
                return ret;
            }
            ret.days = newStatArr(daysInMonth[params.month], 'd', true);
            ret.type = 'dailyStats';
            return ret;
        }
        ret.months = newStatArr(12, 'm', true);
        ret.type = 'monthlyStats';
        return ret;
    }
    return enrichWithStat(ret);
};

var find = function (host, path, method, year, month, day, user) {
    return new Promise(function (resolve, reject) {
        var queries = [{
            id: [host, path, method, year].join(','),
            args: {host: host, path: path, method: method, year: year}
        },
            {
                id: [host, path, method, year, month].join(','),
                args: {host: host, path: path, method: method, year: year, month: month}
            },
            {
                id: [host, path, method, year, month, day].join(','),
                args: {host: host, path: path, method: method, year: year, month: month, day: day}
            },
            {id: [host, path, method, user].join(','), args: {host: host, path: path, method: method, user: user}}
        ];
        var metrics = mongodb.collection('metrics');
        var result = _.map(queries, function (query) {
            return new Promise(function (resolve2, reject2) {
                metrics.findOne({_id: query.id}, function (err, doc) {
                    if (err) {
                        reject2(err);
                    } else {
                        if (!doc) {
                            metrics.insert(newDoc(query.args, query.id), function (err, docs) {
                                if (err) {
                                    reject2(err);
                                } else {
                                    resolve2(docs[0]);
                                }
                            });
                        } else {
                            resolve2(doc);
                        }
                    }
                });
            });
        });
        Promise.settle(result)
            .then(function (r) {
                resolve(r);
            });
    });
};

var update = function (metric, host, path, method, user, ua, year, month, day, hour, statusCode, elapsed) {
    return new Promise(function (resolve, reject) {
        var stat = null;
        if (metric._id === [host, path, method, user].join(',')) {
            stat = metric;
            stat['user-agent'] = ua.toString();
            stat.os = ua.os.toString();
            stat.device = ua.device.toString();
        } else if (metric._id === [host, path, method, year].join(',')) {
            stat = metric.months[month - 1];
        } else if (metric._id === [host, path, method, year, month].join(',')) {
            stat = metric.days[day - 1];
        } else if (metric._id === [host, path, method, year, month, day].join(',')) {
            stat = metric.hours[hour];
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
        var metrics = mongodb.collection('metrics');
        metrics.save(metric, function (err, doc) {
            if (err) {
                reject(err);
            } else {
                resolve(doc);
            }
        });
    });
};

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
        var user = request.auth && request.auth.credentials && request.auth.credentials.user ? request.auth.credentials.user.email : '';
        var elapsed = moment(request.info.responded === 0 ? now : request.info.responded).diff(moment(request.info.received));
        find(host, path, method, year, month, day, user)
            .then(function (metrics) {
                _.forEach(metrics, function (metric) {
                    if (metric.isFulfilled()) {
                        update(metric.value(), host, path, method, user, ua, year, month, day, hour, statusCode, elapsed).done();
                    }
                });
            })
            .catch(function (err) {
                server.log(['error', 'metric'], err, now);
            });
        return reply.continue();
    });
    next();

};

module.exports.register.attributes = {
    name: 'metrics'
};