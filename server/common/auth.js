'use strict';
var Boom = require('boom');
var Users = require('./../users/model');

exports.register = function (server, options, next) {
    server.connections.forEach(function (connection) {
        connection.auth.strategy('simple', 'basic', {
            validateFunc: function (email, sessionkey, callback) {
                var alreadyReplied = false;
                Users.findBySessionCredentials(email, sessionkey)
                    .then(function (user) {
                        if (!user) {
                            alreadyReplied = true;
                            callback(null, false);
                        } else {
                            user.hydrateRoles()
                                .then(function (enrichedUser) {
                                    alreadyReplied = true;
                                    callback(null, true, {user: enrichedUser});
                                });
                        }
                    })
                    .catch(function (err) {
                        if (err && !alreadyReplied) {
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
                return reply(Boom.forbidden('Permission denied ' + forAction + ' on ' + onObject));
            }
            reply();
        }
    };
};

exports.register.attributes = {
    name: 'auth'
};
