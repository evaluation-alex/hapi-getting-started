'use strict';
var _ = require('lodash');
var Joi = require('joi');
var UserGroups = require('./model');
var Users = require('./../users/model');
var ControllerFactory = require('./../common/controller-factory');
var areValid = require('./../common/pre-reqs').areValid;
var validAndPermitted = require('./../common/pre-reqs').validAndPermitted;

var Controller = new ControllerFactory('user-groups', UserGroups)
    .newController({
        payload: {
            name: Joi.string().required(),
            members: Joi.array().items(Joi.string()),
            owners: Joi.array().items(Joi.string()),
            description: Joi.string(),
            access: Joi.string().only(['restricted', 'public'])
        }
    }, [
        {assign: 'validUsers', method: areValid(Users, 'email', ['members', 'owners'])}
    ], function (request) {
        return {
            name: request.payload.name,
            organisation: request.auth.credentials.user.organisation
        };
    })
    .findController({
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
    })
    .findOneController()
    .updateController({
        payload: {
            isActive: Joi.boolean(),
            addedMembers: Joi.array().items(Joi.string()).unique(),
            removedMembers: Joi.array().items(Joi.string()).unique(),
            addedOwners: Joi.array().items(Joi.string()).unique(),
            removedOwners: Joi.array().items(Joi.string()).unique(),
            description: Joi.string(),
            access: Joi.string().only(['restricted', 'public'])
        }
    }, [{assign: 'validAndPermitted', method: validAndPermitted(UserGroups, 'id', ['owners'])},
        {assign: 'validUsers', method: areValid(Users, 'email', ['addedMembers', 'addedOwners'])}
    ], 'update', 'update')
    .deleteController({assign: 'validAndPermitted', method: validAndPermitted(UserGroups, 'id', ['owners'])})
    .joinApproveRejectController(['join', 'approve', 'reject'], 'addedMembers', 'owners')
    .doneConfiguring();

module.exports = Controller;
