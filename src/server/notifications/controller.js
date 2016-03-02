'use strict';
const _ = require('./../lodash');
const utils = require('./../common/utils');
const pre = require('./../common/prereqs');
const handlers = require('./../common/handlers');
const post = require('./../common/posthandlers');
const {filter, flatten, merge} = _;
const {buildQuery, by, user, hasItems} = utils;
const {canView, canUpdate, prePopulate, onlyOwner, buildMongoQuery} = pre;
const {buildFindHandler, buildUpdateHandler} = handlers;
const {i18n, hashCodeOn} = post;
const Notifications = require('./model');
const schema = require('./../../shared/rest-api')(require('joi'), _).notifications;
module.exports = {
    find: {
        validate: schema.find,
        pre: [
            canView(Notifications.collection),
            buildMongoQuery(Notifications, schema.findOptions, (request, findOptions) => {
                const query = merge(
                    {email: by(request)},
                    buildQuery(request, findOptions)
                );
                const prefs = user(request).preferences;
                const blocked = filter(flatten([
                    prefs.notifications.blogs.blocked,
                    prefs.notifications.posts.blocked,
                    prefs.notifications.userGroups.blocked
                ]));
                if (hasItems(blocked)) {
                    query.objectId = {$nin: blocked};
                }
                return query;
            })
        ],
        handler: buildFindHandler(Notifications),
        post: [
            i18n(Notifications),
            hashCodeOn(Notifications)
        ]
    },
    update: {
        validate: schema.update,
        pre: [
            canUpdate(Notifications.collection),
            prePopulate(Notifications, 'id'),
            onlyOwner(Notifications)
        ],
        handler: buildUpdateHandler(Notifications, 'update'),
        post: [
            i18n(Notifications),
            hashCodeOn(Notifications)
        ]
    }
};
