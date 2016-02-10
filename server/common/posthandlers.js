'use strict';
const Bluebird = require('bluebird');
const _ = require('./../lodash');
const {merge, isFunction} = _;
const utils = require('./utils');
const {by, user, errback, hasItems, locale, hashCode, profile} = utils;
const Notifications = require('./../notifications/model');
const buildPostHandler = function buildPostHandler(tags, cb) {
    const timing = profile('handler', merge({}, tags, {type: 'post'}));
    const cbp = Bluebird.method((request, target) => cb(request, target));
    return {
        method(request, reply) {
            const start = Date.now();
            if (!request.response.isBoom && request.response.source) {
                const p = request.response.source.data ?
                    Bluebird.all(request.response.source.data.map(item => cbp(request, item))) :
                    cbp(request, request.response.source);
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
const sendNotifications = function sendNotifications(Model, notifyCb) {
    const tags = {collection: Model.collection, method: 'sendNotifications'};
    const notifycb = Bluebird.method((target, request) => notifyCb(target, request));
    const notify = function notify(request, target) {
        return notifycb(target, request)
            .then(args => {
                if (hasItems(args.to)) {
                    return Notifications.create(args.to,
                        Model.collection,
                        target._id,
                        args.title,
                        'unread',
                        args.action ? args.action : 'fyi',
                        args.priority ? args.priority : 'low',
                        args.description,
                        by(request),
                        target.organisation);
                }
                return null;
            })
    };
    return buildPostHandler(tags, notify);
};
const cancelNotifications = function cancelNotifications(Model, action, cancelCb) {
    const tags = {collection: Model.collection, method: 'cancelNotifications'};
    const cancelcb = Bluebird.method((target, request, notification) =>
        cancelCb ?
            cancelCb(target, request, notification) :
            notification.setState('cancelled', by(request)).save()
    );
    const cancel = function cancel(request, target) {
        return Bluebird.all(Notifications.find({
                objectType: Model.collection,
                objectId: target._id,
                state: 'unread',
                action: action
            })
            .then(notifications => notifications
                .map(notification => cancelcb(target, request, notification))
                .map(p => p.reflect())
            ))
            //http://bluebirdjs.com/docs/api/reflect.html
            .map(p => p.isFulfilled() ? p.value() : /*istanbul ignore next*/p.reason());
    };
    return buildPostHandler(tags, cancel);
};
const i18n = function i18n(Model) {
    const tags = {collection: Model.collection, method: 'i18n'};
    return buildPostHandler(tags, (request, target) =>
        target.i18n ? target.i18n(locale(request)) : /*istanbul ignore next*/target
    );
};
const hashCodeOn = function hashCodeOn(Model) {
    const tags = {collection: Model.collection, method: 'hashCode'};
    return buildPostHandler(tags, (request, target) => hashCode(target));
};
const populateObject = function populateObject(Model, id) {
    const tags = {collection: Model.collection, method: 'populateObject'};
    return buildPostHandler(tags, (request, target) =>
        target.populate ? target.populate(user(request)) : /*istanbul ignore next*/target
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
