'use strict';
let logger = require('./../../config').logger;
let errors = require('./../errors');
let cookie = require('cookie');
let Users = require('./../../users/model');
let Roles = require('./../../users/roles/model');
let loginValidation = (request, email, sessionkey, callback) => {
    Users.findBySessionCredentials(email, sessionkey)
        .then((user) => {
            logger.info(['auth'], {user: email, success: true});
            Roles.find({name: {$in: user.roles}, organisation: user.organisation})
                .then((roles) => {
                    user._roles = roles;
                    callback(null, true, {user: user});
                });
        })
        .catch(errors.UserNotFoundError,
        errors.UserNotLoggedInError,
        errors.SessionExpiredError,
        errors.SessionCredentialsNotMatchingError,
        (err) => {
            callback(err.i18nError('en'), false);
        })
        .catch((err) => {
            logger.info(['auth', 'error'], {user: email, success: false, error: JSON.stringify(err)});
            callback(null, false);
        });
};
module.exports.register = (server, options, next) => {
    // this is being done to prevent users and roles fom creating indexes before mongo connections have been established
    server.connections.forEach((connection) => {
        connection.auth.strategy('simple', 'basic', {
            validateFunc: loginValidation
        });
    });
    server.ext('onPreAuth', (request, reply) => {
        if (!request.headers.authorization && request.headers.cookie) {
            let ckie = cookie.parse(request.headers.cookie);
            if (ckie.site) {
                let o = JSON.parse(ckie.site);
                request.headers.authorization = o.authorization;
            }
        }
        return reply.continue();
    });
    return next();
};
exports.register.attributes = {
    name: 'auth'
};
