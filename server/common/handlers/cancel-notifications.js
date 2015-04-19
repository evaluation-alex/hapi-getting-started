'use strict';
let Promise = require('bluebird');
let Notifications = require('./../../users/notifications/model');
let _ = require('lodash');
let utils = require('./../utils');
module.exports = function CancelNotification (model, cancelAction, cancelNotificationsCb) {
    let cancelNotificationsHook = Promise.method((target, request, notification) =>
            cancelNotificationsCb ?
                cancelNotificationsCb(target, request, notification) :
                notification.setState('cancelled', request.auth.credentials.user.email).save()
    );
    return (target, request) => {
        return Notifications.find({
            objectType: model.collection,
            objectId: target._id,
            state: 'unread',
            action: cancelAction
        })
            .then((notifications) => Promise.settle(
                _.map(notifications, (notification) => cancelNotificationsHook(target, request, notification))
            )
        ).catch(utils.errback)
            .done();
    };
};
