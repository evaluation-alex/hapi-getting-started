'use strict';
let Promise = require('bluebird');
let Notifications = require('./../../users/notifications/model');
let utils = require('./../utils');
module.exports = function SendNotifications (model, notifyCb) {
    let notifyHook = Promise.method((target, request) => notifyCb(target, request));
    return (target, request) => {
        return notifyHook(target, request)
            .then((args) => {
                if (utils.hasItems(args.to)) {
                    return Notifications.create(args.to,
                        target.organisation,
                        model.collection,
                        target._id,
                        args.title,
                        'unread',
                        args.action ? args.action : 'fyi',
                        args.priority ? args.priority : 'low',
                        args.description,
                        request.auth.credentials.user.email);
                }
                return undefined;
            })
            .catch(utils.errback)
            .done();
    };
};
