'use strict';
var BaseModel = require('hapi-mongo-models').BaseModel;
var Joi = require('joi');
var promisify = require('./../../../common/mixins/promisify');
var Config = require('./../../../../config');
var Promise = require('bluebird');
var _ = require('lodash');

var authAttemptsConfig = Config.authAttempts;

var AuthAttempts = function AuthAttempts (attrs) {
    _.assign(this, attrs);
};

AuthAttempts._collection = 'auth-attempts';

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

_.extend(AuthAttempts, BaseModel);
promisify(AuthAttempts, ['pagedFind', 'find', 'count', 'insertOne']);

AuthAttempts.create = function create (ip, email) {
    var self = this;
    var document = {
        ip: ip,
        email: email,
        organisation: '*',
        time: new Date()
    };
    return self._insertOne(document)
        .then(function (aa) {
            return aa[0];
        });
};

AuthAttempts.abuseDetected = function abuseDetected (ip, email) {
    var self = this;
    return Promise.join(self._count({ip: ip}), self._count({ip: ip, email: email}),
        function (abusiveIpCount, abusiveIpUserCount) {
            var ipLimitReached = abusiveIpCount >= authAttemptsConfig.forIp;
            var ipUserLimitReached = abusiveIpUserCount >= authAttemptsConfig.forIpAndUser;
            return (ipLimitReached || ipUserLimitReached);
        });
};

module.exports = AuthAttempts;
