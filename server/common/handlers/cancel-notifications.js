'use strict';
var logger = require('./../../../config').logger;
var Promise = require('bluebird');
var Notifications = require('./../../users/notifications/model');
var _ = require('lodash');

module.exports = function CancelNotification (model, cancelAction, cancelNotificationsCb) {
    return function cancelNotifications (target, request) {
        return Notifications._find({
            objectType: model._collection,
            objectId: target._id,
            state: 'unread',
            action: cancelAction
        })
            .then(function (notifications) {
                return Promise.settle(_.map(notifications, function (notification) {
                    if (cancelNotificationsCb) {
                        /*jshint unused:false*/
                        return new Promise(function (resolve, reject) {
                            resolve(cancelNotificationsCb(target, request, notification));
                        });
                        /*jshint unused:true*/
                    } else {
                        return notification.setState('cancelled', request.auth.credentials.user.email).save();
                    }
                }));
            })
            .catch(function (err) {
                if (err) {
                    logger.error({error: err});
                }
            })
            .done();
    };
};
