'use strict';
var logger = require('./../../../config').logger;
var Promise = require('bluebird');
var Notifications = require('./../../users/notifications/model');
var _ = require('lodash');

module.exports = function CancelNotification (model, cancelAction, cancelNotificationsCb) {
    var cancelHook = function cancelCbHook (target, request, notification) {
        if (cancelNotificationsCb) {
            /*jshint unused:false*/
            return new Promise (function (resolve, reject) {
                resolve(cancelNotificationsCb(target, request, notification));
            });
            /*jshint unused:true*/
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
                .then(function (notifications) {
                    return Promise.settle(_.map(notifications, function (notification) {
                        return cancelHook(target, request, notification);
                    }));
                })
                .catch(function (err) {
                    if (err) {
                        logger.error({error: err});
                    }
                });
        }
    };
};
