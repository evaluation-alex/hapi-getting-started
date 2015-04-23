'use strict';
let Joi = require('joi');
let UserGroups = require('./model');
let ControllerFactory = require('./../common/controller-factory');
let areValid = require('./../common/prereqs/are-valid');
let isMemberOf = require('./../common/prereqs/is-member-of');
let createDeleteObjectNotificationsBuilder = require('./../common/notifications/create-delete-builder');
let addRemoveNotificationsBuilder = require('./../common/notifications/add-remove-builder');
let utils = require('./../common/utils');
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
    ], (request) => {
        return {
            name: request.payload.name,
            organisation: utils.org(request)
        };
    })
    .sendNotifications(createDeleteObjectNotificationsBuilder('UserGroup', 'owners', 'name', 'new'))
    .findController({
        query: {
            email: Joi.string(),
            groupName: Joi.string(),
            isActive: Joi.string()
        }
    }, (request) => utils.buildQueryForPartialMatch({}, request, [['email', 'members'], ['groupName', 'name']]))
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
    .sendNotifications(addRemoveNotificationsBuilder('UserGroup', ['owners', 'members'], 'owners', 'name'))
    .deleteController(isMemberOf(UserGroups, ['owners']))
    .sendNotifications(createDeleteObjectNotificationsBuilder('UserGroup', 'owners', 'name', 'delete'))
    .joinLeaveController(['members'], 'owners', 'name')
    .approveRejectController('addedMembers', 'owners', 'name')
    .doneConfiguring();
module.exports = Controller;
