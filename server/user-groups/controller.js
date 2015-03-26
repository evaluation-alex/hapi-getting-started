'use strict';
var Joi = require('joi');
var UserGroups = require('./model');
var ControllerFactory = require('./../common/controller-factory');
var areValid = require('./../common/prereqs/are-valid');
var validAndPermitted = require('./../common/prereqs/valid-permitted');
var NewObjectNotificationsBuilder = require('./../common/notifications/new-builder');
var DeleteObjectNotificationsBuilder = require('./../common/notifications/delete-builder');
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
    .sendNotifications(new NewObjectNotificationsBuilder('UserGroup', 'owners', 'name'))
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
    }, [validAndPermitted(UserGroups, 'id', ['owners']),
        areValid.users(['addedMembers', 'addedOwners'])
    ], 'update', 'update')
    .sendNotifications(new AddRemoveNotificationsBuilder('UserGroup', ['owners', 'members'], 'owners', 'name'))
    .deleteController(validAndPermitted(UserGroups, 'id', ['owners']))
    .sendNotifications(new DeleteObjectNotificationsBuilder('UserGroup', 'owners', 'name'))
    .joinLeaveController(['members'], 'owners', 'name')
    .approveRejectController('addedMembers', 'owners', 'name')
    .doneConfiguring();

module.exports = Controller;
