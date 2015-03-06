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

ExtendedModel.defaultcb = function (method, resolve, reject) {
    var self = this;
    var start = Date.now();
    return function (err, doc) {
        err ? timedReject(self._collection, method, start, reject, err) :
            timedResolve(self._collection, method, start, resolve, doc);
    };
};

ExtendedModel.defaultcb2 = function (method, resolve, reject, notValid) {
    var self = this;
    var start = Date.now();
    return function (err, docs) {
        err ? timedReject(self._collection, method, start, reject, err) :
            timedResolve(self._collection, method, start, resolve, !docs ? notValid : docs[0]);
    };
};

ExtendedModel._find = function (conditions) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.find(conditions, self.defaultcb('_find', resolve, reject));
    });
};

ExtendedModel._findOne = function (query) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.findOne(query, self.defaultcb('_findOne', resolve, reject));
    });
};

ExtendedModel._findByIdAndUpdate = function (id, obj) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.findByIdAndUpdate(id, obj, self.defaultcb('_findByIdAndUpdate', resolve, reject));
    });
};

ExtendedModel._count = function (query) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.count(query, self.defaultcb('_count', resolve, reject));
    });
};

ExtendedModel._insert = function (document, notCreated) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.insert(document, self.defaultcb2('_insert', resolve, reject, notCreated));
    });
};

ExtendedModel._findByIdAndRemove = function (id) {
    var self = this;
    var err = new Error('Document not found');
    return new Promise(function (resolve, reject) {
        var collection = BaseModel.db.collection(self._collection);
        collection.findAndRemove({_id: id}, self.defaultcb2('_findByIdAndRemove', resolve, reject, err));
    });
};

ExtendedModel._pagedFind = function (query, fields, sort, limit, page) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.pagedFind(query, fields, sort, limit, page, self.defaultcb('_pagedFind', resolve, reject));
    });
};

ExtendedModel._insertAndAudit = function (doc, notCreated, idToUse, action) {
    var self = this;
    return self._insert(doc, notCreated)
        .then(function (obj) {
            if (obj) {
                var audit = {
                    objectChangedType: _.capitalize(self._collection),
                    objectChangedId: obj[idToUse ? idToUse : '_id'],
                    action: action ? action : 'create',
                    origValues: null,
                    newValues: obj,
                    organisation: obj.organisation,
                    by: obj.createdBy,
                    timestamp: new Date()
                };
                var collection = BaseModel.db.collection('audit');
                /*jshint unused:false*/
                collection.insert(audit, function (err, doc) {
                    if (err) {
                        Config.logger.error({error: err});
                    }
                });
                /*jshint unused:true*/
            }
            return obj;
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
                }));
        }
    });
    /*jshint unused:true*/
};

ExtendedModel.isValid = function (id, roles, member) {
    var self = this;
    /*jshint unused:false*/
    return new Promise(function (resolve, reject) {
        if (member === 'root') {
            resolve({message: 'valid'});
        } else {
            resolve(self._findOne({_id: id})
                .then(function (g) {
                    var message = '';
                    if (!g) {
                        message = 'not found';
                    } else {
                        var isValid = !!_.find(roles, function (role) {
                            return g._isMemberOf(role, member);
                        });
                        message = isValid ? 'valid' : 'not a member of ' + JSON.stringify(roles) + ' list';
                    }
                    return {message: message};
                }));
        }
    });
    /*jshint unused:true*/
};

module.exports = ExtendedModel;
