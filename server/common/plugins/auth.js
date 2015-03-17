'use strict';
var Users = require('./../../users/model');
var logger = require('./../../../config').logger;
var errors = require('./../errors');
var utils = require('./../utils');

var loginValidation = function loginValidation (email, sessionkey, callback) {
    Users.findBySessionCredentials(email, sessionkey)
        .then(function (user) {
            logger.info(['auth'], {user: email, success: true});
            callback(null, true, {user: user});
        })
        .catch(errors.UserNotFoundError,
        errors.UserNotLoggedInError,
        errors.SessionExpiredError,
        errors.SessionCredentialsNotMatchingError,
        function (err) {
            callback(utils.getBoomError(err, 'en'), false);
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
