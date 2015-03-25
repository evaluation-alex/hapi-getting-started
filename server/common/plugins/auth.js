'use strict';
var Users = require('./../../users/model');
var Preferences = require('./../../users/preferences/model');
var Roles = require('./../../users/roles/model');
var Promise = require('bluebird');
var logger = require('./../../../config').logger;
var errors = require('./../errors');

var loginValidation = function loginValidation (email, sessionkey, callback) {
    Users.findBySessionCredentials(email, sessionkey)
        .then(function (user) {
            logger.info(['auth'], {user: email, success: true});
            var roles = Roles._find({name: {$in: user.roles}, organisation: user.organisation});
            var preferences = Preferences._findOne({email: user.email, organisation: user.organisation});
            Promise.join(roles, preferences, function (roles, prefs) {
                user._roles = roles;
                user.preferences = prefs;
                callback(null, true, {user: user});
            });
        })
        .catch(errors.UserNotFoundError,
        errors.UserNotLoggedInError,
        errors.SessionExpiredError,
        errors.SessionCredentialsNotMatchingError,
        function (err) {
            callback(err.boomError('en'), false);
        })
        .catch(function (err) {
            logger.info(['auth', 'error'], {user: email, success: false, error: JSON.stringify(err)});
            callback(null, false);
        });
};

module.exports.register = function register (server, options, next) {
    server.connections.forEach(function (connection) {
        connection.auth.strategy('simple', 'basic', {
            validateFunc: loginValidation
        });
    });
    next();
};

exports.register.attributes = {
    name: 'auth'
};
