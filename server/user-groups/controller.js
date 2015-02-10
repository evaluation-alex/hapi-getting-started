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
var areValid = require('./../common/controller').areValid;

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
        });
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
        });
};

Controller.find = BaseController.find('user-groups', UserGroups, {
    query: {
        email: Joi.string(),
        groupName: Joi.string(),
        isActive: Joi.string()
    }
}, function (request) {
    var query = {};
    if (request.query.email) {
        query.members = {$regex: new RegExp('^.*?' + request.query.email + '.*$', 'i')};
    }
    if (request.query.groupName) {
        query.name = {$regex: new RegExp('^.*?' + request.query.groupName + '.*$', 'i')};
    }
    if (request.query.isActive) {
        query.isActive = request.query.isActive === '"true"';
    }
    return query;
});

Controller.findOne = BaseController.findOne('user-groups', UserGroups);

Controller.update = BaseController.update('user-groups', UserGroups, {
    payload: {
        isActive: Joi.boolean(),
        addedMembers: Joi.array().includes(Joi.string()).unique(),
        removedMembers: Joi.array().includes(Joi.string()).unique(),
        addedOwners: Joi.array().includes(Joi.string()).unique(),
        removedOwners: Joi.array().includes(Joi.string()).unique(),
        description: Joi.string()
    }
});
Controller.update.pre.push({assign: 'validAndPermitted', method: validAndPermitted},
    {assign: 'validMembers', method: areValid(Users, 'email', 'addedMembers')},
    {assign: 'validOwners', method: areValid(Users, 'email', 'addedOwners')});

Controller.new = {
    validator: {
        payload: {
            name: Joi.string().required(),
            members: Joi.array().includes(Joi.string()),
            owners: Joi.array().includes(Joi.string()),
            description: Joi.string()
        }
    },
    pre: [
        AuthPlugin.preware.ensurePermissions('update', 'user-groups'),
        {assign: 'groupCheck', method: groupCheck},
        {assign: 'validMembers', method: areValid(Users, 'email', 'members')},
        {assign: 'validOwners', method: areValid(Users, 'email', 'owners')},
    ],
    handler: function (request, reply) {
        var by = request.auth.credentials.user.email;
        UserGroups.create(request.payload.name, request.payload.description, by)
            .then(function (userGroup) {
                if (userGroup) {
                    return userGroup.add(request.payload.members, 'member', by)
                        .add(request.payload.owners, 'owner', by)
                        ._save();
                }
                return userGroup;
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
            });
    }
};

Controller.delete = BaseController.delete('user-groups', UserGroups);
Controller.delete.pre.push({assign: 'validAndPermitted', method: validAndPermitted});

module.exports.Controller = Controller;
