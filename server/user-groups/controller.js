'use strict';
let schemas = require('./schemas');
let UserGroups = require('./model');
let ControllerFactory = require('./../common/controller-factory');
let areValid = require('./../common/prereqs/are-valid');
let isMemberOf = require('./../common/prereqs/is-member-of');
let createDeleteObjectNotificationsBuilder = require('./../common/notifications/create-delete-builder');
let addRemoveNotificationsBuilder = require('./../common/notifications/add-remove-builder');
let utils = require('./../common/utils');
var Controller = new ControllerFactory(UserGroups)
    .enableNotifications()
    .newController(schemas.create, [
        areValid.users(['members', 'owners'])
    ], (request) => {
        return {
            name: request.payload.name,
            organisation: utils.org(request)
        };
    })
    .sendNotifications(createDeleteObjectNotificationsBuilder('UserGroup', 'owners', 'name', 'new'))
    .findController(schemas.find, (request) => utils.buildQueryForPartialMatch({}, request, [['email', 'members'], ['groupName', 'name']]))
    .findOneController()
    .updateController(schemas.update, [
        isMemberOf(UserGroups, ['owners']),
        areValid.users(['addedMembers', 'addedOwners'])
    ], 'update', 'update')
    .sendNotifications(addRemoveNotificationsBuilder('UserGroup', ['owners', 'members'], 'owners', 'name'))
    .deleteController(isMemberOf(UserGroups, ['owners']))
    .sendNotifications(createDeleteObjectNotificationsBuilder('UserGroup', 'owners', 'name', 'delete'))
    .joinLeaveController(['members'], 'owners', 'name')
    .approveRejectController('addedMembers', 'owners', 'name')
    .doneConfiguring();
module.exports = Controller;
