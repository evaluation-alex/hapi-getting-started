'use strict';
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var ExtendedModel = require('./../common/extended-model').ExtendedModel;
var Config = require('./../../config');
var Promise = require('bluebird');

var authAttemptsConfig = Config.authAttempts;

var AuthAttempts = ExtendedModel.extend({
    /* jshint -W064 */
    constructor: function (attrs) {
        ObjectAssign(this, attrs);
    }
    /* jshint +W064 */
});

AuthAttempts._collection = 'authAttempts';

AuthAttempts.schema = Joi.object().keys({
    _id: Joi.object(),
    email: Joi.string().required(),
    organisation: Joi.string().default('*'),
    ip: Joi.string().required(),
    time: Joi.date().required()
});

AuthAttempts.indexes = [
    [{ip: 1, email: 1}],
    [{email: 1}]
];
/*jshint unused:false*/
AuthAttempts.prototype.del = function (doc, by) {
    var self = this;
    AuthAttempts._findByIdAndRemove(self._id);
    return self;
};
/*jshint unused:true*/

AuthAttempts.prototype.save = function() {
    var self = this;
    return Promise.resolve(self);
};

AuthAttempts.create = function (ip, email) {
    var self = this;
    var document = {
        ip: ip,
        email: email,
        organisation: '*',
        time: new Date()
    };
    return self._insert(document, {});
};

AuthAttempts.abuseDetected = function (ip, email) {
    var self = this;
    return new Promise(function (resolve/*, reject*/) {
        Promise.join(self._count({ip: ip}), self._count({ip: ip, email: email}),
            function (abusiveIpCount, abusiveIpUserCount) {
                var ipLimitReached = abusiveIpCount >= authAttemptsConfig.forIp;
                var ipUserLimitReached = abusiveIpUserCount >= authAttemptsConfig.forIpAndUser;
                resolve(ipLimitReached || ipUserLimitReached);
            });
    });
};

module.exports = AuthAttempts;
