'use strict';
var BaseModel = require('hapi-mongo-models').BaseModel;
var Promise = require('bluebird');
var _ = require('lodash');
var utils = require('./utils');
var Config = require('./../../config');
var StatsDClient = require('node-statsd');
var moment = require('moment');
var sdc = new StatsDClient({
    host: Config.statsd.host,
    port: Config.statsd.port,
    mock: !Config.statsd.logMetrics
});

var ExtendedModel = BaseModel.extend({
});

var timedReject = function (collection, method, start, reject, err) {
    sdc.timing(Config.projectName + '.' + collection + '.' + method, moment().diff(moment(start)));
    utils.logAndReject(err, reject);
};

var timedResolve = function (collection, method, start, resolve, val) {
    sdc.timing(Config.projectName + '.' + collection + '.' + method, moment().diff(moment(start)));
    resolve(val);
};

var defaultcb = function (collection, method, start, resolve, reject) {
    return function (err, doc) {
        err ? timedReject(collection, method, start, reject, err) : timedResolve(collection, method, start, resolve, doc);
    };
};

ExtendedModel._find = function (conditions) {
    var self = this;
    var start = Date.now();
    return new Promise(function (resolve, reject) {
        self.find(conditions, defaultcb(self._collection, '_find', start, resolve, reject));
    });
};

ExtendedModel._findOne = function (conditions) {
    var self = this;
    var start = Date.now();
    return new Promise(function (resolve, reject) {
        self.findOne(conditions, defaultcb(self._collection, '_findOne', start, resolve, reject));
    });
};

ExtendedModel._findByIdAndUpdate = function (id, obj) {
    var self = this;
    var start = Date.now();
    return new Promise(function (resolve, reject) {
        self.findByIdAndUpdate(id, obj, defaultcb(self._collection, '_findByIdAndUpdate', start, resolve, reject));
    });
};

ExtendedModel._count = function (query) {
    var self = this;
    var start = Date.now();
    return new Promise(function (resolve, reject) {
        self.count(query, defaultcb(self._collection, '_count', start, resolve, reject));
    });
};

ExtendedModel._insert = function (document, notCreated) {
    var self = this;
    var start = Date.now();
    return new Promise(function (resolve, reject) {
        self.insert(document, function (err, docs) {
            if (err) {
                timedReject(self._collection, '_insert', start, reject, err);
            } else {
                timedResolve(self._collection, '_insert', start, resolve, !docs ? notCreated : docs[0]);
            }
        });
    });
};

ExtendedModel._findByIdAndRemove = function (id) {
    var self = this;
    var start = Date.now();
    return new Promise(function (resolve, reject) {
        var collection = BaseModel.db.collection(self._collection);
        collection.findAndRemove({ _id: id }, function (err, doc) {
            if (err) {
                timedReject(self._collection, '_findByIdAndRemove', start, reject, err);
            } else {
                timedResolve(self._collection, '_insert', start, resolve, !doc ? new Error ('document not found') : doc);
            }
        });
    });
};

ExtendedModel._pagedFind = function (query, fields, sort, limit, page) {
    var self = this;
    var start = Date.now();
    return new Promise(function (resolve, reject) {
        self.pagedFind(query, fields, sort, limit, page, defaultcb(self._collection, '_pagedFind', start, resolve, reject));
    });
};

ExtendedModel.areValid = function (property, toCheck, organisation) {
    var self = this;
    return new Promise(function (resolve, reject) {
        if (!toCheck || toCheck.length === 0) {
            resolve({});
        } else {
            var conditions = {};
            conditions[property] = {$in: toCheck};
            conditions.isActive = true;
            conditions.organisation = organisation;
            self._find(conditions)
                .then(function (docs) {
                    if (!docs) {
                        resolve({});
                    } else {
                        var results = Object.create(null);
                        _.forEach(docs, function (doc) {
                            results[doc[property]] = true;
                        });
                        _.forEach(toCheck, function (e) {
                            if (!results[e]) {
                                results[e] = false;
                            }
                        });
                        resolve(results);
                    }
                })
                .catch(function (err) {
                    utils.logAndReject(err, reject);
                });
        }
    });
};

ExtendedModel.isValid = function (id, roles, member) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self._findOne({_id: id})
            .then(function (g) {
                if (!g) {
                    resolve({message: 'not found'});
                } else {
                    var isValid = false;
                    isValid = member === 'root';
                    _.forEach(roles, function (role) {
                        isValid = isValid || g._isMemberOf(role, member);
                    });
                    if (isValid) {
                        resolve({message: 'valid'});
                    } else {
                        resolve({message: 'not a member of ' + JSON.stringify(roles) + ' list'});
                    }
                }
            })
            .catch(function (err) {
                utils.logAndReject(err, reject);
            })
            .done();
    });
};

module.exports = ExtendedModel;
