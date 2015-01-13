'use strict';
var Hoek = require('hoek');
var Boom = require('boom');

exports.register = function (server, options, next) {
    options = Hoek.applyToDefaults({basePath: ''}, options);
    server.route({
        method: 'DELETE',
        path: options.basePath + '/logout',
        config: {
            auth: {
                strategy: 'simple'
            }
        },
        handler: function (request, reply) {
            var Users = request.server.plugins['hapi-mongo-models'].Users;
            var credentials = request.auth.credentials || {user: {}};
            Users._findOne({email: credentials.user.email})
                .then(function (user) {
                    if (!user) {
                        reply(Boom.notFound('Session not found. Logout and login again'));
                    } else {
                        user.logout(request.info.remoteAddress, user.email).done();
                        reply({message: 'Success.'});
                    }
                })
                .catch(function (err) {
                    if (err) {
                        reply(Boom.badImplementation(err));
                    }
                })
                .done();
        }
    });
    next();
};

exports.register.attributes = {
    name: 'logout'
};
