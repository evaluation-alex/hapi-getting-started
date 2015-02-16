'use strict';
var _ = require('lodash');
var Joi = require('joi');
var Boom = require('boom');
var BaseModel = require('hapi-mongo-models').BaseModel;
var UserGroups = require('./model');
var Users = require('./../users/model');
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
            reply(Boom.badImplementation(err));
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
    var fields = [['email', 'members'], ['groupName', 'name']];
    _.forEach(fields, function (pair) {
        if (request.query[pair[0]]) {
            query[pair[1]] = {$regex: new RegExp('^.*?' + request.query[pair[0]] + '.*$', 'i')};
        }
    });
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
}, [{assign: 'validAndPermitted', method: validAndPermitted},
    {assign: 'validMembers', method: areValid(Users, 'email', 'addedMembers')},
    {assign: 'validOwners', method: areValid(Users, 'email', 'addedOwners')}
]);

Controller.new = BaseController.new('user-groups', UserGroups, {
    payload: {
        name: Joi.string().required(),
        members: Joi.array().includes(Joi.string()),
        owners: Joi.array().includes(Joi.string()),
        description: Joi.string()
    }
}, [
    {assign: 'validMembers', method: areValid(Users, 'email', 'members')},
    {assign: 'validOwners', method: areValid(Users, 'email', 'owners')}
], function (request) {
    return {
        name: request.payload.name,
        organisation: request.auth.credentials.user.organisation
    };
});

Controller.delete = BaseController.delete('user-groups', UserGroups);
Controller.delete.pre.push({assign: 'validAndPermitted', method: validAndPermitted});

module.exports.Controller = Controller;
