'use strict';
const _ = require('lodash');
const utils = require('./../../common/utils');
const pre = require('./../../common/prereqs');
const handlers = require('./../../common/handlers');
const post = require('./../../common/posthandlers');
const {flatten, merge} = _;
const {buildQuery, by, user, hasItems} = utils;
const {findValidator, canView, canUpdate, prePopulate, onlyOwner} = pre;
const {buildFindHandler, buildUpdateHandler} = handlers;
const {i18n} = post;
const schemas = require('./schemas');
const Notifications = require('./model');
module.exports = {
    find: {
        validate: findValidator(schemas.controller.find, schemas.controller.findDefaults),
        pre: [
            canView(Notifications.collection)
        ],
        handler: buildFindHandler(Notifications, request => {
            let query = merge(
                {email: by(request)},
                buildQuery(request, schemas.controller.findOptions)
            );
            const prefs = user(request).preferences;
            const blocked = flatten([
                prefs.notifications.blogs.blocked,
                prefs.notifications.posts.blocked,
                prefs.notifications.userGroups.blocked
            ]);
            if (hasItems(blocked)) {
                query.objectId = {$nin: blocked};
            }
            return query;
        }),
        post: [
            i18n(Notifications)
        ]
    },
    update: {
        validate: schemas.controller.update,
        pre: [
            canUpdate(Notifications.collection),
            prePopulate(Notifications, 'id'),
            onlyOwner(Notifications)
        ],
        handler: buildUpdateHandler(Notifications, schemas.dao.updateMethod.method),
        post: [
            i18n(Notifications)
        ]
    }
};
