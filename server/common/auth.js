'use strict';
var Boom = require('boom');
var Users = require('./../users/model');

exports.register = function (server, options, next) {
    server.connections.forEach(function (connection) {
        connection.auth.strategy('simple', 'basic', {
            validateFunc: function (email, sessionkey, callback) {
                Users.findBySessionCredentials(email, sessionkey)
                    .then(function (user) {
                        if (!user) {
                            callback(null, false);
                        } else {
                            user.hydrateRoles()
                                .then(function (enrichedUser) {
                                    callback(null, true, {user: enrichedUser});
                                });
                        }
                    })
                    .catch(function (err) {
                        if (err) {
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
        ensurePermissions: function (request, reply) {
            var ret = request.auth.credentials.user.hasPermissionsTo(forAction, onObject);
            if (!ret) {
                return reply(Boom.forbidden('Permission denied ' + forAction + ' on ' + onObject));
            }
            reply();
        }
    };
};

exports.register.attributes = {
    name: 'auth'
};
