'use strict';
let Promise = require('bluebird');
let Notifications = require('./../../users/notifications/model');
let _ = require('lodash');
let utils = require('./../utils');
module.exports = function CancelNotification (model, cancelAction, cancelNotificationsCb) {
    return (target, request) => {
        return Notifications.find({
            objectType: model.collection,
            objectId: target._id,
            state: 'unread',
            action: cancelAction
        })
            .then((notifications) => {
                return Promise.settle(_.map(notifications, (notification) => {
                    if (cancelNotificationsCb) {
                        /*jshint unused:false*/
                        return new Promise((resolve, reject) => resolve(cancelNotificationsCb(target, request, notification)));
                        /*jshint unused:true*/
                    } else {
                        return notification.setState('cancelled', request.auth.credentials.user.email).save();
                    }
                }));
            })
            .catch(utils.errback)
            .done();
    };
};
