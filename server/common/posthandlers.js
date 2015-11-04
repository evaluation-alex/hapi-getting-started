'use strict';
import Bluebird from 'bluebird';
import {by, errback, hasItems, locale} from './utils';
import Notifications from './../users/notifications/model';
export function sendNotifications(Model, notifyCb) {
    const notify = Bluebird.method((target, request) => notifyCb(target, request));
    return {
        method(request, reply) {
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
                    .catch(errback);
            } else {
                reply.continue();
            }
        }
    };
}
export function cancelNotifications(Model, action, cancelCb) {
    const cancel = Bluebird.method((target, request, notification) =>
            cancelCb ?
                cancelCb(target, request, notification) :
                notification.setState('cancelled', by(request)).save()
    );
    return {
        method(request, reply) {
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
                    .catch(errback);
            } else {
                reply.continue();
            }
        }
    };
}
export function i18n() {
    return {
        method(request, reply) {
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
            return reply.continue();
        }
    };
}
