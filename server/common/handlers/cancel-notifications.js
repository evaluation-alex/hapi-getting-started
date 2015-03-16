'use strict';
var logger = require('./../../../config').logger;
var Promise = require('bluebird');
var Notifications = require('./../../users/notifications/model');

module.exports = function CancelNotification (model, cancelAction, cancelNotificationsCb) {
    var cancelHook = function cancelCbHook (target, request, notification) {
        if (cancelNotificationsCb) {
            return Promise.resolve(cancelNotificationsCb(target, request, notification));
        } else {
            notification.setState('cancelled', request.auth.credentials.user.email);
            return notification.save();
        }
    };
    return function cancelNotifications(target, request) {
        if (cancelAction) {
            Notifications._find({
                objectType: model._collection,
                objectId: target._id,
                state: 'unread',
                action: cancelAction
            })
                .map(function (notification) {
                    cancelHook(target, request, notification);
                })
                .catch(function (err) {
                    if (err) {
                        logger.error({error: err});
                    }
                });
        }
    };
};
