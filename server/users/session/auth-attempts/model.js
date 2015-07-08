'use strict';
let ModelBuilder = require('./../../../common/model-builder');
let schemas = require('./schemas');
let Config = require('./../../../config');
let Bluebird = require('bluebird');
let _ = require('lodash');
let limits = Config.authAttempts;
let AuthAttempts = (new ModelBuilder())
    .onModel(function AuthAttempts (attrs) {
        _.assign(this, attrs);
    })
    .inMongoCollection('auth-attempts')
    .usingConnection('app')
    .usingSchema(schemas.model)
    .addIndex([{ip: 1, email: 1}])
    .addIndex([{email: 1}])
    .doneConfiguring();
AuthAttempts.create = (ip, email) => {
    let self = this;
    let document = {
        ip: ip,
        email: email,
        organisation: '*',
        time: new Date()
    };
    return self.insert(document);
};
AuthAttempts.abuseDetected = (ip, email) => {
    let self = this;
    return Bluebird.join(self.count({ip: ip}), self.count({ip: ip, email: email}),
        (attemptsFromIp, attemptsFromIpUser) => attemptsFromIp >= limits.forIp || attemptsFromIpUser >= limits.forIpAndUser);
};
module.exports = AuthAttempts;
