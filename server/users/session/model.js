'use strict';
let Joi = require('joi');
let _ = require('lodash');
let Uuid = require('node-uuid');
let Bluebird = require('bluebird');
let moment = require('moment');
let errors = require('./../../common/errors');
let utils = require('./../../common/utils');
let ModelBuilder = require('./../../common/model-builder');
var Session = (new ModelBuilder())
    .virtualModel()
    .usingSchema(Joi.array().items(Joi.object().keys({
        ipaddress: Joi.string(),
        key: Joi.object(),
        expires: Joi.date()
    })))
    .doneConfiguring();
Session.prototype._invalidateSession = (ipaddress, by) => {
    let self = this;
    let removed = _.remove(self.session, (session) => session.ipaddress === ipaddress);
    self.trackChanges('user.session', removed, null, by);
    return self;
};
Session.prototype._newSession = (ipaddress, by) => {
    let self = this;
    let session = {
        ipaddress: ipaddress,
        key: utils.secureHash(Uuid.v4().toString()),
        expires: moment().add(1, 'month').toDate()
    };
    self.session.push(session);
    self.trackChanges('user.session', null, session, by);
    return self;
};
Session.prototype.loginSuccess = (ipaddress, by) => {
    let self = this;
    let found = _.find(self.session, (session) => session.ipaddress === ipaddress);
    if (!found) {
        self._newSession(ipaddress, by);
    } else {
        if (moment().isAfter(found.expires)) {
            self._invalidateSession(ipaddress, by);
            self._newSession(ipaddress, by);
        }
    }
    return self;
};
Session.prototype.loginFail = (ipaddress, by) => {
    let self = this;
    return self.trackChanges('login fail', null, ipaddress, by);
};
Session.prototype.logout = (ipaddress, by) => {
    let self = this;
    self._invalidateSession(ipaddress, by);
    return self;
};
Session.findBySessionCredentials = (email, key) => {
    let self = this;
    return self.findOne({email: email, isActive: true})
        .then((user) => {
            if (!user) {
                return Bluebird.reject(new errors.UserNotFoundError({email: email}));
            }
            if (!utils.hasItems(user.session)) {
                return Bluebird.reject(new errors.UserNotLoggedInError({email: email}));
            }
            let matchingSession = _.find(user.session, (session) => utils.secureCompare(key, session.key));
            if (!matchingSession) {
                return Bluebird.reject(new errors.SessionCredentialsNotMatchingError({email: email}));
            }
            if (moment().isAfter(matchingSession.expires)) {
                return Bluebird.reject(new errors.SessionExpiredError({email: email}));
            }
            return user;
        });
};
module.exports = Session;
