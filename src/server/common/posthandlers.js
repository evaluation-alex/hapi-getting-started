'use strict';
const Bluebird = require('bluebird');
const _ = require('./../lodash');
const {merge} = _;
const utils = require('./utils');
const {by, user, errback, hasItems, locale, profile} = utils;
const Notifications = require('./../notifications/model');
const buildPostHandler = function buildPostHandler(tags, cb) {
    const timing = profile('handler', merge({type: 'post'}, tags));
    const cbp = Bluebird.method((request, target) => cb(request, target));
    return {
        method(request, reply) {
            const start = Date.now();
            const {isBoom, source} = request.response;
            if (!isBoom && source) {
                const p = source.data ?
                    Bluebird.all(source.data.map(item => cbp(request, item))) :
                    cbp(request, source);
                p
                    .then(() => {
                        reply.continue();
                        return null;
                    })
                    .catch(errback)
                    .finally(() => timing(start));
            } else {
                reply.continue();
                timing(start);
            }
        }
    };
};
const sendNotifications = function sendNotifications({collection}, notifyCb) {
    const tags = {collection, method: 'sendNotifications'};
    const notifycb = Bluebird.method((target, request) => notifyCb(target, request));
    const notify = function notify(request, target) {
        return notifycb(target, request)
            .then(({to, title, action, priority, description}) => {
                if (hasItems(to)) {
                    return Notifications.create(to,
                        collection,
                        target._id,
                        title,
                        'unread',
                        action || 'fyi',
                        priority || 'low',
                        false,
                        description,
                        by(request),
                        target.organisation);
                }
                return null;
            })
    };
    return buildPostHandler(tags, notify);
};
const cancelNotifications = function cancelNotifications({collection}, action, cancelCb) {
    const tags = {collection, method: 'cancelNotifications'};
    const cancelcb = Bluebird.method((target, request, notification) =>
        cancelCb ?
            cancelCb(target, request, notification) :
            notification.setState('cancelled', by(request)).save()
    );
    const cancel = function cancel(request, target) {
        return Bluebird.all(Notifications.find({
                objectType: collection,
                objectId: target._id,
                state: 'unread',
                action
            })
            .then(notifications => notifications
                .map(notification => cancelcb(target, request, notification))
                .map(p => p.reflect())
            ))
            //http://bluebirdjs.com/docs/api/reflect.html
            .map(p => p.isFulfilled() ?
                p.value() :/*istanbul ignore next*/
                p.reason()
            );
    };
    return buildPostHandler(tags, cancel);
};
const i18n = function i18n({collection}) {
    const tags = {collection, method: 'i18n'};
    return buildPostHandler(tags, (request, target) =>
        target.i18n ?
            target.i18n(locale(request)) :/*istanbul ignore next*/
            target
    );
};
const hashCodeOn = function hashCodeOn({collection}) {
    const tags = {collection, method: 'hashCode'};
    return buildPostHandler(tags, (request, target) =>
        target.hashCode ?
            target.hashCode() :/*istanbul ignore next*/
            target
    );
};
const populateObject = function populateObject({collection}) {
    const tags = {collection, method: 'populateObject'};
    return buildPostHandler(tags, (request, target) =>
        target.populate ?
            target.populate(user(request)) :/*istanbul ignore next*/
            target
    );
};
module.exports = {
    buildPostHandler,
    sendNotifications,
    cancelNotifications,
    i18n,
    hashCodeOn,
    populateObject
};
