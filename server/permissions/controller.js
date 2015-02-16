'use strict';
var _ = require('lodash');
var Joi = require('joi');
var Permissions = require('./model');
var BaseController = require('./../common/controller').BaseController;
var Users = require('./../users/model');
var UserGroups = require('./../user-groups/model');
var areValid = require('./../common/controller').areValid;

var Controller = {};

Controller.find = BaseController.find('permissions', Permissions, {
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
});

Controller.findOne = BaseController.findOne('permissions', Permissions);

Controller.update = BaseController.update('permissions', Permissions, {
    payload: {
        isActive: Joi.boolean(),
        addedUsers: Joi.array().includes(Joi.string()).unique(),
        removedUsers: Joi.array().includes(Joi.string()).unique(),
        addedGroups: Joi.array().includes(Joi.string()).unique(),
        removedGroups: Joi.array().includes(Joi.string()).unique(),
        description: Joi.string()
    }
}, [{assign: 'validUsers', method: areValid(Users, 'email', 'addedUsers')},
    {assign: 'validGroups', method: areValid(UserGroups, 'name', 'addedGroups')}
]);

Controller.new = BaseController.new('permissions', Permissions, {
    payload: {
        description: Joi.string(),
        users: Joi.array().includes(Joi.string()).unique(),
        groups: Joi.array().includes(Joi.string()).unique(),
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
});

Controller.delete = BaseController.delete('permissions', Permissions);

module.exports.Controller = Controller;
