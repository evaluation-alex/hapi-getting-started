'use strict';
var Hoek = require('hoek');
var Promise = require('bluebird');
var _ = require('lodash');
var Config = require('./../../config');
var moment = require('moment');
var MongoClient = require('mongodb').MongoClient;
var UserAgent = require('useragent');
var mongodb;

var cache = {};

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
    s.min = 99999999999;
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

var updNewDoc = function (stats, ua, statusCode, elapsed) {
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

var updExistingDoc = function(prefixStr, ua, statusCode, elapsed) {
    var ret = {
        $inc: {},
        $min: {},
        $max: {}
    };
    _.forEach(prefixStr, function (prefix) {
        ret.$inc[prefix + 'count'] = 1;
        ret.$inc[prefix + 'statusCode.' + statusCode] = 1;
        ret.$min[prefix + 'min'] = elapsed;
        ret.$max[prefix + 'max'] = elapsed;
        //https://jira.mongodb.org/browse/SERVER-11345
        //ret.$set[prefix + 'avg'] = {$divide:[{$add: [{$mul: [prefix + 'avg', prefix + 'count']}, elapsed]}, {$add: [prefix + 'count', 1]}]};
    });
    return ret;
};

var TimeBasedMetric = function(host, path, method, year) {
    var self = this;
    self._id = [host, path, method, year].join(',');
    self.id = function () {
        return self._id;
    };
    self.updateNewDoc = function (month, hour, day, ua, statusCode, elapsed) {
        self.host = host;
        self.path = path;
        self.method = method;
        self.year = year;
        self.type = 'combinedStats';
        self = enrichWithStat(self);
        self.months = newStatArr(12, 'm', true);
        var daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        _.forEach(self.months, function (month) {
            month.days = newStatArr(daysInMonth[month.m-1], 'd', true);
            _.forEach(month.days, function (day) {
                day.hours = newStatArr(24, 'h', false);
            });
        });
        var stats = [self, self.months[month - 1], self.months[month - 1].days[day - 1],self.months[month - 1].days[day - 1].hours[hour]];
        updNewDoc(stats, ua, statusCode, elapsed);
        return self;
    };
    self.updateExistingDoc = function (month, day,hour, ua, statusCode, elapsed) {
        var m = month - 1;
        var d = day - 1;
        var h = hour;
        var prefixStr = ['',
            'months.' + m + '.',
            'months.' + m + '.days.' + d + '.',
            'months.' + m + '.days.' + d + '.hours.' + h + '.'];
        return updExistingDoc(prefixStr, ua, statusCode, elapsed);
    };
    return self;
};

var UserBasedMetric = function (host, path, method, user) {
    var self = this;
    self._id = [host, path, method, user].join(',');
    self.id = function () {
        return self._id;
    };
    self.updateNewDoc = function (month, hour, day, ua, statusCode, elapsed) {
        self.host = host;
        self.path = path;
        self.method = method;
        self.user = user;
        self.type = 'userStats';
        self = enrichWithStat(self);
        var stats = [self];
        updNewDoc(stats, ua, statusCode, elapsed);
        return self;
    };
    self.updateExistingDoc = function (month, day, hour, ua, statusCode, elapsed) {
        var prefixStr = [''];
        return updExistingDoc(prefixStr, ua, statusCode, elapsed);
    };
    return self;
};

/* jshint unused: false*/
var findAndUpdate = function (host, path, method, user, ua, year, month, day, hour, statusCode, elapsed) {
    var queries = [new TimeBasedMetric(host, path, method, year), new UserBasedMetric(host, path, method, user)];
    var metrics = mongodb.collection('metrics');
    _.forEach(queries, function (query) {
        var toSave = null;
        if (!cache[query.id()]) {
            toSave = query.updateNewDoc(month, day, hour, ua, statusCode, elapsed);
        } else {
            toSave = query.updateExistingDoc(month, day, hour, ua, statusCode, elapsed);
        }
        metrics.findAndModify({_id: query.id()}, [['_id', 'asc']], toSave, {upsert: true, new: true}, function (err, doc) {
            if (err) {
                console.log(err);
            } else {
                if (doc) {
                    cache[query.id()] = true;
                }
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
