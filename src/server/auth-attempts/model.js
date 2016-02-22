'use strict';
const Bluebird = require('bluebird');
const config = require('./../config');
const build = require('./../common/dao').build;
const schemas = require('./schemas');
const {authAttempts: limits} = config;
const AuthAttempts = function AuthAttempts(attrs) {
    this.init(attrs);
};
AuthAttempts.create = function create(ip, email) {
    return AuthAttempts.upsert({
        ip,
        email,
        organisation: '*',
        time: new Date()
    });
};
AuthAttempts.abuseDetected = function abuseDetected(ip, email) {
    return Bluebird.join(
        AuthAttempts.count({ip}),
        AuthAttempts.count({ip, email}),
        (attemptsFromIp, attemptsFromIpUser) => {
            return attemptsFromIp >= limits.forIp || attemptsFromIpUser >= limits.forIpAndUser;
        });
};
module.exports = build(AuthAttempts, schemas.dao, schemas.model);

