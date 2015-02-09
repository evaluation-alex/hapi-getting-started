'use strict';
var Boom = require('boom');
var Users = require('./../users/model');
var logger = require('./../manifest').logger;

exports.register = function (server, options, next) {
    server.connections.forEach(function (connection) {
        connection.auth.strategy('simple', 'basic', {
            validateFunc: function (email, sessionkey, callback) {
                var alreadyReplied = false;
                Users.findBySessionCredentials(email, sessionkey)
                    .then(function (user) {
                        if (!user) {
                            alreadyReplied = true;
                            logger.info(['auth'], {user: email, success: false});
                            callback(null, false);
                        } else {
                            user.hydrateRoles()
                                .then(function (enrichedUser) {
                                    alreadyReplied = true;
                                    logger.info(['auth'], {user: email, success: true});
                                    callback(null, true, {user: enrichedUser});
                                });
                        }
                    })
                    .catch(function (err) {
                        if (err && !alreadyReplied) {
                            logger.log(['auth', 'error'], {user: email, success: true});
                            callback(null, false);
                        }
                    })
                    .done();
            }
        });
    });
    next();
};

exports.preware = {};

exports.preware.ensurePermissions = function (forAction, onObject) {
    return {
        assign: 'ensurePermissions',
        method: function (request, reply) {
            var ret = request.auth.credentials.user.hasPermissionsTo(forAction, onObject);
            if (!ret) {
                logger.warn(['rolePermissions', 'error'], {
                    user: request.auth.credentials.user.email,
                    action: forAction,
                    object: onObject,
                    request: {id: request.id, method: request.method, path: request.path}
                });
                return reply(Boom.forbidden('Permission denied ' + forAction + ' on ' + onObject));
            }
            reply();
        }
    };
};

exports.register.attributes = {
    name: 'auth'
};
