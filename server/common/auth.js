'use strict';
var Users = require('./../users/model');
var logger = require('./../../config').logger;

var loginValidation = function (email, sessionkey, callback) {
    Users.findBySessionCredentials(email, sessionkey)
        .then(function (user) {
            logger.info(['auth'], {user: email, success: true});
            callback(null, true, {user: user});
        })
        .catch(function (err) {
            logger.info(['auth', 'error'], {user: email, success: false, error: JSON.stringify(err)});
            callback(null, false);
        });
};

module.exports.register = function (server, options, next) {
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
