'use strict';
var _ = require('lodash');
var Joi = require('joi');
var UserGroups = require('./model');
var Users = require('./../users/model');
var ControllerFactory = require('./../common/controller-factory').ControllerFactory;
var areValid = require('./../common/controller-factory').areValid;
var validAndPermitted = require('./../common/controller-factory').validAndPermitted;

var Controller = new ControllerFactory('user-groups', UserGroups)
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
            addedMembers: Joi.array().includes(Joi.string()).unique(),
            removedMembers: Joi.array().includes(Joi.string()).unique(),
            addedOwners: Joi.array().includes(Joi.string()).unique(),
            removedOwners: Joi.array().includes(Joi.string()).unique(),
            description: Joi.string(),
            access: Joi.string().valid(['restricted', 'public'])
        }
    }, [{assign: 'validAndPermitted', method: validAndPermitted(UserGroups, 'id', ['owners'])},
        {assign: 'validMembers', method: areValid(Users, 'email', 'addedMembers')},
        {assign: 'validOwners', method: areValid(Users, 'email', 'addedOwners')}
    ], 'update', 'update')
    .newController({
        payload: {
            name: Joi.string().required(),
            members: Joi.array().includes(Joi.string()),
            owners: Joi.array().includes(Joi.string()),
            description: Joi.string(),
            access: Joi.string().valid(['restricted', 'public'])
        }
    }, [
        {assign: 'validMembers', method: areValid(Users, 'email', 'members')},
        {assign: 'validOwners', method: areValid(Users, 'email', 'owners')}
    ], function (request) {
        return {
            name: request.payload.name,
            organisation: request.auth.credentials.user.organisation
        };
    })
    .deleteController({assign: 'validAndPermitted', method: validAndPermitted(UserGroups, 'id', ['owners'])})
    .joinApproveRejectController(['join', 'approve', 'reject'], 'addedMembers', 'owners')
    .doneConfiguring();

module.exports.Controller = Controller;
