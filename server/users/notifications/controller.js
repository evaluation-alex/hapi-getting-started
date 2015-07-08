'use strict';
let schemas = require('./schemas');
let _ = require('lodash');
let Notifications = require('./model');
let ControllerFactory = require('./../../common/controller-factory');
let onlyOwnerAllowed = require('./../../common/prereqs/only-owner');
let utils = require('./../../common/utils');
let Controller = new ControllerFactory(Notifications)
    .findController(schemas.find, (request) => {
        let query = utils.buildQueryForPartialMatch({}, request, [['state', 'state'], ['objectType', 'objectType']]);
        query = utils.buildQueryForDateRange(query, request, 'createdOn');
        query.email = utils.by(request);
        let prefs = utils.user(request).preferences;
        let blocked = _.flatten([
            prefs.notifications.blogs.blocked,
            prefs.notifications.posts.blocked,
            prefs.notifications.userGroups.blocked
        ]);
        if (utils.hasItems(blocked)) {
            query.objectId = {$nin: blocked};
        }
        return query;
    })
    .updateController(schemas.update, [
        onlyOwnerAllowed(Notifications, 'email')
    ], 'update',
    'update')
    .doneConfiguring();
module.exports = Controller;
