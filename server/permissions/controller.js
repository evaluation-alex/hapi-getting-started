'use strict';
var _ = require('lodash');
var Joi = require('joi');
var Permissions = require('./model');
var Users = require('./../users/model');
var UserGroups = require('./../user-groups/model');
var ControllerFactory = require('./../common/controller-factory');
var areValid = require('./../common/pre-reqs').areValid;

var Controller = new ControllerFactory('permissions', Permissions)
    .findController({
        query: {
            user: Joi.string(),
            group: Joi.string(),
            action: Joi.string(),
            object: Joi.string(),
            isActive: Joi.string()
        }
    }, function (request) {
        var query = {};
        var fields = [['user', 'users'], ['group', 'groups'], ['action', 'action'], ['object', 'object']];
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
            addedUsers: Joi.array().items(Joi.string()).unique(),
            removedUsers: Joi.array().items(Joi.string()).unique(),
            addedGroups: Joi.array().items(Joi.string()).unique(),
            removedGroups: Joi.array().items(Joi.string()).unique(),
            description: Joi.string()
        }
    }, [{assign: 'validUsers', method: areValid(Users, 'email', 'addedUsers')},
        {assign: 'validGroups', method: areValid(UserGroups, 'name', 'addedGroups')}
    ], 'update', 'update')
    .newController({
        payload: {
            description: Joi.string(),
            users: Joi.array().items(Joi.string()).unique(),
            groups: Joi.array().items(Joi.string()).unique(),
            action: Joi.string().required(),
            object: Joi.string().required()
        }
    }, [
        {assign: 'validUsers', method: areValid(Users, 'email', 'users')},
        {assign: 'validGroups', method: areValid(UserGroups, 'name', 'groups')}
    ], function (request) {
        return {
            action: request.payload.action,
            object: request.payload.object
        };
    })
    .deleteController()
    .doneConfiguring();

module.exports = Controller;
