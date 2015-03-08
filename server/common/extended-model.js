'use strict';
var BaseModel = require('hapi-mongo-models').BaseModel;
var Promise = require('bluebird');
var _ = require('lodash');
var utils = require('./utils');
var Config = require('./../../config');
var logger = Config.logger;

var ExtendedModel = BaseModel.extend({});

ExtendedModel.defaultcb = function (method, resolve, reject) {
    var bucket = this._collection + '.' + method;
    var start = Date.now();
    return function (err, res) {
        utils.timedPromise(bucket, start, resolve, reject, err, res);
    };
};

_.forEach(['find', 'findOne', 'count', 'pagedFind', 'findByIdAndUpdate', 'insert'], function (method) {
    ExtendedModel['_' + method] = function () {
        var self = this;
        var args = [].slice.call(arguments);
        return new Promise(function (resolve, reject) {
            args.push(self.defaultcb(method, resolve, reject));
            self[method].apply(self, args);
        });
    };
}, ExtendedModel);

ExtendedModel._insertAndAudit = function (doc, idToUse, action) {
    var self = this;
    return self._insert(doc)
        .then(function (obj) {
            if (!obj) {
                return false;
            } else {
                var audit = {
                    objectChangedType: _.capitalize(self._collection),
                    objectChangedId: obj[0][idToUse ? idToUse : '_id'],
                    action: action ? action : 'create',
                    origValues: null,
                    newValues: obj[0],
                    organisation: obj[0].organisation,
                    by: obj[0].createdBy,
                    timestamp: new Date()
                };
                var collection = BaseModel.db.collection('audit');
                /*jshint unused:false*/
                collection.insert(audit, function (err, doc) {
                    if (err) {
                        logger.error({error: err});
                    }
                });
                /*jshint unused:true*/
            }
            return obj[0];
        });
};

ExtendedModel.areValid = function (property, toCheck, organisation) {
    var self = this;
    if (!toCheck || toCheck.length === 0) {
        return Promise.resolve({});
    } else {
        var conditions = {};
        conditions[property] = {$in: toCheck};
        conditions.isActive = true;
        conditions.organisation = organisation;
        return self._find(conditions)
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
            });
    }
};

ExtendedModel.isValid = function (id, roles, member) {
    var self = this;
    if (member === 'root') {
        return Promise.resolve({message: 'valid'});
    } else {
        return self._findOne({_id: id})
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
            });
    }
};

module.exports = ExtendedModel;
