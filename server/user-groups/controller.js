'use strict';
var _ = require('lodash');
var Joi = require('joi');
var UserGroups = require('./model');
var ControllerFactory = require('./../common/controller-factory');
var areValid = require('./../common/prereqs/are-valid');
var validAndPermitted = require('./../common/prereqs/valid-permitted');
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
    .sendNotifications(function newNotificationBuilder (ug, request) {
        return {
            to: ug.owners,
            title: ['UserGroup {{name}} created.', {title: ug.name}],
            description: ['UserGroup {{name}} created and you have been designated owner by {{createdBy}}', {
                title: ug.name,
                createdBy: request.auth.credentials.user.email
            }]
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
    .sendNotifications(function updateNotificationBuilder (ug, request) {
        var description = {};
        var shouldNotify = false;
        _.forEach(['members', 'owners'], function (toInspect) {
            _.forEach(['added', 'removed'], function (t) {
                var p = t + _.capitalize(toInspect);
                if (utils.hasItems(request.payload[p])) {
                    shouldNotify = true;
                    description[toInspect] = description[toInspect] || {};
                    description[toInspect][t] = request.payload[p];
                }
            });
        });
        return {
            to: shouldNotify ? ug.owners : [],
            title: ['UserGroup {{name}} updated by {{updatedBy}}', {
                title: ug.name,
                updatedBy: request.auth.credentials.user.email
            }],
            description: description
        };
    })
    .deleteController(validAndPermitted(UserGroups, 'id', ['owners']))
    .sendNotifications(function deleteNotificationBuilder (ug, request) {
        return {
            to: ug.owners,
            title: ['UserGroup {{name}} deleted.', {title: ug.name}],
            description: ['UserGroup {{name}} deleted by {{updatedBy}}', {
                title: ug.name,
                updatedBy: request.auth.credentials.user.email
            }]
        };
    })
    .joinLeaveController(['members'], 'owners', 'name')
    .approveRejectController('addedMembers', 'owners', 'name')
    .doneConfiguring();

module.exports = Controller;
