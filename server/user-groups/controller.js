'use strict';
var _ = require('lodash');
var Joi = require('joi');
var UserGroups = require('./model');
var ControllerFactory = require('./../common/controller-factory');
var areValid = require('./../common/prereqs/are-valid');
var validAndPermitted = require('./../common/prereqs/valid-permitted');

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
        areValid.users(['members', 'owners'])
    ], function uniqueCheckQuery (request) {
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
    }, function buildFindQuery (request) {
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
    }, [validAndPermitted(UserGroups, 'id', ['owners']),
        areValid.users(['addedMembers', 'addedOwners'])
    ], 'update', 'update')
    .deleteController(validAndPermitted(UserGroups, 'id', ['owners']))
    .joinApproveRejectController(['join', 'approve', 'reject'], 'addedMembers', 'owners')
    .doneConfiguring();

module.exports = Controller;
