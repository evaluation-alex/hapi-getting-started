'use strict';
var _ = require('lodash');

module.exports = function CancelJoinNotificationsBuilder (toAdd) {
    return function cancelJoinNotifications (obj, request, notification) {
        var modified = false;
        _.forEach(request.payload[toAdd], function (a) {
            if (notification.content.join === a) {
                modified = true;
                notification.setState('cancelled', request.auth.credentials.user.email);
            }
        });
        return modified ? notification.save() : notification;
    };
};
