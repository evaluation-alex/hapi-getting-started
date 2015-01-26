'use strict';
var Joi = require('joi');
var Hoek = require('hoek');
var AuthPlugin = require('./../auth');
var Boom = require('boom');
var BaseModel = require('hapi-mongo-models').BaseModel;
var _ = require('lodash');

exports.register = function (server, options, next) {
    options = Hoek.applyToDefaults({basePath: ''}, options);
    var validAndPermitted = function (request, reply) {
        var UserGroups = request.server.plugins['hapi-mongo-models'].UserGroups;
        UserGroups.isValid(BaseModel.ObjectID(request.params.id), request.auth.credentials.user.email)
            .then(function (m) {
                if (m.message === 'valid') {
                    reply();
                } else if (m.message === 'not found') {
                    reply(Boom.notFound(JSON.stringify(m)));
                } else if (m.message === 'not an owner') {
                    reply(Boom.unauthorized(JSON.stringify(m)));
                }
            })
            .catch(function (err) {
                if (err) {
                    reply(Boom.badImplementation(err));
                }
            })
            .done();
    };
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
                AuthPlugin.preware.ensurePermissions('update', 'user-groups'),
                {
                    assign: 'validUsers',
                    method: function (request, reply) {
                        var Users = request.server.plugins['hapi-mongo-models'].Users;
                        var invalidUsers = [];
                        var invalidOwners = [];
                        if (request.payload.addedMembers) {
                            Users.areValid(request.payload.addedMembers)
                                .then(function (found) {
                                    _.forEach(request.payload.addedMembers, function (a) {
                                        if (!found[a]) {
                                            invalidUsers.push(a);
                                        }
                                    });
                                });
                        }
                        if (request.payload.addedOwners) {
                            Users.areValid(request.payload.addedOwners)
                                .then(function (found) {
                                    _.forEach(request.payload.addedOwners, function (a) {
                                        if (!found[a]) {
                                            invalidOwners.push(a);
                                        }
                                    });
                                });
                        }
                        var msg = '';
                        if (invalidUsers.length > 0) {
                            msg = 'invalidMembers = [' + JSON.stringify(invalidUsers) + ']';
                        }
                        if (invalidOwners.length > 0) {
                            msg += 'invalidOwners = [' + JSON.stringify(invalidOwners) + ']';
                        }
                        if (invalidUsers.length > 0 || invalidOwners.length > 0) {
                            reply(Boom.badData(msg));
                        } else {
                            reply();
                        }
                    }
                },
                {
                    assign: 'validAndPermitted',
                    method: validAndPermitted
                }
            ]
        },
        handler: function (request, reply) {
            var UserGroups = request.server.plugins['hapi-mongo-models'].UserGroups;
            UserGroups._findOne({_id: BaseModel.ObjectID(request.params.id)})
                .then(function (userGroup) {
                    var p = [userGroup];
                    var by = request.auth.credentials.user.email;
                    if (request.payload.isActive === true) {
                        p.push(userGroup.reactivate(by));
                    }
                    if (request.payload.isActive === false) {
                        p.push(userGroup.deactivate(by));
                    }
                    if (request.payload.addedMembers) {
                        p.push(userGroup.addUsers(request.payload.addedMembers, 'member', by));
                    }
                    if (request.payload.removedMembers) {
                        p.push(userGroup.removeUsers(request.payload.removedMembers, 'member', by));
                    }
                    if (request.payload.addedOwners) {
                        p.push(userGroup.addUsers(request.payload.addedOwners, 'owner', by));
                    }
                    if (request.payload.removedOwners) {
                        p.push(userGroup.removeUsers(request.payload.removedOwners, 'owner', by));
                    }
                    if (request.payload.description) {
                        p.push(userGroup.updateDesc(request.payload.description, by));
                    }
                    return Promise.all(p);
                })
                .then(function (ug) {
                    reply(ug[0]);
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
                            return userGroup.addUsers(request.payload.members, by);
                        }
                        return userGroup;
                    }
                })
                .then(function (ug) {
                    reply(ug);
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
                AuthPlugin.preware.ensurePermissions('update', 'user-groups'),
                {
                    assign: 'validAndPermitted',
                    method: validAndPermitted
                }
            ]
        },
        handler: function (request, reply) {
            var UserGroups = request.server.plugins['hapi-mongo-models'].UserGroups;
            UserGroups._findOne({_id: BaseModel.ObjectID(request.params.id)})
                .then(function (userGroup) {
                    var by = request.auth.credentials.user.email;
                    reply(userGroup.deactivate(by));
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
    name: 'user-groups'
};
