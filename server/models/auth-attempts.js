'use strict';
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var BaseModel = require('hapi-mongo-models').BaseModel;
var Config = require('../../config').config({argv: []});
var Promise = require('bluebird');

var authAttemptsConfig = Config.authAttempts;

var AuthAttempts = BaseModel.extend({
    constructor: function (attrs) {
        ObjectAssign(this, attrs);
    }
});

AuthAttempts._collection = 'authAttempts';

AuthAttempts.schema = Joi.object().keys({
    _id: Joi.object(),
    email: Joi.string().required(),
    ip: Joi.string().required(),
    time: Joi.date().required()
});

AuthAttempts.indexes = [
    [{ ip: 1, email: 1 }],
    [{ email: 1 }]
];

AuthAttempts.create = function (ip, email) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
        var document = {
            ip: ip,
            email: email,
            time: new Date()
        };
        self.insert(document, function (err, docs) {
            if (err) {
                reject(err);
            } else {
                resolve(docs[0]);
            }
        });
    });
    return promise;
};

AuthAttempts._count = function(query) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
        self.count(query, function (err, count) {
            if (err) {
                reject (err);
            } else {
                resolve(count);
            }
        });
    });
    return promise;
};

AuthAttempts.abuseDetected = function (ip, email) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
        Promise.join(self._count({ ip: ip }), self._count({ip: ip, email: email}),
            function (abusiveIpCount, abusiveIpUserCount) {
                var ipLimitReached = abusiveIpCount >= authAttemptsConfig.forIp;
                var ipUserLimitReached = abusiveIpUserCount >= authAttemptsConfig.forIpAndUser;
                resolve(ipLimitReached || ipUserLimitReached);
            });
    });
    return promise;
};

module.exports = AuthAttempts;
