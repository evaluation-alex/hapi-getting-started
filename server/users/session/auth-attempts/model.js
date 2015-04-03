'use strict';
let Model = require('./../../../common/model');
let Joi = require('joi');
let Config = require('./../../../../config');
var Promise = require('bluebird');
let _ = require('lodash');
let authAttemptsConfig = Config.authAttempts;
var AuthAttempts = function AuthAttempts (attrs) {
    _.assign(this, attrs);
};
AuthAttempts.collection = 'auth-attempts';
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
_.extend(AuthAttempts, Model);
AuthAttempts.create = function create (ip, email) {
    let self = this;
    let document = {
        ip: ip,
        email: email,
        organisation: '*',
        time: new Date()
    };
    return self.insert(document);
};
AuthAttempts.abuseDetected = function abuseDetected (ip, email) {
    let self = this;
    return Promise.join(self.count({ip: ip}), self.count({ip: ip, email: email}),
        function (abusiveIpCount, abusiveIpUserCount) {
            var ipLimitReached = abusiveIpCount >= authAttemptsConfig.forIp;
            var ipUserLimitReached = abusiveIpUserCount >= authAttemptsConfig.forIpAndUser;
            return (ipLimitReached || ipUserLimitReached);
        });
};
module.exports = AuthAttempts;
