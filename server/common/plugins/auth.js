'use strict';
var Users = require('./../../users/model');
var logger = require('./../../../config').logger;
var i18n = require('./../../../config').i18n;
var Boom = require('boom');

var cases = {
    'UserNotFound': function (email) {
        return Boom.notFound(i18n.__({phrase: '{{email}} not found'}, {email: email}));
    },
    'UserNotLoggedIn': function (email) {
        return Boom.unauthorized(i18n.__({phrase: '{{email}} not logged in'}, {email: email}));
    },
    'SessionCredentialsNotMaching': function (email) {
        return Boom.unauthorized(i18n.__({phrase: '{{email}} does not have the right credentials, login again'}, {email: email}));
    },
    'SessionExpired': function () {
        return Boom.unauthorized(i18n.__({phrase: 'Your session has expired, login again'}));
    }
};

var loginValidation = function loginValidation (email, sessionkey, callback) {
    Users.findBySessionCredentials(email, sessionkey)
        .then(function (user) {
            logger.info(['auth'], {user: email, success: true});
            callback(null, true, {user: user});
        })
        .catch(function (err) {
            logger.info(['auth', 'error'], {user: email, success: false, error: JSON.stringify(err)});
            var msg = cases[err.type];
            callback(msg ? msg(email) : null, false);
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
