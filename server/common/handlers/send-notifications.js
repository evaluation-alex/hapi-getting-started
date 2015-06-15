'use strict';
let Bluebird = require('bluebird');
let Notifications = require('./../../users/notifications/model');
let utils = require('./../utils');
module.exports = (model, notifyCb) => {
    let notifyHook = Bluebird.method((target, request) => notifyCb(target, request));
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
                        utils.by(request));
                }
                return undefined;
            })
            .catch(utils.errback)
            .done();
    };
};
