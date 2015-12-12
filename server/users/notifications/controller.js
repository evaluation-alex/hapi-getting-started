'use strict';
const {flatten, merge} = require('lodash');
const {buildQuery, by, user, hasItems} = require('./../../common/utils');
const {findValidator, canView, canUpdate, prePopulate, onlyOwner} = require('./../../common/prereqs');
const {buildFindHandler, buildUpdateHandler} = require('./../../common/handlers');
const {i18n} = require('./../../common/posthandlers');
const schemas = require('./schemas');
const Notifications = require('./model');
module.exports = {
    find: {
        validate: findValidator(schemas.controller.find),
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
