'use strict';
const config = require('./../../config');
const Users = require('./../../users/model');
const {logger} = config;
const register = function register(server, options, next) {
    server.connections.forEach(connection => {
        connection.auth.strategy('simple', 'basic', {
            validateFunc(request, email, sessionkey, callback) {
                Users.findBySessionCredentials(email, sessionkey)
                    .then(user => {
                        callback(null, true, {user});
                    })
                    .catch(err => {
                        logger.info(['auth', 'error'], {user: email, success: false, error: JSON.stringify(err)});
                        callback(err.i18nError ? err.i18nError('en') : null, false);
                    });
            }
        });
    });
    return next();
};
register.attributes = {
    name: 'auth'
};
module.exports = register;
