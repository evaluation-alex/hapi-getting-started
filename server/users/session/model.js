'use strict';
var Joi = require('joi');
var _ = require('lodash');
var Uuid = require('node-uuid');
var Promise = require('bluebird');
var moment = require('moment');
var errors = require('./../../common/errors');
var utils = require('./../../common/utils');

var Session = function session () {
};

Session.schema = Joi.array().items(Joi.object().keys({
    ipaddress: Joi.string(),
    key: Joi.object(),
    expires: Joi.date()
}));

Session.prototype._invalidateSession = function invalidateSession (ipaddress, by) {
    var self = this;
    var removed = _.remove(self.session, function (session) {
        return session.ipaddress === ipaddress;
    });
    self._audit('user.session', removed, null, by);
    return self;
};
Session.prototype._newSession = function newSession (ipaddress, by) {
    var self = this;
    var session = {
        ipaddress: ipaddress,
        key: utils.secureHash(Uuid.v4().toString()),
        expires: moment().add(1, 'month').toDate()
    };
    self.session.push(session);
    self._audit('user.session', null, session, by);
    return self;
};
Session.prototype.loginSuccess = function loginSuccess (ipaddress, by) {
    var self = this;
    delete self.resetPwd;
    var found = _.find(self.session, function (session) {
        return session.ipaddress === ipaddress;
    });
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
Session.prototype.loginFail = function loginFail (ipaddress, by) {
    var self = this;
    return self._audit('login fail', null, ipaddress, by);
};
Session.prototype.logout = function logout (ipaddress, by) {
    var self = this;
    self._invalidateSession(ipaddress, by);
    return self;
};

Session.findBySessionCredentials = function findBySessionCredentials (email, key) {
    var self = this;
    return self._findOne({email: email, isActive: true})
        .then(function (user) {
            if (!user) {
                return Promise.reject(new errors.UserNotFoundError({email: email}));
            }
            if (!utils.hasItems(user.session)) {
                return Promise.reject(new errors.UserNotLoggedInError({email: email}));
            }
            var matchingSession = _.find(user.session, function (session) {
                return utils.secureCompare(key, session.key);
            });
            if (!matchingSession) {
                return Promise.reject(new errors.SessionCredentialsNotMatchingError({email: email}));
            }
            if (moment().isAfter(matchingSession.expires)) {
                return Promise.reject(new errors.SessionExpiredError({email: email}));
            }
            return user;
        });
};

module.exports = Session;

