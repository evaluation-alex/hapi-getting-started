'use strict';
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var BaseModel = require('hapi-mongo-models').BaseModel;
var Promise = require('bluebird');

var UsersAudit = BaseModel.extend({
    constructor: function (attrs) {
        ObjectAssign(this, attrs);
    }
});

UsersAudit._collection = 'usersAudit';

UsersAudit.schema = Joi.object().keys({
    userId: Joi.object(),
    action: Joi.string().valid('signup', 'login success', 'login fail', 'logout', 'reset password', 'reset password sent', 'update roles', 'deactivate'),
    attribs: Joi.object(),
    timestamp: Joi.date(),
    by: Joi.string()
});

UsersAudit.indexes = [
    [{userId: 1, action: 1, timestamp: 1}, {unique: true}]
];

UsersAudit.create = function(obj) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
        self.insert(obj, function (err, doc) {
            if (err) {
                reject(err);
            } else {
                resolve(doc);
            }
        });
    });
    return promise;
};

UsersAudit._findOne = function(conditions) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
        self.findOne(conditions, function (err, doc) {
            if (err) {
                reject(err);
            } else {
                if (!doc) {
                    reject(new Error('UsersAudit docs not found for conditions - ' + JSON.stringify(conditions)));
                } else {
                    resolve(doc);
                }
            }
        });
    });
    return promise;
};

module.exports = UsersAudit;
