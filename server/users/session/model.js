'use strict';
var Joi = require('joi');
var Uuid = require('node-uuid');
var Promise = require('bluebird');
var moment = require('moment');
var errors = require('./../../common/errors');
var utils = require('./../../common/utils');

var Session = function session () {};

Session.schema = Joi.object().keys({
    key: Joi.object(),
    expires: Joi.date()
});

Session.prototype._invalidateSession = function invalidateSession () {
    var self = this;
    self.session = {};
    delete self.session;
    return self;
};
Session.prototype._newSession = function newSession () {
    var self = this;
    self.session = {
        key: utils.secureHash(Uuid.v4().toString()),
        expires: moment().add(1, 'month').toDate()
    };
    return self;
};
Session.prototype.loginSuccess = function loginSuccess (ipaddress, by) {
    var self = this;
    self._newSession();
    delete self.resetPwd;
    return self._audit('login success', null, ipaddress, by);
};
Session.prototype.loginFail = function loginFail (ipaddress, by) {
    var self = this;
    self._invalidateSession();
    return self._audit('login fail', null, ipaddress, by);
};
Session.prototype.logout = function logout (ipaddress, by) {
    var self = this;
    self._invalidateSession();
    return self._audit('logout', null, ipaddress, by);
};

Session.findBySessionCredentials = function findBySessionCredentials (email, key) {
    var self = this;
    return self._findOne({email: email, isActive: true})
        .then(function (user) {
            if (!user) {
                return Promise.reject(new errors.UserNotFoundError({email: email}));
            }
            if (!user.session || !user.session.key) {
                return Promise.reject(new errors.UserNotLoggedInError({email: email}));
            }
            if (moment().isAfter(user.session.expires)) {
                return Promise.reject(new errors.SessionExpiredError({email: email}));
            }
            var keyMatch = utils.secureCompare(key, user.session.key);
            if (!keyMatch) {
                return Promise.reject(new errors.SessionCredentialsNotMatchingError({email: email}));
            }
            return user;
        });
};

module.exports = Session;

