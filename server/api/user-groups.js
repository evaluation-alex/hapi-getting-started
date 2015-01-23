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
        path: options.basePath + '/user-groups',
        config: {
            auth: {
                strategy: 'simple'
            },
            validate: {
                query: {
                    email: Joi.string(),
                    groupName: Joi.string(),
                    isActive: Joi.string(),
                    fields: Joi.string(),
                    sort: Joi.string(),
                    limit: Joi.number().default(20),
                    page: Joi.number().default(1)
                }
            },
            pre: [
                AuthPlugin.preware.ensurePermissions('view', 'user-groups')
            ]
        },
        handler: function (request, reply) {
            var UserGroups = request.server.plugins['hapi-mongo-models'].UserGroups;
            var query = {};
            if (request.query.email) {
                query.members.email = new RegExp('^.*?' + request.query.email + '.*$', 'i');
            }
            if (request.query.groupName) {
                query.name = request.query.groupName;
            }
            if (request.query.isActive) {
                query.isActive = request.query.isActive === true;
            }
            var fields = request.query.fields;
            var sort = request.query.sort;
            var limit = request.query.limit;
            var page = request.query.page;
            UserGroups.pagedFind(query, fields, sort, limit, page, function (err, results) {
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
        path: options.basePath + '/user-groups/{id}',
        config: {
            auth: {
                strategy: 'simple'
            },
            pre: [
                AuthPlugin.preware.ensurePermissions('view', 'user-groups')
            ]
        },
        handler: function (request, reply) {
            var UserGroups = request.server.plugins['hapi-mongo-models'].UserGroups;
            UserGroups._findOne({_id: BaseModel.ObjectID(request.params.id)})
                .then(function (userGroup) {
                    if (!userGroup) {
                        reply(Boom.notFound('User group not found.'));
                    } else {
                        reply(userGroup);
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
        path: options.basePath + '/user-groups/{id}',
        config: {
            auth: {
                strategy: 'simple'
            },
            validate: {
                payload: {
                    isActive: Joi.boolean(),
                    addedMembers: Joi.array().includes(Joi.string()),
                    removedMembers: Joi.array().includes(Joi.string()),
                    addedOwners: Joi.array().includes(Joi.string()),
                    removedOwners: Joi.array().includes(Joi.string()),
                    description: Joi.string()
                }
            },
            pre: [
                AuthPlugin.preware.ensurePermissions('update', 'user-groups')
            ]
        },
        handler: function (request, reply) {
            var UserGroups = request.server.plugins['hapi-mongo-models'].UserGroups;
            UserGroups._findOne({_id: BaseModel.ObjectID(request.params.id)})
                .then(function (userGroup) {
                    if (!userGroup) {
                        reply(Boom.notFound('User group not found.'));
                    } else {
                        var by = request.auth.credentials.user.email;
                        if (userGroup.isOwner(by) || by === 'root') {
                            if (request.payload.isActive === true) {
                                userGroup.reactivate(by);
                            }
                            if (request.payload.isActive === false) {
                                userGroup.deactivate(by);
                            }
                            if (request.payload.addedMembers) {
                                userGroup.addUsers(request.payload.addedMembers, by);
                            }
                            if (request.payload.removedMembers) {
                                userGroup.removeUsers(request.payload.removedMembers, by);
                            }
                            if (request.payload.addedOwners) {
                                userGroup.addOwners(request.payload.addedOwners, by);
                            }
                            if (request.payload.removedOwners) {
                                userGroup.removeOwners(request.payload.removedOwners, by);
                            }
                            if (request.payload.description) {
                                userGroup.updateDesc(request.payload.description, by);
                            }
                            reply(userGroup);
                        } else {
                            reply(Boom.unauthorized('Only owners are allowed to modify groups'));
                        }
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
        method: 'POST',
        path: options.basePath + '/user-groups',
        config: {
            auth: {
                strategy: 'simple'
            },
            validate: {
                payload: {
                    name: Joi.string().required(),
                    members: Joi.array().includes(Joi.string()),
                    description: Joi.string()
                }
            },
            pre: [{
                assign: 'groupCheck',
                method: function (request, reply) {
                    var UserGroups = request.server.plugins['hapi-mongo-models'].UserGroups;
                    UserGroups.findByName(request.payload.name.toLowerCase())
                        .then(function (userGroup) {
                            if (!userGroup) {
                                reply(Boom.conflict('Group with this name is already in use.'));
                            } else {
                                reply(true);
                            }
                        })
                        .catch(function (err) {
                            if (err) {
                                reply(Boom.badImplementation(err));
                            }
                        })
                        .done();
                }
            },
                AuthPlugin.preware.ensurePermissions('update', 'user-groups')
            ]
        },
        handler: function (request, reply) {
            var UserGroups = request.server.plugins['hapi-mongo-models'].UserGroups;
            var by = request.auth.credentials.user.email;
            UserGroups.create(request.payload.name, request.payload.description, by)
                .then(function (userGroup) {
                    if (!userGroup) {
                        reply(Boom.notFound('User group could not be created.'));
                    } else {
                        if (request.payload.members) {
                            userGroup.addUsers(request.payload.members, by);
                        }
                        reply(userGroup);
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
        method: 'DELETE',
        path: options.basePath + '/user-groups/{id}',
        config: {
            auth: {
                strategy: 'simple'
            },
            pre: [
                AuthPlugin.preware.ensurePermissions('update', 'user-groups')
            ]
        },
        handler: function (request, reply) {
            var UserGroups = request.server.plugins['hapi-mongo-models'].UserGroups;
            UserGroups._findOne({_id: BaseModel.ObjectID(request.params.id)})
                .then(function (userGroup) {
                    if (!userGroup) {
                        reply(Boom.notFound('User group not found.'));
                    } else {
                        var by = request.auth.credentials.user.email;
                        if (userGroup.isOwner(by) || by === 'root') {
                            reply(userGroup.deactivate(by));
                        } else {
                            reply(Boom.unauthorized('Only owners are allowed to modify groups'));
                        }
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
