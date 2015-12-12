'use strict';
const Bluebird = require('bluebird');
const {by, errback, hasItems, locale, timing} = require('./utils');
const Notifications = require('./../users/notifications/model');
module.exports.sendNotifications = function sendNotifications(Model, notifyCb) {
    const tags = {collection: Model.collection, method: 'sendNotifications', type: 'post'};
    const notify = Bluebird.method((target, request) => notifyCb(target, request));
    return {
        method(request, reply) {
            const start = Date.now();
            if (!request.response.isBoom) {
                const target = request.response.source;
                notify(target, request)
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
                    .then(() => {
                        reply.continue();
                        return null;
                    })
                    .catch(errback)
                    .finally(() => {
                        timing('handler', tags, {elapsed: Date.now() - start});
                    });
            } else {
                timing('handler', tags, {elapsed: Date.now() - start});
                reply.continue();
            }
        }
    };
};
module.exports.cancelNotifications = function cancelNotifications(Model, action, cancelCb) {
    const tags = {collection: Model.collection, method: 'cancelNotifications', type: 'post'};
    const cancel = Bluebird.method((target, request, notification) =>
            cancelCb ?
                cancelCb(target, request, notification) :
                notification.setState('cancelled', by(request)).save()
    );
    return {
        method(request, reply) {
            const start = Date.now();
            if (!request.response.isBoom) {
                const target = request.response.source;
                Notifications.find({
                    objectType: Model.collection,
                    objectId: target._id,
                    state: 'unread',
                    action: action
                })
                    .then(notifications => notifications.map(notification => cancel(target, request, notification)).map(p => p.reflect()))
                    .then(() => {
                        reply.continue();
                        return null;
                    })
                    .catch(errback)
                    .finally(() => {
                        timing('handler', tags, {elapsed: Date.now() - start});
                    });
            } else {
                timing('handler', tags, {elapsed: Date.now() - start});
                reply.continue();
            }
        }
    };
};
module.exports.i18n = function i18n(Model) {
    const tags = {collection: Model.collection, method: 'i18n', type: 'post'};
    return {
        method(request, reply) {
            const start = Date.now();
            if (!request.response.isBoom) {
                const lcl = locale(request);
                const obj = request.response.source;
                /*istanbul ignore else*/
                if (obj) {
                    if (hasItems(obj.data)) {
                        obj.data.forEach(d => d.i18n(lcl));
                    } else {
                        obj.i18n(lcl);
                    }
                }
            }
            timing('handler', tags, {elapsed: Date.now() - start});
            return reply.continue();
        }
    };
};
