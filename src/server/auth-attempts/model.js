'use strict';
const Bluebird = require('bluebird');
const config = require('./../config');
const build = require('./../common/dao').build;
const {authAttempts: limits} = config;
const modelSchema = require('./../../shared/model')(require('joi'), require('./../lodash'))['auth-attempts'];
const daoOptions = {
    connection: 'app',
    collection: 'auth-attempts',
    indexes: [
        {fields: {ip: 1, email: 1}},
        {fields: {email: 1}}
    ],
    saveAudit: false,
    isReadonly: true,
    schemaVersion: 1
};
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
        (attemptsFromIp, attemptsFromIpUser) =>
            attemptsFromIp >= limits.forIp || attemptsFromIpUser >= limits.forIpAndUser
        );
};
module.exports = build(AuthAttempts, daoOptions, modelSchema);
