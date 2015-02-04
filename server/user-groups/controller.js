'use strict';
var Joi = require('joi');
var Boom = require('boom');
var BaseModel = require('hapi-mongo-models').BaseModel;
var _ = require('lodash');
var Promise = require('bluebird');
var UserGroups = require('./model');
var Users = require('./../users/model');
var AuthPlugin = require('./../common/auth');
var BaseController = require('./../common/controller').BaseController;

var Controller = {};

var validAndPermitted = function (request, reply) {
    UserGroups.isValid(BaseModel.ObjectID(request.params.id), request.auth.credentials.user.email)
        .then(function (m) {
            var cases = {
                'valid': function () {
                    reply();
                },
                'not found': function () {
                    reply(Boom.notFound(JSON.stringify(m)));
                },
                'not an owner': function () {
                    reply(Boom.unauthorized(JSON.stringify(m)));
                }
            };
            cases[m.message]();
        })
        .catch(function (err) {
            if (err) {
                reply(Boom.badImplementation(err));
            }
        })
        .done();
};

var validUsers = function (request, reply) {
    var invalidUsers = [];
    var invalidOwners = [];
    Users.areValid(request.payload.addedMembers)
        .then(function (validatedMembers) {
            if (request.payload.addedMembers) {
                _.forEach(request.payload.addedMembers, function (a) {
                    if (!validatedMembers[a]) {
                        invalidUsers.push(a);
                    }
                });
            }
            return Users.areValid(request.payload.addedOwners);
        })
        .then(function (validatedOwners) {
            if (request.payload.addedOwners) {
                _.forEach(request.payload.addedOwners, function (a) {
                    if (!validatedOwners[a]) {
                        invalidOwners.push(a);
                    }
                });
            }
        })
        .then(function () {
            var msg = '';
            if (invalidUsers.length > 0) {
                msg += 'invalidMembers = ' + JSON.stringify(invalidUsers) + ',';
            }
            if (invalidOwners.length > 0) {
                msg += 'invalidOwners = ' + JSON.stringify(invalidOwners);
            }
            if (invalidUsers.length > 0 || invalidOwners.length > 0) {
                reply(Boom.badData(msg));
            } else {
                reply();
            }
        })
        .catch(function (err) {
            if (err) {
                reply(Boom.badImplementation(err));
            }
        })
        .done();
};

var groupCheck = function (request, reply) {
    UserGroups.findByName(request.payload.name)
        .then(function (userGroup) {
            if (userGroup) {
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
};

Controller.find = BaseController.find('user-groups', UserGroups, function (request) {
    var query = {};
    if (request.query.email) {
        query['members.email'] = {$regex: new RegExp('^.*?' + request.query.email + '.*$', 'i')};
        query['members.isActive'] = true;
    }
    if (request.query.groupName) {
        query.name = {$regex: new RegExp('^.*?' + request.query.groupName + '.*$', 'i')};
    }
    if (request.query.isActive) {
        query.isActive = request.query.isActive === '"true"';
    }
    return query;
});

Controller.find.validator = {
    query: {
        email: Joi.string(),
        groupName: Joi.string(),
        isActive: Joi.string(),
        fields: Joi.string(),
        sort: Joi.string(),
        limit: Joi.number().default(20),
        page: Joi.number().default(1)
    }
};

Controller.findOne = BaseController.findOne('user-groups', UserGroups);

Controller.update = {
    validator: {
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
        {assign: 'validUsers', method: validUsers},
        {assign: 'validAndPermitted', method: validAndPermitted}
    ],
    handler: function (request, reply) {
        var by = request.auth.credentials.user.email;
        UserGroups._findOne({_id: BaseModel.ObjectID(request.params.id)})
            .then(function (userGroup) {
                return (request.payload.isActive === true) ? userGroup.reactivate(by) : userGroup;
            })
            .then(function (userGroup) {
                return (request.payload.isActive === false) ? userGroup.deactivate(by) : userGroup;
            })
            .then(function (userGroup) {
                return (request.payload.addedMembers) ? userGroup.addUsers(request.payload.addedMembers, 'member', by) : userGroup;
            })
            .then(function (userGroup) {
                return (request.payload.removedMembers) ? userGroup.removeUsers(request.payload.removedMembers, 'member', by) : userGroup;
            })
            .then(function (userGroup) {
                return (request.payload.addedOwners) ? userGroup.addUsers(request.payload.addedOwners, 'owner', by) : userGroup;
            })
            .then(function (userGroup) {
                return (request.payload.removedOwners) ? userGroup.removeUsers(request.payload.removedOwners, 'owner', by) : userGroup;
            })
            .then(function (userGroup) {
                return (request.payload.description) ? userGroup.updateDesc(request.payload.description, by) : userGroup;
            })
            .then(function (userGroup) {
                reply(userGroup);
            })
            .catch(function (err) {
                if (err) {
                    reply(Boom.badImplementation(err));
                }
            })
            .done();
    }
};

Controller.new = {
    validator: {
        payload: {
            name: Joi.string().required(),
            addedMembers: Joi.array().includes(Joi.string()),
            addedOwners: Joi.array().includes(Joi.string()),
            description: Joi.string()
        }
    },
    pre: [
        AuthPlugin.preware.ensurePermissions('update', 'user-groups'),
        {assign: 'groupCheck', method: groupCheck},
        {assign: 'validUsers', method: validUsers}
    ],
    handler: function (request, reply) {
        var by = request.auth.credentials.user.email;
        UserGroups.create(request.payload.name, request.payload.description, by)
            .then(function (userGroup) {
                return (userGroup && request.payload.addedMembers) ? userGroup.addUsers(request.payload.addedMembers, 'member', by) : userGroup;
            })
            .then(function (userGroup) {
                    return (userGroup && request.payload.addedOwners) ? userGroup.addUsers(request.payload.addedOwners, 'owner', by) : userGroup;
            })
            .then(function (userGroup) {
                if (!userGroup) {
                    reply(Boom.notFound('User group could not be created.'));
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
};

Controller.delete = {
    pre: [
        AuthPlugin.preware.ensurePermissions('update', 'user-groups'),
        {assign: 'validAndPermitted', method: validAndPermitted}
    ],
    handler: function (request, reply) {
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
};

module.exports.Controller = Controller;
