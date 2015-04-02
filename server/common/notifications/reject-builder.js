'use strict';
var utils = require('./../utils');
module.exports = function RejectNotificationsBuilder (toAdd, idForNotificationsTitle) {
    return function rejectNotifications (obj, request) {
        return {
            to: utils.hasItems(request.payload[toAdd]) ? request.payload[toAdd] : [],
            title: ['Your request to follow {{title}} was denied', {
                title: obj[idForNotificationsTitle]
            }],
            description: ['Your request to follow {{title}} was denied by {{updatedBy}}', {
                title: obj[idForNotificationsTitle],
                updatedBy: request.auth.credentials.user.email
            }]
        };
    };
};
