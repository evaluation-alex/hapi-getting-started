'use strict';
var Joi = require('joi');
var Hoek = require('hoek');
var AuthPlugin = require('./../auth');
var Boom = require('boom');
var BaseModel = require('hapi-mongo-models').BaseModel;

exports.register = function (server, options, next) {
    options = Hoek.applyToDefaults({basePath: ''}, options);
    server.route({
        method: 'GET',
        path: options.basePath + '/users',
        config: {
            auth: {
                strategy: 'simple'
            },
            validate: {
                query: {
                    email: Joi.string(),
                    isActive: Joi.string(),
                    fields: Joi.string(),
                    sort: Joi.string(),
                    limit: Joi.number().default(20),
                    page: Joi.number().default(1)
                }
            },
            pre: [
                AuthPlugin.preware.ensurePermissions('view', 'users')
            ]
        },
        handler: function (request, reply) {
            var Users = request.server.plugins['hapi-mongo-models'].Users;
            var query = {};
            if (request.query.email) {
                query.email = new RegExp('^.*?' + request.query.email + '.*$', 'i');
            }
            if (request.query.isActive) {
                query.isActive = request.query.isActive === 'true';
            }
            var fields = request.query.fields;
            var sort = request.query.sort;
            var limit = request.query.limit;
            var page = request.query.page;
            Users.pagedFind(query, fields, sort, limit, page, function (err, results) {
                if (err) {
                    reply(Boom.badImplementation(err));
                } else {
                    reply(results);
                }
            });
        }
    });

    server.route({
        method: 'GET',
        path: options.basePath + '/users/{id}',
        config: {
            auth: {
                strategy: 'simple'
            },
            pre: [
                AuthPlugin.preware.ensurePermissions('view', 'users')
            ]
        },
        handler: function (request, reply) {
            var Users = request.server.plugins['hapi-mongo-models'].Users;
            Users._findOne({_id: BaseModel.ObjectID(request.params.id)})
                .then(function (user) {
                    if (!user) {
                        reply(Boom.notFound('Document not found.'));
                    } else {
                        reply(user);
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

    server.route({
        method: 'PUT',
        path: options.basePath + '/users/{id}',
        config: {
            auth: {
                strategy: 'simple'
            },
            validate: {
                payload: {
                    isActive: Joi.boolean(),
                    roles: Joi.array().includes(Joi.string()),
                    password: Joi.string()
                }
            },
            pre: [
                AuthPlugin.preware.ensurePermissions('update', 'users')
            ]
        },
        handler: function (request, reply) {
            var Users = request.server.plugins['hapi-mongo-models'].Users;
            Users._findOne({_id: BaseModel.ObjectID(request.params.id)})
                .then(function (user) {
                    if (!user) {
                        reply(Boom.notFound('User not found.'));
                    } else {
                        if (request.payload.isActive === false) {
                            user.deactivate(request.auth.credentials.user.email).done();
                        }
                        if (request.payload.isActive === true) {
                            user.reactivate(request.auth.credentials.user.email).done();
                        }
                        if (request.payload.roles) {
                            user.updateRoles(request.payload.roles, request.auth.credentials.user.email).done();
                        }
                        if (request.payload.password) {
                            user.resetPassword(request.payload.password, request.auth.credentials.user.email).done();
                        }
                        reply(user);
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
}
;

exports.register.attributes = {
    name: 'users'
};
