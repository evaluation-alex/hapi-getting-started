'use strict';
let _ = require('lodash');
module.exports = function JoinCancelNotificationBuilder(toAdd) {
    return (obj, request, notification) => {
        let modified = false;
        _.forEach(request.payload[toAdd], (a) => {
            if (notification.content.join === a) {
                modified = true;
                notification.setState('cancelled', request.auth.credentials.user.email);
            }
        });
        return modified ? notification.save() : notification;
    };
};
