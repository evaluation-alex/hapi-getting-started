'use strict';
var Joi = require('joi');
var UserGroups = require('./model');
var ControllerFactory = require('./../common/controller-factory');
var areValid = require('./../common/prereqs/are-valid');
var isMemberOf = require('./../common/prereqs/valid-permitted');
var CreateDeleteObjectNotificationsBuilder = require('./../common/notifications/create-delete-builder');
var AddRemoveNotificationsBuilder = require('./../common/notifications/add-remove-builder');
var utils = require('./../common/utils');

var Controller = new ControllerFactory(UserGroups)
    .enableNotifications()
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
    .sendNotifications(new CreateDeleteObjectNotificationsBuilder('UserGroup', 'owners', 'name', 'new'))
    .findController({
        query: {
            email: Joi.string(),
            groupName: Joi.string(),
            isActive: Joi.string()
        }
    }, function buildFindQuery (request) {
        var query = {};
        utils.buildQueryFromRequestForFields(query, request, [['email', 'members'], ['groupName', 'name']]);
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
    }, [isMemberOf(UserGroups, ['owners']),
        areValid.users(['addedMembers', 'addedOwners'])
    ], 'update', 'update')
    .sendNotifications(new AddRemoveNotificationsBuilder('UserGroup', ['owners', 'members'], 'owners', 'name'))
    .deleteController(isMemberOf(UserGroups, ['owners']))
    .sendNotifications(new CreateDeleteObjectNotificationsBuilder('UserGroup', 'owners', 'name', 'delete'))
    .joinLeaveController(['members'], 'owners', 'name')
    .approveRejectController('addedMembers', 'owners', 'name')
    .doneConfiguring();

module.exports = Controller;
