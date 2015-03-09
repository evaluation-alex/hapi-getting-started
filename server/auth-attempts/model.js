'use strict';
var BaseModel = require('hapi-mongo-models').BaseModel;
var ObjectAssign = require('object-assign');
var Joi = require('joi');
var Promisify = require('./../common/mixins/promisify');
var Config = require('./../../config');
var Promise = require('bluebird');

var authAttemptsConfig = Config.authAttempts;

var AuthAttempts = BaseModel.extend({
    /* jshint -W064 */
    constructor: function (attrs) {
        ObjectAssign(this, attrs);
    }
    /* jshint +W064 */
});

Promisify(AuthAttempts, ['pagedFind', 'find', 'count', 'insert']);

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

AuthAttempts.create = function (ip, email) {
    var self = this;
    var document = {
        ip: ip,
        email: email,
        organisation: '*',
        time: new Date()
    };
    return self._insert(document)
        .then(function (aa) {
            return aa[0];
        });
};

AuthAttempts.abuseDetected = function (ip, email) {
    var self = this;
    return Promise.join(self._count({ip: ip}), self._count({ip: ip, email: email}),
            function (abusiveIpCount, abusiveIpUserCount) {
                var ipLimitReached = abusiveIpCount >= authAttemptsConfig.forIp;
                var ipUserLimitReached = abusiveIpUserCount >= authAttemptsConfig.forIpAndUser;
                return (ipLimitReached || ipUserLimitReached);
            });
};

module.exports = AuthAttempts;
