'use strict';
var Joi = require('joi');
var Boom = require('boom');
var BaseModel = require('hapi-mongo-models').BaseModel;
var _ = require('lodash');
var Promise = require('bluebird');
var Permissions = require('./model');
var AuthPlugin = require('./../common/auth');
var BaseController = require('./../common/controller').BaseController;
var Users = require('./../users/model');
var UserGroups = require('./../user-groups/model');
var areValid = require('./../common/controller').areValid;

var Controller = {};

var permissionCheck = function (request, reply) {
    var query = {
        action: request.payload.action,
        object: request.payload.object
    };
    Permissions._findOne(query)
        .then(function (permissions) {
            if (permissions) {
                reply(Boom.conflict('Permissions already exist, modify the existing ones.'));
            } else {
                reply(true);
            }
        })
        .catch(function (err) {
            if (err) {
                reply(Boom.badImplementation(err));
            }
        });
};

Controller.find = BaseController.find('permissions', Permissions, {
    query: {
        user: Joi.string(),
        group: Joi.string(),
        action: Joi.string(),
        object: Joi.string(),
        isActive: Joi.string()
    }
}, function (request) {
    var query = {};
    if (request.query.user) {
        query.users = {$regex: new RegExp('^.*?' + request.query.user + '.*$', 'i')};
    }
    if (request.query.group) {
        query.groups = {$regex: new RegExp('^.*?' + request.query.group + '.*$', 'i')};
    }
    if (request.query.action) {
        query.action = {$regex: new RegExp ('^.*?' + request.query.action + '.*$', 'i')};
    }
    if (request.query.object) {
        query.object = {$regex: new RegExp ('^.*?' + request.query.object + '.*$', 'i')};
    }
    if (request.query.isActive) {
        query.isActive = request.query.isActive === '"true"';
    }
    return query;
});

Controller.findOne = BaseController.findOne('permissions', Permissions);

Controller.update = {
    validator: {
        payload: {
            isActive: Joi.boolean(),
            addedUsers: Joi.array().includes(Joi.string()).unique(),
            removedUsers: Joi.array().includes(Joi.string()).unique(),
            addedGroups: Joi.array().includes(Joi.string()).unique(),
            removedGroups: Joi.array().includes(Joi.string()).unique(),
            description: Joi.string()
        }
    },
    pre: [AuthPlugin.preware.ensurePermissions('update', 'permissions'),
        {assign: 'validUsers', method: areValid(Users, 'email', 'addedUsers')},
        {assign: 'validGroups', method: areValid(UserGroups, 'name', 'addedGroups')}
    ],
    handler: function (request, reply) {
        var by = request.auth.credentials.user.email;
        Permissions._findOne({_id: BaseModel.ObjectID(request.params.id)})
            .then(function (permissions) {
                return (permissions && request.payload.isActive === true) ? permissions.reactivate(by) : permissions;
            })
            .then(function (permissions) {
                return (permissions && request.payload.isActive === false) ? permissions.deactivate(by) : permissions;
            })
            .then(function (permissions) {
                return (permissions && request.payload.addedUsers) ? permissions.addUsers(request.payload.addedUsers, 'user', by) : permissions;
            })
            .then(function (permissions) {
                return (permissions && request.payload.removedUsers) ? permissions.removeUsers(request.payload.removedUsers, 'user', by) : permissions;
            })
            .then(function (permissions) {
                return (permissions && request.payload.addedGroups) ? permissions.addUsers(request.payload.addedGroups, 'group', by) : permissions;
            })
            .then(function (permissions) {
                return (permissions && request.payload.removedGroups) ? permissions.removeUsers(request.payload.removedGroups, 'group', by) : permissions;
            })
            .then(function (permissions) {
                return (permissions && request.payload.description) ? permissions.updateDesc(request.payload.description, by) : permissions;
            })
            .then(function (permissions) {
                return (permissions) ? permissions._save() : permissions;
            })
            .then(function (permissions) {
                if (!permissions) {
                    reply(Boom.notFound('Permissions not found.'));
                } else {
                    reply(permissions);
                }
            })
            .catch(function (err) {
                if (err) {
                    reply(Boom.badImplementation(err));
                }
            });
    }
};

Controller.new = {
    validator: {
        payload: {
            description: Joi.string(),
            users: Joi.array().includes(Joi.string()).unique(),
            groups: Joi.array().includes(Joi.string()).unique(),
            action: Joi.string(),
            object: Joi.string()
        }
    },
    pre: [
        AuthPlugin.preware.ensurePermissions('update', 'permissions'),
        {assign: 'permissionCheck', method: permissionCheck},
        {assign: 'validUsers', method: areValid(Users, 'email', 'users')},
        {assign: 'validGroups', method: areValid(UserGroups, 'name', 'groups')}
    ],
    handler: function (request, reply) {
        var by = request.auth.credentials.user.email;
        Permissions.create(request.payload.description, request.payload.users, request.payload.groups, request.payload.action, request.payload.object, by)
            .then(function (permissions) {
                if (!permissions) {
                    reply(Boom.notFound('permissions could not be created.'));
                } else {
                    reply(permissions);
                }
            })
            .catch(function (err) {
                if (err) {
                    reply(Boom.badImplementation(err));
                }
            });
    }
};

Controller.delete = {
    pre: [AuthPlugin.preware.ensurePermissions('update', 'permissions')],
    handler: function (request, reply) {
        Permissions._findOne({_id: BaseModel.ObjectID(request.params.id)})
            .then(function (permissions) {
                if (!permissions) {
                    reply(Boom.notFound('Permissions not found.'));
                    return false;
                } else {
                    var by = request.auth.credentials.user.email;
                    return permissions.deactivate(by)._save();
                }
            })
            .then(function(permissions) {
                if (permissions) {
                    reply(permissions);
                }
            })
            .catch(function (err) {
                if (err) {
                    reply(Boom.badImplementation(err));
                }
            });
    }
};

module.exports.Controller = Controller;
