'use strict';
var BaseModel = require('hapi-mongo-models').BaseModel;
var Promise = require('bluebird');
var _ = require('lodash');
var utils = require('./utils');
var Config = require('./../../config');
var statsd = Config.statsd;

var ExtendedModel = BaseModel.extend({});

var timedReject = function (collection, method, start, reject, err) {
    statsd.timing(Config.projectName + '.' + collection + '.' + method, Date.now() - start);
    statsd.increment(Config.projectName + '.' + collection + '.' + method + '.err', 1);
    utils.logAndReject(err, reject);
};

var timedResolve = function (collection, method, start, resolve, val) {
    statsd.timing(Config.projectName + '.' + collection + '.' + method, Date.now() - start);
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

ExtendedModel._findOne = function (query) {
    var self = this;
    var start = Date.now();
    return new Promise(function (resolve, reject) {
        self.findOne(query, defaultcb(self._collection, '_findOne', start, resolve, reject));
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
        collection.findAndRemove({_id: id}, function (err, doc) {
            if (err) {
                timedReject(self._collection, '_findByIdAndRemove', start, reject, err);
            } else {
                timedResolve(self._collection, '_findByIdAndRemove', start, resolve, !doc ? new Error('document not found') : doc);
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
    /*jshint unused:false*/
    return new Promise(function (resolve, reject) {
        if (!toCheck || toCheck.length === 0) {
            resolve({});
        } else {
            var conditions = {};
            conditions[property] = {$in: toCheck};
            conditions.isActive = true;
            conditions.organisation = organisation;
            resolve(self._find(conditions)
                .then(function (docs) {
                    if (!docs) {
                        return {};
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
                        return results;
                    }
                }));
        }
    });
    /*jshint unused:true*/
};

ExtendedModel.isValid = function (id, roles, member) {
    var self = this;
    /*jshint unused:false*/
    return new Promise(function (resolve, reject) {
        resolve(self._findOne({_id: id})
            .then(function (g) {
                if (!g) {
                    return {message: 'not found'};
                } else {
                    var isValid = member === 'root' || !!_.find(roles, function (role) {
                            return g._isMemberOf(role, member);
                        });
                    return isValid ?
                    {message: 'valid'} :
                    {message: 'not a member of ' + JSON.stringify(roles) + ' list'};
                }
            }));
    });
    /*jshint unused:true*/
};

module.exports = ExtendedModel;
