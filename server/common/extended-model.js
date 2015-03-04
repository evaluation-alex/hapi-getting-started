'use strict';
var BaseModel = require('hapi-mongo-models').BaseModel;
var Promise = require('bluebird');
var _ = require('lodash');
var utils = require('./utils');

var ExtendedModel = BaseModel.extend({
});

var defaultcb = function (resolve, reject) {
    return function (err, doc) {
        err ? utils.logAndReject(err, reject) : resolve(doc);
    };
};

ExtendedModel._find = function (conditions) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.find(conditions, defaultcb(resolve, reject));
    });
};

ExtendedModel._findOne = function (conditions) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.findOne(conditions, defaultcb(resolve, reject));
    });
};

ExtendedModel._findByIdAndUpdate = function (id, obj) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.findByIdAndUpdate(id, obj, defaultcb(resolve, reject));
    });
};

ExtendedModel._count = function (query) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.count(query, defaultcb(resolve, reject));
    });
};

ExtendedModel._insert = function (document, notCreated) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.insert(document, function (err, docs) {
            if (err) {
                utils.logAndReject(err, reject);
            } else {
                if (!docs) {
                    resolve(notCreated);
                } else {
                    resolve(docs[0]);
                }
            }
        });
    });
};

ExtendedModel._findByIdAndRemove = function (id) {
    var self = this;
    return new Promise(function (resolve, reject) {
        var collection = BaseModel.db.collection(self._collection);
        collection.findAndRemove({ _id: id }, function (err, doc) {
            if (err) {
                utils.logAndReject(err, reject);
            } else {
                if (!doc) {
                    reject(new Error ('document not found'));
                } else {
                    resolve(doc);
                }
            }
        });
    });
};

ExtendedModel._pagedFind = function (query, fields, sort, limit, page) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.pagedFind(query, fields, sort, limit, page, defaultcb(resolve, reject));
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
