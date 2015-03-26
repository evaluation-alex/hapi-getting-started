'use strict';
var Joi = require('joi');
var _ = require('lodash');
var Notifications = require('./model');
var ControllerFactory = require('./../../common/controller-factory');
var onlyOwnerAllowed = require('./../../common/prereqs/only-owner');
var utils = require('./../../common/utils');

var Controller = new ControllerFactory(Notifications)
    .findController({
        query: {
            title: Joi.string(),
            state: Joi.string(),
            objectType: Joi.string(),
            createdOnBefore: Joi.date(),
            createdOnAfter: Joi.date(),
            isActive: Joi.string()
        }
    }, function buildFindQuery (request) {
        var query = {};
        query.email = request.auth.credentials.user.email;
        var prefs = request.auth.credentials.user.preferences;
        var blocked = _.flatten([
            prefs.notifications.blogs.blocked,
            prefs.notifications.posts.blocked,
            prefs.notifications.userGroups.blocked
        ]);
        if (utils.hasItems(blocked)) {
            query.objectId = {$nin: blocked};
        }
        utils.buildQueryFromRequestForFields(query, request, [['state', 'state'], ['objectType', 'objectType']]);
        utils.buildQueryFromRequestForDateFields(query, request, 'createdOn');
        return query;
    })
    .updateController({
        payload: {
            state: Joi.string().only(['read', 'starred']),
            isActive: Joi.boolean()
        }
    }, [
        onlyOwnerAllowed(Notifications, 'email')
    ], 'update',
    'update')
    .doneConfiguring();

module.exports = Controller;
