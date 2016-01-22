'use strict';
const Bluebird = require('bluebird');
const _ = require('lodash');
const {merge, isFunction} = _;
const utils = require('./utils');
const {by, errback, hasItems, locale, timing, hashCode} = utils;
const Notifications = require('./../notifications/model');
const buildPostHandler = function buildPostHandler(tags, cb) {
    const posthandlerTags = merge({}, tags, {type: 'post'});
    const cbp = Bluebird.method((request, target) => cb(request, target));
    return {
        method(request, reply) {
            const start = Date.now();
            if (!request.response.isBoom && request.response.source) {
                return cbp(request, request.response.source)
                    .then(() => {
                        reply.continue();
                        return null;
                    })
                    .catch(errback)
                    .finally(() => {
                        timing('handler', posthandlerTags, {elapsed: Date.now() - start});
                    });
            } else {
                timing('handler', posthandlerTags, {elapsed: Date.now() - start});
                reply.continue();
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
                        target.organisation,
                        Model.collection,
                        target._id,
                        args.title,
                        'unread',
                        args.action ? args.action : 'fyi',
                        args.priority ? args.priority : 'low',
                        args.description,
                        by(request));
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
        return Notifications.find({
                objectType: Model.collection,
                objectId: target._id,
                state: 'unread',
                action: action
            })
            .then(notifications => notifications.map(notification => cancelcb(target, request, notification)).map(p => p.reflect()))
    };
    return buildPostHandler(tags, cancel);
};
const i18n = function i18n(Model) {
    const tags = {collection: Model.collection, method: 'i18n'};
    const internationalize = function internationalize(request, target) {
        const lcl = locale(request);
        return (hasItems(target.data)) ? target.data.forEach(d => d.i18n(lcl)) : target.i18n(lcl);
    };
    return buildPostHandler(tags, internationalize);
};
const hashCodeOn = function hashCodeOn(Model) {
    const tags = {collection: Model.collection, method: 'hashCode'};
    const addHashCode = function addHashCode(request, target) {
        return (hasItems(target.data)) ? target.data.map(hashCode) : hashCode(target);
    };
    return buildPostHandler(tags, addHashCode);
};
const populateObject = function populateObject(Model, id) {
    const tags = {collection: Model.collection, method: 'populateObject'};
    const populateDep = function populateDep(request, target) {
        const user = by(request);
        if (hasItems(target.data)) {
            return Bluebird.all(target.data.map(item => item.populate(user)))
                .then(op => {
                    target.data = op;
                    return target;
                });
        } else {
            return target.populate(user);
        }
    };
    return buildPostHandler(tags, populateDep);
};
module.exports = {
    buildPostHandler,
    sendNotifications,
    cancelNotifications,
    i18n,
    hashCodeOn,
    populateObject
};
